// Propriétaire : Ahmed (B). Section « Modèles d'IA » de la page Raisonnement (demande de Mouad, status 14 nov.).
// Données : modelCards() de Mouad (src/models/ml) — fiches figées à l'entraînement, aucun réseau.
import type { Tag } from '../../types';
import { modelCards, type ModelCard } from '../../models/ml';
import { Label, TagBadge, fmt } from '../../ui';
import { plain } from './Reasoning';

const TAGS: readonly Tag[] = ['NASA', 'Publié', 'H', 'Persona'];
const asTag = (t: string): Tag | null => (TAGS as readonly string[]).includes(t) ? (t as Tag) : null;

const isNum = (x: unknown): x is number => typeof x === 'number' && Number.isFinite(x);
const pct = (x: unknown) => isNum(x) ? fmt(x * 100, 0) : '—';
const n = (x: unknown, d = 2) => isNum(x) ? fmt(x, d) : '—';

/** Texte d'une fiche → affichage : casse de phrase, virgule décimale, milliers espacés. */
const prose = (s: string): string => plain(s.replace(/\s+→\s+/g, ', ').replace(/\s*Entraîné hors ligne avant la démo\./, ''))
  .replace(/(\d)\.(\d)/g, '$1,$2')
  .replace(/(?<![\d,])(\d{4,})(?![\d,])(?= (?:adultes|astronautes))/g, (m) => fmt(Number(m), 0));
const capital = (s: string): string => s.charAt(0).toLocaleUpperCase('fr-FR') + s.slice(1);

interface Stat { label: string; value: string; unit?: string }
interface Row { k: string; organ: string; day: string; scen: string; ml: number; base: number; cov: number }

const ORGAN: Record<string, string> = { hanche: 'Hanche', cuisse: 'Cuisse', coeur: 'Cœur' };

/** Modèle B : une ligne par organe / échéance / scénario. */
function forecastRows(metrics: Record<string, unknown>): Row[] {
  return Object.entries(metrics)
    .filter(([, v]) => v && typeof v === 'object')
    .map(([k, v]) => {
      const [organ, day, scen] = k.split('/');
      const x = v as Record<string, number>;
      return {
        k, organ: ORGAN[organ] ?? organ, day: day === '210' ? 'Sol 0' : `J${day}`,
        scen: scen === 'plan' ? 'Avec le plan' : 'Rythme actuel',
        ml: x.mae_median, base: x.mae_baseline_without_ml, cov: x.coverage_10_90,
      };
    });
}

/** Chiffres clés par modèle ; repli générique si un nouveau modèle arrive. */
function headline(c: ModelCard): Stat[] {
  const m = c.metrics as Record<string, unknown>;
  if (c.id === 'blood-age') return [
    { label: 'Précision (R²)', value: n(m.r2) },
    { label: 'Erreur moyenne', value: `± ${n(m.mae_years, 1)}`, unit: 'ans' },
    { label: 'Échantillon', value: isNum(m.n_test) ? fmt(m.n_test, 0) : '—' },
  ];
  if (c.id === 'mood-risk') return [
    { label: 'Détection', value: pct(m.detection_rate), unit: '%' },
    { label: 'Délai médian', value: n(m.median_delay_days, 0), unit: 'j' },
    { label: 'Fausses alertes', value: pct(m.false_alarm_rate_astronauts), unit: '%' },
    { label: 'AUC', value: n(m.auc_test, 3) },
  ];
  if (c.id === 'organ-forecast') {
    const rows = forecastRows(m);
    if (!rows.length) return [];
    const cov = rows.map((r) => r.cov).filter(isNum);
    const better = rows.filter((r) => r.ml < r.base).length;
    return [
      { label: 'Projections', value: fmt(rows.length, 0) },
      { label: 'Gain vs référence', value: `${better} / ${rows.length}` },
      ...(cov.length ? [{ label: 'Couverture', value: `${pct(Math.min(...cov))}–${pct(Math.max(...cov))}`, unit: '%' }] : []),
    ];
  }
  return Object.entries(m)
    .filter(([, v]) => typeof v === 'number')
    .slice(0, 4)
    .map(([k, v]) => ({ label: k, value: n(v) }));
}

function ForecastTable({ rows }: { rows: Row[] }) {
  return (
    <div className="rs-table-wrap">
      <table className="sz-table rs-table">
        <thead>
          <tr>
            <th>Organe</th><th>Échéance</th><th>Scénario</th>
            <th className="sz-num">Erreur du modèle</th><th className="sz-num">Sans modèle</th><th className="sz-num">Bande 10–90 %</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.k}>
              <td>{r.organ}</td><td>{r.day}</td><td className="rs-table__dim">{r.scen}</td>
              <td className={r.ml < r.base ? 'sz-num' : 'sz-num rs-table__worse'}>{n(r.ml)}</td>
              <td className="sz-num rs-table__dim">{n(r.base)}</td>
              <td className="sz-num rs-table__dim">{pct(r.cov)} %</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="rs-table__note">Erreur absolue moyenne, en points de perte, sur l'échantillon de test.</p>
    </div>
  );
}

function Card({ c }: { c: ModelCard }) {
  const tag = asTag(c.tag);
  const stats = headline(c);
  const rows = c.id === 'organ-forecast' ? forecastRows(c.metrics) : [];
  const [name, ...rest] = c.title.split(' — ');
  const method = rest.join(' — ');
  return (
    <section className="sz-panel">
      <header className="sz-panel__head rs-model__head">
        <h3 className="sz-panel__title rs-model__name">{name}</h3>
        <span className="sz-panel__fill" />
        {tag && <TagBadge tag={tag} />}
      </header>
      <div className="sz-panel__body rs-model__body">
        {stats.length > 0 && (
          <dl className="rs-stats">
            {stats.map((s) => (
              <div key={s.label} className="rs-stat">
                <dt><Label>{s.label}</Label></dt>
                <dd>
                  <span className="sz-value">{s.value}</span>
                  {s.unit && <span className="sz-unit"> {s.unit}</span>}
                </dd>
              </div>
            ))}
          </dl>
        )}
        <details className="rs-more">
          <summary className="sz-btn sz-btn--ghost sz-btn--sm">
            <svg className="rs-more__chev" viewBox="0 0 8 8" aria-hidden="true"><path d="M2.5 1l3 3-3 3" fill="none" stroke="currentColor" strokeWidth="1.3" /></svg>
            Méthode et limites
          </summary>
          <dl className="rs-more__content">
            {method && (
              <div className="rs-def__row">
                <dt><Label>Méthode</Label></dt>
                <dd>{capital(prose(method))}</dd>
              </div>
            )}
            <div className="rs-def__row">
              <dt><Label>Apprentissage</Label></dt>
              <dd>{prose(c.learning)}</dd>
            </div>
            <div className="rs-def__row">
              <dt><Label>Données</Label></dt>
              <dd>{prose(c.data)}</dd>
            </div>
            {rows.length > 0 && (
              <div className="rs-def__row">
                <dt><Label>Erreur sur le test</Label></dt>
                <dd><ForecastTable rows={rows} /></dd>
              </div>
            )}
            {c.limits.length > 0 && (
              <div className="rs-def__row">
                <dt><Label>Limites</Label></dt>
                <dd>
                  <ul className="rs-limits">
                    {c.limits.map((l) => <li key={l}>{prose(l)}</li>)}
                  </ul>
                </dd>
              </div>
            )}
          </dl>
        </details>
      </div>
    </section>
  );
}

export function ModelCards() {
  const cards = modelCards();
  if (!cards.length) return null;
  return (
    <section className="rs-models" aria-labelledby="rs-models-title">
      <h2 id="rs-models-title" className="rs-models__title">Modèles d'IA</h2>
      <p className="rs-models__sub sz-detail">
        Entraînés avant la mission, calculés à bord sans réseau. Les seuils d'alerte restent des normes NASA.
      </p>
      <div className="rs-models__list">
        {cards.map((c) => <Card key={c.id} c={c} />)}
      </div>
    </section>
  );
}
