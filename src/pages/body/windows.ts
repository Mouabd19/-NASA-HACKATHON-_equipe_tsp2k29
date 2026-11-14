// Fenêtres de la page Body (Steve) : ouvertes / fermées, position (glisser), ordre d'affichage.
// Écran de base = le corps scanné seul (avec ses ⚠) ; tout le reste s'ouvre depuis le menu AFFICHAGE.
import { create } from 'zustand';

export type WinId = 'bilan' | 'analyses' | 'montre' | 'calques' | 'alertes' | 'chronologie';

export const WINDOWS: { id: WinId; label: string; key: string }[] = [
  { id: 'bilan', label: 'Bilan du jour', key: '1' },
  { id: 'analyses', label: 'Analyses', key: '2' },
  { id: 'montre', label: 'Montre', key: '3' },
  { id: 'calques', label: 'Calques', key: '4' },
  { id: 'alertes', label: 'Alertes du jour', key: '5' },
  { id: 'chronologie', label: 'Chronologie', key: '6' },
];

interface WindowsState {
  open: Record<WinId, boolean>;
  offset: Record<WinId, [number, number]>;   // déplacement depuis la position d'origine (px)
  order: WinId[];                             // dernier = au premier plan
  menu: boolean;
  toggle: (id: WinId) => void;
  close: (id: WinId) => void;
  closeAll: () => void;
  focus: (id: WinId) => void;
  move: (id: WinId, dx: number, dy: number) => void;
  setMenu: (v: boolean) => void;
}

const none = (): Record<WinId, boolean> => ({ bilan: false, analyses: false, montre: false, calques: false, alertes: false, chronologie: false });
const zero = (): Record<WinId, [number, number]> => ({ bilan: [0, 0], analyses: [0, 0], montre: [0, 0], calques: [0, 0], alertes: [0, 0], chronologie: [0, 0] });

export const useWindows = create<WindowsState>((set) => ({
  open: none(),
  offset: zero(),
  order: WINDOWS.map((w) => w.id),
  menu: false,
  toggle: (id) => set((s) => ({ open: { ...s.open, [id]: !s.open[id] }, order: [...s.order.filter((w) => w !== id), id] })),
  close: (id) => set((s) => ({ open: { ...s.open, [id]: false } })),
  closeAll: () => set({ open: none(), menu: false }),
  focus: (id) => set((s) => (s.order.at(-1) === id ? s : { order: [...s.order.filter((w) => w !== id), id] })),
  move: (id, dx, dy) => set((s) => ({ offset: { ...s.offset, [id]: [s.offset[id][0] + dx, s.offset[id][1] + dy] } })),
  setMenu: (v) => set({ menu: v }),
}));
