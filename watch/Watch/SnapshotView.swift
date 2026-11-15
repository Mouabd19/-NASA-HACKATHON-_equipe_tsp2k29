import SwiftUI

struct SnapshotView: View {
    @StateObject private var model = HealthSnapshotModel { payload in
        try await Transport.ingest(payload).label
    }

    var body: some View {
        List {
            Button {
                Task { await model.run() }
            } label: {
                Text(model.running ? "Envoi en cours" : "Envoyer mes données")
                    .frame(maxWidth: .infinity, minHeight: 44)
            }
            .disabled(model.running)

            if let error = model.error {
                Text(error).font(.footnote).foregroundStyle(Palette.red)
            } else if let summary = model.summary {
                Text(summary).font(.footnote).monospacedDigit().foregroundStyle(Palette.secondary)
            }

            SnapshotRows(model: model)
        }
        .navigationTitle("Santé")
    }
}
