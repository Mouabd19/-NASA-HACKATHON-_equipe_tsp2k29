// Propriétaire : Ahmed (B). Page Raisonnement : donnée → modèle → norme → décision — ROADMAP §3.
import type { ReactNode } from 'react';
import { Link, useParams } from 'react-router-dom';
import type { ReasoningStep } from '../../types';
import { explain } from '../../models/explain';
import { getStandard } from '../../content/standards';
import { MISSION_TODAY } from '../../ingest/checkin';
import { Label, ProvenanceBadge, TagBadge } from '../../ui';
import { ModelCards } from './ModelCards';
import './reasoning.css';

const KIND: Record<ReasoningStep['kind'], string> = {
  donnee: 'Donnée',
  modele: 'Modèle',
  norme: 'Norme',
  decision: 'Décision',
};

/** « NASA-STD-3001 V1 4027 » → « V1 4027 ». */
export function standardIdOf(step: ReasoningStep): string | null {
  const s = `${step.source?.label ?? ''} ${step.text}`;
  const m = /\bV\d\s?\d{4}\b/.exec(s);
  return m ? m[0].replace(/^V(\d)\s?/, 'V$1 ') : null;
}

// Mots écrits en capitales dans les données : rendus en casse de phrase à l'affichage (les sigles ne sont pas touchés).
const LOWER: Record<string, string> = {
  'ESTIMÉE': 'estimée', 'SIMULÉ': 'simulé', 'SIMULÉE': 'simulée', 'SIMULÉES': 'simulées', 'RÉEL': 'réel',
  AMBRE: 'ambre', ORANGE: 'orange', ROUGE: 'rouge', VERT: 'vert',
  'PROPOSÉ': 'proposé', PROPOSE: 'propose', MAINTENANT: '« Maintenant »', ENSUITE: '« Ensuite »',
};
const LOWER_RE = new RegExp(`(?<![\\p{L}\\d])(${Object.keys(LOWER).sort((a, b) => b.length - a.length).join('|')})(?![\\p{L}\\d])`, 'gu');

/** Texte issu des données → texte affiché : sans crochets, sans capitales d'insistance, sans renvois internes. */
export function plain(text: string): string {
  return text
    .replace(/\s*\[H\]/g, '')
    .replace(/\[(V\d\s?\d{4})\]/g, '$1')
    .replace(/\s*\((?:§\s?\d+|règles R\d+)\)/g, '')
    .replace(/\s+→\s+/g, ' : ')
    .replace(LOWER_RE, (w) => LOWER[w] ?? w);
}

/** Titre de la page : le sujet seul (« ARED charge lourde — pourquoi ? » → « ARED charge lourde »). */
const pageTitle = (title: string): string => plain(title).replace(/\s*[—–-]\s*pourquoi\s*\?\s*$/i, '');

/** Libellé de source sans la mention de provenance (portée par l'étiquette, en mode Détails). */
/** L'écran d'origine est nommé comme son onglet : « Corps du jour » → « Corps · J94 ». */
const sourceLabel = (label: string): string => plain(label.replace(/\s*—\s*SIMULÉ\s*\(persona [^)]*\)\s*$/u, ''))
  .replace(/^Corps du jour(?: J\d+)?/, `Corps · J${MISSION_TODAY}`);

export function ReasoningPage() {
  const { id = '' } = useParams();
  const r = explain(id); // useParams décode déjà l'id

  const shell = (children: ReactNode) => (
    <div className="sz-page rs-page">
      <Link className="sz-link rs-back" to="/warroom">‹ Plan du jour</Link>
      {children}
    </div>
  );

  if (!r.steps.length) {
    return shell(
      <>
        <header className="sz-page__head">
          <h1 className="sz-page__title">Explication introuvable</h1>
        </header>
        <p className="rs-empty">Cette explication n'existe pas ou n'est plus disponible.</p>
      </>,
    );
  }

  const hasH = r.steps.some((s) => s.tag === 'H');

  return shell(
    <>
      <header className="sz-page__head rs-head">
        <h1 className="sz-page__title">{pageTitle(r.title)}</h1>
        <ProvenanceBadge value="SIMULÉ" />
      </header>
      <ol className="sz-panel rs-chain">
        {r.steps.map((s, i) => <Step key={i} step={s} index={i + 1} />)}
      </ol>
      {hasH && (
        <p className="rs-note sz-detail">
          Les étapes « Hypothèse » sont des repères de l'équipe. L'écart d'âge d'un organe est un équivalent en années de
          vieillissement terrestre : la perte osseuse ou musculaire en vol est en partie réversible au retour.
        </p>
      )}
      <ModelCards />
    </>,
  );
}

function Step({ step, index }: { step: ReasoningStep; index: number }) {
  const stdId = step.kind === 'norme' || step.tag === 'NASA' ? standardIdOf(step) : null;
  const std = stdId ? getStandard(stdId) : null;
  const src = !std && step.source ? step.source : null;
  return (
    <li className="rs-step">
      <div className="rs-step__head">
        <span className="rs-step__n" aria-hidden="true">{index}</span>
        <Label>{KIND[step.kind]}</Label>
      </div>
      <div className="rs-step__body">
        <p className="rs-step__text">{plain(step.text)}</p>
        {std && (
          <blockquote className="rs-quote">
            <div className="rs-quote__ref">
              NASA-STD-3001 vol. 1 rév. C, {std.id} · {std.title}
              {!std.verified && ' · non vérifié'}
            </div>
            {std.quote
              ? <p className="rs-quote__text">« {std.quote} »</p>
              : <p className="rs-quote__text rs-quote__text--empty">Citation indisponible hors ligne</p>}
            {std.url && <a href={std.url} target="_blank" rel="noreferrer" className="sz-link rs-quote__link">Source</a>}
          </blockquote>
        )}
        {/* norme citée : la référence est déjà dans la citation */}
        {(!std || step.tag !== 'NASA') && (
        <div className="rs-step__meta sz-detail">
          <TagBadge tag={step.tag} id={step.tag === 'NASA' && stdId ? stdId : undefined} />
          {src && (
            <span className="rs-step__src">
              Source :{' '}
              {src.url
                ? <a href={src.url} target="_blank" rel="noreferrer" className="sz-link">{sourceLabel(src.label)}</a>
                : sourceLabel(src.label)}
            </span>
          )}
        </div>
        )}
      </div>
    </li>
  );
}
