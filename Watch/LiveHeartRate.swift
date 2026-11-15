import Foundation
import HealthKit

/// Pouls en direct : HKWorkoutSession + HKLiveWorkoutBuilder, chaque nouvelle valeur
/// part vers POST /ingest avec la date de l'échantillon (au plus une requête toutes les 2 s).
@MainActor
final class LiveHeartRate: NSObject, ObservableObject {
    enum Phase: Equatable { case idle, starting, running, stopping }

    @Published private(set) var phase: Phase = .idle
    /// Vrai si la séance en cours est simulée (rien n'est envoyé)
    @Published private(set) var isSimulated = false

    @Published private(set) var bpm: Double?
    /// Date de l'échantillon HealthKit
    @Published private(set) var sampleDate: Date?
    /// Heure de réception sur la montre, sert au « En direct » (< 15 s)
    @Published private(set) var receivedAt: Date?

    @Published private(set) var lastSentAt: Date?
    @Published private(set) var lastSentValue: Double?
    @Published private(set) var lastRoute: Transport.Route?
    @Published private(set) var sentCount = 0
    @Published private(set) var lastError: String?
    @Published private(set) var lastErrorAt: Date?

    /// Dernières valeurs reçues (60 au plus), pour le tracé de la page Pouls
    @Published private(set) var recent: [Double] = []
    /// FC au repos du porteur, lue dans Santé au démarrage : sert de référence à l'écart affiché
    @Published private(set) var restingRef: (value: Double, date: Date)?

    private let store = HKHealthStore()
    private var session: HKWorkoutSession?
    private var builder: HKLiveWorkoutBuilder?
    private var simTimer: Timer?
    private var simTick = 0.0
    private var lastQueuedSampleDate: Date?

    private lazy var sender = ThrottledSender(minInterval: 2) { [weak self] payload, result in
        self?.handle(result, for: payload)
    }

    static let liveWindow: TimeInterval = 15

    func isLive(at now: Date) -> Bool {
        guard phase == .running, let receivedAt else { return false }
        return now.timeIntervalSince(receivedAt) < Self.liveWindow
    }

    /// L'erreur affichée est-elle plus récente que le dernier envoi réussi ?
    var errorIsCurrent: Bool {
        guard let lastErrorAt else { return false }
        guard let lastSentAt else { return true }
        return lastErrorAt > lastSentAt
    }

    // MARK: Démarrer / arrêter

    func start(simulated: Bool) async {
        guard phase == .idle else { return }
        bpm = nil; sampleDate = nil; receivedAt = nil; lastQueuedSampleDate = nil
        recent = []
        isSimulated = simulated
        phase = .starting

        if simulated {
            startSimulation()
            return
        }

        guard HKHealthStore.isHealthDataAvailable() else {
            fail("Santé indisponible sur cet appareil")
            phase = .idle
            return
        }

        do {
            try await store.requestAuthorization(toShare: [HKObjectType.workoutType()], read: HealthTypes.read)
            if store.authorizationStatus(for: HKObjectType.workoutType()) == .sharingDenied {
                fail("Autorise Triflow dans Santé › Accès aux données")
                phase = .idle
                return
            }

            await loadRestingReference()

            let config = HKWorkoutConfiguration()
            config.activityType = .other
            config.locationType = .indoor

            let session = try HKWorkoutSession(healthStore: store, configuration: config)
            let builder = session.associatedWorkoutBuilder()
            builder.dataSource = HKLiveWorkoutDataSource(healthStore: store, workoutConfiguration: config)
            session.delegate = self
            builder.delegate = self
            self.session = session
            self.builder = builder

            let startDate = Date()
            session.startActivity(with: startDate)
            try await builder.beginCollection(at: startDate)
            phase = .running
        } catch {
            fail("Démarrage impossible : \(error.localizedDescription)")
            session?.end()
            cleanup()
        }
    }

    func stop() {
        guard phase == .running || phase == .starting else { return }
        sender.cancel()
        if isSimulated {
            simTimer?.invalidate()
            simTimer = nil
            phase = .idle
            return
        }
        guard let session else { cleanup(); return }
        phase = .stopping
        session.end() // la suite dans didChangeTo .ended
    }

    private func finish(at date: Date) async {
        if let builder {
            try? await builder.endCollection(at: date)
            // On n'enregistre pas de séance dans Santé : seule la mesure en direct nous intéresse
            builder.discardWorkout()
        }
        cleanup()
    }

    private func cleanup() {
        session = nil
        builder = nil
        phase = .idle
    }

    // MARK: Réception et envoi

    fileprivate func receive(bpm value: Double, sampleDate date: Date) {
        guard phase == .running || phase == .starting else { return }
        bpm = value
        sampleDate = date
        receivedAt = Date()
        recent.append(value)
        if recent.count > 60 { recent.removeFirst(recent.count - 60) }

        guard !isSimulated else { return } // jamais de valeur inventée côté serveur
        guard date != lastQueuedSampleDate else { return }
        lastQueuedSampleDate = date
        sender.submit(IngestPayload(type: "HeartRate", value: value.rounded(), unit: "bpm", sampleDate: date))
    }

    private func handle(_ result: Result<Transport.Route, Error>, for payload: IngestPayload) {
        switch result {
        case .success(let route):
            lastSentAt = Date()
            lastSentValue = payload.value
            lastRoute = route
            sentCount += 1
        case .failure(let error):
            fail(error.localizedDescription)
        }
    }

    fileprivate func fail(_ message: String) {
        lastError = message
        lastErrorAt = Date()
    }

    /// Dernière FC au repos dans Santé (30 derniers jours). Absente → pas d'écart affiché, jamais de valeur inventée.
    private func loadRestingReference() async {
        let since = Date().addingTimeInterval(-30 * 86_400)
        let query = HKSampleQueryDescriptor(
            predicates: [.quantitySample(type: HKQuantityType(.restingHeartRate),
                                         predicate: HKQuery.predicateForSamples(withStart: since, end: nil))],
            sortDescriptors: [SortDescriptor(\.endDate, order: .reverse)],
            limit: 1
        )
        guard let s = try? await query.result(for: store).first else { restingRef = nil; return }
        restingRef = (s.quantity.doubleValue(for: HKUnit.count().unitDivided(by: .minute())), s.endDate)
    }

    // MARK: Mode simulé (UI seulement)

    private func startSimulation() {
        phase = .running
        simTick = 0
        simTimer = Timer.scheduledTimer(withTimeInterval: 1, repeats: true) { [weak self] _ in
            Task { @MainActor in
                guard let self else { return }
                self.simTick += 1
                let v = 72 + 8 * sin(self.simTick / 10) + Double.random(in: -2...2)
                self.receive(bpm: v.rounded(), sampleDate: Date())
            }
        }
    }
}

// MARK: - Délégués HealthKit (appelés hors du thread principal)

extension LiveHeartRate: HKWorkoutSessionDelegate, HKLiveWorkoutBuilderDelegate {
    nonisolated func workoutSession(_ workoutSession: HKWorkoutSession,
                                    didChangeTo toState: HKWorkoutSessionState,
                                    from fromState: HKWorkoutSessionState,
                                    date: Date) {
        guard toState == .ended else { return }
        Task { @MainActor in await self.finish(at: date) }
    }

    nonisolated func workoutSession(_ workoutSession: HKWorkoutSession, didFailWithError error: Error) {
        let message = error.localizedDescription
        Task { @MainActor in
            self.fail("Séance interrompue : \(message)")
            self.stop()
        }
    }

    nonisolated func workoutBuilderDidCollectEvent(_ workoutBuilder: HKLiveWorkoutBuilder) {}

    nonisolated func workoutBuilder(_ workoutBuilder: HKLiveWorkoutBuilder,
                                    didCollectDataOf collectedTypes: Set<HKSampleType>) {
        let hr = HKQuantityType(.heartRate)
        guard collectedTypes.contains(hr),
              let stats = workoutBuilder.statistics(for: hr),
              let quantity = stats.mostRecentQuantity(),
              let interval = stats.mostRecentQuantityDateInterval() else { return }
        let value = quantity.doubleValue(for: HKUnit.count().unitDivided(by: .minute()))
        let date = interval.end
        Task { @MainActor in self.receive(bpm: value, sampleDate: date) }
    }
}
