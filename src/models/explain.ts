// Propriétaire : Mouad (ROADMAP §7). Chaîne de raisonnement de chaque item de la to-do :
//   DONNÉE (mesure du jour, avec sa provenance) → MODÈLE (formule calée ou modèle d'IA entraîné)
//   → NORME (NASA-STD-3001 quand elle existe, sinon repère d'équipe [H] dit comme tel) → DÉCISION.
// Les modèles d'IA (src/models/ml) apparaissent ici : c'est la page Raisonnement qui les rend visibles.
// Identifiant : « r-<sujet> » (jour = aujourd'hui) ou « r-<sujet>@<jour> » (un autre jour de la timeline).
import type { Metric, Reasoning, ReasoningStep, Tag } from '../types.ts';
import { getBloodTests, getCheckIn, getDayBody } from '../sim/load.ts';
import { DAY_END, DAY_SOL0, DAY_TODAY } from '../sim/persona.ts';
import { getStandard } from '../content/standards.ts';
import references from '../../public/data/nasa/references.json';
import { boneLossPct, BONE_RED } from './bone.ts';
import { VO2_MIN_ABS, VO2_PREFLIGHT, vo2max } from './aerobic.ts';
import { DOSE_CAREER_LIMIT_MSV, DOSE_CRUISE_MSV_DAY, DOSE_SURFACE_MSV_DAY } from './radiation.ts';
import { bloodAgeSeries, moodSignals, organForecast } from './ml/index.ts';

const fr = (v: number | undefined, digits = 1) =>
  v === undefined || !Number.isFinite(v) ? '—' : v.toFixed(digits);
const step = (kind: ReasoningStep['kind'], text: string, tag: Tag, source?: ReasoningStep['source']): ReasoningStep =>
  source ? { kind, text, tag, source } : { kind, text, tag };

const nasa = (id: string): ReasoningStep['source'] => {
  const s = getStandard(id);
  return { label: `NASA-STD-3001 Vol. 1 Rev. C — ${id}`, url: s.url };
};
// Sources vérifiées par Steve (public/data/nasa/references.json) : titre et lien repris tels quels.
const refs = new Map(references.references.map(r => [r.id, r]));
const cite = (id: string, fallback: string): NonNullable<ReasoningStep['source']> => {
  const r = refs.get(id);
  return r ? { label: r.title, url: r.url } : { label: fallback };
};
const REF = {
  ochmo: cite('ochmo-exercise', 'NASA OCHMO Technical Brief — Exercise (2023)'),
  leblanc2013: cite('leblanc2013', 'LeBlanc et al. 2013 — bisphosphonates + exercise on the ISS'),
  smithCa: cite('smith-calcium', 'Smith S.M., Calcium and Bone Metabolism During Spaceflight (NASA)'),
  okada: cite('okada2022', 'Okada et al. 2022 — kidney stones in flight'),
  onsd: cite('fall2022-onsd', 'Fall et al. 2022 — optic nerve sheath and SANS'),
  levine: cite('phenoage', 'Levine et al., Aging, 2018 (PhenoAge)'),
  nhanes: { label: 'Model A — trained on NHANES 2015–2018 (CDC)', url: 'https://wwwn.cdc.gov/nchs/nhanes/' },
  rad: { label: 'MSL/RAD — Zeitlin et al. 2013; Hassler et al. 2014' },
  sim: (what: string) => ({ label: `${what} — SIMULATED (persona Haddad)` }),
};

const metricAt = (day: number, organ: string, key: string): Metric | undefined =>
  getDayBody(day).organs.find(o => o.id === organ)?.metrics.find(m => m.key === key);
const when = (day: number) => (day > DAY_TODAY ? `Projection D${day}` : `D${day}`);
const pace = (day: number) => (day > DAY_TODAY ? 'model projection, not a measurement' : 'measured');

/** Prévision du modèle B (J94 → J210 / J860), en une phrase. */
function forecastText(organ: 'hanche' | 'cuisse' | 'coeur', horizon: 210 | 860): string | null {
  const cur = organForecast(organ, horizon, 0);
  const plan = organForecast(organ, horizon, 1);
  if (!cur || !plan) return null;
  return `AI model B (quantile regression, trained on 2,000 virtual astronauts calibrated to NASA data), from measurements D0–D${DAY_TODAY}: at D${horizon}, ` +
    `${fr(cur.p50, 1)}% ${cur.unit.replace(/^% /, '')} at current pace (10–90% range: ${fr(cur.p10, 1)}–${fr(cur.p90, 1)}), ` +
    `${fr(plan.p50, 1)}% with the plan.`;
}

type Builder = (day: number) => Omit<Reasoning, 'id'>;

const CHAINS: Record<string, Builder> = {
  'r-hanche-ared': day => boneChain(day, 'ARED heavy loading — why?',
    'Heavy squats and deadlifts on ARED: axial loading is the most effective countermeasure for the hip (NASA OCHMO). Decided onboard, without waiting for Earth.', REF.ochmo),
  'r-hanche-nutrition': day => boneChain(day, 'Calcium and vitamin D menu — why?',
    'Bone menu for the day (≈ 1,200 mg calcium, 800 IU vitamin D): supports bone formation, without excess since urinary calcium is being monitored.'),
  'r-urine': day => {
    const ca = metricAt(day, 'reins', 'calcium_urinaire');
    return {
      title: 'First-morning urinalysis — why?',
      steps: [
        step('donnee', `${when(day)}: urinary calcium ${fr(ca?.value, 0)} mg/24 h (${pace(day)}). The scanner cannot see bone: urine is our daily window on resorption.`, 'Persona', REF.sim('Daily urine')),
        step('modele', 'Bone breakdown releases calcium into the urine. AI model B uses it to estimate hip bone loss (urinary calcium + CTX).', 'H', REF.smithCa),
        step('norme', `NASA-STD-3001 [V1 4027]: hip bone density ≥ ${BONE_RED.hanche}% of preflight. Tracking resorption every day allows action before the threshold.`, 'NASA', nasa('V1 4027')),
        step('decision', 'First-morning urine sample, analyzed onboard: it feeds the next day\'s bone and kidney status.', 'H'),
      ],
    };
  },
  'r-sol-routine': day => {
    const g = metricAt(day, 'yeux', 'gaine_nerf_optique');
    return {
      title: 'Ground routine consult — why?',
      steps: [
        step('donnee', `${when(day)}: bone projected below threshold, VO₂max close to the limit at Sol 0, optic nerve sheath ${fr(g?.value, 2)} mm.`, 'Persona', REF.sim("Today's body")),
        step('modele', forecastText('hanche', DAY_END as 860) ?? `"Bone" model: ${fr(boneLossPct('hanche', DAY_END, 0), 1)}% loss at D${DAY_END} at current pace.`, 'H'),
        step('norme', 'These topics (bisphosphonates, SANS risk, aerobic protocol) go beyond what the crew decides alone. Exercise + bisphosphonates protected astronauts\' bone on the ISS.', 'Publié', REF.leblanc2013),
        step('decision', 'Delayed message to the ground flight surgeon. The reply arrives under NEXT with today\'s radio delay: NOW never depends on it.', 'H'),
      ],
    };
  },
  'r-vo2-intervalles': day => {
    const v = metricAt(day, 'coeur', 'vo2max');
    const f = forecastText('coeur', DAY_SOL0 as 210);
    return {
      title: 'Interval cardio — why?',
      steps: [
        step('donnee', `${when(day)}: VO₂max ${fr(v?.value, 1)} ml/kg/min, i.e. ${fr(((v?.value ?? NaN) / VO2_PREFLIGHT) * 100, 1)}% of preflight (${fr(VO2_PREFLIGHT, 1)}).`, 'Persona', REF.sim('Watch + cycle session')),
        step('modele', f ?? `"Aerobic" model: ${fr(vo2max(DAY_SOL0, 0), 1)} ml/kg/min at Sol 0 at current pace, ${fr(vo2max(DAY_SOL0, 1), 1)} with the plan.`, 'H'),
        step('norme', `NASA-STD-3001 [V1 4003]: ≥ 80% of preflight; [V1 4002]: ≥ ${fr(VO2_MIN_ABS, 1)} ml/kg/min for Mars surface EVA (D${DAY_SOL0}).`, 'NASA', nasa('V1 4003')),
        step('decision', 'Interval session at 85–90% of max HR (alternating CEVIS cycle and T2 treadmill): the fastest way to raise VO₂max.', 'H', REF.ochmo),
      ],
    };
  },
  'r-cuisse-tendance': day => muscleChain(day, 'cuisse', 'Thigh strengthening — why?',
    'Heavy squats on ARED for 7 days, then reassessment on the trend (never on a single data point).'),
  'r-mollet': day => muscleChain(day, 'mollet', 'Calf raises — why?',
    'Calf raises on ARED: a muscle heavily used on the ground and nearly idle in microgravity.'),
  'r-cuisse-proteines': day => muscleChain(day, 'cuisse', 'Protein menu — why?',
    'Muscle menu (≈ 140 g protein, including a serving right after ARED) to support muscle protein synthesis.'),
  'r-nerf-optique': day => {
    const g = metricAt(day, 'yeux', 'gaine_nerf_optique');
    return {
      title: 'Vision + optic nerve ultrasound — why?',
      steps: [
        step('donnee', `${when(day)}: optic nerve sheath ${fr(g?.value, 2)} mm (5.00 mm at D0), measured by ultrasound, already performed on the ISS.`, 'Persona', REF.sim('Daily scan')),
        step('modele', '7-day average: it exceeds the 5.5 mm watch threshold. No projection beyond D94: no published model, so nothing is invented.', 'H'),
        step('norme', 'Sheath diameter reflects intracranial pressure, linked to in-flight vision changes (SANS). 5.5 mm threshold: team hypothesis [H].', 'Publié', REF.onsd),
        step('decision', 'Vision test and repeat measurement today; measurements go to the ground flight surgeon (ground routine).', 'H'),
      ],
    };
  },
  'r-calcium-urinaire': day => {
    const ca = metricAt(day, 'reins', 'calcium_urinaire');
    return {
      title: 'Stone-prevention menu + kidney ultrasound — why?',
      steps: [
        step('donnee', `${when(day)}: urinary calcium ${fr(ca?.value, 0)} mg/24 h, 7-day average above the threshold.`, 'Persona', REF.sim('Daily urine')),
        step('modele', 'Calcium released from bone passes into the urine: the rise tracks the estimated bone loss.', 'H', REF.smithCa),
        step('norme', 'Terrestrial reference < 300 mg/24 h; kidney stone risk increases in flight.', 'Publié', REF.okada),
        step('decision', 'At least 2.5 L of water, reduced salt, and a kidney ultrasound.', 'H'),
      ],
    };
  },
  'r-checkin': day => {
    const ci = getCheckIn(day);
    return {
      title: 'Morning check-in — why?',
      steps: [
        step('donnee', ci
          ? `${when(day)}: mood ${ci.mood}/5, fatigue ${ci.fatigue}/5, pain ${ci.pain}/3, perceived sleep ${ci.sleepFelt}/5 (${ci.source === 'manual' ? 'REAL, entered' : 'SIMULATED'}).`
          : `${when(day)}: check-in not done yet. It is the only data only the astronaut can provide.`,
          'Persona', { label: 'Morning check-in — REAL when entered, SIMULATED otherwise' }),
        step('modele', 'It feeds today\'s triage (rules R13) and AI model C (mood signal, compared with the personal baseline D0–D20).', 'H'),
        step('norme', 'Pain 3 → RED, pain 2 → notify the CMO, mood ≤ 2 with fatigue ≥ 4 → ORANGE (team rules [H]). The Crew Medical Officer decides when Earth is far away.', 'NASA', nasa('V1 3006')),
        step('decision', 'Check-in is the first screen of the day, in under 30 seconds. Without it, never a green status.', 'H'),
      ],
    };
  },
  'r-prelevement': day => {
    const draws = getBloodTests('crp').filter(b => b.day <= day);
    const last = draws.at(-1)?.day;
    const age = bloodAgeSeries().filter(p => p.day <= day).at(-1);
    return {
      title: 'Capillary micro-sample — why?',
      steps: [
        step('donnee', last === undefined ? 'No blood draw available.' : `Last blood draw: D${last}, ${day - last} days ago.`, 'Persona', REF.sim('Weekly blood draw')),
        step('modele', age
          ? `AI model A (ElasticNet regression, trained on 9,300 real NHANES adults): blood age ${fr(age.bloodAge, 1)} years for a chronological age of ${fr(age.chronoAge, 1)}. Like PhenoAge (Levine 2018), it needs up-to-date markers.`
          : 'PhenoAge (Levine 2018) and AI model A (blood age) need up-to-date markers.', 'H', REF.nhanes),
        step('norme', 'Expired data never yields a green status: after 7 days the draw must be repeated; after 14 days triage switches to "insufficient data".', 'H'),
        step('decision', 'Finger-prick micro-sample (weekly): a daily venous blood draw would be unrealistic in flight.', 'H'),
      ],
    };
  },
  'r-dose': day => {
    const d = metricAt(day, 'dose', 'dose_cumulee');
    return {
      title: 'Dose review — why?',
      steps: [
        step('donnee', `${when(day)}: cumulative dose ${fr(d?.value, 0)} mSv (onboard dosimeter, SIMULATED).`, 'Persona', REF.sim('Dosimeter')),
        step('modele', `${fr(DOSE_CRUISE_MSV_DAY, 2)} mSv/d in cruise, ${fr(DOSE_SURFACE_MSV_DAY, 2)} mSv/d on the surface (Curiosity rover measurements).`, 'Publié', REF.rad),
        step('norme', `NASA-STD-3001 [V1 4030]: career dose below ${DOSE_CAREER_LIMIT_MSV} mSv.`, 'NASA', nasa('V1 4030')),
        step('decision', 'Review with the CMO of time spent outside the best-shielded area.', 'H'),
      ],
    };
  },
  'r-cmo': day => ({
    title: 'Notify the CMO — why?',
    steps: [
      step('donnee', `${when(day)}: an indicator crossed a red threshold, or the check-in reports pain or a condition that requires it.`, 'Persona', REF.sim("Today's body + check-in")),
      step('modele', 'Today\'s triage (computed onboard): the most severe level between organ alerts and the check-in (rules R13).', 'H'),
      step('norme', 'NASA-STD-3001 [V1 3006]: a Crew Medical Officer onboard; when Earth is far away, the CMO decides.', 'NASA', nasa('V1 3006')),
      step('decision', 'The onboard CMO is notified before any exercise session; Earth is informed as soon as the link allows.', 'H'),
    ],
  }),
  'r-psy': day => {
    const s = moodSignals().filter(m => m.day <= day).at(-1);
    return {
      title: 'Psych session offered — why?',
      steps: [
        step('donnee', s
          ? `${when(day)}: mood, fatigue, sleep, heart rate variability and cortisol over the last 7 days, compared with the astronaut's baseline (D0–D20). Mood deviation: ${fr(s.z.mood, 1).replace('-', '−')} SD.`
          : 'Low mood several days in a row at check-in.', 'Persona', REF.sim('Check-in + watch + blood draw')),
        step('modele', s
          ? `AI model C (logistic regression, trained on 1,500 virtual astronauts): score ${fr(s.score, 2)}, above the threshold 2 days in a row. On the test set: 92% of episodes detected, 6% false alarms.`
          : 'Rule: mood ≤ 2 three days in a row.', 'H'),
        step('norme', 'NASA-STD-3001 [V1 6010]: routine private psychological conferences with a professional.', 'NASA', nasa('V1 6010')),
        step('decision', 'A conversation is PROPOSED. The astronaut sees the signal first and decides; nothing is imposed or shared without their consent. A signal to look at, never a diagnosis.', 'H'),
      ],
    };
  },
  'r-dos': day => ({
    title: 'Back mobility — why?',
    steps: [
      step('donnee', `${when(day)}: lower back pain reported at check-in.`, 'Persona', { label: 'Morning check-in' }),
      step('modele', 'In microgravity the spine lengthens and the paraspinal muscles atrophy: low back pain is common.', 'H'),
      step('norme', 'Team threshold [H]: pain 2 → notify the CMO; pain 1 → gentle mobility.', 'H'),
      step('decision', 'Back mobility and core stability session, 15 min.', 'H', REF.ochmo),
    ],
  }),
  'r-pvt': day => {
    const p = metricAt(day, 'yeux', 'pvt');
    return {
      title: 'PVT alertness test — why?',
      steps: [
        step('donnee', p
          ? `${when(day)}: reaction time ${fr(p.value, 0)} ms, ${p.trend7d === undefined ? '7-day trend unavailable' : `7-day trend ${fr(p.trend7d, 1)}%/wk`}.`
          : `${when(day)}: no recent alertness measurement; the data has expired.`, 'Persona', REF.sim('Daily PVT')),
        step('modele', '7-day average reaction time, cross-checked with check-in fatigue and sleep. Sleep loss slows reaction times before it is felt.', 'H'),
        step('norme', 'No numeric NASA threshold in our sources: team threshold [H], alertness to watch above a 300 ms average. Missing data never yields a green status.', 'H'),
        step('decision', '3-minute PVT today, before tasks that require precision.', 'H'),
      ],
    };
  },
  'r-fatigue': day => ({
    title: 'Recovery — why?',
    steps: [
      step('donnee', `${when(day)}: high fatigue or poor perceived sleep at check-in.`, 'Persona', { label: 'Morning check-in' }),
      step('modele', 'Fatigue and sleep feed the triage and AI model C (mood signal).', 'H'),
      step('norme', 'No numeric NASA threshold: team threshold [H].', 'H'),
      step('decision', '10 min of slow breathing and an early, light dinner to protect sleep.', 'H', REF.ochmo),
    ],
  }),
  'r-entretien': day => ({
    title: 'Maintenance protocol — why?',
    steps: [
      step('donnee', `${when(day)}: no alerts; all tracked indicators are within their thresholds.`, 'Persona', REF.sim("Today's body")),
      step('modele', 'The models project slow loss even without an alert: maintenance slows it down.', 'H'),
      step('norme', 'NASA: about 600 min of exercise per week, cardio + resistance training, throughout the mission.', 'NASA', REF.ochmo),
      step('decision', 'Standard ARED sessions + continuous cardio and standard menu.', 'H'),
    ],
  }),
};

function boneChain(day: number, title: string, decision: string, src?: ReasoningStep['source']): Omit<Reasoning, 'id'> {
  const dens = metricAt(day, 'hanche', 'densite_osseuse');
  const loss = metricAt(day, 'hanche', 'perte_osseuse');
  return {
    title,
    steps: [
      step('donnee', `${when(day)}: hip bone density ESTIMATED at ${fr(dens?.value, 2)}% of preflight (loss ${fr(loss?.value, 2)}%). The ultrasound scanner does not measure bone: estimate based on the preflight ground assessment and urinary markers.`, 'H', REF.sim("Today's body")),
      step('modele', forecastText('hanche', 860) ?? `"Bone" model: ${fr(boneLossPct('hanche', DAY_END, 0), 1)}% loss at D${DAY_END} at current pace.`, 'H'),
      step('norme', `NASA-STD-3001 [V1 4027]: bone density ≥ ${BONE_RED.hanche}% of preflight at the hip, ≥ ${BONE_RED.femur}% at the femoral neck. The projection falls below the threshold → AMBER.`, 'NASA', nasa('V1 4027')),
      step('decision', decision, 'H', src),
    ],
  };
}

function muscleChain(day: number, organ: 'cuisse' | 'mollet', title: string, decision: string): Omit<Reasoning, 'id'> {
  const vol = metricAt(day, organ, 'volume');
  const f = organ === 'cuisse' ? forecastText('cuisse', 210) : null;
  return {
    title,
    steps: [
      step('donnee', `${when(day)}: ${organ === 'cuisse' ? 'thigh' : 'calf'} volume ${fr(vol?.value, 1)}% of D0, 7-day trend ${fr(vol?.trend7d, 2)}%/wk (noise ± ${fr(vol?.noise, 2)}).`, 'Persona', REF.sim('Daily scan')),
      step('modele', f ?? 'Regression over the last 7 days: the slope leaves the noise band. A single value never triggers an alert.', 'H'),
      step('norme', 'No numeric NASA threshold for muscle volume: team thresholds [H] on loss and 7-day trend.', 'H'),
      step('decision', decision, 'H', REF.ochmo),
    ],
  };
}

const UNKNOWN = (id: string): Reasoning => ({
  id, title: 'Reasoning not found',
  steps: [
    step('donnee', `No data linked to the identifier "${id}".`, 'H'),
    step('modele', 'No model applied.', 'H'),
    step('norme', 'No associated standard.', 'H'),
    step('decision', 'Insufficient data: no instruction can be justified.', 'H'),
  ],
});

/** Identifiant de raisonnement pour un sujet et un jour (sans suffixe pour aujourd'hui). */
export const reasoningId = (topic: string, day: number): string => (day === DAY_TODAY ? topic : `${topic}@${day}`);
export const reasoningTopics = (): string[] => Object.keys(CHAINS);

/** Chaîne donnée → modèle → norme → décision d'un item de la to-do. */
export function explain(id: string): Reasoning {
  const [topic, d] = id.split('@');
  const day = d === undefined ? DAY_TODAY : Number(d);
  const build = CHAINS[topic];
  if (!build || !Number.isInteger(day) || day < 0 || day > DAY_END) return UNKNOWN(id);
  return { id, ...build(day) };
}
