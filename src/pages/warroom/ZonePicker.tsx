// Propriétaire : Ahmed (B). Choix multiple des zones douloureuses : chaque zone se coche et se décoche.
import type { OrganId } from '../../types';

export function ZonePicker({ zones, value, onToggle }: { zones: { id: OrganId; label: string }[]; value: OrganId[]; onToggle: (id: OrganId) => void }) {
  return (
    <div role="group" aria-label="Zones de la douleur" className="wr-zones">
      {zones.map((z) => {
        const on = value.includes(z.id);
        return (
          <button key={z.id} type="button" role="checkbox" aria-checked={on} data-active={on} onClick={() => onToggle(z.id)} className="sz-btn">
            {z.label}
          </button>
        );
      })}
    </div>
  );
}
