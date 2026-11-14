// public/models/manifest.json : format ModelManifest (§6) + ancres du contrat 3D.
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { getDayBody } from '../src/sim/load';
import type { ModelManifest } from '../src/types';

const manifest = JSON.parse(readFileSync(new URL('../public/models/manifest.json', import.meta.url), 'utf8')) as ModelManifest;

// Ancres calculées sur la géométrie Z-Anatomy (Steve) : on vérifie leur présence et leur plausibilité
// (dans le volume du corps : pieds y ≈ 0, sommet ≈ 1,72 m, largeur ±0,4 m, profondeur ±0,25 m).
const ORGANS = ['hanche', 'rachis', 'femur', 'cuisse', 'mollet', 'paravertebraux', 'coeur', 'poumons', 'foie', 'reins', 'cerveau', 'yeux', 'sang', 'dose'];

describe('manifest.json', () => {
  it('ancres conformes au contrat', () => {
    expect(manifest.organs.map((o) => o.id).sort()).toEqual([...ORGANS].sort());
    for (const o of manifest.organs) {
      const [x, y, z] = o.anchor;
      expect(Math.abs(x)).toBeLessThan(0.4);
      expect(y).toBeGreaterThan(0);
      expect(y).toBeLessThan(1.8);
      expect(Math.abs(z)).toBeLessThan(0.25);
    }
  });
  it('calques et organes cohérents avec le corps du jour', () => {
    const body = getDayBody(94);
    expect(manifest.layers.map((l) => l.id)).toEqual(['squelette', 'muscles', 'organes', 'cardio', 'nerveux', 'exposition']);
    for (const l of manifest.layers) {
      expect(l.file).toMatch(/\.glb$/);
      for (const id of l.organs) expect(body.organs.find((o) => o.id === id)?.layer).toBe(l.id);
    }
    expect(manifest.layers.flatMap((l) => l.organs).sort()).toEqual(body.organs.map((o) => o.id).sort());
    expect(manifest.credits).toMatch(/Z-Anatomy/);
    expect(manifest.credits).toMatch(/CC BY-SA 4\.0/);
  });
});
