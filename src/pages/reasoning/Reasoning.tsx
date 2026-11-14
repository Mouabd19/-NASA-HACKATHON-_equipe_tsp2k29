// Propriétaire : Ahmed (B). Page Raisonnement : DONNÉE → MODÈLE → NORME → DÉCISION — ROADMAP §1, §3.
import type { ReactNode } from 'react';
import { Link, useParams } from 'react-router-dom';
import type { ReasoningStep } from '../../types';
import { explain } from '../../models/explain';
import { getStandard } from '../../content/standards';
import { Panel, Prov, T, TagBadge } from '../warroom/ui';
import '../warroom/warroom.css';

const KIND: Record<ReasoningStep['kind'], { label: string }> = {
  donnee: { label: 'Donnée' },
  modele: { label: 'Modèle' },
  norme: { label: 'Norme' },
  decision: { label: 'Décision' },
};

/** « NASA-STD-3001 V1 4027 » → « V1 4027 ». */
export function standardIdOf(step: ReasoningStep): string | null {
  const s = `${step.source?.label ?? ''} ${step.text}`;
  const m = /\bV\d\s?\d{4}\b/.exec(s);
  return m ? m[0].replace(/^V(\d)\s?/, 'V$1 ') : null;
}

export function ReasoningPage() {
  const { id = '' } = useParams();
  const r = explain(id); // useParams décode déjà l'id

  const shell = (children: ReactNode) => (
    <main style={{ background: T.bg, color: T.text, fontFamily: T.fontText, minHeight: '100vh', padding: '32px clamp(16px, 3vw, 32px) 48px', boxSizing: 'border-box', WebkitFontSmoothing: 'antialiased' }}>
      <div style={{ maxWidth: 820, margin: '0 auto' }}>
        <Link className="wr-link" to="/warroom" style={{ fontSize: 15, marginLeft: -2 }}>‹ War Room</Link>
        <div style={{ marginTop: 24 }}>{children}</div>
      </div>
    </main>
  );

  if (!r.steps.length) {
    return shell(
      <Panel title="Explication introuvable">
        <p style={{ color: T.textDim, margin: 0 }}>Cette explication n'existe pas ou n'est plus disponible</p>
      </Panel>,
    );
  }

  const hasH = r.steps.some((s) => s.tag === 'H');

  return shell(
    <>
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 16, flexWrap: 'wrap', marginBottom: 32 }}>
        <h1 style={{ fontFamily: T.fontDisplay, fontSize: 'clamp(28px, 3vw, 40px)', fontWeight: 600, letterSpacing: '-0.015em', lineHeight: 1.12, margin: 0 }}>
          <span style={{ color: T.textMuted }}>Pourquoi · </span>{r.title}
        </h1>
        <span style={{ marginLeft: 'auto' }}><Prov p="SIMULÉ" /></span>
      </div>
      <ol style={{ listStyle: 'none', margin: 0, padding: 0 }}>
        {r.steps.map((s, i) => (
          <li key={i} style={{ display: 'grid', gridTemplateColumns: '28px 1fr', gap: 12 }}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <div style={{ width: 10, height: 10, borderRadius: '50%', marginTop: 28, border: `1px solid ${s.tag === 'H' ? T.holo : s.kind === 'norme' ? T.text : T.borderStrong}`, background: s.kind === 'decision' ? T.text : 'transparent' }} />
              {i < r.steps.length - 1 && <div style={{ flex: 1, width: 1, background: T.border, marginTop: 4 }} />}
            </div>
            <div style={{ paddingBottom: 16 }}>
              <Step step={s} />
            </div>
          </li>
        ))}
      </ol>
      {hasH && (
        <Panel title="Limite" style={{ marginTop: 8 }}>
          <p style={{ margin: 0, color: T.textDim, fontSize: 15, lineHeight: 1.5 }}>
            Les étapes [H] sont des hypothèses ou indicateurs de l'équipe. L'écart d'âge d'un organe est un équivalent en années de
            vieillissement terrestre, pas un vieillissement réel : la perte osseuse ou musculaire spatiale est en partie réversible au retour.
          </p>
        </Panel>
      )}
    </>,
  );
}

function Step({ step }: { step: ReasoningStep }) {
  const k = KIND[step.kind];
  const stdId = step.kind === 'norme' || step.tag === 'NASA' ? standardIdOf(step) : null;
  const std = stdId ? getStandard(stdId) : null;
  return (
    <Panel
      title={k.label}
      prov={<TagBadge tag={step.tag} id={step.tag === 'NASA' && stdId ? stdId : undefined} />}
          >
      <p style={{ margin: 0, fontSize: 17, lineHeight: 1.47 }}>{step.text}</p>
      {std && (
        <blockquote style={{ margin: '16px 0 0', padding: '12px 16px', borderRadius: T.radius.inset, background: T.panelRaised, border: `1px solid ${T.border}` }}>
          <div style={{ fontSize: 13, color: T.textMuted, marginBottom: 4 }}>
            NASA-STD-3001 Vol. 1 Rev C · {std.id} — {std.title}
            {!std.verified && <span style={{ color: T.textDim }}> · non vérifié</span>}
          </div>
          {std.quote ? <p style={{ margin: 0, fontSize: 15, lineHeight: 1.5, color: T.text }}>« {std.quote} »</p>
            : <p style={{ margin: 0, fontSize: 13, color: T.textDim }}>Citation indisponible hors ligne</p>}
          {std.url && <a href={std.url} target="_blank" rel="noreferrer" className="wr-link" style={{ fontSize: 13, display: 'inline-block', marginTop: 8 }}>Source en ligne ↗</a>}
        </blockquote>
      )}
      {!std && step.source && (
        <div style={{ marginTop: 12, fontSize: 13, color: T.textMuted }}>
          Source :{' '}
          {step.source.url ? <a href={step.source.url} target="_blank" rel="noreferrer" className="wr-link">{step.source.label} ↗</a> : step.source.label}
        </div>
      )}
    </Panel>
  );
}
