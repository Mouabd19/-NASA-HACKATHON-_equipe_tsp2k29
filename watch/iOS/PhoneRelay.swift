import Foundation
import WatchConnectivity

/// Côté iPhone : envoie l'adresse du Mac à la montre, et relaie vers le Mac
/// les requêtes que la montre n'arrive pas à faire elle-même.
@MainActor
final class PhoneRelay: NSObject, ObservableObject {
    static let shared = PhoneRelay()

    @Published private(set) var watchState = "Connexion à la montre"
    @Published private(set) var relayed = 0
    @Published private(set) var lastRelayAt: Date?
    @Published private(set) var lastError: String?
    @Published private(set) var lastErrorAt: Date?

    func start() {
        guard WCSession.isSupported() else {
            watchState = "WatchConnectivity indisponible"
            return
        }
        WCSession.default.delegate = self
        WCSession.default.activate()
    }

    func pushServerURL(_ url: String) throws {
        guard WCSession.isSupported(), WCSession.default.activationState == .activated else {
            throw APIError.network("Session montre pas encore active")
        }
        guard WCSession.default.isPaired else { throw APIError.network("Aucune montre appairée") }
        guard WCSession.default.isWatchAppInstalled else { throw APIError.network("App absente de la montre") }
        try WCSession.default.updateApplicationContext([RelayKeys.baseURL: url])
    }

    fileprivate func refreshState() {
        let s = WCSession.default
        if s.activationState != .activated { watchState = "Connexion à la montre" }
        else if !s.isPaired { watchState = "Aucune montre appairée" }
        else if !s.isWatchAppInstalled { watchState = "App absente de la montre" }
        else if s.isReachable { watchState = "App ouverte sur la montre" }
        else { watchState = "Installée, app fermée sur la montre" }
    }

    fileprivate func record(success: Bool, error: String?) {
        if success {
            relayed += 1
            lastRelayAt = Date()
        } else {
            lastError = error
            lastErrorAt = Date()
        }
    }
}

extension PhoneRelay: WCSessionDelegate {
    nonisolated func session(_ session: WCSession, activationDidCompleteWith activationState: WCSessionActivationState, error: Error?) {
        Task { @MainActor in self.refreshState() }
    }

    nonisolated func sessionDidBecomeInactive(_ session: WCSession) {}

    nonisolated func sessionDidDeactivate(_ session: WCSession) {
        session.activate() // changement de montre
    }

    nonisolated func sessionWatchStateDidChange(_ session: WCSession) {
        Task { @MainActor in self.refreshState() }
    }

    nonisolated func sessionReachabilityDidChange(_ session: WCSession) {
        Task { @MainActor in self.refreshState() }
    }

    nonisolated func session(_ session: WCSession, didReceiveMessage message: [String: Any], replyHandler: @escaping ([String: Any]) -> Void) {
        guard let call = HTTPCall(relayMessage: message) else {
            replyHandler([RelayKeys.error: "Message de la montre illisible"])
            return
        }
        Task {
            do {
                let result = try await ServerAPI.perform(call)
                replyHandler(result.relayReply)
                await MainActor.run { self.record(success: true, error: nil) }
            } catch {
                let why = error.localizedDescription
                replyHandler([RelayKeys.error: why])
                await MainActor.run { self.record(success: false, error: why) }
            }
        }
    }
}
