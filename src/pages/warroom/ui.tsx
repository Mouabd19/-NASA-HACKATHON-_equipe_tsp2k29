// Propriétaire : Ahmed (B). Briques propres au Plan du jour : bouton, contrôle segmenté, pastille muette.
// Panneau, étiquettes et formats viennent de src/ui (mêmes composants que les pages Corps et Raisonnement).
import { useRef, type CSSProperties, type KeyboardEvent, type ReactNode } from 'react';
import type { Color, Level } from '../../types';
import { statusColor, tokens } from '../../ui/tokens';
import { statusVar } from '../../ui/primitives';

/** Couleurs pour les attributs SVG (dérivées des tokens). */
export const T = { text: tokens.color.text, status: statusColor } as const;

export const LEVEL_LABEL: Record<Level, string> = {
  VERT: 'Vert', AMBRE: 'Ambre', ORANGE: 'Orange', ROUGE: 'Rouge', DONNEES_INSUFFISANTES: 'Données insuffisantes',
};

/** Pastille de statut décorative (.sz-dot) : le texte voisin porte le sens. Gris = inconnu : pastille creuse. */
export function Dot({ color, size = 8 }: { color: Color; size?: number }) {
  const style = { '--sz-status': statusVar[color], width: size, height: size } as CSSProperties;
  return <span aria-hidden className="sz-dot" data-color={color} style={style} />;
}

type BtnKind = 'primary' | 'secondary' | 'quiet';
const BTN_KIND: Record<BtnKind, string> = { primary: ' sz-btn--primary', secondary: '', quiet: ' sz-btn--ghost' };

/** Bouton (.sz-btn). `active` marque un bouton enfoncé ; une seule action `primary` par écran. */
export function Btn(props: {
  children: ReactNode; onClick?: () => void; active?: boolean; disabled?: boolean; title?: string; kind?: BtnKind;
  size?: 'sm' | 'lg'; className?: string;
}) {
  const kind: BtnKind = props.kind ?? 'secondary';
  return (
    <button
      type="button"
      title={props.title}
      disabled={props.disabled}
      onClick={props.onClick}
      aria-pressed={props.active === undefined ? undefined : props.active}
      className={`sz-btn${BTN_KIND[kind]}${props.size ? ` sz-btn--${props.size}` : ''}${props.className ? ` ${props.className}` : ''}`}
    >
      {props.children}
    </button>
  );
}

/** Contrôle segmenté (.sz-seg) : une seule valeur. Clavier : Tab entre groupes, flèches dans le groupe (modèle radiogroup). */
export function Segmented<V extends string | number>(props: {
  values: readonly V[]; value: V | undefined; onChange: (v: V) => void; ariaLabel: string; render?: (v: V) => ReactNode;
  describedBy?: string; size?: 'lg'; className?: string;
}) {
  const refs = useRef<(HTMLButtonElement | null)[]>([]);
  const idx = props.value === undefined ? -1 : props.values.indexOf(props.value);
  const move = (i: number) => {
    const n = props.values.length;
    const j = (i + n) % n;
    props.onChange(props.values[j]);
    refs.current[j]?.focus();
  };
  const onKey = (e: KeyboardEvent) => {
    const cur = idx < 0 ? 0 : idx;
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') { e.preventDefault(); move(idx < 0 ? 0 : cur + 1); }
    else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') { e.preventDefault(); move(idx < 0 ? 0 : cur - 1); }
    else if (e.key === 'Home') { e.preventDefault(); move(0); }
    else if (e.key === 'End') { e.preventDefault(); move(props.values.length - 1); }
  };
  return (
    <div
      role="radiogroup"
      aria-label={props.ariaLabel}
      aria-describedby={props.describedBy}
      onKeyDown={onKey}
      className={`sz-seg${props.size === 'lg' ? ' sz-seg--lg' : ''}${props.className ? ` ${props.className}` : ''}`}
    >
      {props.values.map((v, i) => {
        const on = props.value === v;
        return (
          <button
            key={String(v)}
            ref={(el) => { refs.current[i] = el; }}
            type="button"
            role="radio"
            aria-checked={on}
            tabIndex={on || (idx < 0 && i === 0) ? 0 : -1}
            onClick={() => props.onChange(v)}
            className="sz-seg__opt"
          >
            {props.render ? props.render(v) : v}
          </button>
        );
      })}
    </div>
  );
}

export const hhmm = (d: Date) => d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
