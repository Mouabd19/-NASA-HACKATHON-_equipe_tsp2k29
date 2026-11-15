import Foundation
import WatchConnectivity

/// Côté montre : reçoit l'adresse du Mac saisie sur l'iPhone, et relaie les requêtes
/// vers l'iPhone quand la montre n'atteint pas le Mac elle-même.
final class PhoneLink: NSObject, WCSessionDelegate {
    static let shared = PhoneLink()

    func start() {
        guard WCSession.isSupported() else { return }
        WCSession.default.delegate = self
        WCSession.default.activate()
    }

    var isReachable: Bool {
        WCSession.isSupported()
            && WCSession.default.activationState == .activated
            && WCSession.default.isReachable
    }

    func relay(_ call: HTTPCall) async throws -> HTTPResult {
        guard isReachable else { throw APIError.network("iPhone injoignable") }
        return try await withCheckedThrowingContinuation { cont in
            WCSession.default.sendMessage(call.relayMessage, replyHandler: { reply in
                if let result = HTTPResult(relayReply: reply) {
                    cont.resume(returning: result)
                } else {
                    let why = reply[RelayKeys.error] as? String ?? "réponse de l'iPhone illisible"
                    cont.resume(throwing: APIError.network(why))
                }
            }, errorHandler: { error in
                cont.resume(throwing: APIError.network(error.localizedDescription))
            })
        }
    }

    // MARK: WCSessionDelegate

    func session(_ session: WCSession, activationDidCompleteWith activationState: WCSessionActivationState, error: Error?) {
        apply(session.receivedApplicationContext)
    }

    func session(_ session: WCSession, didReceiveApplicationContext applicationContext: [String: Any]) {
        apply(applicationContext)
    }

    private func apply(_ context: [String: Any]) {
        guard let url = context[RelayKeys.baseURL] as? String, !url.isEmpty else { return }
        DispatchQueue.main.async {
            UserDefaults.standard.set(url, forKey: AppKeys.serverURL)
        }
    }
}
