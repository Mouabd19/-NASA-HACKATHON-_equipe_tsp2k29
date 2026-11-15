// Matériau du corps : rendu translucide gris-bleu neutre, contour par effet de bord (fresnel),
// mélange additif (aucun artefact de tri), teinte de statut mate. Aucun effet animé décoratif.
// Les réglages par défaut viennent de look.ts ; les couleurs de tokens.ts.
import * as THREE from 'three';
import type { LayerId } from '../types';
import { tokens } from '../ui/tokens';
import { look } from './look';

export interface HologramOpts {
  /** Couleur de base (défaut : tokens.color.holo). */
  color?: string;
  /** Opacité globale (défaut : 1). */
  opacity?: number;
  /** Rendu « fantôme » (corps projeté). */
  ghost?: boolean;
  /** Ajout : reprend core / rim / fresnel du calque dans look.layers. */
  layer?: LayerId | 'shell';
  /** Ajout : 'flow' = tirets animés le long de uv.x (vaisseaux), 'heat' = carte de dose. */
  fx?: 'flow' | 'heat';
}

const vertexShader = /* glsl */ `
varying vec3 vWorldPos;
varying vec3 vWorldNormal;
varying vec2 vUv;
void main() {
  vec4 wp = modelMatrix * vec4(position, 1.0);
  vWorldPos = wp.xyz;
  // normale en espace monde (supporte les miroirs : inverse-transposée de la matrice modèle)
  vWorldNormal = normalize(transpose(inverse(mat3(modelMatrix))) * normal);
  vUv = uv;
  gl_Position = projectionMatrix * viewMatrix * wp;
}
`;

const fragmentShader = /* glsl */ `
uniform float uTime;
uniform vec3 uColor;
uniform vec3 uTint;
uniform float uTintMix;
uniform float uOpacity;
uniform float uHighlight;
uniform float uGhost;
uniform float uDim;
uniform float uCore;
uniform float uRim;
uniform float uFresnelPower;
uniform float uFlow;
uniform float uHeat;
uniform float uBackFace;
uniform vec2 uTintLook;   // (inutilisé), remplissage
uniform vec3 uHoverLook;  // gain au survol, atténuation, aplat de la pièce mise en avant
uniform vec3 uGhostLook;  // opacité, part du remplissage conservée, part de la teinte de statut conservée
uniform vec3 uFlowLook;   // densité, vitesse, surbrillance
uniform vec3 uHeatLook;   // paliers, luminosité par palier, lignes de niveau
uniform float uAlphaMax;
uniform float uDepthCue;   // 0 = aucun ; sinon opacité résiduelle de la moitié du corps opposée à la caméra

varying vec3 vWorldPos;
varying vec3 vWorldNormal;
varying vec2 vUv;

// Répartition ILLUSTRATIVE (hypothèse) de la dose sur le corps : champ lisse et symétrique (gauche = droite).
// Plus exposé : tête, épaules, membres fins. Moins exposé : tronc et bassin (auto-blindage par les tissus).
float heatField(vec3 p) {
  float ax = abs(p.x);
  float h = 0.30;
  h += 0.35 * smoothstep(1.20, 1.72, p.y);                                          // tête et épaules
  h += 0.25 * smoothstep(0.16, 0.36, ax);                                           // bras et mains
  h += 0.18 * (1.0 - smoothstep(0.10, 0.55, p.y));                                  // jambes et pieds
  h -= 0.30 * exp(-pow((p.y - 1.05) / 0.28, 2.0)) * (1.0 - smoothstep(0.06, 0.20, ax)); // tronc, bassin
  return clamp(h / 0.70, 0.0, 0.999);
}

void main() {
  vec3 V = normalize(cameraPosition - vWorldPos);
  vec3 N = normalize(vWorldNormal);
  float ndv = abs(dot(N, V));
  float fres = pow(1.0 - ndv, uFresnelPower);

  // organe non mis en avant : sa teinte de statut s'éteint à moitié (l'œil va à l'organe survolé / épinglé)
  float tintMix = uTintMix * (1.0 - 0.5 * uDim);
  vec3 col = mix(uColor, uTint, tintMix);

  float a = uCore + uRim * fres;
  a += tintMix * uTintLook.y * (0.4 + 0.6 * ndv);

  // carte de chaleur (calque exposition)
  if (uHeat > 0.5) {
    float h = heatField(vWorldPos);
    float f = fract(h * uHeatLook.x);
    float q = floor(h * uHeatLook.x) / max(1.0, uHeatLook.x - 1.0);   // palier normalisé 0..1
    float line = (smoothstep(0.92, 1.0, f) + (1.0 - smoothstep(0.0, 0.08, f))) * step(0.02, h) * step(h, 0.985);
    // paliers DISCRETS et LINÉAIRES en luminance (pas en teinte : la couleur reste réservée aux statuts)
    a = uCore + uHeatLook.y * q + line * uHeatLook.z * (0.06 + 0.16 * q) + uRim * fres * (0.35 + 0.65 * q);
    // la teinte de statut (ambre / rouge si la dose dépasse le repère) ne colore que les zones les plus exposées
    col = mix(uColor, uTint, clamp(uTintMix * smoothstep(0.55, 0.8, q), 0.0, 1.0));
  }

  if (!gl_FrontFacing) a *= uBackFace;

  // repère de profondeur (rendu additif sans tri) : la moitié du corps opposée à la caméra s'efface,
  // sinon dos et face se superposent et le calque se lit « de dos ». L'axe du corps est x = z = 0.
  if (uDepthCue > 0.0) {
    float toward = dot(vWorldPos.xz, normalize(cameraPosition.xz + vec2(0.0, 1e-5)));
    a *= mix(uDepthCue, 1.0, smoothstep(-0.05, 0.035, toward));
  }

  // flux sanguin : tirets qui courent le long du vaisseau (uv.x = mètres)
  if (uFlow > 0.0) {
    float f = fract(vUv.x * uFlowLook.x - uTime * uFlowLook.y * uFlowLook.x);
    float pulse = smoothstep(0.78, 0.96, f) * (1.0 - smoothstep(0.96, 1.0, f));
    a *= 1.0 + uFlow * pulse * uFlowLook.z;
  }

  // corps projeté : même rendu, plus léger, surtout le contour (pas de trame)
  if (uGhost > 0.001) {
    float ga = (uCore * uGhostLook.y + uRim * fres + tintMix * uTintLook.y * uGhostLook.y) * uGhostLook.x;
    a = mix(a, ga, uGhost);
    // une prévision n'est pas une alarme : la teinte de statut ne subsiste qu'en trace, comme les marqueurs en contour
    col = mix(col, mix(uColor, uTint, tintMix * uGhostLook.z), uGhost);
  }

  // survol / sélection : renfort d'opacité + aplat mat de la pièce (elle se détache même en nominal) ; la couleur ne change pas
  a *= 1.0 + uHighlight * uHoverLook.x;
  a += uHighlight * uHoverLook.z * (0.45 + 0.55 * ndv) * (gl_FrontFacing ? 1.0 : uBackFace);
  a *= 1.0 - uDim * uHoverLook.y;

  a = min(a, uAlphaMax) * uOpacity;
  gl_FragColor = vec4(col, a);
  #include <colorspace_fragment>
}
`;

/**
 * Crée un matériau hologramme. Uniforms pilotables (contrat) : uTime, uColor, uTint, uTintMix,
 * uOpacity, uHighlight, uGhost, uDim. Ajouts : uCore, uRim, uFresnelPower, uFlow, uHeat.
 * uTime (secondes) n'anime plus que le flux sanguin, s'il est activé dans look.flow.
 */
export function createHologramMaterial(opts: HologramOpts = {}): THREE.ShaderMaterial {
  const L = look.layers[opts.layer ?? 'organes'];
  const h = look.holo;
  return new THREE.ShaderMaterial({
    vertexShader,
    fragmentShader,
    uniforms: {
      uTime: { value: 0 },
      uColor: { value: new THREE.Color(opts.color ?? tokens.color.holo) },
      uTint: { value: new THREE.Color(tokens.color.holo) },
      uTintMix: { value: 0 },
      uOpacity: { value: opts.opacity ?? 1 },
      uHighlight: { value: 0 },
      uGhost: { value: opts.ghost ? 1 : 0 },
      uDim: { value: 0 },
      uCore: { value: L.core },
      uRim: { value: L.rim },
      uFresnelPower: { value: L.fresnelPower },
      uFlow: { value: opts.fx === 'flow' ? 1 : 0 },
      uHeat: { value: opts.fx === 'heat' ? 1 : 0 },
      uBackFace: { value: h.backFace },
      uTintLook: { value: new THREE.Vector2(0, h.tintCore) },
      uHoverLook: { value: new THREE.Vector3(h.highlightBoost, h.dimFactor, h.highlightFill) },
      uGhostLook: { value: new THREE.Vector3(look.ghost.opacity, look.ghost.fill, look.ghost.tint) },
      uFlowLook: { value: new THREE.Vector3(look.flow.density, look.flow.speed, look.flow.boost) },
      uHeatLook: { value: new THREE.Vector3(look.heat.levels, look.heat.gain, look.heat.contour) },
      uAlphaMax: { value: h.alphaMax },
      uDepthCue: { value: look.depthCue[opts.layer ?? 'organes'] ?? 0 },
    },
    transparent: true,
    depthWrite: false,
    depthTest: false,
    side: THREE.DoubleSide,
    blending: THREE.AdditiveBlending,
    toneMapped: false,
  });
}
