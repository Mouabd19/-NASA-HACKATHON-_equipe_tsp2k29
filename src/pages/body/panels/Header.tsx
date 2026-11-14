// En-tête de la page Body (ROADMAP §1 « En tête de page ») : une seule bande dense.
// Gauche : qui / quel jour / mesuré ou projeté. Centre : âge biologique global (PhenoAge [Publié]).
// Droite : statut du jour, source du corps, délai radio, rejouer le scan.
import { useMemo } from 'react';
import type { CSSProperties, JSX } from 'react';
import type { Color, DayBody } from '../../../types';
import { ASTRONAUT, DAY_END, DAY_SOL0, DAY_TODAY } from '../../../mocks/mission';
import { phenoAge } from '../../../models/phenoAge';
import { lightTimeMin, lightTimeSource } from '../../../content/horizons';
import { ProvenanceBadge, StatusChip, TagBadge, dayToDate, fmt, fmtDay } from '../../../ui';
import { useBody, useDayBody } from '../store';
import './Header.css';

const STATUS_VAR: Record<Color, string> = {
  green: 'var(--sz-ok)',
  amber: 'var(--sz-amber)',
  red: 'var(--sz-red)',
  grey: 'var(--sz-unknown)',
};

/** Phase de mission. Bornes [Persona] (DAY_SOL0 provisoire dans mocks/mission). */
function phaseLabel(day: number): string {
  if (day <= 0) return 'DÉPART — J0';
  if (day < DAY_SOL0) return 'CROISIÈRE ALLER';
  if (day === DAY_SOL0) return 'SOL 0 — ARRIVÉE';
  if (day < DAY_END) return 'SURFACE';
  return 'FIN DE MISSION';
}

const SOURCE_LABEL: Record<DayBody['source'], { text: string; hyp: boolean }> = {
  'echo-bord-sim': { text: 'SCAN ÉCHO — CENTRIFUGEUSE 0,1 g', hyp: true },
  // « Midjourney Medical » est le NOM du scanner (ROADMAP §1), pas une phase de mission.
  'scan-midjourney-sim': { text: 'SCAN US + ANALYSES + MONTRE', hyp: true },
  projection: { text: 'PROJECTION — AUCUN SCAN', hyp: true },
};

/** Statut du jour = le pire statut mesuré. Gris seulement si rien n'est mesuré (jamais vert par défaut). */
function worstStatus(counts: Record<Color, number>): Color {
  if (counts.red > 0) return 'red';
  if (counts.amber > 0) return 'amber';
  if (counts.green > 0) return 'green';
  return 'grey';
}

/** Couleur de l'écart âge biologique − âge réel. Seuils d'affichage [H]. */
function deltaStatus(delta: number): Color {
  if (delta <= 0) return 'green';
  if (delta <= 3) return 'amber';
  return 'red';
}

function signed(n: number, digits: number): string {
  const s = fmt(Math.abs(n), digits);
  return `${n < 0 ? '−' : '+'}${s}`;
}

export function Header(): JSX.Element {
  const day = useBody((s) => s.day);
  const openOrganWindow = useBody((s) => s.openOrganWindow);
  const replayScan = useBody((s) => s.replayScan);
  const globalOpen = useBody((s) => s.organWindow === 'global');

  const body = useDayBody();
  const pheno = useMemo(() => phenoAge(day), [day]);
  const date = dayToDate(day);
  const delay = useMemo(() => lightTimeMin(date), [date]);
  const delayExact = useMemo(() => lightTimeSource(date) === 'table', [date]);

  const counts = useMemo(() => {
    const c: Record<Color, number> = { green: 0, amber: 0, red: 0, grey: 0 };
    for (const o of body.organs) c[o.status] += 1;
    return c;
  }, [body]);
  // « non modélisé » = aucun chiffre du tout (poumons, foie, cerveau) : à part des organes réellement suivis
  const unmodeled = useMemo(() => body.organs.filter((o) => o.metrics.length === 0).length, [body]);
  const tracked = body.organs.length - unmodeled;
  const unknownTracked = useMemo(() => {
    return body.organs.filter((o) => o.metrics.length > 0 && o.status === 'grey').length;
  }, [body]);
  const worst = worstStatus(counts);

  const mode: 'today' | 'past' | 'projection' = day === DAY_TODAY ? 'today' : day < DAY_TODAY ? 'past' : 'projection';
  const source = SOURCE_LABEL[body.source] ?? { text: String(body.source).toUpperCase(), hyp: true };

  const delta = pheno ? pheno.phenoAge - pheno.chronoAge : null;
  const dStatus: Color = delta === null ? 'grey' : deltaStatus(delta);

  return (
    <header className="hdr" data-mode={mode}>
      {/* ── Gauche : identité, jour, état ── */}
      <div className="hdr__left">
        <div className="hdr__id">
          <span className="sz-label sz-dim">{ASTRONAUT.id} · {ASTRONAUT.role}</span>
          <span className="hdr__name sz-mono">{ASTRONAUT.name}</span>
          <TagBadge tag="Persona" />
        </div>
        <div className="hdr__rule" aria-hidden="true" />
        <div className="hdr__day">
          <span className="hdr__daynum sz-mono" title="Jour de mission">J{String(day).padStart(3, '0')}</span>
          <div className="hdr__daymeta">
            <span className="sz-label" title={day < DAY_SOL0 ? `Sol 0 dans ${DAY_SOL0 - day} j [Persona]` : `Fin de mission dans ${Math.max(0, DAY_END - day)} j [Persona]`}>
              {date} <span className="sz-dim">· {phaseLabel(day)}</span> <TagBadge tag="Persona" />
            </span>
            <div className="hdr__state" data-mode={mode} title={
              mode === 'projection'
                ? 'Jour futur : corps projeté par le modèle, pas une mesure'
                : mode === 'today' ? 'Dernier corps mesuré' : 'Corps enregistré ce jour-là'
            }>
              <span className="hdr__state-mark" aria-hidden="true" />
              {mode === 'today' && <span>AUJOURD’HUI — MESURÉ</span>}
              {mode === 'past' && <span>HISTORIQUE — MESURÉ</span>}
              {mode === 'projection' && <span>PROJECTION — MODÈLE <TagBadge tag="H" /></span>}
            </div>
          </div>
        </div>
      </div>

      {/* ── Centre : âge biologique global ── */}
      <button
        type="button"
        className="hdr__bio"
        data-open={globalOpen}
        style={{ '--hdr-delta': STATUS_VAR[dStatus] } as CSSProperties}
        onClick={() => openOrganWindow('global')}
        title="Ouvrir le détail de l’âge biologique global"
      >
        <span className="hdr__bio-head">
          <span className="sz-label sz-dim">ÂGE BIOLOGIQUE</span>
          <TagBadge tag="Publié" />
          {pheno?.mock ? (
            <span className="hdr__mock sz-label" title="La formule PhenoAge est publiée (Levine 2018) mais n'est pas encore calculée : la valeur affichée est factice.">
              FACTICE
            </span>
          ) : null}
          <span className="hdr__bio-open sz-label" aria-hidden="true">DÉTAIL →</span>
        </span>
        {pheno && delta !== null ? (
          <span className="hdr__bio-main">
            <span className="hdr__bio-num sz-mono">{fmt(pheno.phenoAge, 1)}</span>
            <span className="hdr__bio-unit sz-label">ANS</span>
            <span className="hdr__bio-vs">
              <span className="hdr__bio-delta sz-mono">{signed(delta, 1)}</span>
              <span className="sz-label sz-dim">
                ÂGE RÉEL {fmt(pheno.chronoAge, Number.isInteger(pheno.chronoAge) ? 0 : 1)} <TagBadge tag="Persona" />
              </span>
            </span>
          </span>
        ) : (
          <span className="hdr__bio-main">
            <span className="hdr__bio-none sz-mono">DONNÉES INSUFFISANTES</span>
          </span>
        )}
        <span className="hdr__bio-foot sz-label sz-dim">
          {pheno?.mock ? 'FORMULE NON CALCULÉE' : 'LEVINE 2018'}
          {pheno ? <> · {mode === 'projection' ? 'DERNIER PRÉLÈV.' : 'PRÉLÈV.'} {fmtDay(pheno.day)}</> : <> · AUCUN PRÉLÈVEMENT</>}
        </span>
      </button>

      {/* ── Droite : statut du jour, source, délai radio ── */}
      <div className="hdr__right">
        <div className="hdr__status">
          <span className="hdr__row">
            <span className="sz-label sz-dim">STATUT DU JOUR</span>
            <StatusChip color={worst} />
          </span>
          <span className="hdr__counts sz-label">
            <span data-c="red" data-zero={counts.red === 0}>{counts.red} ROUGE</span>
            <span data-c="amber" data-zero={counts.amber === 0}>{counts.amber} AMBRE</span>
            <span data-c="green">{counts.green} NOMINAL</span>
            {unknownTracked > 0 ? <span data-c="grey">{unknownTracked} INCONNU</span> : null}
          </span>
          <span className="sz-label sz-dim">
            {tracked} SUIVIS + {unmodeled} NON MODÉLISÉS
          </span>
        </div>
        <div className="hdr__rule" aria-hidden="true" />
        <div className="hdr__src">
          <span className="hdr__row">
            <span className="sz-label sz-dim">SOURCE</span>
            <ProvenanceBadge value="SIMULÉ" />
          </span>
          <span className="sz-label hdr__src-text">
            {source.text} {source.hyp ? <TagBadge tag="H" /> : null}
          </span>
          <span className="sz-label sz-dim">
            DÉLAI RADIO{' '}
            {delayExact ? (
              <><span className="hdr__delay">{fmt(delay, 2)} MIN</span> <TagBadge tag="Publié" /></>
            ) : (
              <span title="Approximation d'orbite circulaire de l'équipe, pas une éphéméride JPL Horizons">
                <span className="hdr__delay">≈ {fmt(delay, 1)} MIN</span> <TagBadge tag="H" /> APPROX.
              </span>
            )}
          </span>
        </div>
        <button type="button" className="sz-btn hdr__scan" onClick={replayScan} title="Rejouer le balayage du scan sur le corps 3D">
          <span className="hdr__scan-glyph" aria-hidden="true" />
          REJOUER LE SCAN
        </button>
      </div>
    </header>
  );
}
