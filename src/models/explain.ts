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
  v === undefined || !Number.isFinite(v) ? '—' : v.toFixed(digits).replace('.', ',');
const step = (kind: ReasoningStep['kind'], text: string, tag: Tag, source?: ReasoningStep['source']): ReasoningStep =>
  source ? { kind, text, tag, source } : { kind, text, tag };

const nasa = (id: string): ReasoningStep['source'] => {
  const s = getStandard(id);
  return { label: `NASA-STD-3001 Vol. 1 Rév. C — ${id}`, url: s.url };
};
// Sources vérifiées par Steve (public/data/nasa/references.json) : titre et lien repris tels quels.
const refs = new Map(references.references.map(r => [r.id, r]));
const cite = (id: string, fallback: string): NonNullable<ReasoningStep['source']> => {
  const r = refs.get(id);
  return r ? { label: r.title, url: r.url } : { label: fallback };
};
const REF = {
  ochmo: cite('ochmo-exercise', 'NASA OCHMO Technical Brief — Exercise (2023)'),
  leblanc2013: cite('leblanc2013', 'LeBlanc et al. 2013 — bisphosphonates + exercice sur l\'ISS'),
  smithCa: cite('smith-calcium', 'Smith S.M., Calcium and Bone Metabolism During Spaceflight (NASA)'),
  okada: cite('okada2022', 'Okada et al. 2022 — calculs rénaux en vol'),
  onsd: cite('fall2022-onsd', 'Fall et al. 2022 — gaine du nerf optique et SANS'),
  levine: cite('phenoage', 'Levine et al., Aging, 2018 (PhenoAge)'),
  nhanes: { label: 'Modèle A — entraîné sur NHANES 2015–2018 (CDC)', url: 'https://wwwn.cdc.gov/nchs/nhanes/' },
  rad: { label: 'MSL/RAD — Zeitlin et al. 2013 ; Hassler et al. 2014' },
  sim: (what: string) => ({ label: `${what} — SIMULÉ (persona Haddad)` }),
};

const metricAt = (day: number, organ: string, key: string): Metric | undefined =>
  getDayBody(day).organs.find(o => o.id === organ)?.metrics.find(m => m.key === key);
const when = (day: number) => (day > DAY_TODAY ? `Projection J${day}` : `J${day}`);
const pace = (day: number) => (day > DAY_TODAY ? 'projection des modèles, pas une mesure' : 'mesuré');

/** Prévision du modèle B (J94 → J210 / J860), en une phrase. */
function forecastText(organ: 'hanche' | 'cuisse' | 'coeur', horizon: 210 | 860): string | null {
  const cur = organForecast(organ, horizon, 0);
  const plan = organForecast(organ, horizon, 1);
  if (!cur || !plan) return null;
  return `Modèle d'IA B (régression quantile, entraîné sur 2 000 astronautes virtuels calibrés NASA) : à J${horizon}, ` +
    `${fr(cur.p50, 1)} % ${cur.unit.replace(/^% /, '')} au rythme actuel (fourchette 10–90 % : ${fr(cur.p10, 1)}–${fr(cur.p90, 1)}), ` +
    `${fr(plan.p50, 1)} % avec le plan.`;
}

type Builder = (day: number) => Omit<Reasoning, 'id'>;

const CHAINS: Record<string, Builder> = {
  'r-hanche-ared': day => boneChain(day, 'ARED charge lourde — pourquoi ?',
    'Squat et soulevé de terre lourds sur ARED : la charge axiale est la contre-mesure la plus efficace sur la hanche (NASA OCHMO). Décidé à bord, sans attendre la Terre.', REF.ochmo),
  'r-hanche-nutrition': day => boneChain(day, 'Menu calcium et vitamine D — pourquoi ?',
    'Menu os de la journée (≈ 1 200 mg de calcium, 800 UI de vitamine D) : soutenir la formation osseuse, sans excès car le calcium urinaire est surveillé.'),
  'r-urine': day => {
    const ca = metricAt(day, 'reins', 'calcium_urinaire');
    return {
      title: 'Analyse d\'urine du matin — pourquoi ?',
      steps: [
        step('donnee', `${when(day)} : calcium urinaire ${fr(ca?.value, 0)} mg/24 h (${pace(day)}). Le scanner ne voit pas l'os : l'urine est notre fenêtre quotidienne sur la résorption.`, 'Persona', REF.sim('Urine quotidienne')),
        step('modele', 'L\'os qui fond libère son calcium dans les urines. Le modèle d\'IA B s\'en sert pour estimer la perte osseuse de la hanche (calcium + CTX urinaires).', 'H', REF.smithCa),
        step('norme', `NASA-STD-3001 [V1 4027] : densité de la hanche ≥ ${BONE_RED.hanche} % du pré-vol. Suivre la résorption chaque jour permet d'agir avant le seuil.`, 'NASA', nasa('V1 4027')),
        step('decision', 'Échantillon d\'urine du matin, analysé à bord : il nourrit le statut de l\'os et des reins du lendemain.', 'H'),
      ],
    };
  },
  'r-sol-routine': day => {
    const g = metricAt(day, 'yeux', 'gaine_nerf_optique');
    return {
      title: 'Point « Sol-routine » — pourquoi ?',
      steps: [
        step('donnee', `${when(day)} : os en projection sous le seuil, VO₂max proche de la limite à Sol 0, gaine du nerf optique ${fr(g?.value, 2)} mm.`, 'Persona', REF.sim('Corps du jour')),
        step('modele', forecastText('hanche', DAY_END as 860) ?? `Modèle « bone » : perte de ${fr(boneLossPct('hanche', DAY_END, 0), 1)} % à J${DAY_END} au rythme actuel.`, 'H'),
        step('norme', 'Ces sujets (bisphosphonates, risque SANS, protocole aérobie) dépassent ce que l\'équipage tranche seul. Exercice + bisphosphonates ont protégé l\'os d\'astronautes sur l\'ISS.', 'Publié', REF.leblanc2013),
        step('decision', 'Message différé au médecin au sol. Sa réponse arrive dans ENSUITE avec le délai radio du jour : MAINTENANT n\'en dépend jamais.', 'H'),
      ],
    };
  },
  'r-vo2-intervalles': day => {
    const v = metricAt(day, 'coeur', 'vo2max');
    const f = forecastText('coeur', DAY_SOL0 as 210);
    return {
      title: 'Cardio par intervalles — pourquoi ?',
      steps: [
        step('donnee', `${when(day)} : VO₂max ${fr(v?.value, 1)} ml/kg/min, soit ${fr(((v?.value ?? NaN) / VO2_PREFLIGHT) * 100, 1)} % du pré-vol (${fr(VO2_PREFLIGHT, 1)}).`, 'Persona', REF.sim('Montre + séance vélo')),
        step('modele', f ?? `Modèle « aerobic » : ${fr(vo2max(DAY_SOL0, 0), 1)} ml/kg/min à Sol 0 au rythme actuel, ${fr(vo2max(DAY_SOL0, 1), 1)} avec le plan.`, 'H'),
        step('norme', `NASA-STD-3001 [V1 4003] : ≥ 80 % du pré-vol ; [V1 4002] : ≥ ${fr(VO2_MIN_ABS, 1)} ml/kg/min pour sortir sur Mars (J${DAY_SOL0}).`, 'NASA', nasa('V1 4003')),
        step('decision', 'Séance d\'intervalles à 85–90 % de la FC max (vélo CEVIS ou tapis T2 en alternance) : c\'est l\'entraînement qui remonte le plus vite le VO₂max.', 'H', REF.ochmo),
      ],
    };
  },
  'r-cuisse-tendance': day => muscleChain(day, 'cuisse', 'Renforcement de la cuisse — pourquoi ?',
    'Squat lourd sur ARED pendant 7 jours, puis réévaluation sur la tendance (jamais sur un point isolé).'),
  'r-mollet': day => muscleChain(day, 'mollet', 'Extension des mollets — pourquoi ?',
    'Extension des mollets sur ARED : muscle très sollicité au sol, quasi inactif en apesanteur.'),
  'r-cuisse-proteines': day => muscleChain(day, 'cuisse', 'Menu protéines — pourquoi ?',
    'Menu muscle (≈ 140 g de protéines, dont une prise juste après l\'ARED) pour soutenir la synthèse musculaire.'),
  'r-nerf-optique': day => {
    const g = metricAt(day, 'yeux', 'gaine_nerf_optique');
    return {
      title: 'Vision + échographie du nerf optique — pourquoi ?',
      steps: [
        step('donnee', `${when(day)} : gaine du nerf optique ${fr(g?.value, 2)} mm (5,00 mm à J0), mesurée à l'échographie, déjà pratiquée sur l'ISS.`, 'Persona', REF.sim('Scan du jour')),
        step('modele', 'Moyenne sur 7 jours : elle dépasse le repère de vigilance de 5,5 mm. Pas de projection au-delà de J94 : aucun modèle publié, donc rien d\'inventé.', 'H'),
        step('norme', 'La gaine reflète la pression dans le crâne, liée aux troubles de la vision en vol (SANS). Repère de 5,5 mm : hypothèse d\'équipe [H].', 'Publié', REF.onsd),
        step('decision', 'Test de vision et nouvelle mesure aujourd\'hui ; les mesures partent au médecin au sol (Sol-routine).', 'H'),
      ],
    };
  },
  'r-calcium-urinaire': day => {
    const ca = metricAt(day, 'reins', 'calcium_urinaire');
    return {
      title: 'Menu anti-calculs + échographie des reins — pourquoi ?',
      steps: [
        step('donnee', `${when(day)} : calcium urinaire ${fr(ca?.value, 0)} mg/24 h, moyenne 7 j au-dessus du repère.`, 'Persona', REF.sim('Urine quotidienne')),
        step('modele', 'Le calcium libéré par l\'os passe dans les urines : la hausse suit la perte osseuse estimée.', 'H', REF.smithCa),
        step('norme', 'Référence terrestre < 300 mg/24 h ; le risque de calculs rénaux augmente en vol.', 'Publié', REF.okada),
        step('decision', 'Au moins 2,5 L d\'eau, sel réduit, et échographie des reins.', 'H'),
      ],
    };
  },
  'r-checkin': day => {
    const ci = getCheckIn(day);
    return {
      title: 'Check-in du matin — pourquoi ?',
      steps: [
        step('donnee', ci
          ? `${when(day)} : humeur ${ci.mood}/5, fatigue ${ci.fatigue}/5, douleur ${ci.pain}/3, sommeil ressenti ${ci.sleepFelt}/5 (${ci.source === 'manual' ? 'RÉEL, saisi' : 'SIMULÉ'}).`
          : `${when(day)} : check-in pas encore fait. C'est la seule donnée que l'astronaute est seul à pouvoir fournir.`,
          'Persona', { label: 'Check-in du matin — RÉEL quand il est saisi, SIMULÉ sinon' }),
        step('modele', 'Il entre dans le triage du jour (règles R13) et dans le modèle d\'IA C (signal d\'humeur, comparé à la référence personnelle J0–J20).', 'H'),
        step('norme', 'Douleur 3 → ROUGE, douleur 2 → prévenir le CMO, humeur ≤ 2 avec fatigue ≥ 4 → ORANGE (règles d\'équipe [H]). L\'officier médical de bord décide quand la Terre est loin.', 'NASA', nasa('V1 3006')),
        step('decision', 'Check-in en premier écran de la journée, en moins de 30 secondes. Sans lui, jamais de statut vert.', 'H'),
      ],
    };
  },
  'r-prelevement': day => {
    const draws = getBloodTests('crp').filter(b => b.day <= day);
    const last = draws.at(-1)?.day;
    const age = bloodAgeSeries().filter(p => p.day <= day).at(-1);
    return {
      title: 'Micro-prélèvement capillaire — pourquoi ?',
      steps: [
        step('donnee', last === undefined ? 'Aucun prélèvement disponible.' : `Dernier prélèvement : J${last}, il y a ${day - last} jours.`, 'Persona', REF.sim('Prélèvement hebdomadaire')),
        step('modele', age
          ? `Modèle d'IA A (régression ElasticNet, entraîné sur 9 300 adultes réels NHANES) : âge sanguin ${fr(age.bloodAge, 1)} ans pour ${fr(age.chronoAge, 1)} ans d'âge réel. Avec PhenoAge (Levine 2018), il a besoin de marqueurs à jour.`
          : 'PhenoAge (Levine 2018) et le modèle d\'IA A (âge sanguin) ont besoin de marqueurs à jour.', 'H', REF.nhanes),
        step('norme', 'Une donnée expirée ne donne jamais un statut vert : au-delà de 7 jours le prélèvement est à refaire, au-delà de 14 jours le triage passe en « données insuffisantes ».', 'H'),
        step('decision', 'Micro-prélèvement au doigt (hebdomadaire) : une prise de sang veineuse quotidienne serait irréaliste en vol.', 'H'),
      ],
    };
  },
  'r-dose': day => {
    const d = metricAt(day, 'dose', 'dose_cumulee');
    return {
      title: 'Revue de la dose — pourquoi ?',
      steps: [
        step('donnee', `${when(day)} : dose cumulée ${fr(d?.value, 0)} mSv (dosimètre de bord, SIMULÉ).`, 'Persona', REF.sim('Dosimètre')),
        step('modele', `${fr(DOSE_CRUISE_MSV_DAY, 2)} mSv/j en croisière, ${fr(DOSE_SURFACE_MSV_DAY, 2)} mSv/j en surface (mesures du rover Curiosity).`, 'Publié', REF.rad),
        step('norme', `NASA-STD-3001 [V1 4030] : dose de carrière sous ${DOSE_CAREER_LIMIT_MSV} mSv.`, 'NASA', nasa('V1 4030')),
        step('decision', 'Revue avec le CMO du temps passé hors de la zone la mieux protégée.', 'H'),
      ],
    };
  },
  'r-cmo': day => ({
    title: 'Prévenir le CMO — pourquoi ?',
    steps: [
      step('donnee', `${when(day)} : un indicateur a franchi un seuil rouge, ou le check-in signale une douleur ou un état qui l'exige.`, 'Persona', REF.sim('Corps du jour + check-in')),
      step('modele', 'Triage du jour (calculé à bord) : le niveau le plus grave entre les alertes d\'organe et le check-in (règles R13).', 'H'),
      step('norme', 'NASA-STD-3001 [V1 3006] : un officier médical de bord ; quand la Terre est loin, c\'est lui qui décide.', 'NASA', nasa('V1 3006')),
      step('decision', 'Le CMO de bord est prévenu avant toute séance ; la Terre est informée dès que le lien le permet.', 'H'),
    ],
  }),
  'r-psy': day => {
    const s = moodSignals().filter(m => m.day <= day).at(-1);
    return {
      title: 'Point psy proposé — pourquoi ?',
      steps: [
        step('donnee', s
          ? `${when(day)} : humeur, fatigue, sommeil, variabilité cardiaque et cortisol des 7 derniers jours, comparés à la référence de l'astronaute (J0–J20). Écart d'humeur : ${fr(s.z.mood, 1).replace('-', '−')} écart-type.`
          : 'Humeur basse plusieurs jours de suite au check-in.', 'Persona', REF.sim('Check-in + montre + prélèvement')),
        step('modele', s
          ? `Modèle d'IA C (régression logistique, entraîné sur 1 500 astronautes virtuels) : score ${fr(s.score, 2)}, au-dessus du seuil 2 jours de suite. Sur le test : 92 % des épisodes détectés, 6 % de fausses alertes.`
          : 'Règle : humeur ≤ 2 trois jours de suite.', 'H'),
        step('norme', 'NASA-STD-3001 [V1 6010] : entretiens psychologiques réguliers avec un professionnel.', 'NASA', nasa('V1 6010')),
        step('decision', 'Un échange est PROPOSÉ. L\'astronaute voit son signal en premier et décide ; rien n\'est imposé ni transmis sans son accord. Signal à regarder, jamais un diagnostic.', 'H'),
      ],
    };
  },
  'r-dos': day => ({
    title: 'Mobilité du dos — pourquoi ?',
    steps: [
      step('donnee', `${when(day)} : douleur du bas du dos signalée au check-in.`, 'Persona', { label: 'Check-in du matin' }),
      step('modele', 'En apesanteur, la colonne s\'allonge et les muscles paravertébraux s\'atrophient : la douleur lombaire est fréquente.', 'H'),
      step('norme', 'Repère d\'équipe [H] : douleur 2 → prévenir le CMO ; douleur 1 → mobilité douce.', 'H'),
      step('decision', 'Séance de mobilité et de gainage du dos, 15 min.', 'H', REF.ochmo),
    ],
  }),
  'r-fatigue': day => ({
    title: 'Récupération — pourquoi ?',
    steps: [
      step('donnee', `${when(day)} : fatigue élevée ou sommeil ressenti dégradé au check-in.`, 'Persona', { label: 'Check-in du matin' }),
      step('modele', 'Fatigue et sommeil entrent dans le triage et dans le modèle d\'IA C (signal d\'humeur).', 'H'),
      step('norme', 'Pas de seuil NASA chiffré : repère d\'équipe [H].', 'H'),
      step('decision', 'Respiration lente 10 min et dîner tôt et léger pour protéger le sommeil.', 'H', REF.ochmo),
    ],
  }),
  'r-entretien': day => ({
    title: 'Protocole d\'entretien — pourquoi ?',
    steps: [
      step('donnee', `${when(day)} : aucune alerte, tous les indicateurs suivis sont dans leurs seuils.`, 'Persona', REF.sim('Corps du jour')),
      step('modele', 'Les modèles projettent une perte lente même sans alerte : l\'entretien la freine.', 'H'),
      step('norme', 'NASA : environ 600 min d\'exercice par semaine, cardio + musculation, pendant toute la mission.', 'NASA', REF.ochmo),
      step('decision', 'Séances standard ARED + cardio continu et menu standard.', 'H'),
    ],
  }),
};

function boneChain(day: number, title: string, decision: string, src?: ReasoningStep['source']): Omit<Reasoning, 'id'> {
  const dens = metricAt(day, 'hanche', 'densite_osseuse');
  const loss = metricAt(day, 'hanche', 'perte_osseuse');
  return {
    title,
    steps: [
      step('donnee', `${when(day)} : densité de la hanche ESTIMÉE à ${fr(dens?.value, 2)} % du pré-vol (perte ${fr(loss?.value, 2)} %). Le scanner à ultrasons ne mesure pas l'os : estimation à partir du bilan au sol et des marqueurs urinaires.`, 'H', REF.sim('Corps du jour')),
      step('modele', forecastText('hanche', 860) ?? `Modèle « bone » : perte de ${fr(boneLossPct('hanche', DAY_END, 0), 1)} % à J${DAY_END} au rythme actuel.`, 'H'),
      step('norme', `NASA-STD-3001 [V1 4027] : densité osseuse ≥ ${BONE_RED.hanche} % du pré-vol à la hanche, ≥ ${BONE_RED.femur} % au col du fémur. La projection passe sous le seuil → AMBRE.`, 'NASA', nasa('V1 4027')),
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
      step('donnee', `${when(day)} : volume ${organ === 'cuisse' ? 'de la cuisse' : 'du mollet'} ${fr(vol?.value, 1)} % de J0, tendance 7 j ${fr(vol?.trend7d, 2)} %/sem (bruit ± ${fr(vol?.noise, 2)}).`, 'Persona', REF.sim('Scan du jour')),
      step('modele', f ?? 'Régression sur les 7 derniers jours : la pente sort de la bande de bruit. Une valeur isolée ne déclenche jamais d\'alerte.', 'H'),
      step('norme', 'Pas de seuil NASA chiffré sur le volume musculaire : repères d\'équipe [H] sur la perte et la tendance 7 j.', 'H'),
      step('decision', decision, 'H', REF.ochmo),
    ],
  };
}

const UNKNOWN = (id: string): Reasoning => ({
  id, title: 'Raisonnement introuvable',
  steps: [
    step('donnee', `Aucune donnée associée à l'identifiant « ${id} ».`, 'H'),
    step('modele', 'Aucun modèle appliqué.', 'H'),
    step('norme', 'Aucune norme associée.', 'H'),
    step('decision', 'Données insuffisantes : aucune consigne ne peut être justifiée.', 'H'),
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
