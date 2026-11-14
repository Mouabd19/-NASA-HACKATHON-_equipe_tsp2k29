// Propriétaire : Ahmed (B). Choix multiple des zones douloureuses : chaque zone se coche et se décoche.
import type { OrganId } from '../../types';
import { T } from './ui';

export function ZonePicker({ zones, value, onToggle }: { zones: { id: OrganId; label: string }[]; value: OrganId[]; onToggle: (id: OrganId) => void }) {
  return (
    <div role="group" aria-label="Zones de la douleur" style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
      {zones.map((z) => {
        const on = value.includes(z.id);
        return (
          <button
            key={z.id}
            type="button"
            role="checkbox"
            aria-checked={on}
            onClick={() => onToggle(z.id)}
            className="wr-seg"
            style={{
              fontFamily: T.fontText, fontSize: 15, fontWeight: 500, minHeight: 44, padding: '0 16px',
              borderRadius: T.radius.pill, cursor: 'pointer',
              background: on ? T.text : T.panelRaised,
              color: on ? T.bg : T.textDim,
              border: `1px solid ${on ? T.text : T.borderStrong}`,
              transition: `background-color 150ms ${T.ease}, color 150ms ${T.ease}`,
            }}
          >
            {z.label}
          </button>
        );
      })}
    </div>
  );
}
