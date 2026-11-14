// Primitives du design system — ROADMAP §1 « Direction artistique ».
// Aucune couleur en dur : tout passe par les variables CSS injectées par tokens.ts.
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

/** Pastille de statut (carrée, comme tout le reste). */
export function StatusDot({ color, pulse, size = 6 }: StatusDotProps): JSX.Element {
  const style = { '--sz-status': statusVar[color], width: size, height: size } as CSSProperties;
  return (
    <span
      className={cx('sz-dot', pulse && 'sz-dot--pulse')}
      data-color={color}
      style={style}
      role="img"
      aria-label={statusLabel[color]}
    />
  );
}

export interface StatusChipProps { color: Color; label?: string }

/** Statut en toutes lettres, avec sa pastille. */
export function StatusChip({ color, label }: StatusChipProps): JSX.Element {
  const style = { '--sz-status': statusVar[color] } as CSSProperties;
  return (
    <span className="sz-chip" data-color={color} style={style}>
      <span className="sz-dot" style={{ width: 5, height: 5 }} aria-hidden="true" />
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

/** Panneau en équerre, bordure 1 px. En-tête : n° de système · titre · emplacement libre · provenance. */
export function Panel({ title, sys, provenance, right, className, style, children }: PanelProps): JSX.Element {
  const hasHead = Boolean(title || sys || provenance || right);
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
        </header>
      ) : null}
      <div className="sz-panel__body">{children}</div>
    </section>
  );
}
