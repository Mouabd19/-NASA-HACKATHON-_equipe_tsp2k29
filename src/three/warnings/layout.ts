// Mise en page écran des étiquettes d'alerte (pur, sans React ni three) : colonnes gauche/droite + dé-chevauchement vertical.

export interface Slot {
  /** y écran souhaité (centre de l'étiquette) = y de l'ancre. */
  want: number;
  /** y écran attribué (centre de l'étiquette), écrit par deOverlap. */
  y: number;
}

/**
 * Dé-chevauche une colonne : trie sur y, pousse vers le bas ce qui se recouvre,
 * puis remonte l'ensemble si la colonne dépasse en bas. Modifie `y` en place.
 */
export function deOverlap(slots: Slot[], step: number, top: number, bottom: number): void {
  if (!slots.length) return;
  const sorted = slots.slice().sort((a, b) => a.want - b.want);
  let prev = -Infinity;
  for (const s of sorted) {
    s.y = Math.max(s.want, prev + step, top);
    prev = s.y;
  }
  let next = Infinity;
  for (let i = sorted.length - 1; i >= 0; i--) {
    const s = sorted[i];
    s.y = Math.min(s.y, next - step, bottom);
    next = s.y;
  }
}

/**
 * Trait coudé ancre → plaque : un segment HORIZONTAL au départ de l'ancre, puis un segment oblique (45° si la place
 * le permet) qui arrive sur la plaque. Le coude est côté plaque : sur le corps, les traits d'une même colonne sont
 * parallèles et, les plaques étant rangées dans l'ordre des ancres, ils ne se croisent jamais.
 * Renvoie la chaîne `points` d'un <polyline>. `side` = +1 plaque à droite, −1 à gauche.
 */
export function elbowPoints(ax: number, ay: number, ex: number, ey: number, side: number, trim: number): string {
  const reach = Math.abs(ex - ax);
  const dy = ey - ay;
  const run = Math.min(Math.abs(dy), Math.max(0, reach - trim - 8));
  const kx = ex - side * run;                 // coude, côté plaque
  const sx = ax + side * Math.min(trim, Math.max(0, Math.abs(kx - ax)));
  if (Math.abs(dy) < 1.5) return `${r(sx)},${r(ey)} ${r(ex)},${r(ey)}`;
  return `${r(sx)},${r(ay)} ${r(kx)},${r(ay)} ${r(ex)},${r(ey)}`;
}

/** Arrondi au demi-pixel : un trait de 1 px reste net. */
function r(v: number): number {
  return Math.round(v) + 0.5;
}
