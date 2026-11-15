import SwiftUI

struct PulseView: View {
    @ObservedObject var heart: LiveHeartRate
    @AppStorage(AppKeys.simulated) private var simulatedSetting = false
    @AppStorage(AppKeys.serverURL) private var serverURL = ""

    var body: some View {
        TimelineView(.periodic(from: .now, by: 1)) { context in
            let live = heart.isLive(at: context.date)
            ScrollView {
                VStack(alignment: .leading, spacing: 6) {
                    if heart.isSimulated || (heart.phase == .idle && simulatedSetting) {
                        Text("SIMULÉ · rien n'est envoyé")
                            .font(.footnote.weight(.semibold))
                            .foregroundStyle(Palette.amber)
                    }

                    statusRow(live: live)

                    HStack(alignment: .firstTextBaseline, spacing: 4) {
                        Text(heart.bpm.map { String(Int($0.rounded())) } ?? "--")
                            .font(.system(size: 54, weight: .semibold))
                            .monospacedDigit()
                            .foregroundStyle(valueColor(live: live))
                        Text("bpm")
                            .font(.footnote)
                            .foregroundStyle(Palette.secondary)
                    }

                    sendLine
                    errorLine

                    Button {
                        Task {
                            if heart.phase == .idle {
                                await heart.start(simulated: simulatedSetting)
                            } else {
                                heart.stop()
                            }
                        }
                    } label: {
                        Text(buttonLabel).frame(maxWidth: .infinity, minHeight: 44)
                    }
                    .disabled(heart.phase == .starting || heart.phase == .stopping)
                    .padding(.top, 4)
                }
                .frame(maxWidth: .infinity, alignment: .leading)
            }
        }
        .navigationTitle("Pouls")
    }

    // MARK: Morceaux

    private func statusRow(live: Bool) -> some View {
        let (text, color): (String, Color) = {
            if live { return heart.isSimulated ? ("Simulé", Palette.amber) : ("En direct", Palette.green) }
            switch heart.phase {
            case .starting: return ("Démarrage", Palette.gray)
            case .running: return ("En attente du pouls", Palette.gray)
            case .stopping: return ("Arrêt", Palette.gray)
            case .idle:
                if let d = heart.sampleDate { return ("Arrêté · mesure de \(d.clock)", Palette.gray) }
                return ("Pas de mesure", Palette.gray)
            }
        }()
        return HStack(spacing: 6) {
            Circle().fill(color).frame(width: 8, height: 8)
            Text(text).font(.footnote).monospacedDigit()
                .foregroundStyle(color == Palette.gray ? Palette.secondary : color)
        }
    }

    private func valueColor(live: Bool) -> Color {
        guard live else { return Palette.gray }
        return heart.isSimulated ? Palette.amber : .white
    }

    @ViewBuilder
    private var sendLine: some View {
        if serverURL.isEmpty && !heart.isSimulated {
            Text("Règle l'adresse du Mac, page suivante")
                .font(.footnote).foregroundStyle(Palette.amber)
        } else if let at = heart.lastSentAt {
            let route = heart.lastRoute.map { " \($0.label)" } ?? ""
            Text("Envoyé à \(at.clock)\(route) · \(heart.sentCount)")
                .font(.footnote).monospacedDigit()
                .foregroundStyle(Palette.secondary)
        } else if !heart.isSimulated {
            Text("Rien envoyé pour l'instant")
                .font(.footnote).foregroundStyle(Palette.secondary)
        }
    }

    @ViewBuilder
    private var errorLine: some View {
        if let err = heart.lastError, let at = heart.lastErrorAt {
            Text("\(at.clock) · \(err)")
                .font(.footnote).monospacedDigit()
                .foregroundStyle(heart.errorIsCurrent ? Palette.red : Palette.gray)
                .lineLimit(4)
        }
    }

    private var buttonLabel: String {
        switch heart.phase {
        case .idle: return "Démarrer"
        case .starting: return "Démarrage…"
        case .running: return "Arrêter"
        case .stopping: return "Arrêt…"
        }
    }
}
