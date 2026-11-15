// Numéros de repère partagés entre la liste « Alertes » et la scène 3D.
import { describe, expect, it } from 'vitest';
import type { LayerId } from '../../src/types';
import { alertsForDayPlan } from '../../src/models/alerts';
import { getAnchor } from '../../src/three/anatomy';
import { alarmNumbers, isOnBody, sortAlarms } from '../../src/pages/body/alarmOrder';

const DEFAULT: Record<LayerId, boolean> = { squelette: true, muscles: true, organes: true, cardio: false, nerveux: false, exposition: false };
const ALL: Record<LayerId, boolean> = { squelette: true, muscles: true, organes: true, cardio: true, nerveux: true, exposition: true };

describe('alarmOrder', () => {
  it('ne numérote que les repères visibles : le n° 1 est toujours sur la scène', () => {
    const alerts = alertsForDayPlan(94, 0);
    const nums = alarmNumbers(alerts, (a) => isOnBody(a, DEFAULT));
    const eye = alerts.find((a) => a.organId === 'yeux');
    expect(eye && nums.has(eye.id)).toBe(false);
    expect([...nums.values()].sort()).toEqual([1, 2, 3]);
  });

  it.each([94, 600, 860])('J%i : les numéros se lisent de haut en bas sur le corps', (day) => {
    for (const layers of [DEFAULT, ALL]) {
      const alerts = alertsForDayPlan(day, 0);
      const nums = alarmNumbers(alerts, (a) => isOnBody(a, layers));
      const byNum = alerts.filter((a) => nums.has(a.id)).sort((a, b) => nums.get(a.id)! - nums.get(b.id)!);
      const heights = byNum.map((a) => getAnchor(a.organId)![1]);
      expect(heights).toEqual([...heights].sort((a, b) => b - a));
    }
  });

  it('en projection, la liste suit le corps ; les repères masqués passent en fin de liste', () => {
    const alerts = alertsForDayPlan(600, 0);
    const visible = (a: (typeof alerts)[number]): boolean => isOnBody(a, DEFAULT);
    const list = sortAlarms(alerts, true, visible);
    const firstHidden = list.findIndex((a) => !visible(a));
    expect(firstHidden === -1 || list.slice(firstHidden).every((a) => !visible(a))).toBe(true);
  });
});
