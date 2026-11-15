// En-tête de la page Corps : bandeau de synthèse, une ligne de blocs « libellé + valeur ».
// Jour de mission · âge biologique (ouvre la fenêtre de détail) · statut du jour.
import { useMemo } from 'react';
import type { CSSProperties, JSX } from 'react';
import type { Color } from '../../../types';
import { DAY_END, DAY_SOL0, DAY_TODAY } from '../../../mocks/mission';
import { phenoAge } from '../../../models/phenoAge';
import { bloodAgeSeries } from '../../../models/ml';
import { PanelClose, StatusChip, StatusDot, dayToDate, fmt, fmtDay, statusVar } from '../../../ui';
import { useBody, useDayBody } from '../store';
import './Header.css';

/** Phase de mission (bornes du scénario, DAY_SOL0 provisoire dans mocks/mission). */
function phaseLabel(day: number): string {
  if (day <= 0) return 'Départ';
  if (day < DAY_SOL0) return 'Croisière aller';
  if (day === DAY_SOL0) return 'Arrivée sur Mars';
  if (day < DAY_END) return 'Surface';
  return 'Fin de mission';
}

const DATE_FORMAT = new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' });

/** Date ISO → « 14 novembre 2026 ». */
function longDate(iso: string): string {
  const t = Date.parse(`${iso}T00:00:00Z`);
  return Number.isFinite(t) ? DATE_FORMAT.format(t) : iso;
}

/** Statut du jour = le pire statut mesuré. Gris seulement si rien n'est mesuré (jamais vert par défaut). */
function worstStatus(counts: Record<Color, number>): Color {
  if (counts.red > 0) return 'red';
  if (counts.amber > 0) return 'amber';
  if (counts.green > 0) return 'green';
  return 'grey';
}

/** Couleur de l'écart âge biologique − âge réel. Seuils d'affichage : hypothèse de l'équipe. */
function deltaStatus(delta: number): Color {
  if (delta <= 0) return 'green';
  if (delta <= 3) return 'amber';
  return 'red';
}

function signed(n: number, digits: number): string {
  const s = fmt(Math.abs(n), digits);
  return `${n < 0 ? '−' : '+'}${s}`;
}

/** « 4 en attention », « 7 nominaux » : même vocabulaire que les pastilles (src/ui/tokens.ts). */
const countLabel = (color: Color, n: number): string =>
  color === 'green' ? (n > 1 ? 'nominaux' : 'nominal') : { red: 'en alerte', amber: 'en attention', grey: 'sans donnée' }[color];

/** Décompte d'un statut ; rien si aucun organe n'est dans ce statut. */
function Count({ color, n }: { color: Color; n: number }): JSX.Element | null {
  if (n <= 0) return null;
  return (
    <span className="hdr__count">
      <StatusDot color={color} size={6} />
      <span>{n} {countLabel(color, n)}</span>
    </span>
  );
}

export function Header(): JSX.Element {
  const day = useBody((s) => s.day);
  const openOrganWindow = useBody((s) => s.openOrganWindow);
  const globalOpen = useBody((s) => s.organWindow === 'global');

  const body = useDayBody();
  const pheno = useMemo(() => phenoAge(day), [day]);
  // Âge sanguin (modèle NHANES) : dernier prélèvement ≤ jour affiché ; rien d'inventé au-delà.
  const bloodSeries = useMemo(() => bloodAgeSeries(), []);
  const blood = useMemo(() => bloodSeries.filter((p) => p.day <= day).at(-1) ?? null, [bloodSeries, day]);
  const date = dayToDate(day);

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

  const delta = pheno ? pheno.phenoAge - pheno.chronoAge : null;
  const dStatus: Color = delta === null ? 'grey' : deltaStatus(delta);

  return (
    <header className="sz-panel hdr" data-mode={mode}>
      {/* ── Jour de mission ── */}
      <div
        className="hdr__block hdr__block--day"
        title={day < DAY_SOL0 ? `Arrivée sur Mars dans ${DAY_SOL0 - day} j` : `Fin de mission dans ${Math.max(0, DAY_END - day)} j`}
      >
        <span className="hdr__label">
          <span className="sz-label">Jour de mission</span>
          <span className="hdr__meta sz-detail">{phaseLabel(day)}</span>
        </span>
        <span className="hdr__line">
          <span className="sz-value">Jour {day}</span>
          <span className="hdr__sub">{longDate(date)}</span>
        </span>
      </div>

      {/* ── Âge biologique (ouvre le détail) ── */}
      <button
        type="button"
        className="hdr__block hdr__block--bio"
        data-open={globalOpen}
        aria-haspopup="dialog"
        aria-expanded={globalOpen}
        style={{ '--hdr-delta': statusVar[dStatus] } as CSSProperties}
        onClick={() => openOrganWindow('global')}
        title="Ouvrir le détail de l’âge biologique"
      >
        <span className="hdr__label">
          <span className="sz-label">Âge biologique</span>
          <span className="hdr__meta sz-detail">
            {pheno ? (pheno.mock ? 'Valeur provisoire' : 'Levine 2018') : 'Aucun prélèvement'}
          </span>
          <svg className="hdr__chevron" viewBox="0 0 8 12" aria-hidden="true">
            <path d="M2 2l4 4-4 4" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </span>
        {pheno && delta !== null ? (
          <span className="hdr__line">
            <span className="hdr__valunit">
              <span className="sz-value">{fmt(pheno.phenoAge, 1)}</span> <span className="sz-unit">ans</span>
            </span>
            <span className="hdr__delta">
              <span className="hdr__delta-num">{signed(delta, 1)}</span>
              <span className="hdr__sub"> vs âge réel</span>
              <span className="hdr__sub sz-detail"> {fmt(pheno.chronoAge, Number.isInteger(pheno.chronoAge) ? 0 : 1)}</span>
            </span>
            {mode === 'projection' ? (
              // Jour futur : l'âge biologique n'est pas projeté, c'est celui du dernier prélèvement — dit en clair.
              <span className="hdr__sub hdr__blood">Dernier prélèvement {fmtDay(pheno.day)}</span>
            ) : blood ? (
              <span
                className="hdr__sub hdr__blood"
                title={`Âge sanguin estimé par régression entraînée sur NHANES 2015–2018 (hypothèse), prélèvement ${fmtDay(blood.day)} — âge réel ${fmt(blood.chronoAge, 1)} ans`}
              >
                Âge sanguin estimé <span className="hdr__strong">{fmt(blood.bloodAge, 1)} ans</span>
                <span className="sz-detail"> · NHANES</span>
              </span>
            ) : null}
          </span>
        ) : (
          <span className="hdr__line">
            <span className="hdr__none">Données insuffisantes</span>
          </span>
        )}
      </button>

      {/* ── Statut du jour ── */}
      <div className="hdr__block hdr__block--status">
        <span className="hdr__label">
          <span className="sz-label">Statut du jour</span>
          <span className="hdr__meta sz-detail">{tracked} suivis · {unmodeled} non modélisés</span>
        </span>
        <span className="hdr__line">
          <StatusChip color={worst} />
          <span className="hdr__counts">
            <Count color="red" n={counts.red} />
            <Count color="amber" n={counts.amber} />
            <Count color="green" n={counts.green} />
            <Count color="grey" n={unknownTracked} />
          </span>
        </span>
      </div>

      <span className="hdr__fill" />
      <PanelClose className="hdr__close" />
    </header>
  );
}
