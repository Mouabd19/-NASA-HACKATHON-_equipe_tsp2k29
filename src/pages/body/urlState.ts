// État de la page Body <-> paramètres d'URL : chaque état visuel devient un lien partageable
// (revue, captures automatiques de scripts/review-shots.mjs).
//
//   day=94 | today | sol0 | end      jour affiché (0..860)
//   layers=squelette,muscles | all | none
//   organ=hanche                      organe épinglé (caméra recentrée)
//   hover=hanche                      organe survolé (carte de survol)
//   window=hanche | global            fenêtre organe ouverte
//   plan=0|1                          0 = rythme actuel, 1 = avec le plan
//   blood=hemoglobine                 ligne de sang dépliée
//   noscan=1                          (lecture seule) pas de balayage au chargement
//
// Au montage, l'URL gagne : seuls les paramètres présents écrasent le store. Ensuite, le store
// est recopié dans l'URL (history.replaceState, limité à une écriture toutes les 150 ms).
import { useEffect, useState } from 'react';
import type { LayerId } from '../../types';
import { DAY_END, DAY_SOL0, DAY_TODAY } from '../../mocks/mission';
import { LAYER_ORDER, useBody } from './store';
import type { BodyState } from './store';

const THROTTLE_MS = 150;
const DEFAULT_LAYERS: LayerId[] = ['squelette', 'muscles', 'organes'];
/** Paramètres gérés ici ; tout autre paramètre de l'URL (noscan…) est conservé tel quel. */
const OWNED = ['day', 'layers', 'organ', 'hover', 'window', 'plan', 'blood'] as const;

const DAY_ALIASES: Record<string, number> = { today: DAY_TODAY, sol0: DAY_SOL0, end: DAY_END, start: 0 };

function parseDay(raw: string): number | null {
  const alias = DAY_ALIASES[raw.toLowerCase()];
  if (alias !== undefined) return alias;
  const n = Number(raw.replace(/^[jd]/i, ''));
  return Number.isFinite(n) ? Math.max(0, Math.min(DAY_END, Math.round(n))) : null;
}

function parseLayers(raw: string): Record<LayerId, boolean> {
  const out = Object.fromEntries(LAYER_ORDER.map((l) => [l, false])) as Record<LayerId, boolean>;
  const v = raw.trim().toLowerCase();
  if (v === 'all') { for (const l of LAYER_ORDER) out[l] = true; return out; }
  if (v === '' || v === 'none') return out;
  for (const part of v.split(',')) {
    const id = part.trim() as LayerId;
    if (LAYER_ORDER.includes(id)) out[id] = true;
  }
  return out;
}

/** Sous-ensemble du store décrit par une chaîne de requête (seulement les clés présentes). */
export function readUrlState(search: string): Partial<BodyState> {
  const q = new URLSearchParams(search);
  const patch: Partial<BodyState> = {};
  const day = q.get('day');
  if (day !== null) { const d = parseDay(day); if (d !== null) patch.day = d; }
  const layers = q.get('layers');
  if (layers !== null) patch.layers = parseLayers(layers);
  const organ = q.get('organ');
  if (organ !== null) patch.selected = organ || null;
  const hover = q.get('hover');
  if (hover !== null) patch.hovered = hover || null;
  const win = q.get('window');
  if (win !== null) patch.organWindow = win || null;
  const plan = q.get('plan');
  if (plan !== null) patch.adherence = plan === '1' ? 1 : 0;
  const blood = q.get('blood');
  if (blood !== null) patch.bloodAnalyte = blood || null;
  return patch;
}

type UrlSlice = Pick<BodyState, 'day' | 'layers' | 'selected' | 'hovered' | 'organWindow' | 'adherence' | 'bloodAnalyte'>;

/** Chaîne de requête décrivant le store ; les valeurs par défaut sont omises (URL courte). */
export function writeUrlState(s: UrlSlice, currentSearch: string): string {
  const q = new URLSearchParams(currentSearch);
  for (const k of OWNED) q.delete(k);
  if (s.day !== DAY_TODAY) q.set('day', String(s.day));
  const on = LAYER_ORDER.filter((l) => s.layers[l]);
  const isDefault = on.length === DEFAULT_LAYERS.length && DEFAULT_LAYERS.every((l) => s.layers[l]);
  if (!isDefault) q.set('layers', on.length === 0 ? 'none' : on.length === LAYER_ORDER.length ? 'all' : on.join(','));
  if (s.selected) q.set('organ', s.selected);
  if (s.hovered) q.set('hover', s.hovered);
  if (s.organWindow) q.set('window', s.organWindow);
  if (s.adherence === 1) q.set('plan', '1');
  if (s.bloodAnalyte) q.set('blood', s.bloodAnalyte);
  // les virgules restent lisibles dans le lien
  const str = q.toString().replace(/%2C/gi, ',');
  return str ? `?${str}` : '';
}

/** Applique l'URL courante au store (l'URL gagne). */
export function applyUrlToStore(): void {
  if (typeof window === 'undefined') return;
  const patch = readUrlState(window.location.search);
  if (Object.keys(patch).length > 0) useBody.setState(patch);
}

/**
 * Synchronisation bidirectionnelle store <-> URL pour la page Body.
 * À appeler une fois, en haut de <Body/> : l'URL est lue AVANT le premier rendu des enfants
 * (la scène 3D démarre donc directement dans l'état demandé).
 */
export function useUrlState(): void {
  useState(() => { applyUrlToStore(); return 0; });

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | 0 = 0;
    let last = 0;

    const flush = (): void => {
      timer = 0;
      last = Date.now();
      if (!window.location.pathname.startsWith('/body')) return;
      const next = writeUrlState(useBody.getState(), window.location.search);
      if (next !== window.location.search) {
        window.history.replaceState(window.history.state, '', window.location.pathname + next + window.location.hash);
      }
    };
    const schedule = (): void => {
      if (timer) return;
      timer = setTimeout(flush, Math.max(0, THROTTLE_MS - (Date.now() - last)));
    };

    const unsub = useBody.subscribe((s, p) => {
      if (
        s.day !== p.day || s.layers !== p.layers || s.selected !== p.selected || s.hovered !== p.hovered
        || s.organWindow !== p.organWindow || s.adherence !== p.adherence || s.bloodAnalyte !== p.bloodAnalyte
      ) schedule();
    });
    const onPop = (): void => applyUrlToStore();
    window.addEventListener('popstate', onPop);
    schedule(); // normalise l'URL dès le montage

    return () => {
      unsub();
      window.removeEventListener('popstate', onPop);
      if (timer) clearTimeout(timer);
    };
  }, []);
}
