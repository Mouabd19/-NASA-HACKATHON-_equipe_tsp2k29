import SwiftUI

/// Page To-do : la liste du jour (GET /api/todo), cochable (POST /api/todo/:id/done | undo).
/// Sans Mac : liste embarquée de J94, coches gardées sur la montre seulement, et c'est écrit.
struct TodoView: View {
    @ObservedObject var todo: TodoStore
    /// Niveau du triage : ORANGE ou ROUGE suspend la charge lourde (même règle que la page web)
    let level: String

    private var suspendHeavy: Bool { level == "ORANGE" || level == "ROUGE" }

    var body: some View {
        List {
            Section {
                ForEach(todo.items) { item in row(item) }
            } header: {
                Text("\(todo.doneCount) / \(todo.items.count) faites")
                    .monospacedDigit()
            } footer: {
                VStack(alignment: .leading, spacing: 2) {
                    if todo.synced {
                        Text("Synchronisée")
                    } else {
                        Text("Liste du jour · hors ligne")
                        Text("Non synchronisée : coches gardées sur la montre")
                    }
                    if let err = todo.lastError {
                        Text(err).foregroundStyle(todo.synced ? Palette.red : Palette.secondary)
                    }
                }
                .font(.caption2)
            }
        }
        .navigationTitle("To-do")
    }

    private func row(_ item: WatchTodo) -> some View {
        let suspended = suspendHeavy && item.isHeavy
        return Button {
            Task { await todo.toggle(item) }
        } label: {
            HStack(alignment: .top, spacing: 8) {
                Image(systemName: item.done ? "checkmark.circle.fill" : "circle")
                    .font(.system(size: 20))
                    .foregroundStyle(item.done ? Palette.text : Palette.secondary)
                    .contentTransition(.symbolEffect(.replace))
                VStack(alignment: .leading, spacing: 1) {
                    HStack(spacing: 4) {
                        if let t = item.time {
                            Text(t).font(.caption2).monospacedDigit().foregroundStyle(Palette.secondary)
                        }
                        if item.isUrgent {
                            Text("Priorité 1").font(.caption2.weight(.semibold)).foregroundStyle(Palette.red)
                        } else if suspended {
                            Text("Suspendu").font(.caption2.weight(.semibold)).foregroundStyle(Palette.amber)
                        }
                    }
                    Text(item.title)
                        .font(.footnote)
                        .foregroundStyle(item.done ? Palette.secondary : Palette.text)
                        .strikethrough(item.done, color: Palette.secondary)
                        .lineLimit(3)
                }
                Spacer(minLength: 0)
            }
            .frame(minHeight: 40)
            .opacity(todo.busy.contains(item.id) ? 0.5 : 1)
        }
        .disabled(suspended || todo.busy.contains(item.id))
        .accessibilityValue(item.done ? "Faite" : "À faire")
    }
}
