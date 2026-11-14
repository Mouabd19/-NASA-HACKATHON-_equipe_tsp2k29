// Liste des systèmes (esprit « Cyberware ») : un calque par ligne, ses organes dessous quand il est actif.
// Le survol d'une ligne allume l'organe en 3D, et inversement (store.hovered / store.selected).
import { useMemo } from 'react';
import type { JSX, KeyboardEvent, MouseEvent } from 'react';
import type { Color, LayerId, OrganState } from '../../../types';
import { getDayBody } from '../../../sim/load';
import { alertsForDay } from '../../../models/alerts';
import { Panel, StatusDot, TagBadge, fmt } from '../../../ui';
import { LAYER_META, LAYER_ORDER, useBody } from '../store';
import './LayersPanel.css';

const SEVERITY: Record<Color, number> = { red: 3, amber: 2, green: 1, grey: 0 };

/** Pire statut MESURÉ du calque ; gris seulement si rien n'est mesuré (jamais vert par défaut). */
function worstOf(organs: OrganState[]): Color {
  let w: Color = 'grey';
  for (const o of organs) if (SEVERITY[o.status] > SEVERITY[w]) w = o.status;
  return w;
}

function digitsFor(v: number): number {
  const a = Math.abs(v);
  if (a >= 100) return 1;
  if (a >= 10) return 1;
  return 2;
}

/** « POUMONS — NON MODÉLISÉ » → « POUMONS » (le suffixe est rendu à part). */
function shortName(name: string): string {
  return name.replace(/\s*[—–(-]\s*non modélisé\)?\s*$/i, '').trim();
}

export function LayersPanel(): JSX.Element {
  const day = useBody((s) => s.day);
  const layers = useBody((s) => s.layers);
  const hovered = useBody((s) => s.hovered);
  const selected = useBody((s) => s.selected);
  const toggleLayer = useBody((s) => s.toggleLayer);
  const soloLayer = useBody((s) => s.soloLayer);
  const setHovered = useBody((s) => s.setHovered);
  const setSelected = useBody((s) => s.setSelected);
  const openOrganWindow = useBody((s) => s.openOrganWindow);

  const body = useMemo(() => getDayBody(day), [day]);
  const alerts = useMemo(() => alertsForDay(day), [day]);

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

  const activeCount = LAYER_ORDER.filter((l) => layers[l]).length;

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
    <Panel
      sys="SYS"
      title="CALQUES"
      provenance="SIMULÉ"
      className="lyr"
      right={<span className="sz-dim">{activeCount}/{LAYER_ORDER.length}</span>}
    >
      <ul className="lyr__list">
        {LAYER_ORDER.map((l) => {
          const meta = LAYER_META[l];
          const organs = byLayer.get(l) ?? [];
          const active = layers[l];
          const n = alertCount.get(l) ?? 0;
          const worst = worstOf(organs);
          return (
            <li key={l} className="lyr__layer" data-active={active}>
              <button
                type="button"
                className="lyr__head"
                aria-pressed={active}
                onClick={onLayerClick(l)}
                onDoubleClick={() => soloLayer(l)}
                title={`${active ? 'Masquer' : 'Afficher'} le calque — Alt+clic ou double-clic : isoler`}
              >
                <span className="lyr__box" aria-hidden="true" />
                <span className="lyr__sys">{meta.sys}</span>
                <span className="lyr__label">{meta.label}</span>
                {!meta.mvp ? <span className="lyr__beta" title="Calque hors MVP — données partielles">BÊTA</span> : null}
                <span className="lyr__fill" />
                <span className="lyr__alerts" data-zero={n === 0} title={`${n} alerte${n > 1 ? 's' : ''} sur ce calque`}>
                  {n > 0 ? `${n} ALR` : '—'}
                </span>
                <StatusDot color={worst} size={7} />
              </button>

              {active && organs.length > 0 ? (
                <ul className="lyr__organs">
                  {organs.map((o) => {
                    const m = o.metrics[0];
                    const unmodeled = o.status === 'grey' && !m;
                    return (
                      <li key={o.id}>
                        <div
                          role="button"
                          tabIndex={0}
                          className="lyr__organ"
                          data-organ-row={o.id}
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
                          title={m ? `${m.label} — clic : épingler · double-clic : ouvrir la fenêtre organe` : 'Organe non modélisé : aucune donnée'}
                        >
                          <StatusDot color={o.status} />
                          <span className="lyr__oname">{shortName(o.name)}</span>
                          {unmodeled || !m ? (
                            <span className="lyr__none">NON MODÉLISÉ</span>
                          ) : (
                            <>
                              <span className="lyr__val">
                                {fmt(m.value, digitsFor(m.value))}
                                <span className="lyr__unit">{m.unit}</span>
                              </span>
                              <TagBadge tag={m.tag} />
                            </>
                          )}
                        </div>
                      </li>
                    );
                  })}
                </ul>
              ) : null}
              {active && organs.length === 0 ? <div className="lyr__empty">AUCUNE DONNÉE CE JOUR</div> : null}
            </li>
          );
        })}
      </ul>
      <div className="lyr__foot">CLIC : AFFICHER · ALT+CLIC : ISOLER</div>
    </Panel>
  );
}
