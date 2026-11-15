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
  if (day <= 0) return 'Departure';
  if (day < DAY_SOL0) return 'Outbound transit';
  if (day === DAY_SOL0) return 'Mars arrival';
  if (day < DAY_END) return 'Surface operations';
  return 'End of mission';
}

const DATE_FORMAT = new Intl.DateTimeFormat('en-US', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' });

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
const countLabel = (color: Color): string =>
  color === 'green' ? 'nominal' : { red: 'warning', amber: 'caution', grey: 'no data' }[color];

/** Décompte d'un statut ; rien si aucun organe n'est dans ce statut. */
function Count({ color, n, projected }: { color: Color; n: number; projected?: boolean }): JSX.Element | null {
  if (n <= 0) return null;
  return (
    <span className="hdr__count" data-projected={projected || undefined}>
      <StatusDot color={color} size={6} />
      <span>{n} {countLabel(color)}</span>
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
  const projected = mode === 'projection';

  const delta = pheno ? pheno.phenoAge - pheno.chronoAge : null;
  const dStatus: Color = delta === null ? 'grey' : deltaStatus(delta);

  return (
    <header className="sz-panel hdr" data-mode={mode}>
      {/* ── Jour de mission ── */}
      <div
        className="hdr__block hdr__block--day"
        title={day < DAY_SOL0 ? `Mars arrival in ${DAY_SOL0 - day} d` : `End of mission in ${Math.max(0, DAY_END - day)} d`}
      >
        <span className="hdr__label">
          <span className="sz-label">Mission day</span>
          <span className="hdr__meta sz-detail">{phaseLabel(day)}</span>
        </span>
        <span className="hdr__line">
          <span className="sz-value">Day {day}</span>
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
        title="Open biological age details"
      >
        <span className="hdr__label">
          <span className="sz-label">Biological age</span>
          <span className="hdr__meta sz-detail">
            {pheno ? (pheno.mock ? 'Provisional value' : 'Levine 2018') : 'No blood draw'}
          </span>
          <svg className="hdr__chevron" viewBox="0 0 8 12" aria-hidden="true">
            <path d="M2 2l4 4-4 4" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </span>
        {pheno && delta !== null ? (
          <span className="hdr__line">
            <span className="hdr__valunit">
              <span className="sz-value">{fmt(pheno.phenoAge, 1)}</span> <span className="sz-unit">yr</span>
            </span>
            <span className="hdr__delta" title={`Chronological age ${fmt(pheno.chronoAge, Number.isInteger(pheno.chronoAge) ? 0 : 1)} yr`}>
              <span className="hdr__delta-num">{signed(delta, 1)}</span>
              <span className="hdr__sub"> vs chronological age</span>
            </span>
            {mode === 'projection' ? (
              // Jour futur : l'âge biologique n'est pas projeté, c'est celui du dernier prélèvement — dit en clair.
              <span className="hdr__sub hdr__blood">Last blood draw {fmtDay(pheno.day)}</span>
            ) : blood ? (
              <span
                className="hdr__sub hdr__blood"
                title={`Blood age estimated by a regression trained on NHANES 2015–2018 (hypothesis), blood draw ${fmtDay(blood.day)} — chronological age ${fmt(blood.chronoAge, 1)} yr`}
              >
                Est. blood age <span className="hdr__strong">{fmt(blood.bloodAge, 1)} yr</span>
              </span>
            ) : null}
          </span>
        ) : (
          <span className="hdr__line">
            <span className="hdr__none">Insufficient data</span>
          </span>
        )}
      </button>

      {/* ── Statut du jour ── */}
      {/* Jour futur : même règle que les marqueurs d'alarme. Une prévision n'est pas une alarme, la couleur passe en contour. */}
      <div
        className="hdr__block hdr__block--status"
        data-projected={projected || undefined}
        title={projected ? 'Status projected by the model: a projection, not an alarm' : undefined}
      >
        <span className="hdr__label">
          <span className="sz-label">{projected ? 'Projected status' : 'Today’s status'}</span>
          <span className="hdr__meta sz-detail">{tracked} tracked · {unmodeled} not modeled</span>
        </span>
        <span className="hdr__line">
          <StatusChip color={worst} />
          <span className="hdr__counts">
            <Count color="red" n={counts.red} projected={projected} />
            <Count color="amber" n={counts.amber} projected={projected} />
            <Count color="green" n={counts.green} projected={projected} />
            <Count color="grey" n={unknownTracked} />
          </span>
        </span>
      </div>

      <span className="hdr__fill" />
      <PanelClose className="hdr__close" />
    </header>
  );
}
