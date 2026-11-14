// Calques du corps : six cases à cocher, puis, pour chaque calque affiché, la liste de ses organes.
// Le survol d'une ligne met l'organe en évidence en 3D, et inversement (store.hovered / store.selected).
import { useMemo, useRef } from 'react';
import type { JSX, KeyboardEvent, MouseEvent } from 'react';
import type { Color, LayerId, Metric, OrganState } from '../../../types';
import { Panel, StatusDot, TagBadge, fmt, sentenceCase } from '../../../ui';
import { LAYER_META, LAYER_ORDER, useBody, useDayAlerts, useDayBody, useRowClip } from '../store';
import './LayersPanel.css';

const SEVERITY: Record<Color, number> = { red: 3, amber: 2, green: 1, grey: 0 };

/** Pire statut MESURÉ du calque ; gris seulement si rien n'est mesuré (jamais vert par défaut). */
function worstOf(organs: OrganState[]): Color {
  let w: Color = 'grey';
  for (const o of organs) if (SEVERITY[o.status] > SEVERITY[w]) w = o.status;
  return w;
}

function digitsFor(v: number): number {
  return Math.abs(v) >= 10 ? 1 : 2;
}

/** « Poumons — non modélisé » → « Poumons » (la mention est rendue à part). */
function shortName(name: string): string {
  return sentenceCase(name.replace(/\s*[—–(-]\s*non modélisé\)?\s*$/i, '').trim());
}

/** Nom en milieu d'énumération : « Foie » → « foie » (un sigle reste en capitales). */
function lowerFirst(name: string): string {
  return /^\p{Lu}\p{Ll}/u.test(name) ? name.charAt(0).toLocaleLowerCase('fr-FR') + name.slice(1) : name;
}

/** Métrique affichée sur la ligne : celle qui PORTE le statut de l'organe, sinon la première (jamais un « 0,00 » sans unité). */
function headline(o: OrganState): Metric | undefined {
  const withUnit = o.metrics.filter((m) => m.unit !== '');
  return withUnit.find((m) => m.color === o.status && (m.color === 'amber' || m.color === 'red'))
    ?? (o.id === 'dose' ? o.metrics.find((m) => m.key === 'dose_jour') : undefined)
    ?? (o.id === 'sang' ? o.metrics.find((m) => m.key === 'hemoglobine') : undefined)   // le VO₂max est porté par le cœur
    ?? withUnit[0] ?? o.metrics[0];
}

/**
 * Ce que chaque calque dit de l'unité de lecture, de sa source ou de ses limites.
 * `short` reste visible (à quoi se rapportent les pourcentages ; valeur estimée, non mesurée) ;
 * `more` n'apparaît qu'en mode Détails.
 */
const LAYER_NOTE: Partial<Record<LayerId, { short?: string; more?: string }>> = {
  squelette: { short: 'Densité estimée, % du pré-vol', more: 'Modèle, bilan au sol et marqueurs urinaires. Aucun scanner à bord.' },
  muscles: { short: 'Volume, % du pré-vol' },
  nerveux: { more: 'Données partielles : nerf optique et vigilance (PVT). Sommeil et humeur : montre et check-in.' },
  exposition: { more: 'Données partielles : dose globale seulement. La répartition sur le corps est illustrative.' },
};

/** Libellé court des cases à cocher. */
const SHORT: Record<LayerId, string> = {
  squelette: 'Squelette', muscles: 'Muscles', organes: 'Organes', cardio: 'Cardio', nerveux: 'Nerveux', exposition: 'Exposition',
};

const SOLO_HINT = 'Alt+clic ou double-clic : isoler';

function alertsText(n: number): string {
  return n === 0 ? 'aucune alerte' : `${n} alerte${n > 1 ? 's' : ''}`;
}

export function LayersPanel(): JSX.Element {
  const layers = useBody((s) => s.layers);
  const hovered = useBody((s) => s.hovered);
  const selected = useBody((s) => s.selected);
  const toggleLayer = useBody((s) => s.toggleLayer);
  const soloLayer = useBody((s) => s.soloLayer);
  const setHovered = useBody((s) => s.setHovered);
  const setSelected = useBody((s) => s.setSelected);
  const openOrganWindow = useBody((s) => s.openOrganWindow);

  const body = useDayBody();
  const alerts = useDayAlerts();

  const byLayer = useMemo(() => {
    const m = new Map<LayerId, OrganState[]>();
    for (const l of LAYER_ORDER) m.set(l, []);
    for (const o of body.organs) m.get(o.layer)?.push(o);
    return m;
  }, [body]);

  const alertCount = useMemo(() => {
    const layerOf = new Map(body.organs.map((o) => [o.id, o.layer] as const));
    const c = new Map<LayerId, number>();
    for (const a of alerts) {
      const l = layerOf.get(a.organId);
      if (l) c.set(l, (c.get(l) ?? 0) + 1);
    }
    return c;
  }, [alerts, body]);

  const activeLayers = LAYER_ORDER.filter((l) => layers[l]);
  // Jamais de demi-ligne ni de titre de section orphelin en bas de liste.
  const listRef = useRef<HTMLUListElement>(null);
  useRowClip(listRef);

  const onLayerClick = (l: LayerId) => (e: MouseEvent) => {
    if (e.altKey) soloLayer(l);
    else toggleLayer(l);
  };
  const onOrganKey = (id: string) => (e: KeyboardEvent) => {
    if (e.key !== 'Enter' && e.key !== ' ') return;
    e.preventDefault();
    if (e.shiftKey) openOrganWindow(id);
    else setSelected(id);
  };

  return (
    <Panel title="Calques" provenance="SIMULÉ" className="lyr">
      {/* Les six cases restent toujours visibles ; le détail des calques affichés défile dessous. */}
      <div className="lyr__grid" role="group" aria-label="Calques">
        {LAYER_ORDER.map((l) => {
          const meta = LAYER_META[l];
          const n = alertCount.get(l) ?? 0;
          const worst = worstOf(byLayer.get(l) ?? []);
          return (
            <button
              key={l}
              type="button"
              className="lyr__tog"
              data-active={layers[l]}
              data-layer-toggle={l}
              aria-pressed={layers[l]}
              onClick={onLayerClick(l)}
              onDoubleClick={() => soloLayer(l)}
              title={`${sentenceCase(meta.label)}${meta.mvp ? '' : ' (bêta)'} : ${alertsText(n)}. ${SOLO_HINT}.`}
            >
              <span className="lyr__box" aria-hidden="true">
                <svg viewBox="0 0 14 14"><path d="M3.5 7.2l2.4 2.4 4.6-5" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" /></svg>
              </span>
              <span className="lyr__tog-l">{SHORT[l]}</span>
              <StatusDot color={worst} />
            </button>
          );
        })}
      </div>

      <ul className="lyr__list sz-scroll" ref={listRef}>
        {activeLayers.length === 0 ? <li className="lyr__empty">Aucun calque affiché</li> : null}
        {activeLayers.map((l) => {
          const meta = LAYER_META[l];
          const organs = byLayer.get(l) ?? [];
          const n = alertCount.get(l) ?? 0;
          const note = LAYER_NOTE[l];
          const withData = organs.filter((o) => o.metrics.length > 0);
          const withoutData = organs.filter((o) => o.metrics.length === 0);
          return (
            <li key={l} className="lyr__layer" data-active="true">
              <button
                type="button"
                className="lyr__head sz-section-title"
                aria-pressed="true"
                onClick={onLayerClick(l)}
                onDoubleClick={() => soloLayer(l)}
                title={`Masquer le calque. ${SOLO_HINT}.`}
              >
                <span className="lyr__label">{sentenceCase(meta.label)}</span>
                {!meta.mvp ? <span className="lyr__beta sz-detail" title="Calque en cours de développement : données partielles">Bêta</span> : null}
                <span className="lyr__fill" />
                {n > 0 ? <span className="lyr__alerts sz-detail">{alertsText(n)}</span> : null}
              </button>

              {note ? (
                <p className={note.short ? 'lyr__src' : 'lyr__src sz-detail'}>
                  {note.short}
                  {note.more ? <span className="sz-detail">{note.short ? '. ' : ''}{note.more}</span> : null}
                </p>
              ) : null}

              {organs.length > 0 ? (
                <ul className="lyr__organs">
                  {withData.map((o) => {
                    const m = headline(o);
                    return (
                      <li key={o.id}>
                        <div
                          role="button"
                          tabIndex={0}
                          className={m ? 'lyr__organ' : 'lyr__organ lyr__organ--plain'}
                          data-organ-row={o.id}
                          data-row
                          data-hovered={hovered === o.id}
                          data-selected={selected === o.id}
                          data-status={o.status}
                          onMouseEnter={() => setHovered(o.id)}
                          onMouseLeave={() => setHovered(null)}
                          onFocus={() => setHovered(o.id)}
                          onBlur={() => setHovered(null)}
                          onClick={() => setSelected(o.id)}
                          onDoubleClick={() => openOrganWindow(o.id)}
                          onKeyDown={onOrganKey(o.id)}
                          title={m ? `${m.label}. Double-clic : ouvrir la fiche.` : 'Non modélisé : aucune donnée'}
                        >
                          <StatusDot color={o.status} />
                          <span className="lyr__oname">{shortName(o.name)}</span>
                          {m ? (
                            <>
                              <span className="lyr__val" data-color={m.color === o.status ? m.color : undefined}>{fmt(m.value, digitsFor(m.value))}</span>
                              <span className="lyr__unit sz-unit">{m.unit}</span>
                              <TagBadge tag={m.tag} />
                            </>
                          ) : (
                            <span className="lyr__none">Non modélisé</span>
                          )}
                        </div>
                      </li>
                    );
                  })}
                  {/* organes sans aucun chiffre : une seule ligne grise (rien n'est caché) */}
                  {withoutData.length > 0 ? (
                    <li>
                      <div className="lyr__organ lyr__organ--plain lyr__organ--static" data-row data-status="grey" title="Aucune mesure ni modèle : statut inconnu">
                        <StatusDot color="grey" />
                        <span className="lyr__oname">{withoutData.map((o, i) => (i === 0 ? shortName(o.name) : lowerFirst(shortName(o.name)))).join(', ')}</span>
                        <span className="lyr__none">Non modélisé</span>
                      </div>
                    </li>
                  ) : null}
                </ul>
              ) : (
                <div className="lyr__empty" data-row>Aucune donnée ce jour</div>
              )}
            </li>
          );
        })}
      </ul>
    </Panel>
  );
}
