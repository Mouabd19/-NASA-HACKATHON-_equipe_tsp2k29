// Propriétaire : Ahmed (B). Carte « Signal d'humeur » du Plan du jour (demande de Mouad, modèle C).
// Signal à regarder, jamais un diagnostic : il PROPOSE un point psy, n'impose rien (ROADMAP §11).
import { modelCards, moodSignals, type MoodSignal } from '../../models/ml';
import { Panel, fmt, tokens } from '../../ui';
import { T } from './ui';

const W = 320;
const H = 64;
const PAD = 2;

function Chart({ s, threshold }: { s: MoodSignal[]; threshold: number }) {
  const d0 = s[0].day;
  const d1 = s[s.length - 1].day;
  const x = (day: number) => PAD + ((day - d0) / Math.max(d1 - d0, 1)) * (W - 2 * PAD);
  const y = (v: number) => PAD + (1 - v) * (H - 2 * PAD);
  const line = s.map((p) => `${x(p.day).toFixed(1)},${y(p.score).toFixed(1)}`).join(' ');
  const first = s.find((p) => p.alert);
  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" height={H} preserveAspectRatio="none" role="img"
      aria-label={`Score d'humeur du jour ${d0} au jour ${d1}, seuil ${fmt(threshold, 2)}${first ? `, alerte depuis le jour ${first.day}` : ', aucune alerte'}`}>
      {/* Seuil en gris : la couleur ne sert qu'au score, quand il le dépasse. */}
      <line x1={PAD} x2={W - PAD} y1={y(threshold)} y2={y(threshold)} stroke={tokens.color.textMuted} strokeDasharray="4 3" strokeWidth={1} vectorEffect="non-scaling-stroke" />
      <polyline points={line} fill="none" stroke={T.text} strokeWidth={1.5} vectorEffect="non-scaling-stroke" />
    </svg>
  );
}

/** Recalculé quand le check-in change : le parent la remonte avec key={version}. */
export function MoodCard() {
  const s = moodSignals();
  const threshold = (modelCards().find((c) => c.id === 'mood-risk') as { threshold?: number } | undefined)?.threshold ?? 0.44;
  if (!s.length) {
    return (
      <Panel title="Signal d'humeur" provenance="SIMULÉ">
        <p className="sz-dim">Données insuffisantes</p>
      </Panel>
    );
  }
  const last = s[s.length - 1];
  const first = s.find((p) => p.alert);
  return (
    <Panel title="Signal d'humeur" provenance="SIMULÉ">
      <div className="wr-metric">
        <span className="sz-label wr-metric__full">Score J{last.day}</span>
        <span className="sz-value" data-alert={last.alert || undefined}>{fmt(last.score, 2)}</span>
        <span className="wr-note wr-metric__side">{last.alert ? `Au-dessus du seuil depuis J${first?.day ?? last.day}` : 'Sous le seuil'}</span>
      </div>
      <div className="wr-chart">
        <div className="wr-chart__plot">
          <Chart s={s} threshold={threshold} />
          {/* étiquette du seuil : au bout du pointillé, hors du SVG (qui s'étire en largeur) */}
          <span className="wr-chart__mark" style={{ top: `${((PAD + (1 - threshold) * (H - 2 * PAD)) / H) * 100}%` }} aria-hidden>{fmt(threshold, 2)}</span>
        </div>
        <div className="wr-chart__axis"><span>J{s[0].day}</span><span>J{last.day}</span></div>
      </div>
      <p className="wr-note">
        Pas un diagnostic
        <span className="sz-detail"> · modèle comparant Haddad à sa propre référence (J0–J20)</span>
      </p>
    </Panel>
  );
}
