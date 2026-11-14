// Propriétaire : Ahmed (ROADMAP §7).
// STUB — remplace l'implémentation sans changer la signature (export function ReasoningPage(): JSX.Element, lit :id).
// Page minimale mais fonctionnelle sur les mocks : la chaîne donnée → modèle → norme NASA → décision,
// chaque maillon avec son étiquette et sa source ; les normes citées sont dépliées (texte + lien + « non vérifié »).
import type { CSSProperties, JSX } from 'react';
import { Link, useParams } from 'react-router-dom';
import type { ReasoningStep } from '../../types';
import { Label, Panel, TagBadge } from '../../ui';
import { explain } from '../../models/explain';
import { getStandard } from '../../content/standards';

const KIND: Record<ReasoningStep['kind'], string> = { donnee: 'DONNÉE', modele: 'MODÈLE', norme: 'NORME', decision: 'DÉCISION' };

const S: Record<string, CSSProperties> = {
  page: { minHeight: '100vh', background: 'var(--sz-bg)', color: 'var(--sz-text)', fontFamily: 'var(--sz-font-text)', padding: 24, boxSizing: 'border-box' },
  wrap: { maxWidth: 860, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 16 },
  top: { display: 'flex', alignItems: 'baseline', gap: 16, flexWrap: 'wrap', borderBottom: '1px solid var(--sz-border)', paddingBottom: 12 },
  h1: { fontSize: 22, fontWeight: 500, margin: 0 },
  link: { color: 'var(--sz-text)', fontFamily: 'var(--sz-font-mono)', letterSpacing: 'var(--sz-tracking)', fontSize: 10, textTransform: 'uppercase', textDecoration: 'underline', textUnderlineOffset: 3 },
  step: { display: 'grid', gridTemplateColumns: '44px 1fr', gap: 12 },
  rail: { display: 'flex', flexDirection: 'column', alignItems: 'center' },
  node: { width: 28, height: 28, border: '1px solid var(--sz-border-strong)', display: 'grid', placeItems: 'center', fontFamily: 'var(--sz-font-mono)', fontSize: 12 },
  line: { flex: 1, width: 1, background: 'var(--sz-border-strong)', minHeight: 16 },
  text: { fontSize: 15, lineHeight: 1.5, margin: '0 0 8px' },
  quote: { borderLeft: '1px solid var(--sz-border-strong)', padding: '4px 0 4px 12px', margin: '8px 0', color: 'var(--sz-text-dim)', fontSize: 13, lineHeight: 1.45 },
  row: { display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
};

const standardIds = (text: string): string[] => [...new Set(text.match(/V1 \d{4}/g) ?? [])];

export function ReasoningPage(): JSX.Element {
  const { id = '' } = useParams();
  const r = explain(id);

  return (
    <div style={S.page} className="sz-scroll">
      <div style={S.wrap}>
        <header style={S.top}>
          <Label dim>RAISONNEMENT / {r.id || '—'}</Label>
          <span style={{ flex: 1 }} />
          <Link to="/warroom" style={S.link}>← War Room</Link>
          <Link to="/body" style={S.link}>Body →</Link>
        </header>
        <h1 style={S.h1}>{r.title}</h1>
        <Label dim>Donnée → modèle → norme NASA → décision · chaque maillon porte sa source et son étiquette</Label>

        {r.steps.map((s, i) => (
          <div key={`${s.kind}-${i}`} style={S.step}>
            <div style={S.rail}>
              <div style={S.node}>{String(i + 1).padStart(2, '0')}</div>
              {i < r.steps.length - 1 ? <div style={S.line} /> : null}
            </div>
            <Panel sys={`R-${String(i + 1).padStart(2, '0')}`} title={KIND[s.kind]} right={<TagBadge tag={s.tag} />} style={{ marginBottom: 16 }}>
              <p style={S.text}>{s.text}</p>
              {s.kind === 'norme'
                ? standardIds(s.text).map((sid) => {
                  const std = getStandard(sid);
                  return (
                    <div key={sid} style={S.quote}>
                      <div style={S.row}>
                        <TagBadge tag="NASA" id={sid} />
                        <Label dim>{std.verified ? 'VÉRIFIÉ' : 'NON VÉRIFIÉ — RÉSUMÉ, PAS UNE CITATION'}</Label>
                      </div>
                      <div style={{ margin: '6px 0' }}>{std.quote}</div>
                      <a href={std.url} target="_blank" rel="noreferrer" style={S.link}>{std.title}</a>
                    </div>
                  );
                })
                : null}
              {s.source ? (
                <div style={S.row}>
                  <Label dim>SOURCE</Label>
                  {s.source.url
                    ? <a href={s.source.url} target="_blank" rel="noreferrer" style={S.link}>{s.source.label}</a>
                    : <Label>{s.source.label}</Label>}
                </div>
              ) : null}
            </Panel>
          </div>
        ))}
        <Label dim>STUB sur données factices · aucune synthèse IA n’intervient dans un seuil</Label>
      </div>
    </div>
  );
}
