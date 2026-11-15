import Foundation

/// Envoi direct montre → Mac en URLSession ; si le Mac est injoignable, repli via l'iPhone.
enum Transport {
    enum Route: Equatable {
        case direct
        case phone

        var label: String { self == .direct ? "depuis la montre" : "via l'iPhone" }
    }

    static func perform(_ call: HTTPCall) async throws -> (HTTPResult, Route) {
        do {
            return (try await ServerAPI.perform(call), .direct)
        } catch APIError.unreachable(let why) {
            guard PhoneLink.shared.isReachable else { throw APIError.unreachable(why) }
            do {
                return (try await PhoneLink.shared.relay(call), .phone)
            } catch {
                throw APIError.network("Mac injoignable (\(why)), iPhone aussi : \(error.localizedDescription)")
            }
        }
    }

    static func health() async throws -> (HealthInfo, Route) {
        let (r, route) = try await perform(try ServerAPI.healthCall(base: AppKeys.currentServerURL))
        return (try ServerAPI.parseHealth(r), route)
    }

    static func ingest(_ payload: IngestPayload) async throws -> Route {
        let call = try ServerAPI.ingestCall(base: AppKeys.currentServerURL, payload: payload)
        let (r, route) = try await perform(call)
        try ServerAPI.checkOK(r)
        return route
    }
}

/// Au plus un envoi toutes les `minInterval` secondes ; si plusieurs valeurs arrivent
/// entre deux envois, seule la plus récente part.
@MainActor
final class ThrottledSender {
    private let minInterval: TimeInterval
    private let onResult: (IngestPayload, Result<Transport.Route, Error>) -> Void
    private var pending: IngestPayload?
    private var inFlight = false
    private var lastAttempt = Date.distantPast
    private var wakeScheduled = false

    init(minInterval: TimeInterval, onResult: @escaping (IngestPayload, Result<Transport.Route, Error>) -> Void) {
        self.minInterval = minInterval
        self.onResult = onResult
    }

    func submit(_ payload: IngestPayload) {
        pending = payload
        pump()
    }

    func cancel() {
        pending = nil
    }

    private func pump() {
        guard !inFlight, let next = pending else { return }
        let wait = minInterval - Date().timeIntervalSince(lastAttempt)
        if wait > 0 {
            guard !wakeScheduled else { return }
            wakeScheduled = true
            Task { [weak self] in
                try? await Task.sleep(nanoseconds: UInt64(wait * 1_000_000_000))
                self?.wakeScheduled = false
                self?.pump()
            }
            return
        }
        pending = nil
        inFlight = true
        lastAttempt = Date()
        Task { [weak self] in
            let result: Result<Transport.Route, Error>
            do {
                result = .success(try await Transport.ingest(next))
            } catch {
                result = .failure(error)
            }
            guard let self else { return }
            self.inFlight = false
            self.onResult(next, result)
            self.pump()
        }
    }
}
