import SwiftUI

struct PhoneHomeView: View {
    @AppStorage(AppKeys.serverURL) private var serverURL = ""
    @ObservedObject private var relay = PhoneRelay.shared
    @State private var draft = ""
    @State private var test: ConnectionTest = .idle
    @State private var pushNote: String?
    @State private var pushFailed = false
    @StateObject private var snapshot = HealthSnapshotModel { payload in
        let call = try ServerAPI.ingestCall(base: AppKeys.currentServerURL, payload: payload)
        try ServerAPI.checkOK(try await ServerAPI.perform(call))
        return "depuis l'iPhone"
    }

    var body: some View {
        NavigationStack {
            Form {
                Section {
                    TextField("http://IP:5173", text: $draft)
                        .keyboardType(.URL)
                        .textInputAutocapitalization(.never)
                        .autocorrectionDisabled()
                        .onSubmit(save)
                        .frame(minHeight: 44)

                    Button("Tester depuis l'iPhone") { Task { await runTest() } }
                        .frame(minHeight: 44)
                        .disabled(test == .running)
                    ConnectionTestRow(test: test)

                    Button("Envoyer à la montre", action: pushToWatch)
                        .frame(minHeight: 44)
                    if let pushNote {
                        Text(pushNote)
                            .font(.footnote)
                            .foregroundStyle(pushFailed ? Palette.red : Palette.secondary)
                    }
                } header: {
                    Text("Adresse du serveur")
                } footer: {
                    Text("Par exemple https://triflow-delta.vercel.app")
                }

                Section {
                    Button(snapshot.running ? "Envoi en cours" : "Envoyer mes données") {
                        save()
                        Task { await snapshot.run() }
                    }
                    .frame(minHeight: 44)
                    .disabled(snapshot.running)
                    if let error = snapshot.error {
                        Text(error).font(.footnote).foregroundStyle(Palette.red)
                    } else if let summary = snapshot.summary {
                        Text(summary).font(.footnote).monospacedDigit().foregroundStyle(Palette.secondary)
                    }
                    SnapshotRows(model: snapshot)
                } header: {
                    Text("Données santé")
                } footer: {
                    Text("Dernière valeur de chaque mesure dans Santé, avec sa vraie date. Une mesure absente n'est pas envoyée")
                }

                Section("Montre") {
                    LabeledContent("État", value: relay.watchState)
                }

                Section {
                    LabeledContent("Requêtes relayées") {
                        Text("\(relay.relayed)").monospacedDigit()
                    }
                    if let at = relay.lastRelayAt {
                        LabeledContent("Dernier relais") {
                            Text(at.clock).monospacedDigit()
                        }
                    }
                    if let err = relay.lastError, let at = relay.lastErrorAt {
                        Text("\(at.clock) · \(err)")
                            .font(.footnote)
                            .monospacedDigit()
                            .foregroundStyle(Palette.red)
                    }
                } header: {
                    Text("Relais montre → serveur")
                } footer: {
                    Text("Utilisé seulement quand la montre n'atteint pas le serveur elle-même")
                }
            }
            .navigationTitle("Triflow")
        }
        .onAppear { draft = serverURL }
    }

    private func save() {
        serverURL = ServerAddress.normalize(draft)
        draft = serverURL
    }

    private func runTest() async {
        save()
        test = .running
        do {
            let r = try await ServerAPI.perform(try ServerAPI.healthCall(base: serverURL))
            test = .ok(try ServerAPI.parseHealth(r), viaPhone: false, at: Date())
        } catch {
            test = .failed(error.localizedDescription)
        }
    }

    private func pushToWatch() {
        save()
        guard !serverURL.isEmpty else {
            pushFailed = true
            pushNote = "Saisis d'abord l'adresse"
            return
        }
        do {
            try relay.pushServerURL(serverURL)
            pushFailed = false
            pushNote = "Envoyée à \(Date().clock), visible à la prochaine ouverture de l'app montre"
        } catch {
            pushFailed = true
            pushNote = error.localizedDescription
        }
    }
}
