import SwiftUI

/// Page Trajet : où en est la mission, et combien de temps met un message pour la Terre.
struct TripView: View {
    @ObservedObject var store: SummaryStore

    private var m: WatchSummary.Mission { store.summary.mission }

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 8) {
                HStack(alignment: .firstTextBaseline, spacing: 4) {
                    Text("J\(m.day)")
                        .font(.system(size: 40, weight: .semibold))
                        .monospacedDigit()
                        .foregroundStyle(Palette.text)
                    Text("/ \(m.totalDays)")
                        .font(.footnote)
                        .monospacedDigit()
                        .foregroundStyle(Palette.secondary)
                }
                Text("\(m.phase) · \(store.origin.short)")
                    .font(.footnote)
                    .foregroundStyle(Palette.secondary)

                MissionTrack(day: m.day, sol0: m.sol0Day, total: m.totalDays)
                    .frame(height: 26)

                Text(m.daysToSol0 > 0 ? "Sol 0 dans \(m.daysToSol0) jours" : "Sur Mars depuis Sol 0")
                    .font(.footnote.weight(.semibold))
                    .monospacedDigit()
                    .foregroundStyle(Palette.text)

                Hairline()

                VStack(alignment: .leading, spacing: 2) {
                    SectionLabel("Délai radio vers la Terre")
                    if m.conjunction {
                        Text("Pas de lien")
                            .font(.title3.weight(.semibold))
                            .foregroundStyle(Palette.amber)
                        Text("Conjonction solaire : le CMO de bord décide")
                            .font(.caption2).foregroundStyle(Palette.secondary)
                    } else if let d = m.delayMin {
                        HStack(alignment: .firstTextBaseline, spacing: 4) {
                            Text(FR.num(d))
                                .font(.title2.weight(.semibold))
                                .monospacedDigit()
                                .foregroundStyle(Palette.text)
                            Text("min, aller simple")
                                .font(.footnote)
                                .foregroundStyle(Palette.secondary)
                        }
                        Text("Aller-retour \(FR.num(2 * d)) min · \(tagLabel(m.delayTag))")
                            .font(.caption2)
                            .monospacedDigit()
                            .foregroundStyle(Palette.secondary)
                    } else {
                        Text("Inconnu")
                            .font(.title3.weight(.semibold))
                            .foregroundStyle(Palette.gray)
                    }
                }

                OriginFooter(origin: store.origin, extra: "Calendrier de mission", stale: store.isStale)
            }
            .frame(maxWidth: .infinity, alignment: .leading)
        }
        .navigationTitle("Trajet")
    }

    private func tagLabel(_ tag: String) -> String {
        switch tag {
        case "Publié", "NASA": return "éphémérides JPL"
        default: return "estimation de l'équipe"
        }
    }
}

/// Frise J0 → fin : partie écoulée en blanc cassé, repère Sol 0, curseur du jour
struct MissionTrack: View {
    let day: Int
    let sol0: Int
    let total: Int

    var body: some View {
        GeometryReader { geo in
            let w = geo.size.width
            let x = { (d: Int) in w * CGFloat(min(max(d, 0), total)) / CGFloat(max(total, 1)) }
            ZStack(alignment: .topLeading) {
                Rectangle().fill(Palette.border).frame(width: w, height: 3).offset(y: 6)
                Rectangle().fill(Palette.text).frame(width: x(day), height: 3).offset(y: 6)
                // Sol 0
                Rectangle().fill(Palette.secondary).frame(width: 1, height: 11).offset(x: x(sol0), y: 2)
                Text("Sol 0")
                    .font(.system(size: 10))
                    .foregroundStyle(Palette.secondary)
                    .fixedSize()
                    .offset(x: x(sol0) - 12, y: 14)
                // aujourd'hui
                Circle().fill(Palette.text).frame(width: 9, height: 9).offset(x: x(day) - 4.5, y: 3)
            }
        }
        .accessibilityElement()
        .accessibilityLabel("Jour \(day) sur \(total), Sol 0 au jour \(sol0)")
    }
}
