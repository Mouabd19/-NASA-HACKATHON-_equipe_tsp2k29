// MOCKS (Walid) — alertes, triage et routeur factices, dérivés du corps du jour (donc cohérents sur toute la timeline).
import type { Alert, Color, Level, LinkPos, Metric, OrganState, RouterOutput, TriageResult } from '../types';
import { DAY_END, DAY_SOL0, DAY_TODAY } from './mission';
import { BONE_THRESHOLD, lossPct, VO2_SOL0, vo2max } from './curves';
import { mockDayBody } from './body';
import { mockCheckIn } from './checkin';
import { fr } from './util';

const LEVEL: Partial<Record<Color, Level>> = { amber: 'AMBRE', red: 'ROUGE' };
const get = (o: OrganState, key: string): Metric | undefined => o.metrics.find((m) => m.key === key);
const trendTxt = (m?: Metric) =>
  m?.trend7d === undefined ? 'tendance 7 j indisponible' : `tendance 7 j ${m.trend7d > 0 ? '+' : '−'}${fr(Math.abs(m.trend7d), 2)} %/sem`;

function boneAlert(o: OrganState, level: Level, name: string): Alert {
  const thr = BONE_THRESHOLD[o.id];
  const dens = get(o, 'densite_osseuse')?.value ?? NaN;
  const loss = get(o, 'perte_osseuse')?.value ?? NaN;
  const end = 100 - (lossPct(o.id, DAY_END, 0) as number);
  const message = level === 'ROUGE'
    ? `Densité estimée ${fr(dens, 2)} % du pré-vol (perte ${fr(loss, 2)} %) : sous le seuil NASA ≥ ${thr} %. Estimation du modèle [H], pas une mesure du scanner.`
    : `Densité estimée ${fr(dens, 2)} % du pré-vol (perte ${fr(loss, 2)} %). Au rythme actuel, projection J${DAY_END} : ${fr(end, 2)} % → ROUGE (seuil NASA ≥ ${thr} %).`;
  return { id: `alert-${o.id}`, organId: o.id, level, title: `${name} — PERTE OSSEUSE ESTIMÉE`, message, rule: 'V1 4027' };
}

function muscleAlert(o: OrganState, level: Level, name: string): Alert {
  const vol = get(o, 'volume');
  return {
    id: `alert-${o.id}`, organId: o.id, level, title: `${name} — ATROPHIE MUSCULAIRE`,
    message: `Volume au scan ${fr(vol?.value ?? NaN, 1)} % de J0, ${trendTxt(vol)} (bruit de mesure ± ${fr(vol?.noise ?? 0, 1)}). Alerte sur la tendance 7 j, pas sur le point du jour.`,
    rule: 'TENDANCE-7J',
  };
}

function organAlert(o: OrganState, level: Level, day: number): Alert | null {
  switch (o.id) {
    case 'hanche': return boneAlert(o, level, 'HANCHE');
    case 'rachis': return boneAlert(o, level, 'RACHIS');
    case 'femur': return boneAlert(o, level, 'COL DU FÉMUR');
    case 'cuisse': return muscleAlert(o, level, 'CUISSE');
    case 'mollet': return muscleAlert(o, level, 'MOLLET');
    case 'paravertebraux': return muscleAlert(o, level, 'PARAVERTÉBRAUX');
    case 'coeur': {
      const v = get(o, 'vo2max')?.value ?? NaN;
      const pct = get(o, 'vo2_pct')?.value ?? NaN;
      const sol0 = vo2max(DAY_SOL0, 0);
      const tail = day < DAY_SOL0
        ? ` Projection Sol 0 (J${DAY_SOL0}) au rythme actuel : ${fr(sol0, 1)} — à la limite du seuil ${fr(VO2_SOL0, 1)} [NASA V1 4002].`
        : ` Seuils : ≥ 80 % du pré-vol [NASA V1 4003], ≥ ${fr(VO2_SOL0, 1)} [NASA V1 4002].`;
      return {
        id: 'alert-coeur', organId: 'coeur', level, title: 'CŒUR — VO₂MAX EN BAISSE',
        message: `VO₂max ${fr(v, 1)} ml/kg/min (−${fr(100 - pct, 2)} % vs pré-vol).${tail}`,
        rule: 'V1 4003',
      };
    }
    case 'yeux': {
      const g = get(o, 'gaine_nerf_optique');
      return {
        id: 'alert-yeux', organId: 'yeux', level, title: 'NERF OPTIQUE — GAINE EN HAUSSE',
        message: `Diamètre de la gaine ${fr(g?.value ?? NaN, 2)} mm (seuil de vigilance 5,5 mm [H]), ${trendTxt(g)}. Reflet de la pression intracrânienne : risque SANS à surveiller.`,
        rule: 'SANS-ONSD',
      };
    }
    case 'reins': {
      const c = get(o, 'calcium_urinaire');
      return {
        id: 'alert-reins', organId: 'reins', level, title: 'REINS — CALCIUM URINAIRE ÉLEVÉ',
        message: `Calcium urinaire ${fr(c?.value ?? NaN, 0)} mg/24 h (référence < 300), ${trendTxt(c)}. Risque de calculs : hydratation renforcée, scan des reins demain.`,
        rule: 'CALCIUM-U',
      };
    }
    case 'dose': {
      const d = get(o, 'dose_cumulee');
      return {
        id: 'alert-dose', organId: 'dose', level, title: 'EXPOSITION — DOSE CUMULÉE',
        message: `Dose cumulée ${fr(d?.value ?? NaN, 0)} mSv (repère 600 mSv [H], 1,84 mSv/j en croisière [Publié RAD]).`,
        rule: 'RAD-DOSE',
      };
    }
    case 'sang': {
      // Le VO₂ est porté par l'alerte « cœur » : ici on n'alerte que sur l'hémoglobine ou la SpO₂.
      const bad = o.metrics.filter((m) => m.key !== 'vo2max' && (m.color === 'amber' || m.color === 'red'));
      if (!bad.length) return null;
      const lvl: Level = bad.some((m) => m.color === 'red') ? 'ROUGE' : 'AMBRE';
      return {
        id: 'alert-sang', organId: 'sang', level: lvl, title: 'SANG — VALEUR HORS RÉFÉRENCE',
        message: bad.map((m) => `${m.label} ${fr(m.value, 1)} ${m.unit}`).join(' · '),
        rule: 'SANG-REF',
      };
    }
    default: return null;
  }
}

const ORDER: Level[] = ['ROUGE', 'ORANGE', 'AMBRE', 'DONNEES_INSUFFISANTES', 'VERT'];
const cache = new Map<number, Alert[]>();

/** Alertes du jour (mesuré ou projeté au rythme actuel), les plus graves d'abord. */
export function mockAlertsForDay(day: number): Alert[] {
  const body = mockDayBody(day);
  const hit = cache.get(body.day);
  if (hit) return hit;
  const out: Alert[] = [];
  for (const o of body.organs) {
    const level = LEVEL[o.status];
    if (!level) continue;
    const a = organAlert(o, level, body.day);
    if (a) out.push(a);
  }
  out.sort((x, y) => ORDER.indexOf(x.level) - ORDER.indexOf(y.level));
  cache.set(body.day, out);
  return out;
}

const PAIN_ZONE: Record<string, string> = { paravertebraux: 'bas du dos' };

export function mockTriage(day: number): TriageResult {
  const alerts = mockAlertsForDay(day);
  const ci = mockCheckIn(day);
  const level: Level = alerts.some((a) => a.level === 'ROUGE') ? 'ROUGE' : alerts.length ? 'AMBRE' : 'VERT';
  const reasons = alerts.map((a) => `${a.title} [${a.rule}]`);
  if (ci) {
    const pain = ci.pain > 0 ? `douleur ${ci.pain}/3${ci.painZone ? ` (${PAIN_ZONE[ci.painZone] ?? ci.painZone})` : ''}` : 'aucune douleur';
    reasons.push(`Check-in : humeur ${ci.mood}/5, fatigue ${ci.fatigue}/5, ${pain}`);
  } else if (day <= DAY_TODAY) {
    reasons.push('Check-in du matin manquant');
  }
  const groundRoutine: string[] = [];
  const has = (id: string) => alerts.some((a) => a.organId === id);
  if (has('hanche') || has('rachis') || has('femur')) groundRoutine.push('Os : réévaluer les bisphosphonates avec le médecin au sol');
  if (has('coeur')) groundRoutine.push('Aérobie : faire valider le protocole par intervalles');
  if (has('yeux')) groundRoutine.push('Risque SANS : transmettre les mesures de la gaine du nerf optique');
  if (has('reins')) groundRoutine.push('Reins : avis sur le risque de calculs');
  return { level, reasons, groundRoutine };
}

const NOW: Record<Level, string> = {
  VERT: 'Suivre le protocole du jour. Aucune action immédiate.',
  AMBRE: 'Appliquer la to-do du jour : contre-mesures renforcées (ARED charge lourde, intervalles). Pas d’urgence.',
  ORANGE: 'Appliquer la to-do du jour sans report et prévenir le CMO de bord dans la journée.',
  ROUGE: 'Arrêter l’activité en cours, prévenir le CMO de bord, appliquer la fiche de conduite à tenir.',
  DONNEES_INSUFFISANTES: 'Données insuffisantes : refaire la mesure (check-in, prélèvement) avant toute décision.',
};
const PROCESSING_MIN = 30; // temps de traitement au sol [H]

/** MAINTENANT ne dépend que du triage (calculé à bord) ; seul ENSUITE dépend du lien Terre. */
export function mockRouter(t: TriageResult, pos: LinkPos, delayMin: number): RouterOutput {
  const maintenant = NOW[t.level];
  if (t.level === 'VERT') {
    return { maintenant, ensuite: { decideur: 'moi', texte: 'Rien à transmettre en priorité. Bilan envoyé avec la télémétrie du jour.' } };
  }
  if (t.level === 'ROUGE' || pos === 'Conjonction') {
    const why = pos === 'Conjonction' ? 'Pas de lien Terre (conjonction) : ' : '';
    return { maintenant, ensuite: { decideur: 'CMO', texte: `${why}le CMO de bord décide. La Terre est informée dès que le lien le permet.` } };
  }
  const reponseMin = Math.round(2 * Math.max(0, delayMin) + PROCESSING_MIN);
  return {
    maintenant,
    ensuite: {
      decideur: 'sol',
      reponseMin,
      texte: `Synthèse IA et avis du médecin au sol attendus dans ≈ ${reponseMin} min (aller-retour radio 2 × ${fr(Math.max(0, delayMin), 1)} min + traitement).`,
    },
  };
}
