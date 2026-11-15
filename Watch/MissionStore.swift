import Foundation
import SwiftUI

// MARK: - Contrat GET /api/watch/summary (server/watchSummary.ts, branche night/watch-api)

struct WatchSummary: Codable, Equatable {
    struct Mission: Codable, Equatable {
        let day: Int
        let totalDays: Int
        let sol0Day: Int
        let daysToSol0: Int
        let date: String
        let phase: String
        let delayMin: Double?
        let delayTag: String
        let conjunction: Bool
    }
    struct Triage: Codable, Equatable {
        let level: String
        let label: String
        let color: String
        let reasons: [String]
    }
    struct Now: Codable, Equatable { let text: String }
    struct Next: Codable, Equatable {
        let decideur: String
        let who: String
        let text: String
        let reponseMin: Int?
    }
    struct AlertZone: Codable, Equatable, Identifiable {
        let organId: String
        let name: String
        let level: String
        let color: String
        let title: String
        let finding: String
        let rule: String
        let zone: String
        var id: String { organId }
    }
    struct TodoCount: Codable, Equatable {
        let total: Int
        let done: Int
    }
    struct Metric: Codable, Equatable, Identifiable {
        let key: String
        let label: String
        let value: Double?
        let unit: String
        let color: String
        let tag: String
        let provenance: String
        var id: String { key }
    }
    struct Checkin: Codable, Equatable { let source: String }

    let version: Int
    let mission: Mission
    let checkin: Checkin
    let triage: Triage
    let now: Now
    let next: Next
    let alerts: [AlertZone]
    let todo: TodoCount
    let metrics: [Metric]

    func metric(_ key: String) -> Metric? { metrics.first { $0.key == key } }
}

struct WatchTodo: Codable, Equatable, Identifiable {
    let id: String
    let kind: String
    let title: String
    let detail: String
    let time: String?
    var done: Bool
    let priority: Int

    var isUrgent: Bool { kind == "medical" && priority == 1 }
    /// Charge lourde : suspendue si le niveau du jour est ORANGE ou ROUGE (même règle que la page web)
    /// Même test que la page web (TodoList.isSuspended) : « heavy load » depuis la traduction du site, « charge lourde » avant
    var isHeavy: Bool {
        let text = "\(title) \(detail)".lowercased()
        return kind == "exercice" && (text.contains("heavy load") || text.contains("charge lourde"))
    }
}

/// D'où viennent les données affichées. Le contenu est toujours celui de la persona (simulé) :
/// seule l'origine change (calculé par le Mac, ou instantané embarqué dans l'app).
enum DataOrigin: Equatable {
    case loading
    case mac(at: Date)
    case embedded(reason: String)

    var label: String {
        switch self {
        case .loading: return "Chargement"
        case .mac(let at): return "Simulé · Mac à \(at.hm)"
        case .embedded: return "Simulé · instantané embarqué"
        }
    }

    /// Même chose, quand le Mac ne répond plus : on montre l'heure de la dernière réponse, pas une synchro en cours
    func label(stale: Bool) -> String {
        if stale, case .mac(let at) = self { return "Simulé · dernière réponse du Mac à \(at.hm)" }
        return label
    }

    /// Mot court pour la première ligne d'une page : la provenance se voit sans faire défiler
    var short: String {
        switch self {
        case .loading: return "Chargement"
        case .mac, .embedded: return "Simulé"
        }
    }
}

enum DemoMode {
    /// `-SZDemo YES` au lancement : aucune requête au Mac, instantané embarqué, pouls simulé lancé tout seul
    static var isOn: Bool { UserDefaults.standard.bool(forKey: "SZDemo") }
    /// `-SZPage today|why|pulse|body|todo|trip|health|settings` : page affichée au lancement (captures) ; `why` ouvre le « Pourquoi ? »
    static var page: String? { UserDefaults.standard.string(forKey: "SZPage") }
}

// MARK: - Résumé du jour

@MainActor
final class SummaryStore: ObservableObject {
    @Published private(set) var summary: WatchSummary
    @Published private(set) var origin: DataOrigin = .loading
    @Published private(set) var lastError: String?

    /// Le Mac a répondu une fois, mais la dernière requête a échoué
    var isStale: Bool { lastError != nil }

    private var refreshing = false

    init() {
        summary = Self.embedded
        origin = DemoMode.isOn ? .embedded(reason: "mode démo") : .loading
    }

    static let embedded: WatchSummary = {
        // Le JSON embarqué est testé à la compilation de l'endpoint : un échec ici serait une erreur de build
        try! JSONDecoder().decode(WatchSummary.self, from: Data(EmbeddedSnapshot.summaryJSON.utf8))
    }()

    func refresh() async {
        guard !refreshing else { return }
        guard !DemoMode.isOn else { origin = .embedded(reason: "mode démo"); return }
        guard !AppKeys.currentServerURL.isEmpty else {
            origin = .embedded(reason: "adresse du Mac non réglée")
            return
        }
        refreshing = true
        defer { refreshing = false }
        do {
            let (r, _) = try await Transport.perform(try ServerAPI.summaryCall(base: AppKeys.currentServerURL))
            guard (200..<300).contains(r.status) else { throw APIError.http(r.status) }
            let s = try JSONDecoder().decode(WatchSummary.self, from: r.data)
            summary = s
            origin = .mac(at: Date())
            lastError = nil
        } catch {
            // Mac absent ou endpoint pas encore déployé : on garde la dernière réponse si elle existe
            lastError = error.localizedDescription
            if case .mac = origin { return }
            summary = Self.embedded
            origin = .embedded(reason: error.localizedDescription)
        }
    }
}

// MARK: - To-do du jour

@MainActor
final class TodoStore: ObservableObject {
    @Published private(set) var items: [WatchTodo] = []
    @Published private(set) var synced = false
    @Published private(set) var lastError: String?
    @Published private(set) var busy: Set<String> = []
    /// La dernière requête n'a pas abouti (Mac absent) : on espace les essais
    @Published private(set) var unreachable = false

    private var localDone: Set<String> = []

    init() {
        items = Self.embedded
    }

    static let embedded: [WatchTodo] = {
        (try? JSONDecoder().decode([WatchTodo].self, from: Data(EmbeddedSnapshot.todoJSON.utf8))) ?? []
    }()

    var doneCount: Int { items.filter(\.done).count }

    /// Prochaine tâche à faire : la liste est déjà triée (urgence médicale d'abord, puis l'heure).
    /// La charge lourde suspendue (niveau ORANGE ou ROUGE) est sautée.
    func nextTask(level: String) -> WatchTodo? {
        let suspend = level == "ORANGE" || level == "ROUGE"
        return items.first { !$0.done && !(suspend && $0.isHeavy) }
    }

    func refresh() async {
        guard !DemoMode.isOn, !AppKeys.currentServerURL.isEmpty else { useEmbedded(); return }
        do {
            let (r, _) = try await Transport.perform(try ServerAPI.todoCall(base: AppKeys.currentServerURL))
            guard (200..<300).contains(r.status) else { throw APIError.http(r.status) }
            let list = try JSONDecoder().decode([WatchTodo].self, from: r.data)
            unreachable = false
            if list.isEmpty {
                // Le Mac répond mais la War Room n'a pas encore poussé la liste : rien à cocher côté serveur
                useEmbedded()
                lastError = "Ouvre le Plan du jour sur le Mac pour synchroniser"
                return
            }
            items = list.sorted(by: Self.order)
            synced = true
            lastError = nil
            unreachable = false
        } catch {
            lastError = error.localizedDescription
            unreachable = true
            if !synced { useEmbedded() }
        }
    }

    func toggle(_ item: WatchTodo) async {
        let target = !item.done
        guard synced else {
            // Liste embarquée : la coche reste sur la montre, rien n'est envoyé
            if target { localDone.insert(item.id) } else { localDone.remove(item.id) }
            set(item.id, done: target)
            return
        }
        busy.insert(item.id)
        defer { busy.remove(item.id) }
        set(item.id, done: target) // affichage immédiat, annulé si le Mac refuse
        do {
            let (r, _) = try await Transport.perform(
                try ServerAPI.todoMarkCall(base: AppKeys.currentServerURL, id: item.id, done: target))
            try ServerAPI.checkOK(r)
            lastError = nil
        } catch {
            set(item.id, done: !target)
            lastError = error.localizedDescription
        }
    }

    private func set(_ id: String, done: Bool) {
        guard let i = items.firstIndex(where: { $0.id == id }) else { return }
        items[i].done = done
    }

    private func useEmbedded() {
        synced = false
        items = Self.embedded.map { var t = $0; t.done = localDone.contains(t.id); return t }.sorted(by: Self.order)
    }

    /// Même ordre que planDay : l'urgence médicale en tête, puis l'heure
    private static func order(_ a: WatchTodo, _ b: WatchTodo) -> Bool {
        if a.isUrgent != b.isUrgent { return a.isUrgent }
        return (a.time ?? "99") < (b.time ?? "99")
    }
}
