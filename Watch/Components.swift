import SwiftUI

/// Pastille de statut : la couleur porte le signal, le mot porte le sens
struct StatusDot: View {
    let color: Color
    var size: CGFloat = 8

    var body: some View {
        Circle().fill(color).frame(width: size, height: size)
    }
}

/// Petit libellé de section (casse de phrase, pas de capitales espacées)
struct SectionLabel: View {
    let text: String

    init(_ text: String) { self.text = text }

    var body: some View {
        Text(text)
            .font(.caption2)
            .foregroundStyle(Palette.secondary)
    }
}

/// Provenance en pied de page : toujours visible sur la montre (pas de mode Détails ici)
struct OriginFooter: View {
    let origin: DataOrigin
    var extra: String?
    var stale = false

    var body: some View {
        VStack(alignment: .leading, spacing: 1) {
            Text(origin.label(stale: stale))
            if let extra { Text(extra) }
        }
        .font(.caption2)
        .monospacedDigit()
        .foregroundStyle(Palette.secondary)
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding(.top, 4)
    }
}

/// Trait horizontal de 1 pt
struct Hairline: View {
    var body: some View {
        Rectangle().fill(Palette.border).frame(height: 1)
    }
}

/// Tracé simple des dernières valeurs (ligne de 1,5 pt, sans remplissage)
struct Sparkline: View {
    let values: [Double]
    let color: Color

    var body: some View {
        GeometryReader { geo in
            if values.count >= 3, let lo = values.min(), let hi = values.max() {
                let span = max(hi - lo, 6) // 6 bpm minimum : évite d'amplifier le bruit
                let mid = (hi + lo) / 2
                Path { p in
                    for (i, v) in values.enumerated() {
                        let x = geo.size.width * CGFloat(i) / CGFloat(values.count - 1)
                        let y = geo.size.height * (0.5 - CGFloat((v - mid) / span))
                        if i == 0 { p.move(to: CGPoint(x: x, y: y)) } else { p.addLine(to: CGPoint(x: x, y: y)) }
                    }
                }
                .stroke(color, style: StrokeStyle(lineWidth: 1.5, lineCap: .round, lineJoin: .round))
            } else {
                Path { p in
                    p.move(to: CGPoint(x: 0, y: geo.size.height / 2))
                    p.addLine(to: CGPoint(x: geo.size.width, y: geo.size.height / 2))
                }
                .stroke(Palette.border, style: StrokeStyle(lineWidth: 1, dash: [2, 3]))
            }
        }
    }
}

/// Étiquette d'une règle : « V1 4027 » → « NASA-STD-3001 V1 4027 » ; tendance ; sinon hypothèse de l'équipe
func ruleLabel(_ rule: String) -> String {
    if rule.hasPrefix("V") { return "NASA-STD-3001 \(rule)" }
    if rule.uppercased().hasPrefix("TENDANCE") { return "Tendance 7 j" }
    return "Hypothèse de l'équipe"
}
