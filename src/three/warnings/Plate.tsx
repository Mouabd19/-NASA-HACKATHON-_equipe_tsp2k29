// Plaque hexagonale d'un warning (DOM, superposée au canvas). Positionnée à chaque frame par Warnings3D.
import type { JSX, KeyboardEvent, SyntheticEvent } from 'react';
import { useBody } from '../../pages/body/store';
import { warnKnobs } from './knobs';
import type { WarnItem } from './model';
import { StatusGlyph } from '../../ui';

const stop = (e: SyntheticEvent): void => e.stopPropagation();

/** Triangle d'avertissement dessiné en SVG (« ! » ou « ? » si les données manquent). */
export function WarnGlyph({ unknown }: { unknown: boolean }): JSX.Element {
  return (
    <svg className="w3d-glyph" viewBox="0 0 22 20" width="22" height="20" aria-hidden="true">
      <path d="M11 1.5 L20.5 18.5 H1.5 Z" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="miter" />
      {unknown ? (
        <path d="M8.9 9.6 V8.6 H13.1 V12 H11 V13.6 M11 15.2 V16.6" fill="none" stroke="currentColor" strokeWidth="1.3" />
      ) : (
        <path d="M11 7.2 V13 M11 14.8 V16.6" fill="none" stroke="currentColor" strokeWidth="1.5" />
      )}
    </svg>
  );
}

export function Plate({ item, register }: { item: WarnItem; register: (el: HTMLDivElement | null) => void }): JSX.Element {
  const hot = useBody((s) => s.hovered === item.organId || s.selected === item.organId);
  const W = warnKnobs.plateW, H = warnKnobs.plateH, tip = 11;
  const hex = `${tip},0.5 ${W - tip},0.5 ${W - 0.5},${H / 2} ${W - tip},${H - 0.5} ${tip},${H - 0.5} 0.5,${H / 2}`;

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
  ].join(' ');

  return (
    <div
      ref={register}
      className={cls}
      style={{ width: W, height: H }}
      role="button"
      tabIndex={0}
      aria-label={`${item.alert.title} — ${item.levelLabel}${item.projected ? ' (projection)' : ''}. ${item.alert.message}`}
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
      <div className="w3d-plate__inner">
        <svg className="w3d-plate__hex" viewBox={`0 0 ${W} ${H}`} width={W} height={H} aria-hidden="true">
          <polygon className="w3d-plate__fill" points={hex} />
          <polygon className="w3d-plate__stroke" points={hex} />
        </svg>
        {/* da_dragon : symbole SF à la place du triangle (WarnGlyph conservé dans le fichier) */}
        <span className="dr-plate-glyph"><StatusGlyph color={item.color} size={20} /></span>
        <div className="w3d-plate__text">
          <span className="w3d-plate__label">{item.label}</span>
          <span className="w3d-plate__sub">
            <b>{item.levelLabel}</b>
            <i className="sz-detail">{item.ruleLabel}</i>
          </span>
        </div>
        {item.color === 'red' && <span className="w3d-plate__hatch" aria-hidden="true" />}
        {item.projected && <span className="w3d-plate__proj">PROJ.</span>}
      </div>
    </div>
  );
}
