// Sol gradué (anneaux + graduations) et règle verticale. Sans React.
import * as THREE from 'three';
import { tokens } from '../../ui/tokens';
import { look } from '../look';

function lines(points: number[], opacity: number): THREE.LineSegments {
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(points, 3));
  const mat = new THREE.LineBasicMaterial({ color: tokens.color.holo, transparent: true, opacity, depthWrite: false, depthTest: false });
  return new THREE.LineSegments(geo, mat);
}

function circle(out: number[], r: number, y: number, from = 0, to = Math.PI * 2, n = 96): void {
  for (let i = 0; i < n; i++) {
    const a0 = from + ((to - from) * i) / n, a1 = from + ((to - from) * (i + 1)) / n;
    out.push(Math.cos(a0) * r, y, Math.sin(a0) * r, Math.cos(a1) * r, y, Math.sin(a1) * r);
  }
}

export function createFloor(): THREE.Group {
  const g = new THREE.Group();
  const R = look.floor.radius;
  const major: number[] = [];
  const minor: number[] = [];

  circle(major, R, 0);
  circle(minor, R * 0.62, 0);
  circle(minor, R * 0.24, 0);
  // arcs extérieurs interrompus (esprit « instrument de mesure »)
  for (let q = 0; q < 4; q++) circle(major, R * 1.1, 0, q * (Math.PI / 2) + 0.2, (q + 1) * (Math.PI / 2) - 0.2, 24);
  // graduations : tous les 5° (fines), tous les 30° (fortes)
  for (let d = 0; d < 360; d += 5) {
    const a = (d * Math.PI) / 180;
    const strong = d % 30 === 0;
    const r0 = R * (strong ? 0.9 : 0.955);
    (strong ? major : minor).push(Math.cos(a) * r0, 0, Math.sin(a) * r0, Math.cos(a) * R, 0, Math.sin(a) * R);
  }
  // croix centrale
  minor.push(-R * 0.24, 0, 0, R * 0.24, 0, 0, 0, 0, -R * 0.24, 0, 0, R * 0.24);
  // axes principaux, interrompus au centre
  for (const s of [-1, 1]) {
    minor.push(s * R * 0.3, 0, 0, s * R * 0.9, 0, 0, 0, 0, s * R * 0.3, 0, 0, s * R * 0.9);
  }
  g.add(lines(major, look.floor.opacity), lines(minor, look.floor.minorOpacity));

  if (look.floor.ruler) {
    const x = look.floor.rulerX;
    const ruler: number[] = [x, 0, 0, x, 1.8, 0];
    for (let cm = 0; cm <= 180; cm += 5) {
      const y = cm / 100;
      const len = cm % 50 === 0 ? 0.05 : cm % 10 === 0 ? 0.028 : 0.014;
      ruler.push(x, y, 0, x + len, y, 0);
    }
    g.add(lines(ruler, look.floor.rulerOpacity));
  }
  return g;
}

export function disposeFloor(g: THREE.Group): void {
  g.traverse((o) => {
    if (o instanceof THREE.LineSegments) {
      o.geometry.dispose();
      (o.material as THREE.Material).dispose();
    }
  });
}
