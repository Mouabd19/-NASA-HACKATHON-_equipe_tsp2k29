// Primitives du design system (styles : src/ui/global.css).
// Aucune couleur en dur : tout passe par les variables CSS injectées par tokens.ts.
import { createContext, useContext } from 'react';
import type { CSSProperties, JSX, ReactNode } from 'react';
import type { Color, Level, Provenance, Tag } from '../types';
import { levelLabel, levelPriority, priorityLabel, priorityMark, statusLabel } from './tokens';

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

/** Libellé de champ ou de section : petit, secondaire, casse de phrase. */
export function Label({ children, dim, className }: LabelProps): JSX.Element {
  return <span className={cx('sz-label', dim && 'sz-dim', className)}>{children}</span>;
}

export interface TagBadgeProps { tag: Tag; id?: string }

/** Source d'un chiffre : NASA V1 4027 / Publié / Hypothèse / Persona. */
export function TagBadge({ tag, id }: TagBadgeProps): JSX.Element {
  const text = id ? `${TAG_TEXT[tag]} ${id}` : TAG_TEXT[tag];
  return (
    <span className="sz-tag" data-tag={tag} title={TAG_TITLE[tag]}>
      {text}
    </span>
  );
}

/** Libellé affiché d'une étiquette (les crochets et le sigle « H » ne sont plus affichés). */
export const TAG_TEXT: Record<Tag, string> = { NASA: 'NASA', 'Publié': 'Publié', H: 'Hypothèse', Persona: 'Persona' };

const TAG_TITLE: Record<Tag, string> = {
  NASA: 'Seuil issu d’une norme NASA',
  'Publié': 'Valeur issue d’une publication scientifique',
  H: 'Hypothèse de l’équipe',
  Persona: 'Donnée du scénario de mission (fictive)',
};

export const PROVENANCE_TEXT: Record<Provenance, string> = { 'RÉEL': 'Réel', 'SIMULÉ': 'Simulé', H: 'Hypothèse' };
const PROVENANCE_TITLE: Record<Provenance, string> = {
  'RÉEL': 'Données réelles',
  'SIMULÉ': 'Données simulées',
  H: 'Hypothèse de l’équipe',
};

export interface ProvenanceBadgeProps { value: Provenance }

/** Provenance d'un panneau : Réel / Simulé / Hypothèse. */
export function ProvenanceBadge({ value }: ProvenanceBadgeProps): JSX.Element {
  return (
    <span className="sz-prov" data-prov={value} title={PROVENANCE_TITLE[value]}>
      {PROVENANCE_TEXT[value]}
    </span>
  );
}

export interface StatusDotProps { color: Color; size?: number }

/** Pastille de statut ronde. */
export function StatusDot({ color, size = 8 }: StatusDotProps): JSX.Element {
  const style = { '--sz-status': statusVar[color], width: size, height: size } as CSSProperties;
  return (
    <span
      className="sz-dot"
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
      <span className="sz-dot" aria-hidden="true" />
      {label ?? statusLabel[color]}
    </span>
  );
}

export interface AlarmMarkProps { level: Level; className?: string }

/**
 * Marqueur de priorité d'alarme (« !!! », « !! », « ! »), comme dans le champ d'alarme d'un moniteur :
 * aplat de la couleur d'alarme, texte sombre. Rien pour un niveau nominal ou inconnu.
 */
export function AlarmMark({ level, className }: AlarmMarkProps): JSX.Element | null {
  const p = levelPriority[level];
  if (!p) return null;
  return (
    <span className={cx('sz-alarm', className)} data-priority={p} role="img" aria-label={priorityLabel[p]} title={`${priorityLabel[p]} · ${levelLabel[level]}`}>
      {priorityMark[p]}
    </span>
  );
}

export interface PanelProps {
  title?: string;
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

/** Panneau. En-tête : titre · emplacement libre · provenance · fermer. */
export function Panel({ title, provenance, right, className, style, children }: PanelProps): JSX.Element {
  const closable = useContext(PanelCloseContext) !== null;
  const hasHead = Boolean(title || provenance || right || closable);
  return (
    <section className={cx('sz-panel', className)} style={style}>
      {hasHead ? (
        <header className="sz-panel__head">
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
