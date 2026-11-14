// Propriétaire : Ahmed (B). Section « Nos modèles d'IA » de la page Raisonnement (demande de Mouad, status 14 nov.).
// Données : modelCards() de Mouad (src/models/ml) — fiches figées à l'entraînement, aucun réseau.
import type { Tag } from '../../types';
import { modelCards, type ModelCard } from '../../models/ml';
import { Panel, T, TagBadge, fr, mono } from '../warroom/ui';

const TAGS: readonly Tag[] = ['NASA', 'Publié', 'H', 'Persona'];
const asTag = (t: string): Tag | null => (TAGS as readonly string[]).includes(t) ? (t as Tag) : null;

const pct = (x: unknown) => typeof x === 'number' ? `${Math.round(x * 100)} %` : '—';
const n = (x: unknown, d = 2) => typeof x === 'number' ? fr(x, d) : '—';
const int = (x: unknown) => typeof x === 'number' ? x.toLocaleString('fr-FR') : '—';

/** Chiffres clés lisibles par modèle ; repli générique si un nouveau modèle arrive. */
function headline(c: ModelCard): { label: string; value: string }[] {
  const m = c.metrics as Record<string, unknown>;
  if (c.id === 'blood-age') return [
    { label: 'R² sur le test', value: n(m.r2) },
    { label: 'Erreur moyenne', value: `± ${n(m.mae_years, 1)} ans` },
    { label: 'Adultes testés', value: int(m.n_test) },
  ];
  if (c.id === 'mood-risk') return [
    { label: 'Épisodes détectés', value: pct(m.detection_rate) },
    { label: 'Délai médian', value: `${n(m.median_delay_days, 0)} j` },
    { label: 'Fausses alertes', value: pct(m.false_alarm_rate_astronauts) },
    { label: 'AUC test', value: n(m.auc_test, 3) },
  ];
  return Object.entries(m)
    .filter(([, v]) => typeof v === 'number')
    .slice(0, 4)
    .map(([k, v]) => ({ label: k, value: n(v) }));
}

const ORGAN: Record<string, string> = { hanche: 'Hanche', cuisse: 'Cuisse', coeur: 'Cœur' };

/** Modèle B : erreur du modèle vs projection sans ML, par organe / échéance / scénario. */
function ForecastTable({ metrics }: { metrics: Record<string, unknown> }) {
  const rows = Object.entries(metrics)
    .filter(([, v]) => v && typeof v === 'object')
    .map(([k, v]) => {
      const [organ, day, scen] = k.split('/');
      const x = v as Record<string, number>;
      return { k, organ: ORGAN[organ] ?? organ, day: day === '210' ? 'Sol 0' : `J${day}`, scen: scen === 'plan' ? 'avec le plan' : 'rythme actuel', ml: x.mae_median, base: x.mae_baseline_without_ml, cov: x.coverage_10_90 };
    });
  if (!rows.length) return null;
  const th = { textAlign: 'left' as const, fontWeight: 500, color: T.textMuted, padding: '6px 12px 6px 0', borderBottom: `1px solid ${T.border}` };
  const td = { padding: '6px 12px 6px 0', borderBottom: `1px solid ${T.border}`, fontVariantNumeric: 'tabular-nums' as const };
  return (
    <div style={{ overflowX: 'auto', marginTop: 12 }}>
      <table style={{ borderCollapse: 'collapse', fontSize: 13, width: '100%', minWidth: 460 }}>
        <thead>
          <tr><th style={th}>Organe</th><th style={th}>Échéance</th><th style={th}>Scénario</th><th style={th}>Erreur modèle</th><th style={th}>Sans ML</th><th style={th}>Bande 10–90 %</th></tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.k}>
              <td style={td}>{r.organ}</td><td style={td}>{r.day}</td><td style={{ ...td, color: T.textDim }}>{r.scen}</td>
              <td style={{ ...td, color: r.ml < r.base ? T.text : T.status.amber }}>{n(r.ml)}</td>
              <td style={{ ...td, color: T.textDim }}>{n(r.base)}</td>
              <td style={{ ...td, color: T.textDim }}>{pct(r.cov)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p style={{ margin: '8px 0 0', fontSize: 13, color: T.textMuted }}>Erreur absolue moyenne en points de perte, sur la part test de la cohorte.</p>
    </div>
  );
}

function Card({ c }: { c: ModelCard }) {
  const tag = asTag(c.tag);
  const stats = c.id === 'organ-forecast' ? [] : headline(c);
  return (
    <details style={{ borderTop: `1px solid ${T.border}`, padding: '16px 0' }}>
      <summary style={{ cursor: 'pointer', display: 'flex', alignItems: 'baseline', gap: 12, flexWrap: 'wrap', listStyle: 'none' }}>
        <span style={{ fontSize: 17, fontWeight: 500, color: T.text, flex: '1 1 320px' }}>{c.title}</span>
        {tag && <TagBadge tag={tag} />}
        <span className="wr-link" style={{ fontSize: 13, minHeight: 0 }}>Détails</span>
      </summary>
      <div style={{ marginTop: 12, display: 'grid', gap: 12, fontSize: 15, lineHeight: 1.5 }}>
        {stats.length > 0 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px 32px' }}>
            {stats.map((s) => (
              <div key={s.label}>
                <div style={{ fontSize: 13, color: T.textMuted }}>{s.label}</div>
                <div style={{ ...mono, fontSize: 17, color: T.text }}>{s.value}</div>
              </div>
            ))}
          </div>
        )}
        <div><span style={{ color: T.textMuted }}>Apprentissage · </span>{c.learning}</div>
        <div><span style={{ color: T.textMuted }}>Données · </span>{c.data}</div>
        {c.id === 'organ-forecast' && <ForecastTable metrics={c.metrics} />}
        {c.limits.length > 0 && (
          <div>
            <div style={{ color: T.textMuted, marginBottom: 4 }}>Limites</div>
            <ul style={{ margin: 0, paddingLeft: 20, color: T.textDim }}>
              {c.limits.map((l) => <li key={l}>{l}</li>)}
            </ul>
          </div>
        )}
      </div>
    </details>
  );
}

export function ModelCards() {
  const cards = modelCards();
  if (!cards.length) return null;
  return (
    <Panel title="Nos modèles d'IA" style={{ marginTop: 24 }}>
      <p style={{ margin: '0 0 8px', color: T.textDim, fontSize: 15, lineHeight: 1.5 }}>
        Entraînés avant la mission, calculés à bord sans réseau. Ils prédisent et signalent ; les seuils d'alerte restent des normes NASA.
      </p>
      {cards.map((c) => <Card key={c.id} c={c} />)}
    </Panel>
  );
}
