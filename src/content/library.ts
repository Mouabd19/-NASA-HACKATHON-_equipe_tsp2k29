// Propriétaire : Steve (D). Bibliothèque de contenus de la to-do — ROADMAP §7.
// Exercices, repas et textes « Pourquoi ? ». Aucun appel réseau.
// Sources : `ochmo-exercise` = NASA OCHMO Technical Brief « Exercise » (déc. 2023) ; ids [Publié] dans public/data/nasa/references.json.
import type { OrganId, Tag } from '../types';

export interface Exercise {
  id: string;
  title: string;                 // 'ARED — squat 4×6'
  device: 'ARED' | 'CEVIS' | 'T2' | 'sans appareil';
  durationMin: number;
  intensity: string;             // '70–80 % FCmax', 'charge lourde'
  sets?: string;                 // '4 × 6'
  targets: OrganId[];
  detail: string;
  tag: Tag;
  sourceId?: string;
}

export interface Meal {
  id: string;
  title: string;
  moment: 'petit-déjeuner' | 'déjeuner' | 'dîner' | 'collation' | 'journée';
  items: string[];
  kcal: number;
  proteinsG: number;
  calciumMg: number;
  vitaminDUI: number;
  note: string;
  tag: Tag;                      // valeurs nutritionnelles = ordres de grandeur [H]
}

export interface TestItem {
  id: string;
  title: string;
  durationMin: number;
  targets: OrganId[];
  detail: string;
  tag: Tag;
  sourceId?: string;
}

const TESTS: TestItem[] = [
  { id: 'test-pvt', title: 'PVT alertness test (3 min)', durationMin: 3, targets: ['cerveau'], detail: 'Tap as soon as a signal appears on screen: measures reaction time and alertness, both sensitive to sleep loss.', tag: 'NASA' },
  { id: 'test-vision', title: 'Vision + optic nerve ultrasound', durationMin: 15, targets: ['yeux'], detail: 'Visual acuity check and ultrasound measurement of optic nerve sheath diameter (SANS risk).', tag: 'Publié', sourceId: 'fall2022-onsd' },
  { id: 'test-prelevement', title: 'Capillary micro-sample', durationMin: 5, targets: ['sang'], detail: 'Finger-prick blood drop (weekly): hemoglobin, inflammation, PhenoAge markers.', tag: 'H' },
  { id: 'test-urine', title: 'First-morning urinalysis', durationMin: 2, targets: ['reins', 'hanche'], detail: 'Calcium and a bone resorption marker: daily tracking of bone and kidney stone risk.', tag: 'Publié', sourceId: 'buckey-urine' },
  { id: 'test-echo-reins', title: 'Kidney ultrasound', durationMin: 10, targets: ['reins'], detail: 'Screening for kidney stones when urinary calcium rises.', tag: 'Publié', sourceId: 'okada2022' },
  { id: 'test-checkin', title: 'Morning check-in', durationMin: 1, targets: ['cerveau'], detail: 'Mood, fatigue, pain, perceived sleep: two taps per row.', tag: 'H' },
];

const EXERCISES: Exercise[] = [
  { id: 'ared-squat', title: 'ARED — heavy squat', device: 'ARED', durationMin: 20, intensity: 'heavy load (strength)', sets: '4 × 6', targets: ['hanche', 'femur', 'cuisse', 'rachis'], detail: 'Squat on the ISS resistance exercise device. Mechanical loading of the hip is the main countermeasure against bone loss.', tag: 'NASA', sourceId: 'ochmo-exercise' },
  { id: 'ared-souleve-de-terre', title: 'ARED — deadlift', device: 'ARED', durationMin: 15, intensity: 'heavy load (strength)', sets: '4 × 6', targets: ['hanche', 'rachis', 'paravertebraux', 'cuisse'], detail: 'Loads the spine and hip, strengthens the back muscles.', tag: 'NASA', sourceId: 'ochmo-exercise' },
  { id: 'ared-mollets', title: 'ARED — calf raises', device: 'ARED', durationMin: 10, intensity: 'moderate load', sets: '3 × 12', targets: ['mollet'], detail: 'Slows calf atrophy: calves work hard on the ground and are nearly idle in microgravity.', tag: 'NASA', sourceId: 'ochmo-exercise' },
  { id: 'velo-intervalles', title: 'Cycle — intervals', device: 'CEVIS', durationMin: 30, intensity: '4 × 4 min at 90% HRmax, 3 min recovery', targets: ['coeur'], detail: 'Interval training to keep VO₂max above NASA thresholds.', tag: 'NASA', sourceId: 'ochmo-exercise' },
  { id: 'velo-continu', title: 'Cycle — endurance', device: 'CEVIS', durationMin: 30, intensity: '70–75% HRmax', targets: ['coeur'], detail: 'Steady-state session, alternating with intervals every other day.', tag: 'NASA', sourceId: 'ochmo-exercise' },
  { id: 'tapis-intervalles', title: 'Treadmill — intervals', device: 'T2', durationMin: 30, intensity: '6 × 2 min at 85–90% HRmax', targets: ['coeur', 'hanche', 'femur'], detail: 'Harnessed running: cardio effort plus impact loading that benefits bone.', tag: 'NASA', sourceId: 'ochmo-exercise' },
  { id: 'tapis-continu', title: 'Treadmill — endurance', device: 'T2', durationMin: 30, intensity: '70% HRmax', targets: ['coeur', 'hanche'], detail: 'Steady-state running, regular impact loading on the lower limbs.', tag: 'NASA', sourceId: 'ochmo-exercise' },
  { id: 'mobilite-dos', title: 'Back mobility and core stability', device: 'sans appareil', durationMin: 15, intensity: 'gentle', targets: ['paravertebraux', 'rachis'], detail: 'Suggested for lower back pain, which is common in microgravity.', tag: 'H' },
  { id: 'respiration', title: 'Slow breathing', device: 'sans appareil', durationMin: 10, intensity: '6 breaths per minute', targets: ['cerveau'], detail: 'Recovery break suggested on days of fatigue or stress.', tag: 'H' },
];

const MEALS: Meal[] = [
  { id: 'menu-calcium-vitd', title: 'Bone menu: calcium and vitamin D', moment: 'journée', items: ['Breakfast: yogurt, oatmeal, almonds', 'Lunch: salmon, broccoli, rice', 'Dinner: cheese omelet, spinach', 'Vitamin D supplement'], kcal: 2700, proteinsG: 120, calciumMg: 1200, vitaminDUI: 800, note: 'Enough calcium and vitamin D, without excess (urinary calcium is being monitored).', tag: 'H' },
  { id: 'menu-proteines', title: 'Muscle menu: protein spread through the day', moment: 'journée', items: ['Breakfast: eggs, whole-grain bread', 'Lunch: chicken, lentils, vegetables', 'Post-ARED snack: protein shake', 'Dinner: white fish, potatoes'], kcal: 2900, proteinsG: 140, calciumMg: 900, vitaminDUI: 800, note: 'Protein spread across the day, including a serving right after the resistance session.', tag: 'H' },
  { id: 'menu-anti-calculs', title: 'Kidney menu: stone prevention', moment: 'journée', items: ['At least 2.5 L of water spread over the day', 'Low-salt meals', 'Moderate animal protein', 'Citrus fruit (citrate)', 'Normal calcium, no extra supplement'], kcal: 2600, proteinsG: 100, calciumMg: 1000, vitaminDUI: 800, note: 'Increased hydration and reduced salt when urinary calcium rises.', tag: 'H' },
  { id: 'menu-standard', title: 'Standard mission menu', moment: 'journée', items: ['Breakfast: cereal, fruit', 'Lunch: beef, vegetables, pasta', 'Dinner: chicken, quinoa, vegetables'], kcal: 2700, proteinsG: 110, calciumMg: 1000, vitaminDUI: 800, note: 'Day with no particular alert.', tag: 'H' },
  { id: 'menu-recuperation', title: 'Recovery menu (fatigue, anemia)', moment: 'journée', items: ['Breakfast: eggs, whole-grain bread, orange juice', 'Lunch: beef, lentils, green vegetables', 'Dinner: fish, sweet potato'], kcal: 2800, proteinsG: 125, calciumMg: 950, vitaminDUI: 800, note: 'Rich in iron and protein, useful when hemoglobin drops.', tag: 'H' },
  { id: 'menu-diner-leger', title: 'Early, light dinner (sleep)', moment: 'dîner', items: ['Dinner before 19:30', 'Vegetable soup, fish, rice', 'No caffeine after 14:00'], kcal: 600, proteinsG: 35, calciumMg: 250, vitaminDUI: 0, note: 'Suggested when sleep quality declines.', tag: 'H' },
];

// Textes « Pourquoi ? » : une phrase par règle, reliée à la norme ou à la source.
const WHY: Record<string, string> = {
  'V1 4027': 'NASA requires hip and spine bone density to stay at or above 95% of preflight values (90% for the femoral neck).',
  'V1 4003': 'NASA requires aerobic capacity to stay at or above 80% of its preflight value.',
  'V1 4002': 'For Mars surface EVAs, NASA requires a VO₂max of at least 36.5 ml/kg/min.',
  'V1 4001': 'For microgravity EVAs, NASA requires a VO₂max of at least 32.9 ml/kg/min.',
  'V1 4030': 'Career radiation dose must stay below 600 mSv (NASA standard).',
  'V1 3006': 'Every vehicle has at least two Crew Medical Officers: when Earth is far away, they make the call.',
  'V1 6010': 'NASA schedules routine private psychological conferences with a professional.',
  'V1 6004': 'NASA requires a psychological support program for the crew.',
  'R13': 'Chest pain, unusual shortness of breath or feeling unwell: stop exercising and notify the Crew Medical Officer immediately, without waiting for Earth.',
  'sol-routine': 'Even with the plan followed, the projection stays close to the limit: the decision belongs to the ground flight surgeon. Exercise + bisphosphonates protected astronauts\' bone on the ISS (LeBlanc 2013).',
  'calcium-urinaire': 'Calcium released from bone passes into the urine and raises kidney stone risk: drink more and check the kidneys by ultrasound.',
  'nerf-optique': 'Optic nerve sheath diameter reflects intracranial pressure, linked to in-flight vision changes (SANS).',
  'point-psy': 'Low mood several days in a row, with poor sleep or elevated cortisol: a session with the psychologist is offered, never imposed.',
  'anemie': 'In flight, the body destroys about 54% more red blood cells: hemoglobin is monitored (Trudel 2022).',
  'donnees-manquantes': 'A measurement is missing or too old: the app never assumes everything is fine and asks for a new test.',
  'exercice-quotidien': 'On the ISS, the crew trains about 600 min per week: cardio and resistance training are the first countermeasure (NASA).',
};

const exerciseById = new Map(EXERCISES.map((e) => [e.id, e]));
const testById = new Map(TESTS.map((t) => [t.id, t]));
const mealById = new Map(MEALS.map((m) => [m.id, m]));

/** Exercice par id (« ared-squat »). Id inconnu → null. */
export function getExercise(id: string): Exercise | null {
  return exerciseById.get(id) ?? null;
}

/** Repas par id (« menu-calcium-vitd »). Id inconnu → null. */
export function getMeal(id: string): Meal | null {
  return mealById.get(id) ?? null;
}

/** Ajout non cassant : test de la to-do par id (« test-pvt »). Id inconnu → null. */
export function getTest(id: string): TestItem | null {
  return testById.get(id) ?? null;
}

/** Phrase « Pourquoi ? » pour une règle (id de norme « V1 4027 » ou règle « calcium-urinaire »).
 *  Contrat : renvoie TOUJOURS une chaîne (signature §7). Règle inconnue → phrase de repli ; utiliser hasWhy() pour le savoir. */
export function whyText(rule: string): string {
  return WHY[rule] ?? 'Undocumented rule: see the Reasoning page for the full chain.';
}

/** Ajout non cassant : vrai si la règle a un texte « Pourquoi ? » documenté. */
export function hasWhy(rule: string): boolean {
  return rule in WHY;
}

/** Ajouts non cassants : listes complètes (pour les mocks et le planificateur). */
export const listTests = (): TestItem[] => TESTS;
export const listExercises = (): Exercise[] => EXERCISES;
export const listMeals = (): Meal[] => MEALS;
export const listWhyRules = (): string[] => Object.keys(WHY);
