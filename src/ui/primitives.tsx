// Primitives du design system — ROADMAP §1 « Direction artistique ».
// Aucune couleur en dur : tout passe par les variables CSS injectées par tokens.ts.
import { createContext, useContext } from 'react';
import type { CSSProperties, JSX, ReactNode } from 'react';
import type { Color, Provenance, Tag } from '../types';
import { statusLabel } from './tokens';

/** Variable CSS d'un statut (gris = inconnu, jamais vert par défaut). */
export const statusVar: Record<Color, string> = {
  green: 'var(--sz-ok)',
  amber: 'var(--sz-amber)',
  red: 'var(--sz-red)',
  grey: 'var(--sz-unknown)',
};

function cx(...parts: (string | false | null | undefined)[]): string {
  return parts.filter(Boolean).join(' ');
}

export interface LabelProps { children?: ReactNode; dim?: boolean; className?: string }

/** Petit texte mono, majuscules espacées. */
export function Label({ children, dim, className }: LabelProps): JSX.Element {
  return <span className={cx('sz-label', dim && 'sz-dim', className)}>{children}</span>;
}

export interface TagBadgeProps { tag: Tag; id?: string }

/** Étiquette d'honnêteté d'un chiffre : [NASA V1 4027] / [Publié] / [H] / [Persona]. */
export function TagBadge({ tag, id }: TagBadgeProps): JSX.Element {
  const text = id ? `${tag} ${id}` : tag;
  return (
    <span className="sz-tag" data-tag={tag} title={TAG_TITLE[tag]}>
      [{text}]
    </span>
  );
}

const TAG_TITLE: Record<Tag, string> = {
  NASA: 'Seuil issu d’une norme NASA',
  'Publié': 'Valeur issue d’une publication scientifique',
  H: 'Hypothèse de l’équipe',
  Persona: 'Donnée du scénario de mission (fictive)',
};

const PROVENANCE_TEXT: Record<Provenance, string> = { 'RÉEL': 'RÉEL', 'SIMULÉ': 'SIMULÉ', H: '[H]' };
const PROVENANCE_TITLE: Record<Provenance, string> = {
  'RÉEL': 'Données réelles',
  'SIMULÉ': 'Données simulées',
  H: 'Hypothèse de l’équipe',
};

export interface ProvenanceBadgeProps { value: Provenance }

/** Provenance d'un panneau : RÉEL / SIMULÉ / [H]. */
export function ProvenanceBadge({ value }: ProvenanceBadgeProps): JSX.Element {
  return (
    <span className="sz-prov" data-prov={value} title={PROVENANCE_TITLE[value]}>
      {PROVENANCE_TEXT[value]}
    </span>
  );
}

export interface StatusDotProps { color: Color; pulse?: boolean; size?: number }

/**
 * da_dragon : symbole de statut façon SF Symbols, lisible sans la couleur.
 * Nominal = coche, ambre = point d'exclamation, rouge = double exclamation, inconnu = point d'interrogation (creux).
 */
export function StatusGlyph({ color, size = 14 }: { color: Color; size?: number }): JSX.Element {
  const fill = color === 'grey' ? 'none' : statusVar[color];
  const ink = color === 'grey' ? 'var(--sz-unknown)' : 'var(--dr-on-status, #0A1424)';
  return (
    <svg className="dr-glyph" data-color={color} width={size} height={size} viewBox="0 0 16 16" aria-hidden="true">
      <circle cx="8" cy="8" r={color === 'grey' ? 7.2 : 8} fill={fill} stroke={color === 'grey' ? 'var(--sz-unknown)' : 'none'} strokeWidth="1.3" />
      {color === 'green' && <path d="M4.8 8.3l2.2 2.2 4.3-4.6" fill="none" stroke={ink} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />}
      {color === 'amber' && <path d="M8 4.2v4.6M8 11.4v.2" fill="none" stroke={ink} strokeWidth="1.9" strokeLinecap="round" />}
      {color === 'red' && <path d="M6.2 4.2v4.6M6.2 11.4v.2M9.8 4.2v4.6M9.8 11.4v.2" fill="none" stroke={ink} strokeWidth="1.8" strokeLinecap="round" />}
      {color === 'grey' && <path d="M6.3 6.4a1.8 1.8 0 1 1 2.4 1.7c-.5.2-.7.6-.7 1.1v.3M8 11.6v.1" fill="none" stroke={ink} strokeWidth="1.5" strokeLinecap="round" />}
    </svg>
  );
}

/** Pastille de statut : le symbole SF, à taille de lecture (≥ 12 px). */
export function StatusDot({ color, pulse, size = 6 }: StatusDotProps): JSX.Element {
  return (
    <span className={cx('sz-dot', 'dr-dot', pulse && 'sz-dot--pulse')} data-color={color} role="img" aria-label={statusLabel[color]}>
      <StatusGlyph color={color} size={Math.max(12, size + 6)} />
    </span>
  );
}

export interface StatusChipProps { color: Color; label?: string }

/** Statut en toutes lettres, avec son symbole. */
export function StatusChip({ color, label }: StatusChipProps): JSX.Element {
  const style = { '--sz-status': statusVar[color] } as CSSProperties;
  return (
    <span className="sz-chip" data-color={color} style={style}>
      <StatusGlyph color={color} size={14} />
      {label ?? statusLabel[color]}
    </span>
  );
}

export interface HatchBandProps { color?: 'red' | 'amber'; height?: number; className?: string }

/** Bande hachurée en diagonale pour les alertes. */
export function HatchBand({ color = 'red', height = 6, className }: HatchBandProps): JSX.Element {
  return <div className={cx(color === 'red' ? 'sz-hatch-red' : 'sz-hatch-amber', className)} style={{ height }} aria-hidden="true" />;
}

export interface PanelProps {
  title?: string;
  sys?: string;
  provenance?: Provenance;
  right?: ReactNode;
  className?: string;
  style?: CSSProperties;
  children?: ReactNode;
}

/**
 * Fermeture du panneau courant : le parent qui sait rouvrir le panneau (page Body) fournit la fonction ;
 * Panel affiche alors un bouton × dans son en-tête. Sans fournisseur, aucun bouton.
 */
export const PanelCloseContext = createContext<(() => void) | null>(null);

export interface CloseButtonProps { onClose: () => void; label?: string; className?: string }

/** Bouton × discret. */
export function CloseButton({ onClose, label = 'Fermer le panneau', className }: CloseButtonProps): JSX.Element {
  return (
    <button type="button" className={cx('sz-close', className)} onClick={onClose} aria-label={label} title={label}>
      <svg viewBox="0 0 10 10" aria-hidden="true"><path d="M1 1l8 8M9 1l-8 8" stroke="currentColor" strokeWidth="1.3" /></svg>
    </button>
  );
}

/** Bouton × du panneau courant, si le parent permet de le fermer. */
export function PanelClose({ className }: { className?: string }): JSX.Element | null {
  const onClose = useContext(PanelCloseContext);
  return onClose ? <CloseButton onClose={onClose} className={className} /> : null;
}

/** Panneau, bordure 1 px. En-tête : n° de système · titre · emplacement libre · provenance · fermer. */
export function Panel({ title, sys, provenance, right, className, style, children }: PanelProps): JSX.Element {
  const closable = useContext(PanelCloseContext) !== null;
  const hasHead = Boolean(title || sys || provenance || right || closable);
  return (
    <section className={cx('sz-panel', className)} style={style}>
      {hasHead ? (
        <header className="sz-panel__head">
          {sys ? <span className="sz-panel__sys">{sys}</span> : null}
          {sys && title ? <span className="sz-panel__sep" aria-hidden="true">/</span> : null}
          {title ? <h2 className="sz-panel__title">{title}</h2> : null}
          <span className="sz-panel__fill" />
          {right ? <span className="sz-panel__right">{right}</span> : null}
          {provenance ? <ProvenanceBadge value={provenance} /> : null}
          <PanelClose />
        </header>
      ) : null}
      <div className="sz-panel__body">{children}</div>
    </section>
  );
}
