// Liste des systèmes (esprit « Cyberware ») : un calque par ligne, ses organes dessous quand il est actif.
// Le survol d'une ligne allume l'organe en 3D, et inversement (store.hovered / store.selected).
import { useMemo } from 'react';
import type { JSX, KeyboardEvent, MouseEvent } from 'react';
import type { Color, LayerId, Metric, OrganState } from '../../../types';
import { Panel, StatusDot, TagBadge, fmt } from '../../../ui';
import { LAYER_META, LAYER_ORDER, useBody, useDayAlerts, useDayBody } from '../store';
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

/** Métrique affichée sur la ligne : celle qui PORTE le statut de l'organe, sinon la première (jamais un « 0,00 » sans unité). */
function headline(o: OrganState): Metric | undefined {
  const withUnit = o.metrics.filter((m) => m.unit !== '');
  return withUnit.find((m) => m.color === o.status && (m.color === 'amber' || m.color === 'red'))
    ?? (o.id === 'dose' ? o.metrics.find((m) => m.key === 'dose_jour') : undefined)
    ?? (o.id === 'sang' ? o.metrics.find((m) => m.key === 'hemoglobine') : undefined)   // le VO₂max est porté par le cœur
    ?? withUnit[0] ?? o.metrics[0];
}

/** Ce que chaque calque dit de sa source ou de ses limites (honnêteté : rien n'est sous-entendu). */
const LAYER_NOTE: Partial<Record<LayerId, JSX.Element>> = {
  squelette: <><b>ESTIMÉ</b> : MODÈLE + BILAN AU SOL + MARQUEURS URINAIRES [H] — PAS LE SCANNER</>,
  nerveux: <>BÊTA : NERF OPTIQUE + VIGILANCE (PVT). SOMMEIL ET HUMEUR : VOIR MONTRE ET CHECK-IN</>,
  exposition: <>BÊTA : DOSE GLOBALE SEULEMENT. CARTE DU CORPS = RÉPARTITION ILLUSTRATIVE [H]</>,
};

/** Libellé court des bascules (2 rangées de 3). */
const SHORT: Record<LayerId, string> = {
  squelette: 'SQUELETTE', muscles: 'MUSCLES', organes: 'ORGANES', cardio: 'CARDIO', nerveux: 'NERVEUX', exposition: 'EXPOSIT.',
};

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
      right={<span className="sz-dim" title="Clic : afficher / masquer · Alt+clic ou double-clic : isoler">{activeCount}/{LAYER_ORDER.length}</span>}
    >
      {/* Les 6 bascules, toujours visibles (jamais sous la ligne de flottaison) ; le détail des calques actifs défile dessous. */}
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
              title={`${meta.sys} ${meta.label}${meta.mvp ? '' : ' (BÊTA)'} — ${n} alerte${n > 1 ? 's' : ''} · clic : ${layers[l] ? 'masquer' : 'afficher'} · Alt+clic ou double-clic : isoler`}
            >
              <span className="lyr__box" aria-hidden="true" />
              <span className="lyr__tog-l">{SHORT[l]}</span>
              <StatusDot color={worst} size={6} />
            </button>
          );
        })}
      </div>
      <ul className="lyr__list sz-scroll">
        {activeCount === 0 ? <li className="lyr__empty lyr__empty--all">AUCUN CALQUE ACTIF — ENVELOPPE DU CORPS SEULE</li> : null}
        {LAYER_ORDER.filter((l) => layers[l]).map((l) => {
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

              {active && LAYER_NOTE[l] ? <div className="lyr__src">{LAYER_NOTE[l]}</div> : null}
              {active && organs.length > 0 ? (
                <ul className="lyr__organs">
                  {organs.filter((o) => o.metrics.length > 0).map((o) => {
                    const m = headline(o);
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
                  {/* organes sans aucun chiffre : une seule ligne grise (place gagnée, rien de caché) */}
                  {organs.some((o) => o.metrics.length === 0) ? (
                    <li>
                      <div className="lyr__organ lyr__organ--static" data-status="grey" title="Aucune mesure ni modèle : statut inconnu, jamais vert par défaut">
                        <StatusDot color="grey" />
                        <span className="lyr__oname">{organs.filter((o) => o.metrics.length === 0).map((o) => shortName(o.name)).join(' · ')}</span>
                        <span className="lyr__none">NON MODÉLISÉ</span>
                      </div>
                    </li>
                  ) : null}
                </ul>
              ) : null}
              {active && organs.length === 0 ? <div className="lyr__empty">AUCUNE DONNÉE CE JOUR</div> : null}
            </li>
          );
        })}
      </ul>
    </Panel>
  );
}
