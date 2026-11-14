// Alertes du jour : alertsForDay(day), triées par gravité. Chaque carte porte data-organ-id
// (lu par les traits de liaison) et allume l'organe en 3D au survol.
import { useMemo } from 'react';
import type { JSX, KeyboardEvent } from 'react';
import type { Alert, Color, DayBody, Level } from '../../../types';
import { trend7d } from '../../../models/trend';
import { getStandard } from '../../../content/standards';
import { HatchBand, Panel, StatusChip, TagBadge, fmt, levelColor, sentenceCase } from '../../../ui';
import { useBody, useDayAlerts, useDayBody } from '../store';
import './AlertsPanel.css';

const LEVEL_RANK: Record<Level, number> = { ROUGE: 0, ORANGE: 1, AMBRE: 2, DONNEES_INSUFFISANTES: 3, VERT: 4 };
const LEVEL_LABEL: Record<Level, string> = {
  ROUGE: 'Rouge',
  ORANGE: 'Orange',
  AMBRE: 'Ambre',
  DONNEES_INSUFFISANTES: 'Données insuffisantes',
  VERT: 'Nominal',
};

/** Une règle « V1 4027 » / « V2 7038 » vient de NASA-STD-3001 ; tout le reste est une règle de l'équipe [H]. */
const isNasaRule = (rule: string): boolean => /^V\d\s*\d+/i.test(rule.trim());

/** Tendance 7 j de la première métrique de l'organe qui en a une. */
function alertTrend(a: Alert, body: DayBody, day: number): { value: number; label: string; model: boolean } | null {
  const organ = body.organs.find((o) => o.id === a.organId);
  if (!organ) return null;
  for (const m of organ.metrics) {
    const t = m.trend7d ?? trend7d(organ.id, m.key, day);
    if (t !== null && Number.isFinite(t)) return { value: t, label: m.label, model: organ.layer === 'squelette' };
  }
  return null;
}

function signed(n: number, digits: number): string {
  const r = Number(Math.abs(n).toFixed(digits));
  return `${r === 0 ? '±' : n < 0 ? '−' : '+'}${fmt(r, digits)}`;
}

export function AlertsPanel(): JSX.Element {
  const day = useBody((s) => s.day);
  const hovered = useBody((s) => s.hovered);
  const selected = useBody((s) => s.selected);
  const setHovered = useBody((s) => s.setHovered);
  const setSelected = useBody((s) => s.setSelected);
  const openOrganWindow = useBody((s) => s.openOrganWindow);

  const adherence = useBody((s) => s.adherence);
  const body = useDayBody();
  const raw = useDayAlerts();
  const alerts = useMemo(
    () => [...raw].sort((a, b) => (LEVEL_RANK[a.level] ?? 9) - (LEVEL_RANK[b.level] ?? 9)),
    [raw],
  );
  const cards = useMemo(
    () => alerts.map((a) => ({ a, trend: alertTrend(a, body, day), std: isNasaRule(a.rule) ? getStandard(a.rule) : null })),
    [alerts, body, day],
  );

  const nRed = alerts.filter((a) => a.level === 'ROUGE').length;

  return (
    <Panel
      sys="ALR"
      title="Alertes"
      provenance="SIMULÉ"
      className="alr"
      right={
        <span className="alr__count" data-red={nRed > 0}>
          {String(alerts.length).padStart(2, '0')}
        </span>
      }
    >
      {body.projected ? (
        <div className="alr__proj">Projection {adherence === 1 ? 'avec le plan' : 'au rythme actuel'} — corps projeté <TagBadge tag="H" /></div>
      ) : null}

      {cards.length === 0 ? (
        <div className="alr__empty">
          <span className="alr__empty-mark" aria-hidden="true" />
          <span>Aucune alerte<span className="sz-detail"> — tendances 7 j dans la bande de bruit</span></span>
        </div>
      ) : (
        <ul className="alr__list">
          {cards.map(({ a, trend, std }) => {
            const color: Color = levelColor[a.level] ?? 'grey';
            const onKey = (e: KeyboardEvent): void => {
              if (e.target !== e.currentTarget) return;
              if (e.key !== 'Enter' && e.key !== ' ') return;
              e.preventDefault();
              setSelected(a.organId);
            };
            return (
              <li key={a.id}>
                <article
                  className="alr__card"
                  role="button"
                  tabIndex={0}
                  data-organ-id={a.organId}
                  data-level={a.level}
                  data-color={color}
                  data-hovered={hovered === a.organId}
                  data-selected={selected === a.organId}
                  onMouseEnter={() => setHovered(a.organId)}
                  onMouseLeave={() => setHovered(null)}
                  onFocus={() => setHovered(a.organId)}
                  onBlur={() => setHovered(null)}
                  onClick={() => setSelected(a.organId)}
                  onKeyDown={onKey}
                >
                  {a.level === 'ROUGE' ? <HatchBand color="red" height={5} /> : null}
                  <div className="alr__body">
                    <div className="alr__top">
                      <StatusChip color={color} label={LEVEL_LABEL[a.level] ?? a.level} />
                      <span className="alr__fill" />
                      <span title={std ? `${std.title}${std.verified ? '' : ' — référence à vérifier'}` : 'Règle interne de l’équipe (hypothèse)'}>
                        {isNasaRule(a.rule) ? <TagBadge tag="NASA" id={a.rule} /> : <TagBadge tag="H" id={a.rule} />}
                      </span>
                    </div>
                    <h3 className="alr__title">{sentenceCase(a.title)}</h3>
                    <p className="alr__msg sz-detail" title={a.message}>{a.message}</p>
                    <div className="alr__foot">
                      {trend ? (
                        <span className="alr__trend sz-detail" title={`Pente sur 7 jours — ${trend.label}`}>
                          {/* os : pente du MODÈLE (rien n'est mesuré par le scanner), pas une tendance mesurée */}
                          <span className="alr__k">{trend.model ? 'Pente modèle 7 j' : 'Tendance 7 j'}</span>
                          <span className="alr__v">{signed(trend.value, 2)} %/SEM</span>
                        </span>
                      ) : (
                        <span className="alr__trend sz-detail">
                          <span className="alr__k">Tendance 7 j</span>
                          <span className="alr__v alr__v--none">Indisponible</span>
                        </span>
                      )}
                      <span className="alr__fill" />
                      <button
                        type="button"
                        className="alr__detail"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelected(a.organId);
                          openOrganWindow(a.organId);
                        }}
                        title="Ouvrir la fenêtre organe"
                      >
                        Ouvrir →
                      </button>
                    </div>
                  </div>
                </article>
              </li>
            );
          })}
        </ul>
      )}
    </Panel>
  );
}
