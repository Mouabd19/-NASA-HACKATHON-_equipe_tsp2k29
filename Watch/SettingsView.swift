import SwiftUI

struct SettingsView: View {
    @AppStorage(AppKeys.serverURL) private var serverURL = ""
    @AppStorage(AppKeys.simulated) private var simulated = false
    @State private var draft = ""
    @State private var test: ConnectionTest = .idle

    var body: some View {
        List {
            Section {
                TextField("http://IP:5173", text: $draft)
                    .textInputAutocapitalization(.never)
                    .autocorrectionDisabled()
                    .onSubmit(save)

                Button {
                    Task { await runTest() }
                } label: {
                    Text("Tester").frame(maxWidth: .infinity, minHeight: 44)
                }
                .disabled(test == .running)

                ConnectionTestRow(test: test)
            } header: {
                Text("Adresse du serveur")
            } footer: {
                Text("Plus simple : saisis-la dans l'app iPhone, elle arrive ici toute seule")
            }

            Section {
                Toggle("Pouls d'exemple", isOn: $simulated)
                    .tint(Palette.amber)
                    .frame(minHeight: 44)
            } footer: {
                Text("Pouls d'exemple pour l'écran, jamais envoyé. Pris en compte au prochain démarrage")
            }
        }
        .navigationTitle("Réglages")
        .onAppear { draft = serverURL }
        .onChange(of: serverURL) { _, new in draft = new }
    }

    private func save() {
        serverURL = ServerAddress.normalize(draft)
        draft = serverURL
    }

    private func runTest() async {
        save()
        test = .running
        do {
            let (info, route) = try await Transport.health()
            test = .ok(info, viaPhone: route == .phone, at: Date())
        } catch {
            test = .failed(error.localizedDescription)
        }
    }
}
