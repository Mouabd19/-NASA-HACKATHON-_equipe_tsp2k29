// État partagé de la page Body. Tous les composants de la page lisent/écrivent ici ;
// aucun ne dépend directement d'un autre composant.
import { create } from 'zustand';
import type { Alert, DayBody, LayerId, OrganId } from '../../types';
import { DAY_TODAY } from '../../mocks/mission';
import { getDayBodyPlan } from '../../sim/load';
import { alertsForDayPlan } from '../../models/alerts';

export const LAYER_ORDER: LayerId[] = ['squelette', 'muscles', 'organes', 'cardio', 'nerveux', 'exposition'];

export const LAYER_META: Record<LayerId, { sys: string; label: string; mvp: boolean }> = {
  squelette: { sys: 'SYS-01', label: 'SQUELETTE', mvp: true },
  muscles: { sys: 'SYS-02', label: 'MUSCLES', mvp: true },
  organes: { sys: 'SYS-03', label: 'ORGANES', mvp: true },
  cardio: { sys: 'SYS-04', label: 'CARDIO / SANG', mvp: true },
  nerveux: { sys: 'SYS-05', label: 'NERVEUX + YEUX', mvp: false },
  exposition: { sys: 'SYS-06', label: 'EXPOSITION', mvp: false },
};

export interface BodyState {
  day: number;                              // jour affiché (0..860)
  layers: Record<LayerId, boolean>;         // calques actifs
  hovered: OrganId | null;                  // organe survolé (3D ou panneau)
  selected: OrganId | null;                 // organe « épinglé » (clic) — recentre la caméra
  organWindow: OrganId | 'global' | null;   // fenêtre organe ouverte ('global' = PhenoAge)
  bloodAnalyte: string | null;              // ligne de sang dépliée
  adherence: 0 | 1;                         // 0 = rythme actuel, 1 = avec le plan
  playing: boolean;                         // lecture de la timeline
  scanNonce: number;                        // incrémenté pour rejouer le balayage du scan
  setDay: (d: number) => void;
  toggleLayer: (l: LayerId) => void;
  soloLayer: (l: LayerId) => void;
  setHovered: (o: OrganId | null) => void;
  setSelected: (o: OrganId | null) => void;
  openOrganWindow: (o: OrganId | 'global' | null) => void;
  setBloodAnalyte: (a: string | null) => void;
  setAdherence: (a: 0 | 1) => void;
  setPlaying: (p: boolean) => void;
  replayScan: () => void;
}

export const useBody = create<BodyState>((set) => ({
  day: DAY_TODAY,
  layers: { squelette: true, muscles: true, organes: true, cardio: false, nerveux: false, exposition: false },
  hovered: null,
  selected: null,
  organWindow: null,
  bloodAnalyte: null,
  adherence: 0,
  playing: false,
  scanNonce: 0,
  setDay: (d) => set({ day: Math.max(0, Math.min(860, Math.round(d))) }),
  toggleLayer: (l) => set((s) => ({ layers: { ...s.layers, [l]: !s.layers[l] } })),
  soloLayer: (l) => set(() => ({
    layers: { squelette: false, muscles: false, organes: false, cardio: false, nerveux: false, exposition: false, [l]: true },
  })),
  setHovered: (o) => set({ hovered: o }),
  setSelected: (o) => set({ selected: o }),
  openOrganWindow: (o) => set({ organWindow: o }),
  setBloodAnalyte: (a) => set({ bloodAnalyte: a }),
  setAdherence: (a) => set({ adherence: a }),
  setPlaying: (p) => set({ playing: p }),
  replayScan: () => set((s) => ({ scanNonce: s.scanNonce + 1 })),
}));

/**
 * Position écran (px, relative au conteneur de la scène) des ancres 3D, écrite à chaque frame
 * par la scène, lue par les traits de liaison et la carte de survol. Mutable, hors React,
 * pour ne pas déclencher de rendu à 60 Hz.
 */
export interface ScreenAnchor { x: number; y: number; visible: boolean }
export const screenAnchors = new Map<OrganId, ScreenAnchor>();

/**
 * (ajout) Coordination carte de survol ↔ plaques de warning, hors React (même repère que screenAnchors) :
 *  · hoverCardRect : boîte de la carte de survol, écrite par HoverCard — les plaques qu'elle recouvre s'effacent ;
 *  · plateSides : côté de la plaque de chaque organe en alerte, écrit par Warnings3D — la carte se pose de l'autre côté.
 */
export const hoverCardRect = { on: false, x: 0, y: 0, w: 0, h: 0 };
export const plateSides = new Map<OrganId, 1 | -1>();
/** (ajout) Axe du corps à l'écran (px, même repère) et échelle px/mètre à sa profondeur — écrit par BodyScene à chaque frame. */
export const bodyAxis = { x: Number.NaN, pxPerM: 0 };
/** (ajout) Balayage en cours : avancement 0..1 (−1 = aucun) et position écran du bord droit de l'anneau — écrit par BodyScene. */
export const scanState = { t: -1, x: 0, y: 0 };

/**
 * (ajout) SEUL point d'accès au corps et aux alertes pour la page Body : le scénario (rythme actuel /
 * avec le plan) est appliqué partout de la même façon — corps 3D, plaques, calques, alertes, en-tête, carte.
 * Avant J94 les deux scénarios sont identiques (données mesurées).
 */
export const scenarioBody = (day: number, adherence: number): DayBody => getDayBodyPlan(day, adherence);
export const scenarioAlerts = (day: number, adherence: number): Alert[] => alertsForDayPlan(day, adherence);
export function useDayBody(): DayBody {
  const day = useBody((s) => s.day);
  const adherence = useBody((s) => s.adherence);
  return scenarioBody(day, adherence);
}
export function useDayAlerts(): Alert[] {
  const day = useBody((s) => s.day);
  const adherence = useBody((s) => s.adherence);
  return scenarioAlerts(day, adherence);
}
