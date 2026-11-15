// MOCKS (Walid) — to-do du jour et chaînes de raisonnement factices, tirées des alertes du jour.
import type { Alert, Reasoning, ReasoningStep, TodoItem } from '../types';
import { DAY_END, DAY_SOL0, DAY_TODAY } from './mission';
import { HIP_LOSS_END_PLAN, lossPct, vo2DeficitPct, vo2max, VO2_PREFLIGHT, VO2_SOL0 } from './curves';
import { mockAlertsForDay } from './alerts';
import { mockDayBody } from './body';
import { mockCheckIn } from './checkin';
import { NASA_STD_3001_URL } from './content';
import { fr } from './util';

type Draft = Omit<TodoItem, 'id' | 'done'> & { slug: string };

function drafts(alerts: Alert[], day: number): Draft[] {
  const has = (...ids: string[]) => alerts.some((a) => ids.includes(a.organId));
  const out: Draft[] = [];
  if (alerts.some((a) => a.level === 'ROUGE')) {
    out.push({ slug: 'cmo', kind: 'medical', title: 'Notify the Crew Medical Officer (CMO)', detail: 'Red threshold crossed: immediate consult with the CMO before any exercise session.', time: '06:45', reasoningId: 'r-cmo', priority: 1 });
  }
  out.push({ slug: 'checkin', kind: 'test', title: 'Morning check-in', detail: 'Mood, fatigue, pain, perceived sleep — 2 taps per row, under 30 s.', time: '07:00', reasoningId: 'r-checkin', priority: 2 });
  if (day % 7 === 0) {
    out.push({ slug: 'prelevement', kind: 'test', title: 'Weekly capillary micro-sample', detail: 'Hemoglobin, CRP, glucose, creatinine, albumin, cortisol… (PhenoAge inputs).', time: '07:10', reasoningId: 'r-prelevement', priority: 2 });
  }
  const bone = has('hanche', 'rachis', 'femur');
  if (bone) {
    out.push({ slug: 'ared-os', kind: 'exercice', title: 'ARED — squat 4×8 + deadlift 4×6', detail: 'Heavy load (≈ 80% 1RM), 45 min. Target: hip, femoral neck, spine.', time: '07:30', reasoningId: 'r-hanche-ared', priority: 1 });
    out.push({ slug: 'repas-calcium', kind: 'repas', title: 'Calcium- and vitamin D-rich lunch', detail: 'Salmon, rice, spinach, fortified yogurt — 780 kcal · 46 g protein · 520 mg calcium · 600 IU vit. D.', time: '12:30', reasoningId: 'r-hanche-nutrition', priority: 2 });
  }
  if (has('reins')) {
    out.push({ slug: 'hydratation', kind: 'medical', title: 'Increased hydration + kidney scan tomorrow', detail: 'Target ≥ 2.5 L over the day; kidney check on tomorrow’s scan.', time: '09:00', reasoningId: 'r-calcium-urinaire', priority: 2 });
  }
  if (has('yeux')) {
    out.push({ slug: 'vision', kind: 'test', title: 'Vision test + optic nerve check', detail: 'Near and far acuity, Amsler grid; repeat sheath measurement on the scan.', time: '10:30', reasoningId: 'r-nerf-optique', priority: 2 });
  }
  if (has('cuisse', 'mollet', 'paravertebraux')) {
    out.push({ slug: 'ared-muscle', kind: 'exercice', title: 'ARED — lunges 3×10 + hip extension 3×12', detail: 'Moderate load, 25 min. Target: the muscle whose 7-day trend is dropping.', time: '11:00', reasoningId: 'r-cuisse-tendance', priority: 2 });
  }
  if (bone || has('yeux', 'coeur')) {
    out.push({ slug: 'sol-routine', kind: 'medical', title: 'Ground routine consult with the flight surgeon', detail: 'Delayed message: bisphosphonates, SANS risk, aerobic protocol. Reply expected under NEXT.', time: '14:00', reasoningId: 'r-sol-routine', priority: 2 });
  }
  if (has('coeur')) {
    out.push({ slug: 'velo', kind: 'exercice', title: 'CEVIS cycle — intervals 6×3 min', detail: '90% HRmax, 2 min recovery, 35 min total.', time: '16:00', reasoningId: 'r-vo2-intervalles', priority: 1 });
  }
  if (has('dose')) {
    out.push({ slug: 'dose', kind: 'medical', title: 'Cumulative dose review with the CMO', detail: 'Cumulative dose above the threshold: review time spent outside the best-shielded area.', time: '15:00', reasoningId: 'r-dose', priority: 2 });
  }
  if (has('cuisse', 'mollet', 'paravertebraux')) {
    out.push({ slug: 'repas-proteines', kind: 'repas', title: 'High-protein dinner', detail: 'Chicken, lentils, cheese, applesauce — 820 kcal · 58 g protein.', time: '19:00', reasoningId: 'r-cuisse-proteines', priority: 3 });
  }
  if (!alerts.length) {
    out.push({ slug: 'ared-entretien', kind: 'exercice', title: 'ARED — maintenance session', detail: 'Standard load, 35 min.', time: '07:30', reasoningId: 'r-entretien', priority: 3 });
    out.push({ slug: 'velo-entretien', kind: 'exercice', title: 'T2 treadmill — continuous run 30 min', detail: '70% HRmax.', time: '16:00', reasoningId: 'r-entretien', priority: 3 });
    out.push({ slug: 'repas-standard', kind: 'repas', title: 'Lunch — standard menu', detail: '750 kcal · 40 g protein · 260 mg calcium.', time: '12:30', reasoningId: 'r-entretien', priority: 3 });
  }
  const ci = mockCheckIn(day);
  if (ci && ci.mood <= 2) {
    out.push({ slug: 'psy', kind: 'medical', title: 'Psych session (offered, never imposed)', detail: 'Low mood at check-in: a conversation is offered; you decide.', reasoningId: 'r-psy', priority: 3 });
  }
  return out.sort((a, b) => (a.time ?? '99').localeCompare(b.time ?? '99'));
}

const cache = new Map<number, TodoItem[]>();

/** To-do du jour, fixée le matin à partir des alertes. Renvoie une copie (done modifiable sans effet de bord). */
export function mockPlanDay(day: number): TodoItem[] {
  const d = mockDayBody(day).day;
  let items = cache.get(d);
  if (!items) {
    items = drafts(mockAlertsForDay(d), d).map(({ slug, ...rest }) => ({ id: `t${d}-${slug}`, done: false, ...rest }));
    cache.set(d, items);
  }
  return items.map((i) => ({ ...i }));
}

// --- Raisonnement : donnée → modèle → norme → décision ---------------------------------------
const NASA = { label: 'NASA-STD-3001 Vol. 1 Rev. C', url: NASA_STD_3001_URL };
const step = (kind: ReasoningStep['kind'], text: string, tag: ReasoningStep['tag'], source?: ReasoningStep['source']): ReasoningStep =>
  source ? { kind, text, tag, source } : { kind, text, tag };

function chains(): Record<string, Reasoning> {
  const T = DAY_TODAY;
  const hip = lossPct('hanche', T, 0) as number;
  const hipEnd = lossPct('hanche', DAY_END, 0) as number;
  const body = mockDayBody(T);
  const m = (organ: string, key: string) => body.organs.find((o) => o.id === organ)?.metrics.find((x) => x.key === key);
  const cuisse = m('cuisse', 'volume');
  const gaine = m('yeux', 'gaine_nerf_optique');
  const ca = m('reins', 'calcium_urinaire');
  const v = vo2max(T, 0);
  const AGE_LIMIT = 'Limitation: the per-organ age gap is a team indicator [H] — an equivalent in years, not actual aging; spaceflight loss is partly reversible after return.';

  const boneData = step('donnee', `D${T}: hip bone density ESTIMATED at ${fr(100 - hip, 2)}% of preflight (loss ${fr(hip, 2)}%). Sources: preflight ground assessment + daily urinary markers. The ultrasound scanner does not measure bone.`, 'H', { label: 'Today’s body D94 — SIMULATED (persona Haddad)' });
  const boneModel = step('modele', `"Bone" model: at current pace, loss reaches ${fr(hipEnd, 2)}% at D${DAY_END}; ${fr(HIP_LOSS_END_PLAN, 2)}% if the plan is followed. ${AGE_LIMIT}`, 'H', { label: 'Bone model — sol-zero sheet §7 (mock)' });
  const boneNorm = step('norme', 'NASA-STD-3001 [V1 4027]: bone density ≥ 95% of preflight at the hip, ≥ 90% at the femoral neck. The D860 projection falls below the threshold → AMBER status today.', 'NASA', NASA);
  const vo2Data = step('donnee', `D${T}: VO₂max ${fr(v, 1)} ml/kg/min, i.e. −${fr(vo2DeficitPct(T, 0), 2)}% vs preflight (${fr(VO2_PREFLIGHT, 1)}).`, 'Persona', { label: 'Watch + cycle session — SIMULATED (persona Haddad)' });
  const vo2Model = step('modele', `"Aerobic" model: on arrival (Sol 0, D${DAY_SOL0}), ${fr(vo2max(DAY_SOL0, 0), 1)} ml/kg/min at current pace; ${fr(vo2max(DAY_SOL0, 1), 1)} with the plan.`, 'H', { label: 'Aerobic model — sol-zero sheet §7 (mock)' });
  const vo2Norm = step('norme', `NASA-STD-3001 [V1 4003]: ≥ 80% of preflight in mission; [V1 4002]: ≥ ${fr(VO2_SOL0, 1)} ml/kg/min. Arrival would be at the limit → AMBER.`, 'NASA', NASA);
  const muscleData = step('donnee', `D${T}: thigh scan volume ${fr(cuisse?.value ?? NaN, 1)}% of D0; 7-day trend ${fr(cuisse?.trend7d ?? NaN, 2)}%/week (measurement noise ± ${fr(cuisse?.noise ?? 0, 1)}).`, 'Persona', { label: 'Daily scan — SIMULATED (no public scanner data)' });
  const muscleModel = step('modele', 'Simple regression over the last 7 days: the slope leaves the noise band. A single value never triggers an alert.', 'H', { label: '7-day trend rule — ROADMAP §8' });
  const muscleNorm = step('norme', 'No numeric NASA threshold for muscle volume: team thresholds [H] (amber at −4% or slope ≤ −0.8%/wk, red at −10%).', 'H');

  const R = (id: string, title: string, steps: ReasoningStep[]): Reasoning => ({ id, title, steps });
  const list = [
    R('r-hanche-ared', 'ARED heavy loading — why?', [boneData, boneModel, boneNorm,
      step('decision', 'Heavy-load ARED session (squat, deadlift): axial loading is the most effective countermeasure for the hip. Decided onboard, without waiting for Earth.', 'H')]),
    R('r-hanche-nutrition', 'Calcium- and vitamin D-rich meal — why?', [boneData, boneModel, boneNorm,
      step('decision', 'Lunch with 520 mg calcium and 600 IU vitamin D to support bone formation. Vitamin D from the last blood draw is at the low end of the reference range.', 'H')]),
    R('r-sol-routine', 'Ground routine consult — why?', [boneData,
      step('modele', `Three topics go beyond what the crew decides alone: bone (D${DAY_END} projection red), VO₂ (Sol 0 at the limit), optic nerve sheath (${fr(gaine?.value ?? NaN, 2)} mm, rising).`, 'H'),
      boneNorm,
      step('decision', 'Delayed message to the ground flight surgeon (bisphosphonates, SANS risk, aerobic protocol). The reply arrives under NEXT, with today’s radio delay: NOW never depends on it.', 'H')]),
    R('r-vo2-intervalles', 'Interval cycling — why?', [vo2Data, vo2Model, vo2Norm,
      step('decision', 'Interval session 6×3 min at 90% HRmax: the plan targets 37.3 ml/kg/min at Sol 0 instead of 36.5.', 'H')]),
    R('r-cuisse-tendance', 'Targeted thigh strengthening — why?', [muscleData, muscleModel, muscleNorm,
      step('decision', 'Add lunges and hip extensions on ARED for 7 days, then reassess on the trend.', 'H')]),
    R('r-cuisse-proteines', 'High-protein dinner — why?', [muscleData, muscleModel, muscleNorm,
      step('decision', 'Dinner with 58 g of protein after the strength session, to support muscle protein synthesis.', 'H')]),
    R('r-nerf-optique', 'Vision test — why?', [
      step('donnee', `D${T}: optic nerve sheath diameter ${fr(gaine?.value ?? NaN, 2)} mm (5.00 mm at D0), rising slightly. Measured by ultrasound, already performed on the ISS.`, 'Persona', { label: 'Daily scan — SIMULATED' }),
      step('modele', '7-day average and slope: the average exceeds the 5.5 mm watch threshold.', 'H'),
      step('norme', 'Team threshold [H] pending the published reference (optic nerve ultrasound, SANS risk) — to be sourced by Steve.', 'H'),
      step('decision', 'Vision test today and measurements sent to the ground flight surgeon.', 'H')]),
    R('r-calcium-urinaire', 'Increased hydration — why?', [
      step('donnee', `D${T}: urinary calcium ${fr(ca?.value ?? NaN, 0)} mg/24 h, rising since D0; no stones on the scan.`, 'Persona', { label: 'Daily urine — SIMULATED' }),
      step('modele', 'Calcium released from bone passes into the urine: the rise tracks the estimated bone loss.', 'H'),
      step('norme', 'Terrestrial reference < 300 mg/24 h [Published — to be verified].', 'Publié'),
      step('decision', 'Hydration ≥ 2.5 L and a kidney check on the next scan.', 'H')]),
    R('r-checkin', 'Morning check-in — why?', [
      step('donnee', 'Mood, fatigue, pain and perceived sleep: the only data only you can provide.', 'Persona', { label: 'Morning check-in — REAL when entered, SIMULATED otherwise' }),
      step('modele', 'The check-in feeds today’s triage, along with cortisol, sleep and HRV.', 'H'),
      step('norme', 'No NASA threshold: team rule [H] (mood ≤ 2 for 3 days → a conversation is offered, never imposed).', 'H'),
      step('decision', 'Check-in is the first screen of the day, in under 30 seconds.', 'H')]),
    R('r-prelevement', 'Weekly capillary sample — why?', [
      step('donnee', 'Last blood draw 7 days ago: the PhenoAge inputs (albumin, creatinine, glucose, CRP…) need refreshing.', 'Persona'),
      step('modele', 'PhenoAge (Levine et al., 2018): overall biological age computed from a standard blood panel.', 'Publié', { label: 'Levine et al., Aging, 2018', url: 'https://doi.org/10.18632/aging.101414' }),
      step('norme', 'Expired data never yields a green status: it switches to "insufficient data".', 'H'),
      step('decision', 'Capillary micro-sample this morning (a daily venous blood draw would be unrealistic in flight).', 'H')]),
    R('r-dose', 'Dose review — why?', [
      step('donnee', 'Cumulative dose tracked daily by the onboard dosimeter (SIMULATED).', 'Persona'),
      step('modele', 'Expected: 1.84 mSv/d in cruise, 0.64 mSv/d on the surface.', 'Publié', { label: 'MSL/RAD — Zeitlin et al. 2013; Hassler et al. 2014' }),
      step('norme', '600 mSv threshold: team hypothesis [H], to be verified in NASA-STD-3001.', 'H', NASA),
      step('decision', 'Review with the CMO of time spent outside the best-shielded area.', 'H')]),
    R('r-cmo', 'Notify the CMO — why?', [
      step('donnee', 'An indicator crossed its red threshold.', 'Persona'),
      step('modele', 'Today’s triage: RED level.', 'H'),
      step('norme', 'Red thresholds: NASA-STD-3001 Rev. C.', 'NASA', NASA),
      step('decision', 'The onboard CMO is notified before any exercise session; Earth is informed in parallel.', 'H')]),
    R('r-psy', 'Psych session offered — why?', [
      step('donnee', 'Low mood at check-in.', 'Persona', { label: 'Morning check-in' }),
      step('modele', 'Rule: mood ≤ 2 over 3 days, or low mood + rising cortisol + poor sleep.', 'H'),
      step('norme', 'No numeric NASA threshold: team rule [H].', 'H'),
      step('decision', 'A conversation is offered. You decide; nothing is imposed or shared without your consent.', 'H')]),
    R('r-entretien', 'Maintenance protocol — why?', [
      step('donnee', 'No alerts today: all tracked indicators are within their thresholds.', 'Persona'),
      step('modele', 'The models project slow loss even without an alert.', 'H'),
      step('norme', 'NASA-STD-3001: exercise countermeasures maintained throughout the mission.', 'NASA', NASA),
      step('decision', 'Standard ARED + aerobic sessions and standard menus.', 'H')]),
  ];
  return Object.fromEntries(list.map((r) => [r.id, r]));
}

let chainCache: Record<string, Reasoning> | null = null;

export function mockExplain(reasoningId: string): Reasoning {
  chainCache ??= chains();
  return chainCache[reasoningId] ?? {
    id: reasoningId,
    title: 'Reasoning not found',
    steps: [
      step('donnee', `No data linked to the identifier “${reasoningId}”.`, 'H'),
      step('modele', 'No model applied.', 'H'),
      step('norme', 'No associated standard.', 'H'),
      step('decision', 'Insufficient data: no instruction can be justified.', 'H'),
    ],
  };
}
export function mockReasoningIds(): string[] {
  chainCache ??= chains();
  return Object.keys(chainCache);
}
