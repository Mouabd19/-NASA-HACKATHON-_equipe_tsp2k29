import Foundation
import HealthKit
import SwiftUI

enum HealthTypes {
    /// Tout ce que l'app lit, demandé en une fois
    static var read: Set<HKObjectType> {
        [
            HKQuantityType(.heartRate),
            HKQuantityType(.restingHeartRate),
            HKQuantityType(.heartRateVariabilitySDNN),
            HKQuantityType(.vo2Max),
            HKQuantityType(.oxygenSaturation),
            HKQuantityType(.appleSleepingWristTemperature),
            HKCategoryType(.sleepAnalysis),
        ]
    }
}

/// Une ligne de l'instantané santé
struct SnapshotItem: Identifiable, Equatable {
    enum Status: Equatable {
        case pending
        case missing
        case sending
        case sent(String?)
        case failed(String)
    }

    let id: String        // type de l'API
    let label: String
    var payload: IngestPayload?
    var display: String?  // « 58 bpm »
    var sampleDate: Date?
    var status: Status

    var color: Color {
        switch status {
        case .sent: return Palette.green
        case .failed: return Palette.red
        case .sending: return Palette.amber
        case .pending, .missing: return Palette.gray
        }
    }

    var detail: String {
        switch status {
        case .pending: return "Pas encore lu"
        case .missing: return "Absente de Santé, rien envoyé"
        case .sending: return "Envoi"
        case .sent(let route):
            return "Envoyée" + (route.map { " \($0)" } ?? "") + dateSuffix
        case .failed(let why): return why
        }
    }

    private var dateSuffix: String {
        guard let d = sampleDate else { return "" }
        return " · mesure du " + d.formatted(.dateTime.day().month(.abbreviated).hour().minute())
    }
}

/// Lit le dernier échantillon de chaque mesure dans Santé, puis les poste un par un.
/// Jamais de valeur inventée : une mesure absente n'est pas envoyée.
@MainActor
final class HealthSnapshotModel: ObservableObject {
    @Published private(set) var items: [SnapshotItem] = HealthSnapshotModel.blank()
    @Published private(set) var running = false
    @Published private(set) var finishedAt: Date?
    @Published private(set) var error: String?

    private let store = HKHealthStore()
    /// Envoie une mesure ; renvoie un libellé de route (« via l'iPhone ») ou nil
    private let send: (IngestPayload) async throws -> String?

    init(send: @escaping (IngestPayload) async throws -> String?) {
        self.send = send
    }

    var summary: String? {
        guard finishedAt != nil else { return nil }
        let sent = items.filter { if case .sent = $0.status { return true } else { return false } }.count
        let missing = items.filter { $0.status == .missing }.count
        let failed = items.filter { if case .failed = $0.status { return true } else { return false } }.count
        var parts = ["\(sent) envoyée\(sent > 1 ? "s" : "")"]
        if missing > 0 { parts.append("\(missing) absente\(missing > 1 ? "s" : "")") }
        if failed > 0 { parts.append("\(failed) en erreur") }
        return parts.joined(separator: " · ")
    }

    func run() async {
        guard !running else { return }
        running = true
        error = nil
        finishedAt = nil
        items = Self.blank()
        defer { running = false; finishedAt = Date() }

        guard HKHealthStore.isHealthDataAvailable() else {
            error = "Santé indisponible sur cet appareil"
            return
        }
        guard !AppKeys.currentServerURL.isEmpty else {
            error = APIError.noAddress.localizedDescription
            return
        }
        do {
            try await store.requestAuthorization(toShare: [HKObjectType.workoutType()], read: HealthTypes.read)
        } catch {
            self.error = "Accès Santé refusé : \(error.localizedDescription)"
            return
        }

        // 1. Lecture
        for i in items.indices {
            items[i] = await read(items[i])
        }
        // 2. Envoi, un par un
        for i in items.indices {
            guard let payload = items[i].payload else { continue }
            items[i].status = .sending
            do {
                items[i].status = .sent(try await send(payload))
            } catch {
                items[i].status = .failed(error.localizedDescription)
            }
        }
    }

    // MARK: Lecture HealthKit

    private struct Spec {
        let id: String
        let label: String
        let type: HKQuantityTypeIdentifier
        let unit: HKUnit
        let apiUnit: String
        let scale: Double
        let digits: Int
    }

    private static let specs: [Spec] = [
        Spec(id: "RestingHeartRate", label: "FC au repos", type: .restingHeartRate,
             unit: HKUnit.count().unitDivided(by: .minute()), apiUnit: "bpm", scale: 1, digits: 0),
        Spec(id: "HeartRateVariabilitySDNN", label: "VFC (SDNN)", type: .heartRateVariabilitySDNN,
             unit: .secondUnit(with: .milli), apiUnit: "ms", scale: 1, digits: 0),
        Spec(id: "VO2Max", label: "VO₂max", type: .vo2Max,
             unit: HKUnit(from: "ml/kg*min"), apiUnit: "ml/kg/min", scale: 1, digits: 1),
        Spec(id: "OxygenSaturation", label: "SpO₂", type: .oxygenSaturation,
             unit: .percent(), apiUnit: "%", scale: 100, digits: 0),
        Spec(id: "AppleSleepingWristTemperature", label: "Température du poignet", type: .appleSleepingWristTemperature,
             unit: .degreeCelsius(), apiUnit: "°C", scale: 1, digits: 2),
    ]

    private static let sleepID = "SleepAnalysis"

    private static func blank() -> [SnapshotItem] {
        specs.map { SnapshotItem(id: $0.id, label: $0.label, status: .pending) }
            + [SnapshotItem(id: sleepID, label: "Sommeil de la dernière nuit", status: .pending)]
    }

    private func read(_ item: SnapshotItem) async -> SnapshotItem {
        var item = item
        if item.id == Self.sleepID {
            guard let (hours, end) = try? await lastNightSleep() else { item.status = .missing; return item }
            let value = (hours * 10).rounded() / 10
            item.payload = IngestPayload(type: Self.sleepID, value: value, unit: "h", sampleDate: end)
            item.display = String(format: "%.1f h", value)
            item.sampleDate = end
            item.status = .pending
            return item
        }
        guard let spec = Self.specs.first(where: { $0.id == item.id }),
              let sample = try? await latest(spec.type) else {
            item.status = .missing
            return item
        }
        let p = pow(10, Double(spec.digits))
        let value = (sample.quantity.doubleValue(for: spec.unit) * spec.scale * p).rounded() / p
        item.payload = IngestPayload(type: spec.id, value: value, unit: spec.apiUnit, sampleDate: sample.endDate)
        item.display = "\(String(format: "%.\(spec.digits)f", value)) \(spec.apiUnit)"
        item.sampleDate = sample.endDate
        item.status = .pending
        return item
    }

    private func latest(_ id: HKQuantityTypeIdentifier) async throws -> HKQuantitySample? {
        let query = HKSampleQueryDescriptor(
            predicates: [.quantitySample(type: HKQuantityType(id))],
            sortDescriptors: [SortDescriptor(\.endDate, order: .reverse)],
            limit: 1
        )
        return try await query.result(for: store).first
    }

    /// Durée endormie de la nuit la plus récente (36 dernières heures), sans double compte
    /// quand l'iPhone et la montre ont tous deux enregistré la nuit.
    private func lastNightSleep() async throws -> (Double, Date)? {
        let now = Date()
        let query = HKSampleQueryDescriptor(
            predicates: [.categorySample(type: HKCategoryType(.sleepAnalysis),
                                         predicate: HKQuery.predicateForSamples(withStart: now.addingTimeInterval(-36 * 3600), end: now))],
            sortDescriptors: [SortDescriptor(\.startDate, order: .forward)]
        )
        let asleep = try await query.result(for: store).filter {
            HKCategoryValueSleepAnalysis.allAsleepValues.map(\.rawValue).contains($0.value)
        }
        guard let lastEnd = asleep.map(\.endDate).max() else { return nil }
        // La nuit = les phases de sommeil finies dans les 16 h avant le dernier réveil
        let night = asleep.filter { $0.endDate > lastEnd.addingTimeInterval(-16 * 3600) }
        var total: TimeInterval = 0
        var cursorEnd = Date.distantPast
        for s in night { // triés par début : union des intervalles
            let start = max(s.startDate, cursorEnd)
            if s.endDate > start { total += s.endDate.timeIntervalSince(start) }
            cursorEnd = max(cursorEnd, s.endDate)
        }
        guard total > 0 else { return nil }
        return (total / 3600, lastEnd)
    }
}

/// Liste partagée montre / iPhone
struct SnapshotRows: View {
    @ObservedObject var model: HealthSnapshotModel

    var body: some View {
        ForEach(model.items) { item in
            VStack(alignment: .leading, spacing: 2) {
                HStack(alignment: .firstTextBaseline, spacing: 6) {
                    Circle().fill(item.color).frame(width: 8, height: 8)
                    Text(item.label).font(.footnote)
                    Spacer(minLength: 4)
                    Text(item.display ?? "--")
                        .font(.footnote.weight(.semibold))
                        .monospacedDigit()
                        .foregroundStyle(item.display == nil ? Palette.gray : .white)
                }
                Text(item.detail)
                    .font(.caption2)
                    .monospacedDigit()
                    .foregroundStyle(item.status == .missing || item.status == .pending ? Palette.secondary : item.color)
                    .fixedSize(horizontal: false, vertical: true)
            }
            .padding(.vertical, 2)
        }
    }
}
