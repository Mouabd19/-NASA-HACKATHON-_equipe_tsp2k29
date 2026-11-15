import SwiftUI

/// Page 1 : état du jour. Niveau de triage (couleur = signal), consigne MAINTENANT, puis ENSUITE.
/// La provenance est dans la première ligne : un regard de 2 s suffit pour voir que c'est simulé.
struct TodayView: View {
    @ObservedObject var store: SummaryStore
    @ObservedObject var todo: TodoStore
    @State private var showWhy = false

    private var s: WatchSummary { store.summary }

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 8) {
                Text("Jour \(s.mission.day) · Haddad · \(store.origin.short)")
                    .font(.footnote)
                    .monospacedDigit()
                    .foregroundStyle(Palette.secondary)
                    .lineLimit(1)
                    .minimumScaleFactor(0.8)

                Button { showWhy = true } label: { level }
                    .buttonStyle(.plain)
                    .accessibilityHint("Affiche les raisons du niveau")

                Hairline()

                nowBlock

                VStack(alignment: .leading, spacing: 2) {
                    SectionLabel("Ensuite")
                    Text("Décide : \(s.next.who)")
                        .font(.footnote.weight(.semibold))
                        .monospacedDigit()
                        .foregroundStyle(Palette.text)
                    Text(s.next.text)
                        .font(.caption2)
                        .foregroundStyle(Palette.secondary)
                        .fixedSize(horizontal: false, vertical: true)
                }

                OriginFooter(origin: store.origin,
                             extra: s.checkin.source == "manual" ? "Check-in saisi" : "Check-in simulé",
                             stale: store.isStale)
            }
            .frame(maxWidth: .infinity, alignment: .leading)
        }
        .navigationTitle("Aujourd'hui")
        .onAppear { if DemoMode.page == "why" { showWhy = true } } // capture du « Pourquoi ? »
        .sheet(isPresented: $showWhy) {
            NavigationStack { ReasonsView(summary: s, origin: store.origin, stale: store.isStale) }
        }
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
            HStack(spacing: 3) {
                Text("Pourquoi ?")
                Image(systemName: "chevron.right").font(.caption2)
            }
            .font(.footnote.weight(.semibold))
            .foregroundStyle(Palette.text)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .contentShape(Rectangle())
        .accessibilityElement(children: .combine)
    }

    /// MAINTENANT : la prochaine tâche de la to-do (urgence médicale d'abord, puis l'heure),
    /// avec la consigne du jour en dessous. Toutes faites → on le dit, avec la consigne.
    private var nowBlock: some View {
        let (head, rest) = split(s.now.text)
        let task = todo.nextTask(level: s.triage.level)
        let title = task?.title ?? (todo.items.isEmpty ? head : "To-do du jour terminée")
        return VStack(alignment: .leading, spacing: 2) {
            HStack(spacing: 4) {
                SectionLabel("Maintenant")
                if let t = task?.time {
                    Text("· \(t)").font(.caption2).monospacedDigit().foregroundStyle(Palette.secondary)
                }
                if task?.isUrgent == true {
                    Text("· Priorité 1").font(.caption2.weight(.semibold)).foregroundStyle(Palette.red)
                }
            }
            Text(title)
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
        .accessibilityElement(children: .combine)
    }

    private var alertCount: String {
        let n = s.alerts.count
        if n == 0 { return "Aucune zone en alerte" }
        return n == 1 ? "1 zone à surveiller" : "\(n) zones à surveiller"
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

/// « Pourquoi ? » : les raisons du niveau du jour, comme le « Pourquoi ? » de la page web.
struct ReasonsView: View {
    let summary: WatchSummary
    let origin: DataOrigin
    var stale = false

    var body: some View {
        List {
            HStack(spacing: 6) {
                StatusDot(color: Palette.status(summary.triage.color), size: 10)
                Text(summary.triage.label).font(.footnote.weight(.semibold))
            }
            .listRowBackground(Color.clear)
            if summary.triage.reasons.isEmpty {
                Text("Aucune raison fournie par le Mac.")
                    .font(.footnote)
                    .foregroundStyle(Palette.secondary)
            }
            ForEach(Array(summary.triage.reasons.enumerated()), id: \.offset) { _, raw in
                let r = Reason(raw, alerts: summary.alerts)
                VStack(alignment: .leading, spacing: 2) {
                    Text(r.text)
                        .font(.footnote)
                        .foregroundStyle(Palette.text)
                        .fixedSize(horizontal: false, vertical: true)
                    if let rule = r.rule {
                        Text(ruleLabel(rule))
                            .font(.caption2)
                            .foregroundStyle(Palette.secondary)
                    }
                }
                .padding(.vertical, 2)
            }
            OriginFooter(origin: origin,
                         extra: summary.checkin.source == "manual" ? "Check-in saisi" : "Check-in simulé",
                         stale: stale)
                .listRowBackground(Color.clear)
        }
        .navigationTitle("Pourquoi ?")
    }
}

/// « HANCHE — PERTE OSSEUSE ESTIMÉE [V1 4027] » → texte lisible + règle.
/// Le texte reprend le titre de l'alerte correspondante (déjà en casse de phrase), sinon une casse de phrase simple.
struct Reason {
    let text: String
    let rule: String?

    init(_ raw: String, alerts: [WatchSummary.AlertZone]) {
        var main = raw.trimmingCharacters(in: .whitespaces)
        var rule: String?
        if main.hasSuffix("]"), let open = main.lastIndex(of: "[") {
            rule = String(main[main.index(after: open)..<main.index(before: main.endIndex)])
            main = String(main[..<open]).trimmingCharacters(in: .whitespaces)
        }
        self.rule = rule
        if let a = alerts.first(where: { $0.title.uppercased() == main.uppercased() }) {
            text = a.title
        } else if main == main.uppercased() {
            let low = main.lowercased()
            text = low.prefix(1).uppercased() + low.dropFirst()
        } else {
            text = main
        }
    }
}
