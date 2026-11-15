import SceneKit
import SwiftUI
import UIKit

/// Page Corps : mannequin 3D simple (SceneKit), zones en alerte colorées par leur statut.
/// Rotation lente au repos ; touche le corps pour le faire tourner à la Couronne.
/// Ce n'est pas un rendu anatomique : il situe les alertes, comme les étiquettes de la page Corps du web.
struct BodyView: View {
    @ObservedObject var store: SummaryStore
    /// Vrai quand la page Corps est affichée : en la quittant, la Couronne revient toujours aux pages
    var isActive = true
    @StateObject private var model = BodyScene()
    @Environment(\.accessibilityReduceMotion) private var reduceMotion
    /// La Couronne ne fait tourner le corps qu'après un toucher. Sans ce toucher, la vue n'est pas focusable :
    /// elle ne peut pas prendre la Couronne toute seule, et la Couronne continue de changer de page.
    @State private var crownMode = false
    @FocusState private var crownFocused: Bool
    @State private var crown = 0.0
    @State private var showList = false

    private var alerts: [WatchSummary.AlertZone] { store.summary.alerts }
    private var controlled: Bool { crownMode && crownFocused }

    var body: some View {
        VStack(spacing: 4) {
            SceneView(scene: model.scene, pointOfView: model.camera, options: [.rendersContinuously])
                .frame(maxWidth: .infinity, maxHeight: .infinity)
                .overlay(alignment: .bottomLeading) {
                    // provenance toujours visible ; remplacée par l'aide quand la Couronne fait tourner le corps
                    Text(controlled ? "Couronne : rotation · touche pour finir" : store.origin.short)
                        .font(.caption2)
                        .foregroundStyle(Palette.secondary)
                }
                .focusable(crownMode)
                .focused($crownFocused)
                .digitalCrownRotation($crown, from: 0, through: 360, by: nil, sensitivity: .low,
                                      isContinuous: true, isHapticFeedbackEnabled: false)
                .onTapGesture { crownMode.toggle() }
                .accessibilityLabel(accessibilityText)

            Button { showList = true } label: {
                HStack(spacing: 6) {
                    StatusDot(color: worstColor)
                    Text(countLabel)
                        .font(.footnote)
                        .monospacedDigit()
                        .foregroundStyle(Palette.text)
                        .lineLimit(1)
                        .minimumScaleFactor(0.8)
                    Spacer(minLength: 0)
                    Image(systemName: "chevron.right")
                        .font(.caption2)
                        .foregroundStyle(Palette.secondary)
                }
                .frame(minHeight: 32)
            }
            .buttonStyle(.plain)
        }
        .navigationTitle("Corps")
        .onAppear { crownMode = false; model.apply(alerts); updateSpin() }
        .onChange(of: alerts) { _, new in model.apply(new) }
        .onChange(of: crown) { _, new in model.setCrown(degrees: new) }
        .onChange(of: crownMode) { _, on in
            // la vue doit d'abord devenir focusable avant de recevoir le focus
            Task { @MainActor in crownFocused = on }
            updateSpin()
        }
        .onChange(of: crownFocused) { _, focused in
            if !focused { crownMode = false }
            updateSpin()
        }
        .onChange(of: isActive) { _, active in if !active { crownMode = false } }
        .onChange(of: reduceMotion) { _, _ in updateSpin() }
        .sheet(isPresented: $showList) {
            NavigationStack { AlertList(alerts: alerts, origin: store.origin, stale: store.isStale) }
        }
    }

    private func updateSpin() { model.setSpinning(!reduceMotion && !crownMode) }

    private var countLabel: String {
        switch alerts.count {
        case 0: return "Aucune zone en alerte"
        case 1: return "1 zone à surveiller"
        default: return "\(alerts.count) zones à surveiller"
        }
    }

    private var worstColor: Color {
        if alerts.contains(where: { $0.color == "red" }) { return Palette.red }
        if alerts.contains(where: { $0.color == "amber" }) { return Palette.amber }
        return Palette.gray
    }

    private var accessibilityText: String {
        alerts.isEmpty ? "Corps, aucune zone en alerte"
            : "Corps, zones en alerte : " + alerts.map(\.name).joined(separator: ", ")
    }
}

/// Liste des alertes (ouverte depuis la page Corps)
struct AlertList: View {
    let alerts: [WatchSummary.AlertZone]
    let origin: DataOrigin
    var stale = false

    var body: some View {
        List {
            if alerts.isEmpty {
                Text("Aucune alerte : tendances 7 j dans la marge de bruit.")
                    .font(.footnote)
                    .foregroundStyle(Palette.secondary)
            }
            ForEach(alerts) { a in
                VStack(alignment: .leading, spacing: 2) {
                    HStack(spacing: 6) {
                        StatusDot(color: Palette.status(a.color))
                        Text(a.name).font(.footnote.weight(.semibold))
                    }
                    Text(a.finding.isEmpty ? a.title : a.finding)
                        .font(.footnote)
                        .foregroundStyle(Palette.text)
                    Text(ruleLabel(a.rule))
                        .font(.caption2)
                        .foregroundStyle(Palette.secondary)
                }
                .padding(.vertical, 2)
            }
            OriginFooter(origin: origin, stale: stale)
                .listRowBackground(Color.clear)
        }
        .navigationTitle("Alertes")
    }
}

// MARK: - Scène SceneKit

@MainActor
final class BodyScene: ObservableObject {
    let scene = SCNScene()
    let camera: SCNNode
    private let spin = SCNNode()
    private let crownNode = SCNNode()
    private var parts: [String: [SCNNode]] = [:]
    private var markers: [String: [SCNNode]] = [:]
    private var crownOffset = 0.0

    private static let neutral = UIColor(red: 0.36, green: 0.40, blue: 0.45, alpha: 1)

    init() {
        scene.background.contents = UIColor.black

        let cam = SCNCamera()
        cam.fieldOfView = 30
        cam.zNear = 0.1
        camera = SCNNode()
        camera.camera = cam
        camera.position = SCNVector3(0, 0.92, 4.1)
        scene.rootNode.addChildNode(camera)

        let ambient = SCNNode()
        ambient.light = SCNLight()
        ambient.light?.type = .ambient
        ambient.light?.intensity = 450
        scene.rootNode.addChildNode(ambient)

        let key = SCNNode()
        key.light = SCNLight()
        key.light?.type = .directional
        key.light?.intensity = 750
        key.eulerAngles = SCNVector3(-0.5, 0.6, 0)
        scene.rootNode.addChildNode(key)

        scene.rootNode.addChildNode(spin)
        spin.addChildNode(crownNode)
        build()
    }

    // Silhouette en volumes simples (mètres, y vers le haut, face vers +z)
    private func build() {
        func add(_ g: SCNGeometry, _ p: SCNVector3, zone: String? = nil, rotZ: Float = 0,
                 scale: SCNVector3 = SCNVector3(1, 1, 1), marker: Bool = false) {
            let m = SCNMaterial()
            m.lightingModel = .lambert
            m.diffuse.contents = Self.neutral
            g.materials = [m]
            let n = SCNNode(geometry: g)
            n.position = p
            n.eulerAngles.z = rotZ
            n.scale = scale
            n.isHidden = marker
            crownNode.addChildNode(n)
            if let zone {
                if marker { markers[zone, default: []].append(n) } else { parts[zone, default: []].append(n) }
            }
        }
        // tête, cou
        add(SCNSphere(radius: 0.11), SCNVector3(0, 1.62, 0))
        add(SCNCylinder(radius: 0.045, height: 0.1), SCNVector3(0, 1.49, 0))
        // tronc
        add(SCNCapsule(capRadius: 0.16, height: 0.5), SCNVector3(0, 1.24, 0),
            scale: SCNVector3(1.12, 1, 0.66))
        add(SCNCapsule(capRadius: 0.135, height: 0.3), SCNVector3(0, 1.0, 0), zone: "abdomen",
            scale: SCNVector3(1.05, 1, 0.64))
        add(SCNCapsule(capRadius: 0.12, height: 0.38), SCNVector3(0, 0.86, 0), zone: "bassin", rotZ: .pi / 2,
            scale: SCNVector3(1, 1, 0.72))
        // bras
        for s: Float in [-1, 1] {
            add(SCNCapsule(capRadius: 0.048, height: 0.33), SCNVector3(s * 0.245, 1.25, 0), rotZ: s * 0.12)
            add(SCNCapsule(capRadius: 0.04, height: 0.3), SCNVector3(s * 0.28, 0.96, 0.01), rotZ: s * 0.06)
            add(SCNSphere(radius: 0.045), SCNVector3(s * 0.29, 0.78, 0.01))
        }
        // jambes
        for s: Float in [-1, 1] {
            add(SCNCapsule(capRadius: 0.075, height: 0.46), SCNVector3(s * 0.095, 0.58, 0), zone: "cuisse")
            add(SCNCapsule(capRadius: 0.055, height: 0.42), SCNVector3(s * 0.095, 0.19, 0), zone: "mollet")
            add(SCNBox(width: 0.08, height: 0.04, length: 0.17, chamferRadius: 0.02), SCNVector3(s * 0.095, -0.01, 0.04))
        }
        // repères (cachés sauf alerte) : yeux, cœur, dos
        for s: Float in [-1, 1] {
            add(SCNSphere(radius: 0.024), SCNVector3(s * 0.042, 1.645, 0.093), zone: "tete", marker: true)
        }
        add(SCNSphere(radius: 0.058), SCNVector3(0.055, 1.27, 0.085), zone: "thorax", marker: true)
        add(SCNBox(width: 0.12, height: 0.42, length: 0.03, chamferRadius: 0.015), SCNVector3(0, 1.12, -0.1),
            zone: "dos", marker: true)
    }

    /// Colore les volumes ou affiche les repères des zones en alerte. Le reste reste neutre (jamais vert par défaut).
    func apply(_ alerts: [WatchSummary.AlertZone]) {
        var color: [String: UIColor] = [:]
        for a in alerts {
            let c = Self.uiColor(a.color)
            // une zone porte la couleur la plus grave
            if color[a.zone] == nil || a.color == "red" { color[a.zone] = c }
        }
        for (zone, nodes) in parts {
            for n in nodes { n.geometry?.firstMaterial?.diffuse.contents = color[zone] ?? Self.neutral }
        }
        for (zone, nodes) in markers {
            for n in nodes {
                n.isHidden = color[zone] == nil
                n.geometry?.firstMaterial?.diffuse.contents = color[zone] ?? Self.neutral
            }
        }
    }

    func setSpinning(_ on: Bool) {
        if on {
            guard spin.action(forKey: "spin") == nil else { return }
            spin.runAction(.repeatForever(.rotateBy(x: 0, y: .pi * 2, z: 0, duration: 24)), forKey: "spin")
        } else {
            spin.removeAction(forKey: "spin")
        }
    }

    func setCrown(degrees: Double) {
        crownNode.eulerAngles.y = Float(degrees * .pi / 180)
    }

    private static func uiColor(_ name: String) -> UIColor {
        switch name {
        case "red": return UIColor(red: 0xE5 / 255, green: 0x54 / 255, blue: 0x4B / 255, alpha: 1)
        case "amber": return UIColor(red: 0xE3 / 255, green: 0xA2 / 255, blue: 0x2E / 255, alpha: 1)
        case "green": return UIColor(red: 0x3D / 255, green: 0xB4 / 255, blue: 0x6D / 255, alpha: 1)
        default: return UIColor(red: 0x69 / 255, green: 0x70 / 255, blue: 0x7B / 255, alpha: 1)
        }
    }
}
