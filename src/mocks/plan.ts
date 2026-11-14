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
    out.push({ slug: 'cmo', kind: 'medical', title: 'Prévenir le CMO de bord', detail: 'Seuil rouge franchi : point immédiat avec le CMO avant toute séance.', time: '06:45', reasoningId: 'r-cmo', priority: 1 });
  }
  out.push({ slug: 'checkin', kind: 'test', title: 'Check-in du matin', detail: 'Humeur, fatigue, douleur, sommeil ressenti — 2 taps par ligne, moins de 30 s.', time: '07:00', reasoningId: 'r-checkin', priority: 2 });
  if (day % 7 === 0) {
    out.push({ slug: 'prelevement', kind: 'test', title: 'Micro-prélèvement capillaire hebdomadaire', detail: 'Hémoglobine, CRP, glucose, créatinine, albumine, cortisol… (entrées de PhenoAge).', time: '07:10', reasoningId: 'r-prelevement', priority: 2 });
  }
  const bone = has('hanche', 'rachis', 'femur');
  if (bone) {
    out.push({ slug: 'ared-os', kind: 'exercice', title: 'ARED — squat 4×8 + soulevé de terre 4×6', detail: 'Charge lourde (≈ 80 % 1RM), 45 min. Cible : hanche, col du fémur, rachis.', time: '07:30', reasoningId: 'r-hanche-ared', priority: 1 });
    out.push({ slug: 'repas-calcium', kind: 'repas', title: 'Déjeuner riche en calcium et vitamine D', detail: 'Saumon, riz, épinards, yaourt enrichi — 780 kcal · 46 g protéines · 520 mg calcium · 600 UI vit. D.', time: '12:30', reasoningId: 'r-hanche-nutrition', priority: 2 });
  }
  if (has('reins')) {
    out.push({ slug: 'hydratation', kind: 'medical', title: 'Hydratation renforcée + scan des reins demain', detail: 'Objectif ≥ 2,5 L sur la journée ; contrôle des reins au scan de demain.', time: '09:00', reasoningId: 'r-calcium-urinaire', priority: 2 });
  }
  if (has('yeux')) {
    out.push({ slug: 'vision', kind: 'test', title: 'Test de vision + contrôle du nerf optique', detail: 'Acuité de près et de loin, grille d’Amsler ; nouvelle mesure de la gaine au scan.', time: '10:30', reasoningId: 'r-nerf-optique', priority: 2 });
  }
  if (has('cuisse', 'mollet', 'paravertebraux')) {
    out.push({ slug: 'ared-muscle', kind: 'exercice', title: 'ARED — fentes 3×10 + extension de hanche 3×12', detail: 'Charge modérée, 25 min. Cible : le muscle dont la tendance 7 j décroche.', time: '11:00', reasoningId: 'r-cuisse-tendance', priority: 2 });
  }
  if (bone || has('yeux', 'coeur')) {
    out.push({ slug: 'sol-routine', kind: 'medical', title: 'Point « Sol-routine » avec le médecin au sol', detail: 'Message différé : bisphosphonates, risque SANS, protocole aérobie. Réponse attendue dans ENSUITE.', time: '14:00', reasoningId: 'r-sol-routine', priority: 2 });
  }
  if (has('coeur')) {
    out.push({ slug: 'velo', kind: 'exercice', title: 'Vélo CEVIS — intervalles 6×3 min', detail: '90 % FC max, récupération 2 min, 35 min au total.', time: '16:00', reasoningId: 'r-vo2-intervalles', priority: 1 });
  }
  if (has('dose')) {
    out.push({ slug: 'dose', kind: 'medical', title: 'Revue de la dose cumulée avec le CMO', detail: 'Dose cumulée au-dessus du repère : revoir le temps passé hors de la zone la mieux protégée.', time: '15:00', reasoningId: 'r-dose', priority: 2 });
  }
  if (has('cuisse', 'mollet', 'paravertebraux')) {
    out.push({ slug: 'repas-proteines', kind: 'repas', title: 'Dîner riche en protéines', detail: 'Poulet, lentilles, fromage, compote — 820 kcal · 58 g protéines.', time: '19:00', reasoningId: 'r-cuisse-proteines', priority: 3 });
  }
  if (!alerts.length) {
    out.push({ slug: 'ared-entretien', kind: 'exercice', title: 'ARED — séance d’entretien', detail: 'Charge standard, 35 min.', time: '07:30', reasoningId: 'r-entretien', priority: 3 });
    out.push({ slug: 'velo-entretien', kind: 'exercice', title: 'Tapis T2 — course continue 30 min', detail: '70 % FC max.', time: '16:00', reasoningId: 'r-entretien', priority: 3 });
    out.push({ slug: 'repas-standard', kind: 'repas', title: 'Déjeuner — menu standard', detail: '750 kcal · 40 g protéines · 260 mg calcium.', time: '12:30', reasoningId: 'r-entretien', priority: 3 });
  }
  const ci = mockCheckIn(day);
  if (ci && ci.mood <= 2) {
    out.push({ slug: 'psy', kind: 'medical', title: 'Point psy (proposé, jamais imposé)', detail: 'Humeur basse au check-in : un échange est proposé, vous décidez.', reasoningId: 'r-psy', priority: 3 });
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
const NASA = { label: 'NASA-STD-3001 Vol. 1 Rév. C', url: NASA_STD_3001_URL };
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
  const AGE_LIMIT = 'Limite : l’écart d’âge par organe est un indicateur de l’équipe [H] — un équivalent en années, pas un vieillissement réel ; la perte spatiale est en partie réversible au retour.';

  const boneData = step('donnee', `J${T} : densité osseuse de la hanche ESTIMÉE à ${fr(100 - hip, 2)} % du pré-vol (perte ${fr(hip, 2)} %). Sources : bilan au sol avant le départ + marqueurs urinaires quotidiens. Le scanner à ultrasons ne mesure pas l’os.`, 'H', { label: 'Corps du jour J94 — SIMULÉ (persona Haddad)' });
  const boneModel = step('modele', `Modèle « bone » : au rythme actuel, la perte atteint ${fr(hipEnd, 2)} % à J${DAY_END} ; ${fr(HIP_LOSS_END_PLAN, 2)} % si le plan est suivi. ${AGE_LIMIT}`, 'H', { label: 'Modèle bone — fiche sol-zero §7 (mock)' });
  const boneNorm = step('norme', 'NASA-STD-3001 [V1 4027] : densité osseuse ≥ 95 % du pré-vol à la hanche, ≥ 90 % au col du fémur. La projection à J860 passe sous le seuil → statut AMBRE aujourd’hui.', 'NASA', NASA);
  const vo2Data = step('donnee', `J${T} : VO₂max ${fr(v, 1)} ml/kg/min, soit −${fr(vo2DeficitPct(T, 0), 2)} % par rapport au pré-vol (${fr(VO2_PREFLIGHT, 1)}).`, 'Persona', { label: 'Montre + séance vélo — SIMULÉ (persona Haddad)' });
  const vo2Model = step('modele', `Modèle « aerobic » : à l’arrivée (Sol 0, J${DAY_SOL0}), ${fr(vo2max(DAY_SOL0, 0), 1)} ml/kg/min au rythme actuel ; ${fr(vo2max(DAY_SOL0, 1), 1)} avec le plan.`, 'H', { label: 'Modèle aerobic — fiche sol-zero §7 (mock)' });
  const vo2Norm = step('norme', `NASA-STD-3001 [V1 4003] : ≥ 80 % du pré-vol en mission ; [V1 4002] : ≥ ${fr(VO2_SOL0, 1)} ml/kg/min. L’arrivée se ferait à la limite → AMBRE.`, 'NASA', NASA);
  const muscleData = step('donnee', `J${T} : volume de la cuisse au scan ${fr(cuisse?.value ?? NaN, 1)} % de J0 ; tendance 7 j ${fr(cuisse?.trend7d ?? NaN, 2)} %/semaine (bruit de mesure ± ${fr(cuisse?.noise ?? 0, 1)}).`, 'Persona', { label: 'Scan du jour — SIMULÉ (aucune donnée publique du scanner)' });
  const muscleModel = step('modele', 'Régression simple sur les 7 derniers jours : la pente sort de la bande de bruit. Une valeur isolée ne déclenche jamais d’alerte.', 'H', { label: 'Règle tendance 7 j — ROADMAP §8' });
  const muscleNorm = step('norme', 'Pas de seuil NASA chiffré sur le volume musculaire : repères d’équipe [H] (ambre à −4 % ou pente ≤ −0,8 %/sem, rouge à −10 %).', 'H');

  const R = (id: string, title: string, steps: ReasoningStep[]): Reasoning => ({ id, title, steps });
  const list = [
    R('r-hanche-ared', 'ARED charge lourde — pourquoi ?', [boneData, boneModel, boneNorm,
      step('decision', 'Séance ARED en charge lourde (squat, soulevé de terre) : la contrainte axiale est la contre-mesure la plus efficace sur la hanche. Décidé à bord, sans attendre la Terre.', 'H')]),
    R('r-hanche-nutrition', 'Repas riche en calcium et vitamine D — pourquoi ?', [boneData, boneModel, boneNorm,
      step('decision', 'Déjeuner à 520 mg de calcium et 600 UI de vitamine D pour soutenir la formation osseuse. La vitamine D du dernier prélèvement est en bas de la référence.', 'H')]),
    R('r-sol-routine', 'Point « Sol-routine » — pourquoi ?', [boneData,
      step('modele', `Trois sujets dépassent ce que l’équipage tranche seul : os (projection J${DAY_END} rouge), VO₂ (Sol 0 à la limite), gaine du nerf optique (${fr(gaine?.value ?? NaN, 2)} mm, en hausse).`, 'H'),
      boneNorm,
      step('decision', 'Message différé au médecin au sol (bisphosphonates, risque SANS, protocole aérobie). La réponse arrive dans ENSUITE, avec le délai radio du jour : MAINTENANT n’en dépend jamais.', 'H')]),
    R('r-vo2-intervalles', 'Vélo par intervalles — pourquoi ?', [vo2Data, vo2Model, vo2Norm,
      step('decision', 'Séance d’intervalles 6×3 min à 90 % FC max : le plan vise 37,3 ml/kg/min à Sol 0 au lieu de 36,5.', 'H')]),
    R('r-cuisse-tendance', 'Renforcement ciblé de la cuisse — pourquoi ?', [muscleData, muscleModel, muscleNorm,
      step('decision', 'Ajout de fentes et d’extensions de hanche sur ARED pendant 7 jours, puis réévaluation sur la tendance.', 'H')]),
    R('r-cuisse-proteines', 'Dîner riche en protéines — pourquoi ?', [muscleData, muscleModel, muscleNorm,
      step('decision', 'Dîner à 58 g de protéines après la séance de renforcement, pour soutenir la synthèse musculaire.', 'H')]),
    R('r-nerf-optique', 'Test de vision — pourquoi ?', [
      step('donnee', `J${T} : diamètre de la gaine du nerf optique ${fr(gaine?.value ?? NaN, 2)} mm (5,00 mm à J0), en légère hausse. Mesure par échographie, déjà pratiquée sur l’ISS.`, 'Persona', { label: 'Scan du jour — SIMULÉ' }),
      step('modele', 'Moyenne et pente sur 7 jours : la moyenne dépasse le repère de vigilance de 5,5 mm.', 'H'),
      step('norme', 'Repère d’équipe [H] en attendant la référence publiée (échographie du nerf optique, risque SANS) — à sourcer par Steve.', 'H'),
      step('decision', 'Test de vision aujourd’hui et envoi des mesures au médecin au sol.', 'H')]),
    R('r-calcium-urinaire', 'Hydratation renforcée — pourquoi ?', [
      step('donnee', `J${T} : calcium urinaire ${fr(ca?.value ?? NaN, 0)} mg/24 h, en hausse depuis J0 ; aucun calcul au scan.`, 'Persona', { label: 'Urine quotidienne — SIMULÉ' }),
      step('modele', 'Le calcium libéré par l’os passe dans les urines : la hausse suit la perte osseuse estimée.', 'H'),
      step('norme', 'Référence terrestre < 300 mg/24 h [Publié — à vérifier].', 'Publié'),
      step('decision', 'Hydratation ≥ 2,5 L et contrôle des reins au scan suivant.', 'H')]),
    R('r-checkin', 'Check-in du matin — pourquoi ?', [
      step('donnee', 'Humeur, fatigue, douleur et sommeil ressenti : la seule donnée que vous êtes seul à pouvoir fournir.', 'Persona', { label: 'Check-in du matin — RÉEL quand il est saisi, SIMULÉ sinon' }),
      step('modele', 'Le check-in entre dans le triage du jour, avec le cortisol, le sommeil et la VFC.', 'H'),
      step('norme', 'Pas de seuil NASA : règle d’équipe [H] (humeur ≤ 2 pendant 3 jours → échange proposé, jamais imposé).', 'H'),
      step('decision', 'Check-in en premier écran de la journée, en moins de 30 secondes.', 'H')]),
    R('r-prelevement', 'Prélèvement capillaire hebdomadaire — pourquoi ?', [
      step('donnee', 'Dernier prélèvement il y a 7 jours : les entrées de PhenoAge (albumine, créatinine, glucose, CRP…) doivent être rafraîchies.', 'Persona'),
      step('modele', 'PhenoAge (Levine et al., 2018) : âge biologique global calculé sur une prise de sang standard.', 'Publié', { label: 'Levine et al., Aging, 2018', url: 'https://doi.org/10.18632/aging.101414' }),
      step('norme', 'Une donnée expirée ne donne jamais un statut vert : elle passe en « données insuffisantes ».', 'H'),
      step('decision', 'Micro-prélèvement capillaire ce matin (une prise de sang veineuse quotidienne serait irréaliste en vol).', 'H')]),
    R('r-dose', 'Revue de la dose — pourquoi ?', [
      step('donnee', 'Dose cumulée suivie chaque jour par le dosimètre de bord (SIMULÉ).', 'Persona'),
      step('modele', 'Prévu : 1,84 mSv/j en croisière, 0,64 mSv/j en surface.', 'Publié', { label: 'MSL/RAD — Zeitlin et al. 2013 ; Hassler et al. 2014' }),
      step('norme', 'Repère de 600 mSv : hypothèse d’équipe [H], à vérifier dans NASA-STD-3001.', 'H', NASA),
      step('decision', 'Revue avec le CMO du temps passé hors de la zone la mieux protégée.', 'H')]),
    R('r-cmo', 'Prévenir le CMO — pourquoi ?', [
      step('donnee', 'Un indicateur est passé sous son seuil rouge.', 'Persona'),
      step('modele', 'Triage du jour : niveau ROUGE.', 'H'),
      step('norme', 'Seuils rouges : NASA-STD-3001 Rév. C.', 'NASA', NASA),
      step('decision', 'Le CMO de bord est prévenu avant toute séance ; la Terre est informée en parallèle.', 'H')]),
    R('r-psy', 'Point psy proposé — pourquoi ?', [
      step('donnee', 'Humeur basse au check-in.', 'Persona', { label: 'Check-in du matin' }),
      step('modele', 'Règle : humeur ≤ 2 sur 3 jours, ou humeur basse + cortisol en hausse + sommeil dégradé.', 'H'),
      step('norme', 'Pas de seuil NASA chiffré : règle d’équipe [H].', 'H'),
      step('decision', 'Un échange est proposé. Vous décidez ; rien n’est imposé ni transmis sans votre accord.', 'H')]),
    R('r-entretien', 'Protocole d’entretien — pourquoi ?', [
      step('donnee', 'Aucune alerte aujourd’hui : tous les indicateurs suivis sont dans leurs seuils.', 'Persona'),
      step('modele', 'Les modèles projettent une perte lente même sans alerte.', 'H'),
      step('norme', 'NASA-STD-3001 : contre-mesures d’exercice maintenues pendant toute la mission.', 'NASA', NASA),
      step('decision', 'Séances standard ARED + aérobie et menus standard.', 'H')]),
  ];
  return Object.fromEntries(list.map((r) => [r.id, r]));
}

let chainCache: Record<string, Reasoning> | null = null;

export function mockExplain(reasoningId: string): Reasoning {
  chainCache ??= chains();
  return chainCache[reasoningId] ?? {
    id: reasoningId,
    title: 'Raisonnement introuvable',
    steps: [
      step('donnee', `Aucune donnée associée à l’identifiant « ${reasoningId} ».`, 'H'),
      step('modele', 'Aucun modèle appliqué.', 'H'),
      step('norme', 'Aucune norme associée.', 'H'),
      step('decision', 'Données insuffisantes : aucune consigne ne peut être justifiée.', 'H'),
    ],
  };
}
export function mockReasoningIds(): string[] {
  chainCache ??= chains();
  return Object.keys(chainCache);
}
