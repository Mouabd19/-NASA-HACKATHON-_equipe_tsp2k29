// Étiquette d'une alerte (DOM, superposée au canvas) : pastille de statut + nom de la zone.
// Positionnée à chaque frame par Warnings3D.
import type { CSSProperties, JSX, KeyboardEvent, SyntheticEvent } from 'react';
import { useBody } from '../../pages/body/store';
import { AlarmMark, alarmText, statusVar } from '../../ui';
import { warnKnobs } from './knobs';
import type { WarnItem } from './model';

const stop = (e: SyntheticEvent): void => e.stopPropagation();

export function Plate({ item, register }: { item: WarnItem; register: (el: HTMLDivElement | null) => void }): JSX.Element {
  const hot = useBody((s) => s.hovered === item.organId || s.selected === item.organId);

  const select = (): void => useBody.getState().setSelected(item.organId);
  const open = (): void => {
    useBody.getState().setSelected(item.organId);
    useBody.getState().openOrganWindow(item.organId);
  };
  const onKey = (e: KeyboardEvent): void => {
    if (e.key === 'Enter') { e.stopPropagation(); open(); }
    else if (e.key === ' ') { e.preventDefault(); e.stopPropagation(); select(); }
  };

  const cls = [
    'w3d-plate',
    `w3d-plate--${item.color}`,
    item.side > 0 ? 'w3d-plate--right' : 'w3d-plate--left',
    item.projected ? 'is-projected' : '',
    hot ? 'is-hot' : '',
  ].filter(Boolean).join(' ');

  return (
    <div
      ref={register}
      className={cls}
      style={{ height: warnKnobs.plateH, '--sz-status': statusVar[item.color] } as CSSProperties}
      role="button"
      tabIndex={0}
      title={`${item.num}. ${alarmText(item.level, item.projected)} · ${item.ruleLabel} — click: pin, double-click: open details`}
      aria-label={`Marker ${item.num}, ${item.alert.title} — ${alarmText(item.level, item.projected)}. ${item.alert.message}`}
      onPointerEnter={() => useBody.getState().setHovered(item.organId)}
      onPointerLeave={() => {
        if (useBody.getState().hovered === item.organId) useBody.getState().setHovered(null);
      }}
      onPointerMove={stop}
      onPointerDown={stop}
      onPointerUp={stop}
      onWheel={stop}
      onClick={(e) => { e.stopPropagation(); select(); }}
      onDoubleClick={(e) => { e.stopPropagation(); open(); }}
      onKeyDown={onKey}
    >
      <span className="w3d-plate__num">{item.num}</span>
      <span className="w3d-plate__label">{item.label}</span>
      {item.color === 'grey' ? <span className="sz-dot" data-color="grey" aria-hidden="true" /> : <AlarmMark level={item.level} projected={item.projected} />}
      {/* mode Détails : la règle appliquée seulement — le statut est déjà porté par la pastille */}
      <span className="w3d-plate__meta sz-detail">{item.ruleLabel}</span>
    </div>
  );
}
