// MOCKS (Walid) — contenus factices : normes, délai radio, synthèses par organe, bibliothèque.
// Aucune citation de norme n'est verbatim : `verified: false` tant que Steve n'a pas vérifié le PDF.
import type { DayBody, Metric, OrganId, OrganState, OrganSummary } from '../types';
import { DAY_END, DAY_SOL0, DAY_TODAY } from './mission';
import { lossPct, VO2_SOL0, vo2max } from './curves';
import { mockDayBody } from './body';
import { dayOfDate, fr, round } from './util';

// --- Normes ---------------------------------------------------------------------------------
export const NASA_STD_3001_URL =
  'https://standards.nasa.gov/sites/default/files/standards/NASA/C//nasa-std-3001-vol-1-rev-c-signature.pdf';

export interface Standard { id: string; title: string; quote: string; url: string; verified: boolean }

const STANDARDS: Record<string, Standard> = {
  'V1 4027': {
    id: 'V1 4027',
    title: 'NASA-STD-3001 Vol. 1 Rév. C — [V1 4027] Densité minérale osseuse en mission',
    quote: 'Résumé (à vérifier sur le PDF) : la masse osseuse doit rester ≥ 95 % de la valeur pré-vol à la hanche et ≥ 90 % au col du fémur.',
    url: NASA_STD_3001_URL,
    verified: false,
  },
  'V1 4003': {
    id: 'V1 4003',
    title: 'NASA-STD-3001 Vol. 1 Rév. C — [V1 4003] Capacité aérobie en mission',
    quote: 'Résumé (à vérifier sur le PDF) : la capacité aérobie en vol doit être maintenue à ≥ 80 % de la valeur pré-vol.',
    url: NASA_STD_3001_URL,
    verified: false,
  },
  'V1 4002': {
    id: 'V1 4002',
    title: 'NASA-STD-3001 Vol. 1 Rév. C — [V1 4002] Capacité aérobie minimale',
    quote: 'Résumé (à vérifier sur le PDF) : VO₂max ≥ 36,5 ml/kg/min pour les tâches exigeantes (sortie, opérations de surface).',
    url: NASA_STD_3001_URL,
    verified: false,
  },
};

export function mockStandard(id: string): Standard {
  return STANDARDS[id.trim()] ?? {
    id, title: `Norme ${id} — non référencée`, quote: 'Référence absente de la base locale (à compléter).', url: NASA_STD_3001_URL, verified: false,
  };
}
export const STANDARD_IDS = Object.keys(STANDARDS);

// --- Délai radio Terre–Mars -----------------------------------------------------------------
// Table figée (sera remplacée par horizons.json, JPL Horizons). Entre deux points : modèle circulaire
// coplanaire recalé pour donner exactement 11,01 min le 2026-11-14 [mock].
const LIGHT_TABLE: Record<string, number> = { '2026-11-14': 11.01 };
const AU_LIGHT_MIN = 8.3167;
const SYNODIC_DAYS = 779.94;
const OPPOSITION = '2027-02-19';
const MARS_AU = 1.524;
const circular = (date: string) => {
  const days = (Date.parse(`${date.slice(0, 10)}T00:00:00Z`) - Date.parse(`${OPPOSITION}T00:00:00Z`)) / 86_400_000;
  const theta = (2 * Math.PI * days) / SYNODIC_DAYS;
  return AU_LIGHT_MIN * Math.sqrt(1 + MARS_AU ** 2 - 2 * MARS_AU * Math.cos(theta));
};
const CALIB = LIGHT_TABLE['2026-11-14'] / circular('2026-11-14');

/** Temps lumière aller simple Terre–Mars, en minutes. */
export function mockLightTimeMin(date: string): number {
  const key = date.slice(0, 10);
  if (LIGHT_TABLE[key] !== undefined) return LIGHT_TABLE[key];
  const v = circular(key) * CALIB;
  return Number.isFinite(v) ? round(v, 2) : NaN;
}

/** 'table' si la date est tabulée, sinon 'approx' (orbite circulaire recalée — hypothèse d'équipe). */
export function mockLightTimeSource(date: string): 'table' | 'approx' {
  return LIGHT_TABLE[date.slice(0, 10)] !== undefined ? 'table' : 'approx';
}

// --- Synthèses par organe (texte gabarit, hors ligne, à partir des chiffres du corps du jour) -
export const SUMMARY_KEY_DAYS = [0, 30, 60, DAY_TODAY, DAY_SOL0, DAY_END].sort((a, b) => a - b);

const val = (o: OrganState, key: string): Metric | undefined => o.metrics.find((m) => m.key === key);
const when = (b: DayBody) =>
  b.day === 0 ? 'Bilan de référence J0'
    : b.projected ? `Projection J${b.day} au rythme actuel (modèle, pas une mesure)`
      : `J${b.day}`;
const STATUS_TXT = { green: 'nominal', amber: 'à surveiller (ambre)', red: 'hors seuil (rouge)', grey: 'inconnu' } as const;
const trendSentence = (m?: Metric) =>
  m?.trend7d === undefined ? '' : ` La tendance sur 7 jours est de ${m.trend7d > 0 ? '+' : '−'}${fr(Math.abs(m.trend7d), 2)} %/semaine.`;

function summaryText(o: OrganState, b: DayBody): string | null {
  const gap = o.bioAge - o.chronoAge;
  const age = ` Écart d'âge estimé [H] : +${fr(gap, 1)} an${round(gap, 1) >= 2 ? 's' : ''} (équivalent en années, en partie réversible au retour).`;
  switch (o.id) {
    case 'hanche': case 'rachis': case 'femur': {
      const d = val(o, 'densite_osseuse');
      const thr = d?.ref?.low ?? 95;
      const end = lossPct(o.id, DAY_END, 0) as number;
      const endPlan = lossPct(o.id, DAY_END, 1) as number;
      return `${when(b)} : la densité osseuse estimée (${o.name.toLowerCase()}) est à ${fr(d?.value ?? NaN, 2)} % du pré-vol, soit une perte de ${fr(100 - (d?.value ?? NaN), 2)} % ; statut ${STATUS_TXT[o.status]}. ` +
        `Cette valeur vient du modèle recalé sur le bilan au sol et sur les marqueurs urinaires : le scanner ne mesure pas l'os. ` +
        `Seuil NASA V1 4027 : ≥ ${thr} %. À J${DAY_END}, la perte atteindrait ${fr(end, 2)} % au rythme actuel contre ${fr(endPlan, 2)} % avec le plan suivi.${age}`;
    }
    case 'cuisse': case 'mollet': case 'paravertebraux': {
      const v = val(o, 'volume');
      return `${when(b)} : le volume musculaire (${o.name.toLowerCase()}) est à ${fr(v?.value ?? NaN, 1)} % de J0 au scan, statut ${STATUS_TXT[o.status]}.${trendSentence(v)} ` +
        `Le point du jour est bruité (± ${fr(v?.noise ?? 0, 1)} point) : seule la tendance sur 7 jours déclenche une alerte. ` +
        `Contre-mesure proposée : travail en charge sur ARED et apport protéique maintenu.${age}`;
    }
    case 'coeur': {
      const v = val(o, 'vo2max');
      const p = val(o, 'vo2_pct');
      const fe = val(o, 'fraction_ejection');
      return `${when(b)} : VO₂max à ${fr(v?.value ?? NaN, 1)} ml/kg/min, soit ${fr(p?.value ?? NaN, 1)} % du pré-vol ; statut ${STATUS_TXT[o.status]}. ` +
        `Fraction d'éjection au scan : ${fr(fe?.value ?? NaN, 0)} %, dans la référence. ` +
        `Au rythme actuel, l'arrivée (Sol 0) se ferait à ${fr(vo2max(DAY_SOL0, 0), 1)} ml/kg/min, à la limite du seuil ${fr(VO2_SOL0, 1)} [NASA V1 4002] ; avec le plan, ${fr(vo2max(DAY_SOL0, 1), 1)}.${age}`;
    }
    case 'reins': {
      const c = val(o, 'calcium_urinaire');
      const k = val(o, 'calculs');
      return `${when(b)} : ${k?.value ? `${k.value} calcul(s) détecté(s)` : 'aucun calcul détecté'} au scan ; calcium urinaire à ${fr(c?.value ?? NaN, 0)} mg/24 h (référence < 300), statut ${STATUS_TXT[o.status]}.${trendSentence(c)} ` +
        `La hausse du calcium urinaire accompagne la perte osseuse et augmente le risque de calculs. ` +
        `Conduite proposée : hydratation renforcée et contrôle des reins au prochain scan.`;
    }
    case 'sang': {
      const hb = val(o, 'hemoglobine');
      const s = val(o, 'spo2');
      const j = val(o, 'volume_jambes');
      return `${when(b)} : hémoglobine à ${fr(hb?.value ?? NaN, 1)} g/dL (référence 13,5–17,5), en légère baisse depuis J0, compatible avec l'anémie spatiale. ` +
        `SpO₂ à ${fr(s?.value ?? NaN, 0)} %, stable. Le volume des jambes est à ${fr(j?.value ?? NaN, 1)} % de J0 : déplacement des fluides vers le haut du corps, attendu en apesanteur. ` +
        `Statut ${STATUS_TXT[o.status]} ; le VO₂max est suivi avec le cœur.`;
    }
    case 'yeux': {
      const g = val(o, 'gaine_nerf_optique');
      return `${when(b)} : le diamètre de la gaine du nerf optique est de ${fr(g?.value ?? NaN, 2)} mm (repère de vigilance 5,5 mm [H]), statut ${STATUS_TXT[o.status]}.${trendSentence(g)} ` +
        `Cette mesure reflète la pression intracrânienne et le risque oculaire SANS. ` +
        `Conduite proposée : test de vision et transmission des mesures au médecin au sol.`;
    }
    case 'dose': {
      const d = val(o, 'dose_cumulee');
      const j = val(o, 'dose_jour');
      return `${when(b)} : dose cumulée de ${fr(d?.value ?? NaN, 0)} mSv, conforme au prévu ; dose du jour ${fr(j?.value ?? NaN, 2)} mSv. ` +
        `Référence de croisière : 1,84 mSv/j [Publié RAD]. Le repère de 600 mSv est une hypothèse d'équipe [H] à vérifier. ` +
        `Statut ${STATUS_TXT[o.status]}.`;
    }
    default:
      return null; // organe non modélisé : pas de synthèse
  }
}

const summaryCache = new Map<string, OrganSummary | null>();

/** Synthèse du jour clé le plus proche (J0, J30, J60, J94, Sol 0, J860). null si l'organe n'est pas modélisé. */
export function mockSummary(organId: OrganId, day: number): OrganSummary | null {
  let key = SUMMARY_KEY_DAYS[0];
  for (const k of SUMMARY_KEY_DAYS) if (Math.abs(k - day) < Math.abs(key - day)) key = k;
  const ck = `${organId}/${key}`;
  if (summaryCache.has(ck)) return summaryCache.get(ck) ?? null;
  const body = mockDayBody(key);
  const o = body.organs.find((x) => x.id === organId);
  const text = o && o.status !== 'grey' ? summaryText(o, body) : null;
  const out: OrganSummary | null = text ? { organId, day: key, text, generatedBy: 'IA-sol', reviewed: false } : null;
  summaryCache.set(ck, out);
  return out;
}

// --- Bibliothèque (exercices, menus, textes « Pourquoi ? ») ---------------------------------
export interface Exercise {
  id: string; title: string; device: 'ARED' | 'CEVIS' | 'T2' | 'aucun';
  durationMin: number; intensity: string; target: OrganId[]; detail: string;
}
export interface Meal {
  id: string; title: string; items: string[];
  kcal: number; proteinG: number; calciumMg: number; vitaminDUI: number;
}

const EXERCISES: Exercise[] = [
  { id: 'ared-squat-sdt', title: 'ARED — squat 4×8 + soulevé de terre 4×6', device: 'ARED', durationMin: 45, intensity: 'charge lourde (≈ 80 % 1RM)', target: ['hanche', 'femur', 'rachis', 'cuisse'], detail: 'Charge axiale élevée : stimule la formation osseuse de la hanche et du rachis.' },
  { id: 'ared-cuisse', title: 'ARED — fentes 3×10 + extension de hanche 3×12', device: 'ARED', durationMin: 25, intensity: 'charge modérée', target: ['cuisse', 'mollet'], detail: 'Renforcement ciblé du quadriceps après le décrochage de la tendance 7 j.' },
  { id: 'cevis-intervalles', title: 'Vélo CEVIS — intervalles 6×3 min', device: 'CEVIS', durationMin: 35, intensity: '90 % FC max, récupération 2 min', target: ['coeur', 'sang'], detail: 'Protocole par intervalles pour freiner la baisse du VO₂max.' },
  { id: 't2-continu', title: 'Tapis T2 — course continue', device: 'T2', durationMin: 30, intensity: '70 % FC max', target: ['coeur', 'mollet'], detail: 'Entretien aérobie et impact au sol.' },
  { id: 'ared-entretien', title: 'ARED — séance d’entretien', device: 'ARED', durationMin: 35, intensity: 'charge standard', target: ['hanche', 'cuisse', 'paravertebraux'], detail: 'Protocole de base, hors alerte.' },
];
const MEALS: Meal[] = [
  { id: 'dej-calcium', title: 'Déjeuner — saumon, riz, épinards, yaourt enrichi', items: ['Saumon réhydraté', 'Riz complet', 'Épinards', 'Yaourt enrichi en calcium'], kcal: 780, proteinG: 46, calciumMg: 520, vitaminDUI: 600 },
  { id: 'diner-proteines', title: 'Dîner — poulet, lentilles, fromage, compote', items: ['Poulet thermostabilisé', 'Lentilles', 'Fromage', 'Compote'], kcal: 820, proteinG: 58, calciumMg: 380, vitaminDUI: 80 },
  { id: 'dej-standard', title: 'Déjeuner — menu standard', items: ['Bœuf', 'Pâtes', 'Légumes', 'Fruit sec'], kcal: 750, proteinG: 40, calciumMg: 260, vitaminDUI: 60 },
  { id: 'diner-standard', title: 'Dîner — menu standard', items: ['Dinde', 'Purée', 'Haricots verts', 'Biscuit'], kcal: 760, proteinG: 42, calciumMg: 240, vitaminDUI: 60 },
];
const WHY: Record<string, string> = {
  'V1 4027': 'La norme NASA demande de garder la densité osseuse au-dessus de 95 % du pré-vol à la hanche (90 % au col du fémur). Votre estimation s’en rapproche : on agit maintenant, tant que c’est réversible.',
  'V1 4003': 'La norme NASA demande de garder au moins 80 % de la capacité aérobie d’avant le vol. Votre VO₂max baisse : les intervalles sont le moyen le plus efficace de le retenir.',
  'V1 4002': 'Il faut au moins 36,5 ml/kg/min de VO₂max pour les tâches exigeantes à l’arrivée. Au rythme actuel, vous arriveriez juste à la limite.',
  'TENDANCE-7J': 'Une mesure isolée peut être bruitée. On alerte seulement quand la pente des 7 derniers jours sort de la bande de bruit du scanner.',
  'SANS-ONSD': 'Le diamètre de la gaine du nerf optique reflète la pression dans le crâne. Sa hausse est un signe précoce du syndrome oculaire SANS.',
  'CALCIUM-U': 'Le calcium libéré par les os passe dans les urines et augmente le risque de calculs rénaux.',
  'RAD-DOSE': 'La dose se cumule tout au long de la mission ; on la compare au prévu (1,84 mSv/j en croisière).',
};

export function mockExercise(id: string): Exercise | null { return EXERCISES.find((e) => e.id === id) ?? null; }
export function mockMeal(id: string): Meal | null { return MEALS.find((m) => m.id === id) ?? null; }
export function mockWhyText(rule: string): string {
  return WHY[rule] ?? 'Explication non disponible pour cette règle (contenu à compléter).';
}

/** Jour de mission d'une date ISO (utile pour le délai radio du jour). */
export const missionDayOf = dayOfDate;
