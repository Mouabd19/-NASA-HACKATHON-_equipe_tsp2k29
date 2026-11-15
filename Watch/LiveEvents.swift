import Foundation

/// Temps réel avec le Mac : GET /api/events (Server-Sent Events) reste ouvert et reçoit
/// « data: {"kind":"todo"|"checkin"|"live","v":n} » à chaque changement (coche, check-in, pouls).
/// Pas de WebSocket : watchOS interdit les connexions bas niveau hors apps audio ; une requête HTTP longue est permise.
/// Si le flux tombe (Mac absent, passage par l'iPhone), on réessaie ; la synchro périodique reste en secours.
@MainActor
final class LiveEvents: ObservableObject {
    /// Vrai tant que le flux est ouvert : la boucle de secours peut alors espacer ses requêtes
    @Published private(set) var connected = false

    private static let session: URLSession = {
        let c = URLSessionConfiguration.ephemeral
        c.timeoutIntervalForRequest = 40   // le serveur envoie un « ping » toutes les 15 s
        c.timeoutIntervalForResource = 24 * 3600
        c.waitsForConnectivity = false
        return URLSession(configuration: c)
    }()

    private struct Event: Decodable { let kind: String }

    /// Écoute jusqu'à l'annulation de la tâche. `onChange` reçoit « todo », « checkin », « live » ou « hello » (connexion).
    func run(base: String, onChange: @escaping @MainActor (String) async -> Void) async {
        while !Task.isCancelled {
            do {
                var req = URLRequest(url: try ServerAddress.url(base: base, path: "/api/events"))
                req.setValue("text/event-stream", forHTTPHeaderField: "Accept")
                let (bytes, response) = try await Self.session.bytes(for: req)
                guard (response as? HTTPURLResponse)?.statusCode == 200 else { throw URLError(.badServerResponse) }
                for try await line in bytes.lines {
                    guard line.hasPrefix("data:") else { continue }
                    connected = true
                    let json = line.dropFirst(5).trimmingCharacters(in: .whitespaces)
                    if let e = try? JSONDecoder().decode(Event.self, from: Data(json.utf8)) {
                        await onChange(e.kind)
                    }
                }
            } catch {
                // flux coupé : on retombe sur la synchro périodique et on réessaie
            }
            connected = false
            try? await Task.sleep(nanoseconds: 3_000_000_000)
        }
        connected = false
    }
}
