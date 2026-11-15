import SwiftUI

@main
struct SOLZeroWatchApp: App {
    @StateObject private var heart = LiveHeartRate()

    init() {
        PhoneLink.shared.start()
    }

    var body: some Scene {
        WindowGroup {
            ContentView(heart: heart)
        }
    }
}

struct ContentView: View {
    @ObservedObject var heart: LiveHeartRate

    var body: some View {
        TabView {
            PulseView(heart: heart)
            SnapshotView()
            SettingsView()
        }
        .tabViewStyle(.verticalPage)
    }
}
