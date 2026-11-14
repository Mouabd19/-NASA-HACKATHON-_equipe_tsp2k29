// Matériau « hologramme médical » : blanc-bleuté désaturé, liseré fresnel, fines lignes
// de balayage, léger scintillement, mélange additif (aucun artefact de tri), teinte de statut.
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

/** Hauteur de plan « hors champ » : tout le corps est sous le plan (teintes révélées), pas de bande visible. */
export const SCAN_Y_IDLE = 1000;

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
uniform float uScanY;
uniform float uDim;
uniform float uCore;
uniform float uRim;
uniform float uFresnelPower;
uniform float uFlow;
uniform float uHeat;
uniform float uBackFace;
uniform vec3 uScanline;   // densité, contraste, vitesse
uniform float uFlicker;
uniform vec2 uTintLook;   // surbrillance, remplissage
uniform vec2 uHoverLook;  // gain au survol, atténuation
uniform vec3 uGhostLook;  // opacité, densité des tirets, remplissage
uniform vec2 uScanLook;   // épaisseur de bande, intensité
uniform vec3 uFlowLook;   // densité, vitesse, surbrillance
uniform vec3 uHeatLook;   // paliers, gain, lignes de niveau
uniform float uAlphaMax;

varying vec3 vWorldPos;
varying vec3 vWorldNormal;
varying vec2 vUv;

float heatField(vec3 p) {
  float h = 0.50 + 0.20 * sin(p.y * 4.2 + 0.6) + 0.16 * sin(p.x * 9.0 + p.y * 3.0)
          + 0.12 * sin(p.z * 14.0 - p.y * 6.0 + 1.7);
  h += 0.22 * smoothstep(1.25, 1.75, p.y);                                         // tête et épaules : moins de matière autour
  h -= 0.26 * exp(-pow((p.y - 1.08) / 0.26, 2.0)) * (1.0 - smoothstep(0.08, 0.2, abs(p.x))); // tronc : auto-blindage
  return smoothstep(0.22, 0.82, h);
}

void main() {
  vec3 V = normalize(cameraPosition - vWorldPos);
  vec3 N = normalize(vWorldNormal);
  float ndv = abs(dot(N, V));
  float fres = pow(1.0 - ndv, uFresnelPower);

  // révélation des teintes par le plan de scan : sous le plan = teinté
  float reveal = smoothstep(0.0, 0.04, uScanY - vWorldPos.y);
  float tintMix = uTintMix * reveal;
  vec3 col = mix(uColor, uTint, tintMix);

  float a = uCore + uRim * fres;
  a += tintMix * uTintLook.y * (0.4 + 0.6 * ndv);

  // carte de chaleur (calque exposition)
  if (uHeat > 0.5) {
    float h = heatField(vWorldPos);
    float f = fract(h * uHeatLook.x);
    float q = floor(h * uHeatLook.x) / uHeatLook.x;
    float line = smoothstep(0.90, 1.0, f) + (1.0 - smoothstep(0.0, 0.10, f));
    a = uCore * (0.25 + q * q * uHeatLook.y) + line * uHeatLook.z * 0.1 * (0.15 + q) + uRim * fres * (0.25 + q);
    col = mix(uColor, uTint, clamp(uTintMix * reveal * (0.25 + q), 0.0, 1.0));
  }

  // lignes de balayage + scintillement
  float sl = 0.5 + 0.5 * sin(vWorldPos.y * uScanline.x * 6.2831853 - uTime * uScanline.z);
  a *= 1.0 - uScanline.y * sl;
  a *= 1.0 - uFlicker * (0.5 + 0.5 * sin(uTime * 31.0 + sin(uTime * 7.3) * 3.0));

  if (!gl_FrontFacing) a *= uBackFace;

  // flux sanguin : tirets qui courent le long du vaisseau (uv.x = mètres)
  if (uFlow > 0.0) {
    float f = fract(vUv.x * uFlowLook.x - uTime * uFlowLook.y * uFlowLook.x);
    float pulse = smoothstep(0.78, 0.96, f) * (1.0 - smoothstep(0.96, 1.0, f));
    a *= 1.0 + uFlow * pulse * uFlowLook.z;
  }

  // corps projeté : fantôme en tranches, surtout le liseré
  if (uGhost > 0.001) {
    float d = fract(vWorldPos.y * uGhostLook.y + uTime * 0.04);
    float dash = smoothstep(0.0, 0.06, d) * (1.0 - smoothstep(uGhostLook.z, uGhostLook.z + 0.06, d));
    float ga = (uCore * 0.35 + uRim * fres + tintMix * uTintLook.y * 0.5) * dash * uGhostLook.x;
    a = mix(a, ga, uGhost);
  }

  // survol / sélection
  a *= 1.0 + uHighlight * uHoverLook.x;
  a *= 1.0 - uDim * uHoverLook.y;
  col *= 1.0 + tintMix * uTintLook.x + uHighlight * 0.25;

  // bande lumineuse là où le plan de scan coupe le maillage
  float band = exp(-abs(vWorldPos.y - uScanY) / uScanLook.x);
  col = mix(col, vec3(1.0), band * 0.7);
  a += band * uScanLook.y * (0.25 + fres);

  a = min(a, uAlphaMax) * uOpacity;
  gl_FragColor = vec4(col, a);
  #include <colorspace_fragment>
}
`;

/**
 * Crée un matériau hologramme. Uniforms pilotables (contrat) : uTime, uColor, uTint, uTintMix,
 * uOpacity, uHighlight, uGhost, uScanY, uDim. Ajouts : uCore, uRim, uFresnelPower, uFlow, uHeat.
 * Penser à avancer uTime (secondes) à chaque frame.
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
      uScanY: { value: SCAN_Y_IDLE },
      uDim: { value: 0 },
      uCore: { value: L.core },
      uRim: { value: L.rim },
      uFresnelPower: { value: L.fresnelPower },
      uFlow: { value: opts.fx === 'flow' ? 1 : 0 },
      uHeat: { value: opts.fx === 'heat' ? 1 : 0 },
      uBackFace: { value: h.backFace },
      uScanline: { value: new THREE.Vector3(h.scanlineDensity, h.scanlineStrength, h.scanlineSpeed) },
      uFlicker: { value: h.flicker },
      uTintLook: { value: new THREE.Vector2(h.tintBoost, h.tintCore) },
      uHoverLook: { value: new THREE.Vector2(h.highlightBoost, h.dimFactor) },
      uGhostLook: { value: new THREE.Vector3(look.ghost.opacity, look.ghost.dashDensity, look.ghost.dashFill) },
      uScanLook: { value: new THREE.Vector2(look.scan.bandWidth, look.scan.bandBoost) },
      uFlowLook: { value: new THREE.Vector3(look.flow.density, look.flow.speed, look.flow.boost) },
      uHeatLook: { value: new THREE.Vector3(look.heat.levels, look.heat.gain, look.heat.contour) },
      uAlphaMax: { value: h.alphaMax },
    },
    transparent: true,
    depthWrite: false,
    depthTest: false,
    side: THREE.DoubleSide,
    blending: THREE.AdditiveBlending,
    toneMapped: false,
  });
}
