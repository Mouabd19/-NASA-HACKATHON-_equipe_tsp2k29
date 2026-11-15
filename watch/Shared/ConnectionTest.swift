import SwiftUI

/// Résultat du bouton « Tester » (appel à /api/health)
enum ConnectionTest: Equatable {
    case idle
    case running
    case ok(HealthInfo, viaPhone: Bool, at: Date)
    case failed(String)

    var text: String {
        switch self {
        case .idle: return "Pas encore testé"
        case .running: return "Test en cours"
        case .ok(let h, let viaPhone, let at):
            let route = viaPhone ? " via l'iPhone" : ""
            return "Mac joint\(route) à \(at.clock) · \(h.todo) tâches · \(h.live) mesures"
        case .failed(let why): return why
        }
    }

    var color: Color {
        switch self {
        case .idle, .running: return Palette.gray
        case .ok(_, let viaPhone, _): return viaPhone ? Palette.amber : Palette.green
        case .failed: return Palette.red
        }
    }
}

struct ConnectionTestRow: View {
    let test: ConnectionTest

    var body: some View {
        HStack(alignment: .firstTextBaseline, spacing: 6) {
            Circle().fill(test.color).frame(width: 8, height: 8)
            Text(test.text)
                .font(.footnote)
                .monospacedDigit()
                .foregroundStyle(test == .idle || test == .running ? Palette.secondary : .white)
                .fixedSize(horizontal: false, vertical: true)
        }
    }
}
