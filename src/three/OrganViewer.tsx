// Visionneuse isolée d'un organe (fenêtre organe, ROADMAP §1) : son propre petit <Canvas>.
// Pièces = organParts(organId) du modèle procédural, recentrées et mises à l'échelle (boîte englobante),
// rotation lente + glisser pour tourner. 'global' → silhouette du corps entier (pièces 'shell').
// Tous les réglages visuels sont dans VIEW, ci-dessous.
import { useEffect, useMemo, useRef } from 'react';
import type { JSX } from 'react';
import * as THREE from 'three';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import type { Color, OrganId } from '../types';
import { statusColor, tokens } from '../ui/tokens';
import { getDayBodyPlan } from '../sim/load';
import { useBody } from '../pages/body/store';
import { buildAnatomy, organParts } from './anatomy';
import type { PartDef } from './anatomy';
import { createHologramMaterial } from './HologramMaterial';
import { look } from './look';

/** Réglages de la visionneuse (itération rapide). */
const VIEW = {
  /** Plus grande dimension de l'organe une fois cadré (unités de scène). */
  fit: 1.06,
  /** Hauteur max : un organe allongé (fémur, corps entier) est limité par sa hauteur. */
  fitHeight: 2.05,
  /** Point visé : le centre de l'organe (plus aucun libellé superposé à la vue). */
  targetY: 0,
  camera: { position: [0, 0.4, 4.3] as [number, number, number], fov: 34 },
  /** Vitesse de rotation automatique (OrbitControls : 2 ≈ 30 s par tour). */
  autoRotateSpeed: 0.6,
  /** Poids de la teinte de statut (0 = hologramme neutre). */
  tintMix: 0.5,
  /** Remplissage « à cœur » de la teinte (0 = seul le liseré porte la couleur : pas d'aplat strié). */
  tintCore: 0,
  /** Plafond d'alpha par fragment et atténuation des faces arrière : évite le blanc brûlé des pièces superposées. */
  alphaMax: 0.6,
  backFace: 0.22,
  /** Liseré de l'organe isolé (plus fin que dans le corps entier). */
  rim: 0.6,
  fresnelPower: 2.2,
  /** Opacité d'un organe non modélisé (gris). */
  greyOpacity: 0.55,
  /** Silhouette du corps entier ('global') : l'enveloppe seule doit se lire sur fond noir. */
  shell: { opacity: look.shell.opacityAlone, rim: 0.6, core: 0.03 },
} as const;

interface Fit { parts: PartDef[]; scale: number; offset: THREE.Vector3; placeholder: boolean }

function partMatrix(p: PartDef): THREE.Matrix4 {
  return new THREE.Matrix4().compose(
    new THREE.Vector3(...p.position),
    new THREE.Quaternion().setFromEuler(new THREE.Euler(...p.rotation)),
    new THREE.Vector3(...p.scale),
  );
}

/** Boîte englobante de toutes les pièces → échelle et décalage pour cadrer. */
function computeFit(organId: OrganId): Fit {
  let parts: PartDef[] = [];
  try {
    parts = organId === 'global' ? buildAnatomy().filter((p) => p.layer === 'shell') : organParts(organId);
  } catch {
    parts = [];
  }
  const box = new THREE.Box3();
  for (const p of parts) {
    if (!p.geometry.boundingBox) p.geometry.computeBoundingBox();
    const b = p.geometry.boundingBox;
    if (b && !b.isEmpty()) box.union(b.clone().applyMatrix4(partMatrix(p)));
  }
  if (parts.length === 0 || box.isEmpty()) {
    return { parts: [], scale: 1, offset: new THREE.Vector3(), placeholder: true };
  }
  const size = box.getSize(new THREE.Vector3());
  const centre = box.getCenter(new THREE.Vector3());
  const horizontal = Math.max(size.x, size.z, 1e-4);
  const scale = Math.min(VIEW.fit / horizontal, VIEW.fitHeight / Math.max(size.y, 1e-4));
  return {
    parts,
    scale,
    offset: centre.multiplyScalar(-1),
    placeholder: false,
  };
}

function useStatus(organId: OrganId): Color {
  const day = useBody((s) => s.day);
  const adherence = useBody((s) => s.adherence);
  return useMemo(() => {
    if (organId === 'global') return 'grey';
    return getDayBodyPlan(day, adherence).organs.find((o) => o.id === organId)?.status ?? 'grey';
  }, [organId, day, adherence]);
}

function Organ({ fit, status, neutral }: { fit: Fit; status: Color; neutral: boolean }): JSX.Element {
  const materials = useMemo(
    () => fit.parts.map((p) => {
      const m = createHologramMaterial({ layer: p.layer, fx: p.fx === 'flow' ? 'flow' : undefined });
      // organe isolé : pas de repère de profondeur (il tourne sur lui-même), liseré seul
      m.uniforms.uDepthCue.value = 0;
      m.uniforms.uAlphaMax.value = VIEW.alphaMax;
      m.uniforms.uBackFace.value = VIEW.backFace;
      (m.uniforms.uTintLook.value as THREE.Vector2).y = VIEW.tintCore;
      if (p.layer !== 'shell' && !p.fx) {
        m.uniforms.uRim.value = VIEW.rim;
        m.uniforms.uFresnelPower.value = VIEW.fresnelPower;
      }
      return m;
    }),
    [fit],
  );
  useEffect(() => () => materials.forEach((m) => m.dispose()), [materials]);
  useEffect(() => {
    const tint = new THREE.Color(statusColor[status]);
    materials.forEach((m, i) => {
      const modeled = fit.parts[i].modeled;
      (m.uniforms.uTint.value as THREE.Color).copy(tint);
      m.uniforms.uTintMix.value = neutral ? 0 : VIEW.tintMix * (status === 'grey' ? 1 : fit.parts[i].tintWeight ?? 1);
      m.uniforms.uOpacity.value = !neutral && (status === 'grey' || !modeled) ? VIEW.greyOpacity : 1;
      if (fit.parts[i].layer === 'shell') {
        m.uniforms.uOpacity.value = VIEW.shell.opacity;
        m.uniforms.uRim.value = VIEW.shell.rim;
        m.uniforms.uCore.value = VIEW.shell.core;
      }
    });
  }, [materials, status, neutral, fit]);
  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    for (const m of materials) m.uniforms.uTime.value = t;
  });
  return (
    <group scale={fit.scale}>
      <group position={fit.offset}>
        {fit.parts.map((p, i) => (
          <mesh
            key={p.key}
            geometry={p.geometry}
            material={materials[i]}
            position={p.position}
            rotation={p.rotation}
            scale={p.scale}
            renderOrder={i}
          />
        ))}
      </group>
    </group>
  );
}

/** Secours du secours : aucune pièce pour cet organe → icosaèdre filaire gris. */
function Placeholder(): JSX.Element {
  const ref = useRef<THREE.LineSegments>(null);
  const geo = useMemo(() => new THREE.WireframeGeometry(new THREE.IcosahedronGeometry(0.55, 1)), []);
  const mat = useMemo(
    () => new THREE.LineBasicMaterial({ color: new THREE.Color(tokens.color.unknown), transparent: true, opacity: 0.9 }),
    [],
  );
  useEffect(() => () => { geo.dispose(); mat.dispose(); }, [geo, mat]);
  return <lineSegments ref={ref} geometry={geo} material={mat} />;
}

export function OrganViewer({ organId }: { organId: OrganId }): JSX.Element {
  const fit = useMemo(() => computeFit(organId), [organId]);
  const status = useStatus(organId);
  return (
    <Canvas
      key={organId}
      dpr={[1, 2]}
      camera={{ position: VIEW.camera.position, fov: VIEW.camera.fov, near: 0.1, far: 50 }}
      gl={{ alpha: true, antialias: true }}
      style={{ width: '100%', height: '100%', cursor: 'grab', touchAction: 'none' }}
    >
      {fit.placeholder ? <Placeholder /> : <Organ fit={fit} status={status} neutral={organId === 'global'} />}
      <OrbitControls
        makeDefault
        enablePan={false}
        enableZoom={false}
        enableDamping
        dampingFactor={0.12}
        autoRotate
        autoRotateSpeed={VIEW.autoRotateSpeed}
        minPolarAngle={Math.PI * 0.2}
        maxPolarAngle={Math.PI * 0.62}
        target={[0, VIEW.targetY, 0]}
      />
    </Canvas>
  );
}
