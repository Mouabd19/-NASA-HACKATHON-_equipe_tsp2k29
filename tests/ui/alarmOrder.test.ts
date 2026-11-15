// Numéros de repère partagés entre la liste « Alertes », la scène 3D et « Maintenant ».
import { describe, expect, it } from 'vitest';
import type { LayerId } from '../../src/types';
import { alertsForDayPlan } from '../../src/models/alerts';
import { getAnchor } from '../../src/three/anatomy';
import { DEFAULT_LAYERS, alarmNumbers, isOnBody, sortAlarms } from '../../src/pages/body/alarmOrder';
import { warnItems } from '../../src/three/warnings/model';

const ALL: Record<LayerId, boolean> = { squelette: true, muscles: true, organes: true, cardio: true, nerveux: true, exposition: true };

describe('alarmOrder', () => {
  it('J94, calques par défaut : la scène se lit 1, 2, 3', () => {
    const nums = warnItems(94, DEFAULT_LAYERS).map((w) => w.num).sort();
    expect(nums).toEqual([1, 2, 3]);
  });

  it.each([94, 600, 860])('J%i : un repère garde son numéro quand on change les calques', (day) => {
    const byDefault = new Map(warnItems(day, DEFAULT_LAYERS).map((w) => [w.key, w.num]));
    for (const w of warnItems(day, ALL)) {
      if (byDefault.has(w.key)) expect(w.num).toBe(byDefault.get(w.key));
    }
  });

  it('J94 : le nerf optique (calque masqué) garde un numéro, après ceux de la scène par défaut', () => {
    const alerts = alertsForDayPlan(94, 0);
    const nums = alarmNumbers(alerts);
    const eye = alerts.find((a) => a.organId === 'yeux');
    expect(eye && nums.get(eye.id)).toBe(4);
  });

  it.each([94, 600, 860])('J%i : avec les calques par défaut, les numéros se lisent de haut en bas', (day) => {
    const alerts = alertsForDayPlan(day, 0);
    const nums = alarmNumbers(alerts);
    const onScene = alerts.filter((a) => isOnBody(a, DEFAULT_LAYERS) && nums.has(a.id)).sort((a, b) => nums.get(a.id)! - nums.get(b.id)!);
    const heights = onScene.map((a) => getAnchor(a.organId)![1]);
    expect(heights).toEqual([...heights].sort((a, b) => b - a));
    expect(onScene.map((a) => nums.get(a.id))).toEqual(onScene.map((_, i) => i + 1));
  });

  it('en projection, la liste suit le corps ; les repères masqués passent en fin de liste', () => {
    const alerts = alertsForDayPlan(600, 0);
    const visible = (a: (typeof alerts)[number]): boolean => isOnBody(a, DEFAULT_LAYERS);
    const list = sortAlarms(alerts, true, visible);
    const firstHidden = list.findIndex((a) => !visible(a));
    expect(firstHidden === -1 || list.slice(firstHidden).every((a) => !visible(a))).toBe(true);
  });
});
