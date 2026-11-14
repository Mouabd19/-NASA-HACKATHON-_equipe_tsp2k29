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

/** Réglages de la visionneuse (itération rapide). */
const VIEW = {
  /** Plus grande dimension de l'organe une fois cadré (unités de scène). */
  fit: 1.12,
  /** Hauteur max : un organe allongé (fémur, corps entier) est limité par sa hauteur. */
  fitHeight: 1.85,
  /** Point visé : sous le centre, pour remonter l'organe au-dessus des libellés du bas. */
  targetY: -0.22,
  camera: { position: [0, 0.55, 4.6] as [number, number, number], fov: 34 },
  /** Vitesse de rotation automatique (OrbitControls : 2 ≈ 30 s par tour). */
  autoRotateSpeed: 1.1,
  /** Poids de la teinte de statut (0 = hologramme neutre). */
  tintMix: 0.7,
  /** Opacité d'un organe non modélisé (gris). */
  greyOpacity: 0.55,
  /** Lignes de balayage visibles sur la hauteur de l'organe cadré. */
  scanlines: 70,
  ring: { opacity: 0.5, ticks: 48, tickOpacity: 0.3 },
} as const;

interface Fit { parts: PartDef[]; scale: number; offset: THREE.Vector3; floorY: number; radius: number; placeholder: boolean }

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
    return { parts: [], scale: 1, offset: new THREE.Vector3(), floorY: -0.75, radius: 0.6, placeholder: true };
  }
  const size = box.getSize(new THREE.Vector3());
  const centre = box.getCenter(new THREE.Vector3());
  const horizontal = Math.max(size.x, size.z, 1e-4);
  const scale = Math.min(VIEW.fit / horizontal, VIEW.fitHeight / Math.max(size.y, 1e-4));
  return {
    parts,
    scale,
    offset: centre.multiplyScalar(-1),
    floorY: -(size.y * scale) / 2 - 0.1,
    radius: Math.min(0.62, Math.max(0.4, (horizontal * scale) / 2 + 0.06)),
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
      // la densité des lignes est en « lignes par mètre monde » : on la ramène à la taille cadrée
      const sl = m.uniforms.uScanline?.value as THREE.Vector3 | undefined;
      if (sl) sl.x = VIEW.scanlines / VIEW.fitHeight;
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
      m.uniforms.uTintMix.value = neutral ? 0 : VIEW.tintMix;
      m.uniforms.uOpacity.value = !neutral && (status === 'grey' || !modeled) ? VIEW.greyOpacity : 1;
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

/** Anneau de sol gradué. */
function FloorRing({ y, radius }: { y: number; radius: number }): JSX.Element {
  const { ring, ticks, ringMat, tickMat } = useMemo(() => {
    const circle: number[] = [];
    const N = 96;
    for (let i = 0; i < N; i++) {
      const a0 = (i / N) * Math.PI * 2;
      const a1 = ((i + 1) / N) * Math.PI * 2;
      circle.push(Math.cos(a0), 0, Math.sin(a0), Math.cos(a1), 0, Math.sin(a1));
    }
    const tk: number[] = [];
    for (let i = 0; i < VIEW.ring.ticks; i++) {
      const a = (i / VIEW.ring.ticks) * Math.PI * 2;
      const r1 = i % 12 === 0 ? 1.16 : i % 4 === 0 ? 1.1 : 1.05;
      tk.push(Math.cos(a), 0, Math.sin(a), Math.cos(a) * r1, 0, Math.sin(a) * r1);
    }
    const g1 = new THREE.BufferGeometry().setAttribute('position', new THREE.Float32BufferAttribute(circle, 3));
    const g2 = new THREE.BufferGeometry().setAttribute('position', new THREE.Float32BufferAttribute(tk, 3));
    const c = new THREE.Color(tokens.color.holo);
    return {
      ring: g1,
      ticks: g2,
      ringMat: new THREE.LineBasicMaterial({ color: c, transparent: true, opacity: VIEW.ring.opacity }),
      tickMat: new THREE.LineBasicMaterial({ color: c, transparent: true, opacity: VIEW.ring.tickOpacity }),
    };
  }, []);
  useEffect(() => () => { ring.dispose(); ticks.dispose(); ringMat.dispose(); tickMat.dispose(); }, [ring, ticks, ringMat, tickMat]);
  return (
    <group position={[0, y, 0]} scale={radius}>
      <lineSegments geometry={ring} material={ringMat} />
      <lineSegments geometry={ticks} material={tickMat} />
      <lineSegments geometry={ring} material={tickMat} scale={0.55} />
    </group>
  );
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
      <FloorRing y={fit.floorY} radius={fit.radius} />
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
