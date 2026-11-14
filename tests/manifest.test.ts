// public/models/manifest.json : format ModelManifest (§6) + ancres du contrat 3D.
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { getDayBody } from '../src/sim/load';
import type { ModelManifest } from '../src/types';

const manifest = JSON.parse(readFileSync(new URL('../public/models/manifest.json', import.meta.url), 'utf8')) as ModelManifest;

const ANCHORS: Record<string, [number, number, number]> = {
  hanche: [0.14, 0.93, 0.02], rachis: [0, 1.15, -0.06], femur: [0.13, 0.82, 0.02], cuisse: [-0.13, 0.68, 0.04],
  mollet: [-0.11, 0.3, -0.03], paravertebraux: [0.05, 1.1, -0.09], coeur: [0.04, 1.3, 0.05], poumons: [-0.09, 1.32, 0.03],
  foie: [-0.07, 1.15, 0.06], reins: [0.07, 1.08, -0.04], cerveau: [0, 1.66, 0], yeux: [0.035, 1.63, 0.09],
  sang: [0.0, 1.2, 0.07], dose: [0, 1.0, 0.1],
};

describe('manifest.json', () => {
  it('ancres conformes au contrat', () => {
    expect(Object.fromEntries(manifest.organs.map((o) => [o.id, o.anchor]))).toEqual(ANCHORS);
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
