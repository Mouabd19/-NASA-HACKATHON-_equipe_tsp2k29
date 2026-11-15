import SceneKit
import SwiftUI
import UIKit

/// Page Corps : le corps 3D de Haddad, avec les modèles de Steve (Z-Anatomy, les mêmes que la page Corps du web),
/// simplifiés pour la montre. Peau translucide, squelette en filigrane, organes en alerte colorés par leur statut.
/// Rotation lente au repos ; touche le corps pour le faire tourner à la Couronne.
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
    /// organes par id (hanche, cuisse, coeur, yeux…), cachés tant qu'ils ne sont pas en alerte
    private var organs: [String: SCNNode] = [:]
    private var crownOffset = 0.0

    private static let neutral = UIColor(red: 0.36, green: 0.40, blue: 0.45, alpha: 1)
    private static let skin = UIColor(red: 0.62, green: 0.68, blue: 0.76, alpha: 1)
    private static let bone = UIColor(red: 0.50, green: 0.53, blue: 0.58, alpha: 1)

    init() {
        scene.background.contents = UIColor.black

        let cam = SCNCamera()
        cam.fieldOfView = 30
        cam.zNear = 0.1
        camera = SCNNode()
        camera.camera = cam
        camera.position = SCNVector3(0, 0.87, 3.4)
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

    /// Charge body.json (index des pièces) + body.bin (Float32 positions, Float32 normales, UInt32 indices).
    /// Fichiers produits par docs/tools/build-watch-body.mjs (dépôt web, branche night/watch-api) à partir de
    /// public/models : même repère que le web (mètres, y vers le haut, face vers +z).
    private func build() {
        guard let jsonURL = Bundle.main.url(forResource: "body", withExtension: "json"),
              let binURL = Bundle.main.url(forResource: "body", withExtension: "bin"),
              let json = try? Data(contentsOf: jsonURL),
              let index = try? JSONDecoder().decode(BodyIndex.self, from: json),
              let bin = try? Data(contentsOf: binURL, options: .mappedIfSafe) else { return }

        for part in index.parts {
            let v = part.vertexCount * 12
            let start = part.offset, end = start + 2 * v + part.indexCount * 4
            guard end <= bin.count else { continue }
            let pos = bin.subdata(in: start ..< start + v)
            let nor = bin.subdata(in: start + v ..< start + 2 * v)
            let idx = bin.subdata(in: start + 2 * v ..< end)
            func source(_ d: Data, _ sem: SCNGeometrySource.Semantic) -> SCNGeometrySource {
                SCNGeometrySource(data: d, semantic: sem, vectorCount: part.vertexCount, usesFloatComponents: true,
                                  componentsPerVector: 3, bytesPerComponent: 4, dataOffset: 0, dataStride: 12)
            }
            let element = SCNGeometryElement(data: idx, primitiveType: .triangles,
                                             primitiveCount: part.indexCount / 3, bytesPerIndex: 4)
            let geo = SCNGeometry(sources: [source(pos, .vertex), source(nor, .normal)], elements: [element])
            let m = SCNMaterial()
            m.lightingModel = .lambert
            geo.materials = [m]
            let node = SCNNode(geometry: geo)

            switch part.id {
            case "avatar":
                // peau translucide, dessinée après le reste pour laisser voir les organes
                m.diffuse.contents = Self.skin
                m.transparency = 0.18
                m.writesToDepthBuffer = false
                node.renderingOrder = 10
            case "squelette":
                m.diffuse.contents = Self.bone
                m.transparency = 0.35
                node.renderingOrder = 5
            default:
                m.diffuse.contents = Self.neutral
                node.isHidden = true
                organs[part.id] = node
            }
            crownNode.addChildNode(node)
        }
    }

    /// Affiche et colore les organes en alerte. Le reste reste caché (jamais vert par défaut).
    func apply(_ alerts: [WatchSummary.AlertZone]) {
        var color: [String: UIColor] = [:]
        for a in alerts {
            for id in organIds(for: a) where color[id] == nil || a.color == "red" {
                color[id] = Self.uiColor(a.color)
            }
        }
        for (id, node) in organs {
            node.isHidden = color[id] == nil
            node.geometry?.firstMaterial?.diffuse.contents = color[id] ?? Self.neutral
            // léger éclat propre pour que l'organe en alerte ressorte sous la peau
            node.geometry?.firstMaterial?.emission.contents = color[id].map { $0.withAlphaComponent(1) } ?? UIColor.black
            node.geometry?.firstMaterial?.emission.intensity = 0.35
        }
    }

    /// L'alerte nomme son organe ; repli sur la zone pour un ancien serveur.
    private func organIds(for a: WatchSummary.AlertZone) -> [String] {
        if organs[a.organId] != nil { return [a.organId] }
        switch a.zone {
        case "bassin": return ["hanche"]
        case "cuisse": return ["cuisse"]
        case "mollet": return ["mollet"]
        case "thorax": return ["coeur"]
        case "abdomen": return ["reins"]
        case "dos": return ["rachis"]
        case "tete": return ["yeux"]
        default: return []
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

/// Index de body.bin (voir docs/tools/build-watch-body.mjs)
private struct BodyIndex: Decodable {
    struct Part: Decodable {
        let id: String
        let vertexCount: Int
        let indexCount: Int
        let offset: Int
    }
    let parts: [Part]
}
