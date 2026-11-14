// Générateur pseudo-aléatoire à graine fixe (mulberry32) : même graine → mêmes données.

export interface Rng {
  next(): number;                         // [0, 1)
  gauss(sd?: number): number;             // N(0, sd²), borné à ±3 sd
  int(min: number, max: number): number;  // entier dans [min, max]
}

export function createRng(seed: number): Rng {
  let a = seed >>> 0;
  const next = () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  const gauss = (sd = 1) => {
    const u = 1 - next();
    const v = next();
    const z = Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
    return Math.max(-3, Math.min(3, z)) * sd;
  };
  const int = (min: number, max: number) => min + Math.floor(next() * (max - min + 1));
  return { next, gauss, int };
}
