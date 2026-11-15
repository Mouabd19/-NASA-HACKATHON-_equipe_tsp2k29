import SwiftUI

/// Page 1 : état du jour. Niveau de triage (couleur = signal), consigne MAINTENANT, puis ENSUITE.
struct TodayView: View {
    @ObservedObject var store: SummaryStore

    private var s: WatchSummary { store.summary }

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 8) {
                Text("Jour \(s.mission.day) · Haddad")
                    .font(.footnote)
                    .monospacedDigit()
                    .foregroundStyle(Palette.secondary)

                level

                Hairline()

                VStack(alignment: .leading, spacing: 2) {
                    SectionLabel("Maintenant")
                    let (head, rest) = split(s.now.text)
                    Text(head)
                        .font(.headline)
                        .foregroundStyle(Palette.text)
                        .fixedSize(horizontal: false, vertical: true)
                    if let rest {
                        Text(rest)
                            .font(.footnote)
                            .foregroundStyle(Palette.secondary)
                            .fixedSize(horizontal: false, vertical: true)
                    }
                }

                VStack(alignment: .leading, spacing: 2) {
                    SectionLabel("Ensuite")
                    Text(nextLine)
                        .font(.footnote.weight(.semibold))
                        .monospacedDigit()
                        .foregroundStyle(Palette.text)
                    Text(s.next.text)
                        .font(.caption2)
                        .foregroundStyle(Palette.secondary)
                        .fixedSize(horizontal: false, vertical: true)
                }

                OriginFooter(origin: store.origin,
                             extra: s.checkin.source == "manual" ? "Check-in saisi" : "Check-in simulé")
            }
            .frame(maxWidth: .infinity, alignment: .leading)
        }
        .navigationTitle("Aujourd'hui")
    }

    private var level: some View {
        let color = Palette.status(s.triage.color)
        return VStack(alignment: .leading, spacing: 2) {
            HStack(spacing: 8) {
                StatusDot(color: color, size: 12)
                Text(s.triage.label)
                    .font(.title3.weight(.semibold))
                    .foregroundStyle(s.triage.color == "grey" ? Palette.secondary : color)
                    .lineLimit(2)
                    .minimumScaleFactor(0.8)
            }
            Text(alertCount)
                .font(.footnote)
                .monospacedDigit()
                .foregroundStyle(Palette.secondary)
        }
        .accessibilityElement(children: .combine)
    }

    private var alertCount: String {
        let n = s.alerts.count
        if n == 0 { return "Aucune zone en alerte" }
        return n == 1 ? "1 zone à surveiller" : "\(n) zones à surveiller"
    }

    private var nextLine: String {
        "Décide : \(s.next.who)"
    }

    /// « Appliquer la to-do du jour : contre-mesures… » → titre court + suite
    private func split(_ text: String) -> (String, String?) {
        guard let r = text.range(of: " : ") else { return (text, nil) }
        let head = String(text[..<r.lowerBound])
        var rest = String(text[r.upperBound...])
        rest = rest.prefix(1).uppercased() + rest.dropFirst()
        return (head, rest)
    }
}
