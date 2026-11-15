import SwiftUI

@main
struct SOLZeroWatchApp: App {
    @StateObject private var heart = LiveHeartRate()
    @StateObject private var summary = SummaryStore()
    @StateObject private var todo = TodoStore()

    init() {
        PhoneLink.shared.start()
    }

    var body: some Scene {
        WindowGroup {
            ContentView(heart: heart, summary: summary, todo: todo)
        }
    }
}

/// Pages, dans l'ordre de la démo (Couronne vers le bas) :
/// état du jour → pouls réel → corps → to-do → trajet → envoi santé → réglages.
enum Page: String, CaseIterable {
    case today, pulse, body, todo, trip, health, settings
}

struct ContentView: View {
    @ObservedObject var heart: LiveHeartRate
    @ObservedObject var summary: SummaryStore
    @ObservedObject var todo: TodoStore
    @Environment(\.scenePhase) private var scenePhase
    @Environment(\.accessibilityReduceMotion) private var reduceMotion
    @AppStorage(AppKeys.serverURL) private var serverURL = ""
    @State private var page: Page = DemoMode.page.flatMap(Page.init(rawValue:)) ?? .today

    var body: some View {
        NavigationStack {
            TabView(selection: $page) {
                TodayView(store: summary).tag(Page.today)
                PulseView(heart: heart, personaResting: summary.summary.metric("fc_repos")).tag(Page.pulse)
                BodyView(store: summary).tag(Page.body)
                TodoView(todo: todo, level: summary.summary.triage.level).tag(Page.todo)
                TripView(store: summary).tag(Page.trip)
                SnapshotView().tag(Page.health)
                SettingsView().tag(Page.settings)
            }
            .tabViewStyle(.verticalPage)
            .animation(reduceMotion ? nil : .easeOut(duration: 0.2), value: page)
        }
        .onChange(of: serverURL) { _, _ in
            Task { await summary.refresh(); await todo.refresh() }
        }
        // Rafraîchit tant que l'app est au premier plan : résumé toutes les 30 s, to-do toutes les 5 s
        .task(id: scenePhase) {
            guard scenePhase == .active else { return }
            if DemoMode.isOn && heart.phase == .idle {
                await heart.start(simulated: true) // mode démo : pouls simulé, jamais envoyé
            }
            var tick = 0
            while !Task.isCancelled {
                if tick % 6 == 0 { await summary.refresh() }
                await todo.refresh()
                tick += 1
                try? await Task.sleep(nanoseconds: 5_000_000_000)
            }
        }
    }
}
