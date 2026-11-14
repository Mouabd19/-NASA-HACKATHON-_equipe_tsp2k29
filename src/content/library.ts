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

const EXERCISES: Exercise[] = [
  { id: 'ared-squat', title: 'ARED — squat lourd', device: 'ARED', durationMin: 20, intensity: 'charge lourde (force)', sets: '4 × 6', targets: ['hanche', 'femur', 'cuisse', 'rachis'], detail: 'Squat sur l\'appareil de résistance de l\'ISS. La charge mécanique sur la hanche est la contre-mesure principale contre la perte osseuse.', tag: 'NASA', sourceId: 'ochmo-exercise' },
  { id: 'ared-souleve-de-terre', title: 'ARED — soulevé de terre', device: 'ARED', durationMin: 15, intensity: 'charge lourde (force)', sets: '4 × 6', targets: ['hanche', 'rachis', 'paravertebraux', 'cuisse'], detail: 'Charge la colonne et la hanche, renforce les muscles du dos.', tag: 'NASA', sourceId: 'ochmo-exercise' },
  { id: 'ared-mollets', title: 'ARED — extension des mollets', device: 'ARED', durationMin: 10, intensity: 'charge modérée', sets: '3 × 12', targets: ['mollet'], detail: 'Freine l\'atrophie des mollets, très sollicités au sol et quasi inactifs en apesanteur.', tag: 'NASA', sourceId: 'ochmo-exercise' },
  { id: 'velo-intervalles', title: 'Vélo — intervalles', device: 'CEVIS', durationMin: 30, intensity: '4 × 4 min à 90 % FCmax, récupération 3 min', targets: ['coeur'], detail: 'Travail par intervalles pour maintenir le VO₂max au-dessus des seuils NASA.', tag: 'NASA', sourceId: 'ochmo-exercise' },
  { id: 'velo-continu', title: 'Vélo — endurance', device: 'CEVIS', durationMin: 30, intensity: '70–75 % FCmax', targets: ['coeur'], detail: 'Séance continue, à alterner avec les intervalles un jour sur deux.', tag: 'NASA', sourceId: 'ochmo-exercise' },
  { id: 'tapis-intervalles', title: 'Tapis — intervalles', device: 'T2', durationMin: 30, intensity: '6 × 2 min à 85–90 % FCmax', targets: ['coeur', 'hanche', 'femur'], detail: 'Course harnachée : effort cardio et impacts utiles à l\'os.', tag: 'NASA', sourceId: 'ochmo-exercise' },
  { id: 'tapis-continu', title: 'Tapis — endurance', device: 'T2', durationMin: 30, intensity: '70 % FCmax', targets: ['coeur', 'hanche'], detail: 'Course continue, impacts réguliers sur les membres inférieurs.', tag: 'NASA', sourceId: 'ochmo-exercise' },
  { id: 'mobilite-dos', title: 'Mobilité et gainage du dos', device: 'sans appareil', durationMin: 15, intensity: 'douce', targets: ['paravertebraux', 'rachis'], detail: 'Proposé en cas de douleur du bas du dos, fréquente en apesanteur.', tag: 'H' },
  { id: 'respiration', title: 'Respiration lente', device: 'sans appareil', durationMin: 10, intensity: '6 respirations par minute', targets: ['cerveau'], detail: 'Pause de récupération proposée les jours de fatigue ou de tension.', tag: 'H' },
];

const MEALS: Meal[] = [
  { id: 'menu-calcium-vitd', title: 'Menu os : calcium et vitamine D', moment: 'journée', items: ['Petit-déjeuner : yaourt, flocons d\'avoine, amandes', 'Déjeuner : saumon, brocolis, riz', 'Dîner : omelette au fromage, épinards', 'Supplément de vitamine D'], kcal: 2700, proteinsG: 120, calciumMg: 1200, vitaminDUI: 800, note: 'Calcium et vitamine D en quantité suffisante, sans excès (le calcium urinaire est surveillé).', tag: 'H' },
  { id: 'menu-proteines', title: 'Menu muscle : protéines réparties', moment: 'journée', items: ['Petit-déjeuner : œufs, pain complet', 'Déjeuner : poulet, lentilles, légumes', 'Collation après l\'ARED : boisson protéinée', 'Dîner : poisson blanc, pommes de terre'], kcal: 2900, proteinsG: 140, calciumMg: 900, vitaminDUI: 800, note: 'Protéines réparties sur la journée, dont une prise juste après la séance de musculation.', tag: 'H' },
  { id: 'menu-anti-calculs', title: 'Menu reins : prévention des calculs', moment: 'journée', items: ['Au moins 2,5 L d\'eau répartis sur la journée', 'Plats peu salés', 'Protéines animales modérées', 'Agrumes (citrate)', 'Calcium normal, sans supplément supplémentaire'], kcal: 2600, proteinsG: 100, calciumMg: 1000, vitaminDUI: 800, note: 'Hydratation renforcée et sel réduit quand le calcium urinaire monte.', tag: 'H' },
  { id: 'menu-standard', title: 'Menu standard de mission', moment: 'journée', items: ['Petit-déjeuner : céréales, fruit', 'Déjeuner : bœuf, légumes, pâtes', 'Dîner : poulet, quinoa, légumes'], kcal: 2700, proteinsG: 110, calciumMg: 1000, vitaminDUI: 800, note: 'Journée sans alerte particulière.', tag: 'H' },
  { id: 'menu-recuperation', title: 'Menu récupération (fatigue, anémie)', moment: 'journée', items: ['Petit-déjeuner : œufs, pain complet, jus d\'orange', 'Déjeuner : bœuf, lentilles, légumes verts', 'Dîner : poisson, patate douce'], kcal: 2800, proteinsG: 125, calciumMg: 950, vitaminDUI: 800, note: 'Riche en fer et en protéines, utile quand l\'hémoglobine baisse.', tag: 'H' },
  { id: 'menu-diner-leger', title: 'Dîner tôt et léger (sommeil)', moment: 'dîner', items: ['Dîner avant 19 h 30', 'Soupe de légumes, poisson, riz', 'Pas de caféine après 14 h'], kcal: 600, proteinsG: 35, calciumMg: 250, vitaminDUI: 0, note: 'Proposé quand le sommeil se dégrade.', tag: 'H' },
];

// Textes « Pourquoi ? » : une phrase par règle, reliée à la norme ou à la source.
const WHY: Record<string, string> = {
  'V1 4027': 'La NASA exige de garder la densité osseuse de la hanche et du rachis à au moins 95 % de sa valeur d\'avant le vol (90 % pour le col du fémur).',
  'V1 4003': 'La NASA exige de garder la capacité aérobie à au moins 80 % de sa valeur d\'avant le vol.',
  'V1 4002': 'Pour sortir sur la surface de Mars, la NASA exige un VO₂max d\'au moins 36,5 ml/kg/min.',
  'V1 4001': 'Pour une sortie en apesanteur, la NASA exige un VO₂max d\'au moins 32,9 ml/kg/min.',
  'V1 4030': 'La dose de radiation reçue sur toute une carrière doit rester sous 600 mSv (norme NASA).',
  'V1 3006': 'Chaque vaisseau a au moins deux officiers médicaux de bord : quand la Terre est loin, ce sont eux qui décident.',
  'V1 6010': 'La NASA prévoit des entretiens psychologiques réguliers avec un professionnel.',
  'V1 6004': 'La NASA impose un programme de soutien psychologique pour l\'équipage.',
  'R13': 'Douleur thoracique, essoufflement inhabituel ou malaise : on arrête l\'effort et on prévient l\'officier médical tout de suite, sans attendre la Terre.',
  'sol-routine': 'Même avec le plan suivi, la projection reste proche de la limite : la décision revient au médecin au sol. Exercice + bisphosphonates a protégé l\'os d\'astronautes sur l\'ISS (LeBlanc 2013).',
  'calcium-urinaire': 'Le calcium libéré par les os passe dans l\'urine et augmente le risque de calculs rénaux : on boit plus et on vérifie les reins à l\'échographie.',
  'nerf-optique': 'Le diamètre de la gaine du nerf optique reflète la pression dans le crâne, liée aux troubles de la vision en vol (SANS).',
  'point-psy': 'Humeur basse plusieurs jours de suite, avec sommeil ou cortisol dégradés : un échange avec le psychologue est proposé, jamais imposé.',
  'anemie': 'En vol, le corps détruit environ 54 % de globules rouges en plus : on surveille l\'hémoglobine (Trudel 2022).',
  'donnees-manquantes': 'Une mesure manque ou date trop : l\'app ne suppose jamais que tout va bien et demande un nouveau test.',
  'exercice-quotidien': 'Sur l\'ISS, l\'équipage s\'entraîne environ 600 min par semaine : cardio et musculation sont la première contre-mesure (NASA).',
};

const exerciseById = new Map(EXERCISES.map((e) => [e.id, e]));
const mealById = new Map(MEALS.map((m) => [m.id, m]));

/** Exercice par id (« ared-squat »). Id inconnu → null. */
export function getExercise(id: string): Exercise | null {
  return exerciseById.get(id) ?? null;
}

/** Repas par id (« menu-calcium-vitd »). Id inconnu → null. */
export function getMeal(id: string): Meal | null {
  return mealById.get(id) ?? null;
}

/** Phrase « Pourquoi ? » pour une règle (id de norme « V1 4027 » ou règle « calcium-urinaire »). */
export function whyText(rule: string): string {
  return WHY[rule] ?? 'Règle non documentée : voir la page Raisonnement pour la chaîne complète.';
}

/** Ajouts non cassants : listes complètes (pour les mocks et le planificateur). */
export const listExercises = (): Exercise[] => EXERCISES;
export const listMeals = (): Meal[] => MEALS;
export const listWhyRules = (): string[] => Object.keys(WHY);
