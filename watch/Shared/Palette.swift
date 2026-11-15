import SwiftUI

/// Couleurs de l'app web (src/ui/tokens.ts). Les couleurs vives sont réservées aux statuts ;
/// tout le reste est en neutres sur fond noir (écran OLED de la montre).
enum Palette {
    static let red = Color(hex: 0xE5544B)
    static let amber = Color(hex: 0xE3A22E)
    static let green = Color(hex: 0x3DB46D)
    /// Donnée absente ou ancienne : jamais de vert par défaut
    static let gray = Color(hex: 0x69707B)
    /// Texte courant (blanc cassé)
    static let text = Color(hex: 0xE6E8EB)
    /// Texte secondaire lisible sur noir (le gris statut est trop sombre pour du texte courant)
    static let secondary = Color(hex: 0x959CA6)
    /// Surface d'un bloc et séparateurs
    static let panel = Color(hex: 0x12151A)
    static let border = Color(hex: 0x252A32)
    /// Corps 3D uniquement
    static let holo = Color(hex: 0xA9B8C6)

    /// Couleur d'un statut du web ('green' | 'amber' | 'red' | 'grey'). Inconnu → gris.
    static func status(_ name: String?) -> Color {
        switch name {
        case "green": return green
        case "amber": return amber
        case "red": return red
        default: return gray
        }
    }
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
    /// « 19:29 »
    var hm: String { formatted(date: .omitted, time: .shortened) }
}

/// Nombres à la française : « 11,0 »
enum FR {
    static func num(_ v: Double, digits: Int = 1) -> String {
        v.formatted(.number.precision(.fractionLength(digits)).locale(Locale(identifier: "fr_FR")))
    }
}
