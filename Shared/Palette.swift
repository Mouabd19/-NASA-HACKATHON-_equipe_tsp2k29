import SwiftUI

/// Couleurs réservées aux statuts. Tout le reste est blanc sur noir.
enum Palette {
    static let red = Color(hex: 0xFF453A)
    static let amber = Color(hex: 0xFF9F0A)
    static let green = Color(hex: 0x30D158)
    /// Donnée absente ou ancienne : jamais de vert par défaut
    static let gray = Color(hex: 0x636366)
    /// Texte secondaire lisible sur noir (le gris statut est trop sombre pour du texte courant)
    static let secondary = Color.white.opacity(0.6)
}

extension Color {
    init(hex: UInt32) {
        self.init(
            red: Double((hex >> 16) & 0xFF) / 255,
            green: Double((hex >> 8) & 0xFF) / 255,
            blue: Double(hex & 0xFF) / 255
        )
    }
}

extension Date {
    /// « 19:29:10 »
    var clock: String { formatted(date: .omitted, time: .standard) }
}
