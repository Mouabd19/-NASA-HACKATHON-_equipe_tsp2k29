import SwiftUI

struct PulseView: View {
    @ObservedObject var heart: LiveHeartRate
    /// FC au repos de la persona (simulée) : référence affichée seulement en mode simulé
    var personaResting: WatchSummary.Metric?
    @AppStorage(AppKeys.simulated) private var simulatedSetting = false
    @AppStorage(AppKeys.serverURL) private var serverURL = ""

    var body: some View {
        TimelineView(.periodic(from: .now, by: 1)) { context in
            let live = heart.isLive(at: context.date)
            ScrollView {
                VStack(alignment: .leading, spacing: 6) {
                    if heart.isSimulated || (heart.phase == .idle && simulatedSetting) {
                        Text("Simulé · non envoyé au Mac")
                            .font(.footnote.weight(.semibold))
                            .foregroundStyle(Palette.amber)
                            .fixedSize(horizontal: false, vertical: true)
                    }

                    // simulé : le bandeau ambre ci-dessus suffit, pas de seconde mention « Simulé »
                    if !(live && heart.isSimulated) { statusRow(live: live) }

                    HStack(alignment: .firstTextBaseline, spacing: 6) {
                        Text(heart.bpm.map { String(Int($0.rounded())) } ?? "--")
                            .font(.system(size: 56, weight: .semibold))
                            .monospacedDigit()
                            .foregroundStyle(valueColor(live: live))
                            .contentTransition(.numericText())
                            .animation(.easeOut(duration: 0.2), value: heart.bpm)
                        VStack(alignment: .leading, spacing: 2) {
                            HeartBeat(bpm: live ? heart.bpm : nil, color: valueColor(live: live))
                            Text("bpm")
                                .font(.footnote)
                                .foregroundStyle(Palette.secondary)
                        }
                    }

                    deltaLine(live: live)

                    Sparkline(values: heart.recent, color: live ? valueColor(live: live) : Palette.gray)
                        .frame(height: 24)
                        .accessibilityHidden(true)

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
            if live { return ("En direct", Palette.green) }
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
            StatusDot(color: color)
            Text(text).font(.footnote).monospacedDigit()
                .foregroundStyle(color == Palette.gray ? Palette.secondary : color)
        }
    }

    /// Blanc pour un pouls réel et frais. Simulé : gris clair, pour ne pas le lire comme une alerte
    /// (l'ambre est réservé au bandeau « SIMULÉ » et aux statuts). Ancien : gris.
    private func valueColor(live: Bool) -> Color {
        guard live else { return Palette.gray }
        return heart.isSimulated ? Palette.secondary : Palette.text
    }

    /// Écart à la FC de repos : celle du porteur (Santé) en réel, celle de la persona en simulé.
    /// Pas de couleur : un pouls plus haut qu'au repos est normal pendant un effort, ce n'est pas un signal.
    @ViewBuilder
    private func deltaLine(live: Bool) -> some View {
        let ref: (Double, String)? = {
            if heart.isSimulated || (heart.phase == .idle && simulatedSetting) {
                guard let v = personaResting?.value else { return nil }
                return (v, "repos de Haddad, simulé")
            }
            guard let r = heart.restingRef else { return nil }
            return (r.value, "ton repos (Santé)")
        }()
        if let (refValue, label) = ref {
            if let bpm = heart.bpm, live {
                let d = Int((bpm - refValue).rounded())
                Text("\(d >= 0 ? "+" : "−")\(abs(d)) vs \(Int(refValue.rounded())) bpm, \(label)")
                    .font(.footnote).monospacedDigit()
                    .foregroundStyle(Palette.secondary)
            } else {
                Text("Référence : \(Int(refValue.rounded())) bpm, \(label)")
                    .font(.footnote).monospacedDigit()
                    .foregroundStyle(Palette.secondary)
            }
        } else if heart.phase == .running && !heart.isSimulated {
            Text("Pas de FC au repos dans Santé : écart inconnu")
                .font(.footnote)
                .foregroundStyle(Palette.secondary)
        }
    }

    @ViewBuilder
    private var sendLine: some View {
        if serverURL.isEmpty && !heart.isSimulated {
            Text("Règle l'adresse du Mac dans Réglages")
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

/// Petit cœur qui bat au rythme mesuré, seulement quand la mesure est fraîche.
/// Immobile si « Réduire les animations » est activé ou sans mesure.
struct HeartBeat: View {
    let bpm: Double?
    let color: Color
    @Environment(\.accessibilityReduceMotion) private var reduceMotion

    var body: some View {
        if let bpm, bpm > 20, !reduceMotion {
            TimelineView(.animation(minimumInterval: 1.0 / 30)) { ctx in
                let period = 60 / bpm
                let t = ctx.date.timeIntervalSinceReferenceDate.truncatingRemainder(dividingBy: period)
                // impulsion brève au début de chaque battement, puis repos
                let k = exp(-pow(t / 0.09, 2))
                glyph.scaleEffect(1 + 0.14 * k)
            }
        } else {
            glyph
        }
    }

    private var glyph: some View {
        Image(systemName: "heart.fill")
            .font(.system(size: 13, weight: .semibold))
            .foregroundStyle(color)
            .accessibilityHidden(true)
    }
}
