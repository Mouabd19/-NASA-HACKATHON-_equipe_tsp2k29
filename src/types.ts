// Contrat de types — ROADMAP §6. Ne change QUE par ajout (champ optionnel, nouveau type).
// Propriétaire : Walid. Demande de changement : section « Demandes aux autres » de ton status.

export type Color = 'green' | 'amber' | 'red' | 'grey';
export type Tag = 'NASA' | 'Publié' | 'H' | 'Persona';
export type Provenance = 'RÉEL' | 'SIMULÉ' | 'H';
export type Level = 'VERT' | 'AMBRE' | 'ORANGE' | 'ROUGE' | 'DONNEES_INSUFFISANTES';
export type LinkPos = 'ISS' | 'Lune' | 'MarsProche' | 'MarsScenario' | 'Conjonction';
export type LayerId = 'squelette' | 'muscles' | 'organes' | 'cardio' | 'nerveux' | 'exposition';
export type OrganId =
  | 'hanche' | 'rachis' | 'femur'                 // squelette
  | 'cuisse' | 'mollet' | 'paravertebraux'        // muscles
  | 'coeur' | 'poumons' | 'foie' | 'reins' | 'cerveau' | 'yeux'  // organes
  | 'sang'                                        // cardio
  | (string & {});

export interface Metric {
  key: string;                  // 'densite_osseuse', 'volume', 'vo2max', 'spo2'...
  label: string;
  value: number;
  unit: string;
  ref?: { low?: number; high?: number; standardId?: string };
  color: Color;
  tag: Tag;
  provenance: Provenance;
  trend7d?: number;             // v3.2 (ajout) : pente sur 7 j, en %/semaine — c'est elle qui déclenche l'alerte
  noise?: number;               // v3.2 (ajout) : bruit de mesure (± même unité que value)
}

export interface CheckIn {      // v3.2 (ajout) : auto-évaluation du matin, 2 taps par ligne
  day: number;
  mood: 1 | 2 | 3 | 4 | 5;
  fatigue: 1 | 2 | 3 | 4 | 5;
  pain: 0 | 1 | 2 | 3;          // 0 = aucune
  painZone?: OrganId;
  painZones?: OrganId[];        // (ajout, demande Ahmed) : plusieurs zones ; painZone = la première, gardée pour compatibilité
  sleepFelt: 1 | 2 | 3 | 4 | 5;
  source: 'manual' | 'simulated';
}

export interface PhenoAgeResult { // v3.2 (ajout) : âge biologique global [Publié]
  day: number;                  // jour du prélèvement utilisé
  phenoAge: number;
  chronoAge: number;
  inputs: Record<string, number>; // marqueurs utilisés, visibles dans Raisonnement
  tag: 'Publié';
  mock?: boolean;               // (ajout) true tant que la valeur vient d'un stub : la FORMULE est publiée, la VALEUR est factice
}

export interface BioAgePoint {
  day: number;
  bioAge: number;
  band?: [number, number];
  predicted: boolean;           // true → tracé en pointillé
}

export interface OrganState {
  id: OrganId;
  layer: LayerId;
  name: string;
  status: Color;
  metrics: Metric[];
  chronoAge: number;
  bioAge: number;
  bioAgeTag: 'H';
}

export interface DayBody {      // le « corps du jour » (un par jour)
  day: number;                  // J0..J94 mesuré ; > 94 = projeté
  date: string;
  projected: boolean;
  organs: OrganState[];
  source: 'scan-midjourney-sim' | 'echo-bord-sim' | 'projection';
}

export interface Alert {
  id: string;
  organId: OrganId;
  level: Level;
  title: string;                // 'HANCHE — PERTE OSSEUSE'
  message: string;
  rule: string;                 // 'V1 4027' ou 'R13'
}

export interface BloodTest {
  day: number;
  analyte: 'hemoglobine' | 'hematocrite' | 'leucocytes' | 'crp' | 'calcium'
         | 'vitamine_d' | 'creatinine' | 'glucose' | 'cortisol' | (string & {});
  value: number;
  unit: string;
  refLow: number;
  refHigh: number;
  tag: Tag;
}

export interface Measurement {
  type: 'RestingHeartRate' | 'HeartRateVariabilitySDNN' | 'VO2Max' | 'OxygenSaturation'
      | 'AppleSleepingWristTemperature' | 'SleepAnalysis' | 'HeartRate';
  value: number;
  unit: string;
  date: string;
  source: 'apple-watch-export' | 'apple-watch-live' | 'manual' | 'simulated';
}

export interface Baseline { type: Measurement['type']; mean: number; sd: number; n: number }

export interface TodoItem {
  id: string;
  kind: 'exercice' | 'repas' | 'test' | 'medical';
  title: string;                // 'ARED — squat 4×8'
  detail: string;
  time?: string;                // '07:30'
  done: boolean;
  reasoningId: string;
  priority: 1 | 2 | 3;
}

export interface ReasoningStep {
  kind: 'donnee' | 'modele' | 'norme' | 'decision';
  text: string;
  source?: { label: string; url?: string };
  tag: Tag;
}
export interface Reasoning { id: string; title: string; steps: ReasoningStep[] }

export interface RouterOutput {
  maintenant: string;           // NE DÉPEND JAMAIS du lien Terre
  ensuite: { decideur: 'moi' | 'CMO' | 'sol' | 'equipage'; reponseMin?: number; texte: string };
}

export interface TriageResult { level: Level; reasons: string[]; groundRoutine: string[] }

export interface OrganSummary { organId: OrganId; day: number; text: string; generatedBy: 'IA-sol'; reviewed: false }

export interface ModelManifest {
  layers: { id: LayerId; file: string; organs: OrganId[] }[];
  organs: { id: OrganId; file?: string; anchor: [number, number, number] }[];  // anchor = position du warning ⚠
  credits: string;              // 'Z-Anatomy — CC BY-SA 4.0'
  avatar?: string;              // (ajout, demande Steve) : silhouette de Haddad (enveloppe hologramme + carte de dose)
  extraNodes?: Record<string, string[] | string>; // (ajout, demande Steve) : fichier .glb → organId présents (y compris arteres, veines, aorte) ; clé `note` = texte libre
}
