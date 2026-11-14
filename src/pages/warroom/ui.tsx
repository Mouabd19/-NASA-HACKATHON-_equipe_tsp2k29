// Propriétaire : Ahmed (B). Petites briques visuelles communes à la War Room et au Raisonnement.
// Seule source des couleurs et typos : src/ui/tokens.ts (Walid). On n'adapte ses noms qu'ici (aucun hex dans les pages).
// La couleur vive est réservée aux statuts.
import { useRef, type CSSProperties, type KeyboardEvent, type ReactNode } from 'react';
import type { Color, Level, Provenance, Tag } from '../../types';
import { statusColor, tokens } from '../../ui/tokens';

const c = tokens.color;
/** Palette à plat des pages d'Ahmed, dérivée des tokens de Walid. */
export const T = {
  bg: c.bg,
  panel: c.panel,
  panelRaised: c.panelHover,
  border: c.border,
  borderStrong: c.borderStrong,
  text: c.text,
  textDim: c.textDim,
  textMuted: c.textDim,
  holo: c.holo,
  accent: c.holo,
  accentFill: c.holo,
  status: statusColor,
  fontText: tokens.font.text,
  fontDisplay: tokens.font.text,
  fontMono: tokens.font.mono,
  radius: { tag: 6, option: 8, control: 10, inset: 12, card: 18, pill: 999 },
  ease: 'cubic-bezier(0.2, 0, 0, 1)',
} as const;

/** Étiquette de section (signature SpaceX) : petite, capitales, espacée, discrète. */
export const label: CSSProperties = {
  fontFamily: T.fontText, fontSize: 11, fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.08em', color: T.textMuted,
};
/** Données et métadonnées : chasse fixe, chiffres tabulaires, casse normale. */
export const mono: CSSProperties = { fontFamily: T.fontMono, fontSize: 12, fontVariantNumeric: 'tabular-nums' };
export const num: CSSProperties = { fontFamily: T.fontDisplay, fontVariantNumeric: 'tabular-nums', fontWeight: 500 };

export const LEVEL_LABEL: Record<Level, string> = {
  VERT: 'Vert', AMBRE: 'Ambre', ORANGE: 'Orange', ROUGE: 'Rouge', DONNEES_INSUFFISANTES: 'Données insuffisantes',
};

export const levelColor = (l: Level): string =>
  l === 'ROUGE' ? T.status.red
  : l === 'ORANGE' || l === 'AMBRE' ? T.status.amber
  : l === 'VERT' ? T.status.green
  : T.status.grey; // DONNEES_INSUFFISANTES → gris, jamais vert

export const colorOf = (c: Color): string => T.status[c];

/** Bande hachurée des alertes rouges (ROADMAP §1), gardée discrète. */
export const hatch = (color: string): CSSProperties => ({
  backgroundImage: `repeating-linear-gradient(135deg, ${color}1f 0 6px, transparent 6px 12px)`,
});

export function Dot({ color, size = 8 }: { color: string; size?: number }) {
  return <span aria-hidden style={{ width: size, height: size, borderRadius: '50%', background: color, display: 'inline-block', flex: 'none' }} />;
}

/** `code` est conservé pour compatibilité mais n'est plus affiché. */
export function Panel(props: { code?: string; title: string; prov?: ReactNode; children: ReactNode; style?: CSSProperties; accent?: string; className?: string }) {
  return (
    <section
      className={props.className}
      style={{
        background: T.panel,
        border: `1px solid ${T.border}`,
        borderRadius: T.radius.card,
        padding: 24,
        minWidth: 0,
        ...props.style,
      }}
    >
      <header style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16, flexWrap: 'wrap', minHeight: 20 }}>
        {props.accent && <Dot color={props.accent} />}
        <h2 style={{ ...label, margin: 0, color: T.textDim }}>{props.title}</h2>
        <span style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 8 }}>{props.prov}</span>
      </header>
      {props.children}
    </section>
  );
}

type ProvLike = Provenance | 'RÉEL — NON NASA';

/** Provenance (RÉEL / SIMULÉ / [H]) : texte discret, jamais une pastille colorée. */
export function Prov({ p }: { p: ProvLike }) {
  const c = p === 'H' ? T.holo : p === 'SIMULÉ' ? T.textMuted : T.textDim;
  const txt = p === 'H' ? '[H]' : p === 'RÉEL — NON NASA' ? 'Réel · non NASA' : p === 'RÉEL' ? 'Réel' : p === 'SIMULÉ' ? 'Simulé' : p;
  return (
    <span style={{ ...mono, fontSize: 11, color: c, border: `1px solid ${T.border}`, borderRadius: T.radius.tag, padding: '2px 8px', whiteSpace: 'nowrap' }}>
      {txt}
    </span>
  );
}

export function TagBadge({ tag, id }: { tag: Tag; id?: string }) {
  const c = tag === 'H' ? T.holo : T.textDim;
  return (
    <span style={{ ...mono, fontSize: 11, color: c, border: `1px solid ${T.border}`, borderRadius: T.radius.tag, padding: '2px 8px', whiteSpace: 'nowrap' }}>
      [{tag}{id ? ' ' + id : ''}]
    </span>
  );
}

type BtnKind = 'primary' | 'secondary' | 'quiet';

export function Btn(props: {
  children: ReactNode; onClick?: () => void; active?: boolean; disabled?: boolean; title?: string; style?: CSSProperties; kind?: BtnKind;
}) {
  const kind: BtnKind = props.kind ?? (props.active ? 'primary' : 'secondary');
  const look: Record<BtnKind, CSSProperties> = {
    primary: { background: T.text, color: T.bg, border: `1px solid ${T.text}` },
    secondary: { background: T.panelRaised, color: T.text, border: `1px solid ${T.border}` },
    quiet: { background: 'transparent', color: T.textDim, border: '1px solid transparent' },
  };
  return (
    <button
      type="button"
      title={props.title}
      disabled={props.disabled}
      onClick={props.onClick}
      className="wr-btn"
      style={{
        fontFamily: T.fontText,
        fontSize: 15,
        fontWeight: 500,
        minWidth: 44,
        minHeight: 44,
        padding: '0 16px',
        borderRadius: T.radius.control,
        cursor: props.disabled ? 'default' : 'pointer',
        opacity: props.disabled ? 0.35 : 1,
        transition: `background-color 150ms ${T.ease}, color 150ms ${T.ease}, transform 100ms ${T.ease}`,
        ...look[kind],
        ...props.style,
      }}
    >
      {props.children}
    </button>
  );
}

/** Contrôle segmenté façon iOS : une seule valeur, un tap. Clavier : Tab entre groupes, flèches dans le groupe (modèle radiogroup). */
export function Segmented<V extends string | number>(props: {
  values: readonly V[]; value: V | undefined; onChange: (v: V) => void; ariaLabel: string; render?: (v: V) => ReactNode;
  describedBy?: string;
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
      style={{ display: 'grid', gridTemplateColumns: `repeat(${props.values.length}, minmax(44px, 1fr))`, gap: 2, padding: 2, background: T.panelRaised, borderRadius: T.radius.control, border: `1px solid ${T.borderStrong}` }}
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
            className="wr-seg"
            style={{
              ...num,
              fontSize: 17,
              minHeight: 44,
              border: 'none',
              borderRadius: T.radius.option,
              cursor: 'pointer',
              background: on ? T.text : 'transparent',
              color: on ? T.bg : T.textDim,
              transition: `background-color 150ms ${T.ease}, color 150ms ${T.ease}`,
            }}
          >
            {props.render ? props.render(v) : v}
          </button>
        );
      })}
    </div>
  );
}

export const hhmm = (d: Date) => d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
export const fr = (x: number, digits = 1) => x.toLocaleString('fr-FR', { minimumFractionDigits: digits, maximumFractionDigits: digits });
