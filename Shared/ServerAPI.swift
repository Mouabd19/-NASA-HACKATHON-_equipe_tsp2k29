import Foundation

// MARK: - Réglages partagés (UserDefaults, lus aussi par @AppStorage)

enum AppKeys {
    static let serverURL = "serverURL"
    static let simulated = "simulatedMode"

    static var currentServerURL: String {
        UserDefaults.standard.string(forKey: serverURL) ?? ""
    }
}

enum ServerAddress {
    /// « 10.0.0.5:5173 » → « http://10.0.0.5:5173 » ; retire les espaces et le / final
    static func normalize(_ raw: String) -> String {
        var s = raw.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !s.isEmpty else { return "" }
        let lower = s.lowercased()
        if !lower.hasPrefix("http://") && !lower.hasPrefix("https://") { s = "http://" + s }
        while s.hasSuffix("/") { s.removeLast() }
        return s
    }

    static func url(base: String, path: String) throws -> URL {
        let b = normalize(base)
        guard !b.isEmpty else { throw APIError.noAddress }
        guard let url = URL(string: b + path), url.host != nil else { throw APIError.badAddress(b) }
        return url
    }
}

// MARK: - Contrat /ingest

struct IngestPayload: Codable, Equatable {
    let type: String
    let value: Double
    let unit: String
    /// Date réelle de l'échantillon HealthKit, jamais l'heure d'envoi
    let date: String

    init(type: String, value: Double, unit: String, sampleDate: Date) {
        self.type = type
        self.value = value
        self.unit = unit
        self.date = ISODate.string(sampleDate)
    }
}

enum ISODate {
    /// « 2026-11-14T19:29:10+01:00 »
    static func string(_ date: Date) -> String {
        let f = ISO8601DateFormatter()
        f.timeZone = .current
        f.formatOptions = [.withInternetDateTime]
        return f.string(from: date)
    }
}

struct HealthInfo: Equatable {
    let todo: Int
    let live: Int
}

// MARK: - Requêtes HTTP (transportables telles quelles vers l'iPhone)

struct HTTPCall {
    let url: URL
    let method: String
    let body: Data?

    var urlRequest: URLRequest {
        var r = URLRequest(url: url, cachePolicy: .reloadIgnoringLocalCacheData, timeoutInterval: 5)
        r.httpMethod = method
        if let body {
            r.httpBody = body
            r.setValue("application/json", forHTTPHeaderField: "Content-Type")
        }
        return r
    }
}

struct HTTPResult {
    let status: Int
    let data: Data
}

enum APIError: LocalizedError, Equatable {
    case noAddress
    case badAddress(String)
    /// Le Mac n'est pas joignable depuis cet appareil : déclenche le repli via l'iPhone
    case unreachable(String)
    case network(String)
    case server(String)
    case http(Int)
    case unreadable

    var errorDescription: String? {
        switch self {
        case .noAddress: return "Règle d'abord l'adresse du Mac"
        case .badAddress(let s): return "Adresse invalide : \(s)"
        case .unreachable(let why): return "Mac injoignable : \(why)"
        case .network(let why): return why
        case .server(let msg): return "Serveur : \(msg)"
        case .http(let code): return "Réponse HTTP \(code)"
        case .unreadable: return "Réponse illisible"
        }
    }

    static func from(_ e: URLError) -> APIError {
        switch e.code {
        case .timedOut: return .unreachable("délai dépassé")
        case .cannotConnectToHost: return .unreachable("connexion refusée, serveur lancé avec --host ?")
        case .cannotFindHost, .dnsLookupFailed: return .unreachable("adresse introuvable")
        case .notConnectedToInternet, .dataNotAllowed, .internationalRoamingOff: return .unreachable("pas de réseau")
        case .networkConnectionLost: return .unreachable("connexion perdue")
        case .appTransportSecurityRequiresSecureConnection: return .network("HTTP bloqué par ATS, voir README")
        default: return .network(e.localizedDescription)
        }
    }
}

enum ServerAPI {
    static let session: URLSession = {
        let c = URLSessionConfiguration.ephemeral
        c.timeoutIntervalForRequest = 5
        c.timeoutIntervalForResource = 10
        c.waitsForConnectivity = false
        return URLSession(configuration: c)
    }()

    /// Envoi direct, sans repli
    static func perform(_ call: HTTPCall) async throws -> HTTPResult {
        do {
            let (data, response) = try await session.data(for: call.urlRequest)
            return HTTPResult(status: (response as? HTTPURLResponse)?.statusCode ?? 0, data: data)
        } catch let e as URLError {
            throw APIError.from(e)
        }
    }

    // MARK: Construction des appels

    static func healthCall(base: String) throws -> HTTPCall {
        HTTPCall(url: try ServerAddress.url(base: base, path: "/api/health"), method: "GET", body: nil)
    }

    static func ingestCall(base: String, payload: IngestPayload) throws -> HTTPCall {
        HTTPCall(
            url: try ServerAddress.url(base: base, path: "/ingest"),
            method: "POST",
            body: try JSONEncoder().encode(payload)
        )
    }

    /// Résumé du jour pour la montre (lecture seule)
    static func summaryCall(base: String) throws -> HTTPCall {
        HTTPCall(url: try ServerAddress.url(base: base, path: "/api/watch/summary"), method: "GET", body: nil)
    }

    static func todoCall(base: String) throws -> HTTPCall {
        HTTPCall(url: try ServerAddress.url(base: base, path: "/api/todo"), method: "GET", body: nil)
    }

    /// Coche (`done`) ou décoche (`undo`) un item de la to-do
    static func todoMarkCall(base: String, id: String, done: Bool) throws -> HTTPCall {
        let safe = id.addingPercentEncoding(withAllowedCharacters: .urlPathAllowed.subtracting(CharacterSet(charactersIn: "/"))) ?? id
        return HTTPCall(url: try ServerAddress.url(base: base, path: "/api/todo/\(safe)/\(done ? "done" : "undo")"),
                        method: "POST", body: nil)
    }

    // MARK: Lecture des réponses

    /// Lit une réponse `{"ok":…}` ; lève `.server` si `ok` vaut false
    @discardableResult
    static func checkOK(_ r: HTTPResult) throws -> [String: Any] {
        if let obj = try? JSONSerialization.jsonObject(with: r.data) as? [String: Any],
           let ok = obj["ok"] as? Bool {
            if ok { return obj }
            throw APIError.server(obj["error"] as? String ?? "refus sans message")
        }
        if !(200..<300).contains(r.status) { throw APIError.http(r.status) }
        throw APIError.unreadable
    }

    static func parseHealth(_ r: HTTPResult) throws -> HealthInfo {
        let obj = try checkOK(r)
        return HealthInfo(todo: obj["todo"] as? Int ?? 0, live: obj["live"] as? Int ?? 0)
    }
}

// MARK: - Relais montre → iPhone (WatchConnectivity transporte des dictionnaires plist)

enum RelayKeys {
    static let url = "url"
    static let method = "method"
    static let body = "body"
    static let status = "status"
    static let data = "data"
    static let error = "error"
    static let baseURL = "baseURL"
}

extension HTTPCall {
    var relayMessage: [String: Any] {
        var m: [String: Any] = [RelayKeys.url: url.absoluteString, RelayKeys.method: method]
        if let body { m[RelayKeys.body] = body }
        return m
    }

    init?(relayMessage m: [String: Any]) {
        guard let s = m[RelayKeys.url] as? String, let url = URL(string: s),
              let method = m[RelayKeys.method] as? String else { return nil }
        self.init(url: url, method: method, body: m[RelayKeys.body] as? Data)
    }
}

extension HTTPResult {
    var relayReply: [String: Any] { [RelayKeys.status: status, RelayKeys.data: data] }

    init?(relayReply r: [String: Any]) {
        guard let status = r[RelayKeys.status] as? Int, let data = r[RelayKeys.data] as? Data else { return nil }
        self.init(status: status, data: data)
    }
}
