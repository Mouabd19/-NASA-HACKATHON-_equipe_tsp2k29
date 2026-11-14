// Propriétaire : Ahmed (B). Carte « Signal d'humeur » de la War Room (demande de Mouad, modèle C).
// Signal à regarder, jamais un diagnostic : il PROPOSE un point psy, n'impose rien (ROADMAP §11).
import { modelCards, moodSignals, type MoodSignal } from '../../models/ml';
import { Dot, Panel, Prov, T, fr } from './ui';

const W = 320;
const H = 72;
const PAD = 4;

function Chart({ s, threshold }: { s: MoodSignal[]; threshold: number }) {
  const d0 = s[0].day;
  const d1 = s[s.length - 1].day;
  const x = (day: number) => PAD + ((day - d0) / Math.max(d1 - d0, 1)) * (W - 2 * PAD);
  const y = (v: number) => PAD + (1 - v) * (H - 2 * PAD);
  const line = s.map((p) => `${x(p.day).toFixed(1)},${y(p.score).toFixed(1)}`).join(' ');
  const first = s.find((p) => p.alert);
  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" height={H} preserveAspectRatio="none" role="img"
      aria-label={`Score d'humeur du jour ${d0} au jour ${d1}, seuil ${fr(threshold, 2)}${first ? `, alerte depuis le jour ${first.day}` : ', aucune alerte'}`}>
      <line x1={PAD} x2={W - PAD} y1={y(threshold)} y2={y(threshold)} stroke={T.status.amber} strokeDasharray="3 3" strokeWidth={1} vectorEffect="non-scaling-stroke" />
      {first && <rect x={x(first.day)} y={PAD} width={W - PAD - x(first.day)} height={H - 2 * PAD} fill={T.status.amber} opacity={0.08} />}
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
      <Panel title="Signal d'humeur" prov={<Prov p="SIMULÉ" />}>
        <p style={{ margin: 0, color: T.textDim, fontSize: 15 }}>Données insuffisantes : pas de signal calculé</p>
      </Panel>
    );
  }
  const last = s[s.length - 1];
  const first = s.find((p) => p.alert);
  return (
    <Panel title="Signal d'humeur" prov={<Prov p="SIMULÉ" />}>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, flexWrap: 'wrap' }}>
        {last.alert && <Dot color={T.status.amber} size={8} />}
        <span style={{ fontSize: 28, fontWeight: 500, fontVariantNumeric: 'tabular-nums' }}>{fr(last.score, 2)}</span>
        <span style={{ fontSize: 13, color: T.textMuted }}>score J{last.day} · seuil {fr(threshold, 2)}</span>
      </div>
      <div style={{ fontSize: 15, color: last.alert ? T.text : T.textDim, margin: '4px 0 12px' }}>
        {last.alert ? `À regarder depuis J${first?.day ?? last.day} : un point psy est proposé` : 'Rien à signaler'}
      </div>
      <Chart s={s} threshold={threshold} />
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: T.textMuted, marginTop: 4, fontVariantNumeric: 'tabular-nums' }}>
        <span>J{s[0].day}</span><span>J{last.day}</span>
      </div>
      <p style={{ margin: '12px 0 0', fontSize: 13, color: T.textMuted, lineHeight: 1.45 }}>
        Modèle d'IA comparant Haddad à sa propre référence (J0–J20). Signal à regarder, jamais un diagnostic.
      </p>
    </Panel>
  );
}
