// Alertes du jour : alertsForDay(day), triées par gravité puis de haut en bas du corps (même ordre que les
// étiquettes de la scène). Chaque ligne porte data-organ-id (lu par les traits de liaison) et met l'organe
// en évidence en 3D au survol.
import { useLayoutEffect, useMemo, useRef, useState } from 'react';
import type { CSSProperties, JSX, KeyboardEvent, RefObject } from 'react';
import type { Alert, Color, DayBody, Level } from '../../../types';
import { trend7d } from '../../../models/trend';
import { getStandard } from '../../../content/standards';
import { AlarmMark, Panel, TagBadge, alarmText, fmt, levelColor, levelLabel, sentenceCase, statusVar } from '../../../ui';
import { getAnchor } from '../../../three/anatomy';
import { alarmNumbers, alertLayers, isOnBody, sortAlarms } from '../alarmOrder';
import { LAYER_META, LAYER_ORDER, useBody, useDayAlerts, useDayBody, useRowClip } from '../store';
import './AlertsPanel.css';

const LEVEL_LABEL: Record<Level, string> = levelLabel;

/** Une règle « V1 4027 » / « V2 7038 » vient de NASA-STD-3001 ; tout le reste est une règle de l'équipe (hypothèse). */
const isNasaRule = (rule: string): boolean => /^V\d\s*\d+/i.test(rule.trim());


/** Identifiant de règle interne → libellé lisible : « TENDANCE-7J » → « Tendance 7j ». */
const ruleLabel = (rule: string): string => sentenceCase(rule.replace(/-/g, ' '));

/**
 * Texte d'alerte issu des données, remis en casse de phrase : plus de flèche ni de capitales
 * (« → ROUGE » → « , rouge »), plus de crochets (« [H] » retiré, « [NASA V1 4002] » → « (NASA V1 4002) »).
 */
function cleanMessage(message: string): string {
  return message
    .replace(/\s*→\s*(ROUGE|AMBRE|ORANGE|VERT)\b/g, (_m, level: string) => `, ${level.toLowerCase()}`)
    .replace(/\s*→\s*/g, ', ')
    .replace(/,?\s*(?:du\s+)?modèle\s*\[H\]/g, (m) => (m.includes('du') ? ' du modèle' : ''))
    .replace(/\s*\[H\]/g, '')
    .replace(/\[([^\]]+)\]/g, '($1)')
    .replace(/\s+([.,])/g, '$1');
}

/** Première phrase du message : affichée seule tant que la ligne n'est pas sélectionnée. */
function firstSentence(message: string): string {
  const cut = message.search(/\.\s+(?=\p{Lu})/u);
  return cut < 0 ? message : message.slice(0, cut + 1);
}

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

/** Nombre de lignes `[data-row]` cachées sous le bas de la liste (point 7.3 : le défilement doit se voir). */
function useRowsBelow(ref: RefObject<HTMLElement | null>, count: number): number {
  const [below, setBelow] = useState(0);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) { setBelow(0); return; }
    const apply = (): void => {
      const bottom = el.getBoundingClientRect().top + el.clientTop + el.clientHeight + 0.5; // même seuil que useRowClip
      let n = 0;
      for (const row of el.querySelectorAll<HTMLElement>('[data-row]')) if (row.getBoundingClientRect().bottom > bottom) n++;
      setBelow(n);
    };
    const ro = new ResizeObserver(apply);
    ro.observe(el);
    el.addEventListener('scroll', apply, { passive: true });
    apply();
    return () => { ro.disconnect(); el.removeEventListener('scroll', apply); };
  }, [ref, count]);
  return below;
}

export function AlertsPanel(): JSX.Element {
  const day = useBody((s) => s.day);
  const hovered = useBody((s) => s.hovered);
  const selected = useBody((s) => s.selected);
  const setHovered = useBody((s) => s.setHovered);
  const setSelected = useBody((s) => s.setSelected);
  const openOrganWindow = useBody((s) => s.openOrganWindow);

  const adherence = useBody((s) => s.adherence);
  const layers = useBody((s) => s.layers);
  const body = useDayBody();
  const raw = useDayAlerts();
  const projected = body.projected;
  // mêmes numéros que les repères posés sur le corps 3D : seuls les repères visibles sont numérotés
  const { alerts, nums } = useMemo(() => {
    const visible = (a: Alert): boolean => isOnBody(a, layers, body);
    return { alerts: sortAlarms(raw, projected, visible), nums: alarmNumbers(raw, visible) };
  }, [raw, layers, body, projected]);
  // Jamais de demi-ligne en bas de liste.
  const listRef = useRef<HTMLUListElement>(null);
  useRowClip(listRef);
  const below = useRowsBelow(listRef, alerts.length);
  const cards = useMemo(
    () => alerts.map((a) => {
      const num = nums.get(a.id);
      // calque masqué : nom du premier calque de l'organe, pour le dire en clair sur la ligne
      const hiddenLayer = num === undefined && a.level !== 'VERT' && getAnchor(a.organId)
        ? LAYER_ORDER.find((l) => alertLayers(a, body).includes(l))
        : undefined;
      return { a, num, hiddenLayer, trend: alertTrend(a, body, day), std: isNasaRule(a.rule) ? getStandard(a.rule) : null };
    }),
    [alerts, nums, body, day],
  );

  return (
    <Panel
      title="Alertes"
      provenance="SIMULÉ"
      className="alr"
      right={alerts.length > 0 ? (
        <span className="alr__count" aria-label={`${alerts.length} alerte${alerts.length > 1 ? 's' : ''}`}>{alerts.length}</span>
      ) : undefined}
    >
      {body.projected ? (
        <div className="alr__proj sz-detail">
          Projection {adherence === 1 ? 'avec le plan' : 'au rythme actuel'} <TagBadge tag="H" />
        </div>
      ) : null}

      {cards.length === 0 ? (
        <p className="alr__empty">
          Aucune alerte<span className="sz-detail"> : tendances sur 7 jours dans la marge de bruit.</span>
        </p>
      ) : (
        <ul className="alr__list" ref={listRef}>
          {cards.map(({ a, num, hiddenLayer, trend, std }) => {
            const color: Color = levelColor[a.level] ?? 'grey';
            const level = LEVEL_LABEL[a.level] ?? sentenceCase(a.level);
            const title = sentenceCase(a.title);
            const message = cleanMessage(a.message);
            const isSelected = selected === a.organId;
            const masked = hiddenLayer !== undefined;
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
                  data-row
                  role="button"
                  tabIndex={0}
                  data-organ-id={a.organId}
                  data-level={a.level}
                  data-color={color}
                  data-projected={projected}
                  data-masked={masked}
                  data-hovered={hovered === a.organId}
                  data-selected={isSelected}
                  onMouseEnter={() => setHovered(a.organId)}
                  onMouseLeave={() => setHovered(null)}
                  onFocus={() => setHovered(a.organId)}
                  onBlur={() => setHovered(null)}
                  onClick={() => setSelected(a.organId)}
                  onKeyDown={onKey}
                >
                  <span className="alr__num" aria-hidden="true">{num ?? ''}</span>
                  <h3 className="alr__title" title={`${alarmText(a.level, projected)} : ${title}`}>
{title}</h3>
                  <span className="alr__prio">
                    {masked ? (
                      // repère absent de la scène : pas de numéro, pas de couleur, la raison en clair
                      <span className="alr__word alr__word--masked" title={`Calque ${LAYER_META[hiddenLayer].label} masqué : repère absent de la scène`}>Calque masqué</span>
                    ) : color === 'grey' ? (
                      <span className="alr__word">
                        <span className="sz-dot" data-color={color} style={{ '--sz-status': statusVar[color] } as CSSProperties} aria-hidden="true" />
                        {level}
                      </span>
                    ) : <AlarmMark level={a.level} projected={projected} withLabel />}
                  </span>
                  <button
                    type="button"
                    className="alr__open"
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelected(a.organId);
                      openOrganWindow(a.organId);
                    }}
                    aria-label={`Ouvrir la fiche : ${title}`}
                    title="Ouvrir la fiche"
                  >
                    <svg viewBox="0 0 12 12" aria-hidden="true"><path d="M4.5 2.5L8 6l-3.5 3.5" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" /></svg>
                  </button>

                  <div className="alr__more sz-detail">
                    <p className="alr__msg" title={message}>{isSelected ? message : firstSentence(message)}</p>
                    <div className="alr__meta">
                      <span title={std ? `${std.title}${std.verified ? '' : ' (référence à vérifier)'}` : `Règle interne de l’équipe : ${ruleLabel(a.rule)}`}>
                        {isNasaRule(a.rule) ? <TagBadge tag="NASA" id={a.rule} /> : <TagBadge tag="H" />}
                      </span>
                      {trend ? (
                        <span className="alr__trend" title={`Pente sur 7 jours : ${trend.label}`}>
                          {/* os : pente du MODÈLE (rien n'est mesuré par scanner), pas une tendance mesurée */}
                          {trend.model ? 'Pente du modèle' : 'Tendance'} 7 j{' '}
                          <span className="alr__v">{signed(trend.value, 2)} %/sem</span>
                        </span>
                      ) : (
                        <span className="alr__trend">Tendance 7 j indisponible</span>
                      )}
                    </div>
                  </div>
                </article>
              </li>
            );
          })}
        </ul>
      )}
      {below > 0 ? (
        <button
          type="button"
          className="alr__below"
          onClick={() => listRef.current?.scrollBy({ top: listRef.current.clientHeight * 0.8, behavior: 'smooth' })}
        >
          + {below} alerte{below > 1 ? 's' : ''} plus bas
        </button>
      ) : null}
    </Panel>
  );
}
