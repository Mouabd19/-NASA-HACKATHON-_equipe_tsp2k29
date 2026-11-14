// Propriétaire : Ahmed (B). Carte MAINTENANT (calculé à bord) / ENSUITE (dépend du lien Terre).
// MAINTENANT est le moment fort de l'écran : la consigne en grand, la couleur du statut et rien d'autre.
// Avant le check-in du jour, aucune consigne n'est affichée : l'inconnu se voit (gris).
import type { OrganSummary, RouterOutput, Tag, TriageResult } from '../../types';
import { usePrefs } from '../../ui/prefs';
import { Dot, LEVEL_LABEL, Panel, Prov, T, hatch, hhmm, label, levelColor, fr } from './ui';

const DECIDEUR: Record<RouterOutput['ensuite']['decideur'], string> = {
  moi: 'Toi', CMO: 'Médecin de bord', sol: 'Médecin au sol', equipage: 'Équipage',
};

const ZONE: Record<string, string> = { rachis: 'dos', cerveau: 'tête', paravertebraux: 'dos' };

/** Id du titre MAINTENANT : le check-in y renvoie le focus après validation. */
export const NOW_TITLE_ID = 'wr-now-title';

export function NowNextCard(props: {
  triage: TriageResult;
  out: RouterOutput;
  delayMin: number;
  delayTag: Tag;
  summary: OrganSummary | null;
  summaryReceivedAt: Date;
  pending: boolean;
  missionNow: Date;
}) {
  const { triage: t, out, delayMin, pending } = props;
  const c = pending ? T.status.grey : levelColor(t.level);
  const insufficient = !pending && t.level === 'DONNEES_INSUFFISANTES';
  const red = !pending && t.level === 'ROUGE';
  const details = usePrefs((s) => s.details);
  const reply = out.ensuite.reponseMin != null ? new Date(props.missionNow.getTime() + out.ensuite.reponseMin * 60_000) : null;
  const levelText = pending ? 'En attente du check-in' : insufficient ? LEVEL_LABEL[t.level] : `Niveau ${LEVEL_LABEL[t.level].toLowerCase()}`;
  const order = pending ? 'Fais le check-in pour obtenir la consigne du jour' : out.maintenant;

  return (
    <div className="wr-now">
      <section
        aria-labelledby={NOW_TITLE_ID}
        style={{
          background: T.panel,
          border: `1px solid ${red ? c + '66' : T.border}`,
          borderRadius: T.radius.card,
          padding: 32,
          display: 'flex',
          flexDirection: 'column',
          gap: 16,
          ...(red ? hatch(c) : {}),
        }}
      >
        <header style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <h2 id={NOW_TITLE_ID} tabIndex={-1} style={{ ...label, margin: 0, color: T.textDim }}>Maintenant</h2>
          <span className="sz-detail" style={{ fontSize: T.fs.sm, color: T.textMuted }}>calculé à bord, sans attendre la Terre</span>
        </header>
        <div role={red ? 'alert' : 'status'} aria-live={red ? 'assertive' : 'polite'} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Dot color={c} size={10} />
            {/* Le gris (inconnu) sert à la pastille ; le texte reste lisible en gris lune. */}
            <span style={{ fontSize: T.fs.md, fontWeight: 500, color: pending || insufficient ? T.textDim : c }}>{levelText}</span>
          </div>
          <p style={{ fontFamily: T.fontDisplay, fontSize: 'clamp(28px, 3.4vw, 44px)', fontWeight: 600, lineHeight: 1.12, letterSpacing: '-0.015em', margin: 0, color: pending || insufficient ? T.textDim : T.text, maxWidth: '22ch' }}>
            {order}
          </p>
        </div>
        {!pending && t.reasons.length > 0 && (
          <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'grid', gap: 4, color: T.textDim, fontSize: T.fs.md, lineHeight: 1.45 }}>
            {t.reasons.slice(0, 4).map((r) => (
              <li key={r} style={{ display: 'flex', gap: 8 }}><span aria-hidden style={{ color: T.textMuted }}>—</span>{r}</li>
            ))}
          </ul>
        )}
      </section>

      <Panel title="Ensuite" prov={<Prov p="SIMULÉ" />}>
        {pending ? (
          <p style={{ margin: 0, fontSize: T.fs.md, color: T.textDim, lineHeight: 1.47 }}>Dépend du check-in du matin</p>
        ) : (
          <>
            <div style={{ fontSize: T.fs.sm, color: T.textMuted }}>Décide</div>
            <div style={{ fontSize: T.fs.lg, fontWeight: 500, color: T.text, marginTop: 2 }}>{DECIDEUR[out.ensuite.decideur]}</div>
            <p style={{ margin: '12px 0 0', color: T.text, fontSize: T.fs.md, lineHeight: 1.47 }}>{out.ensuite.texte}</p>
            <div style={{ fontSize: T.fs.sm, color: T.textMuted, marginTop: 8, fontVariantNumeric: 'tabular-nums' }}>
              Message vers la Terre : {fr(delayMin)} min [{props.delayTag}]{reply ? ` · réponse vers ${hhmm(reply)}` : ''}
            </div>
            {t.groundRoutine.length > 0 && (
              <div style={{ marginTop: 16, fontSize: T.fs.md, color: T.textDim, lineHeight: 1.45 }}>
                <span style={{ color: T.textMuted }}>Suivi par le sol : </span>{t.groundRoutine.join(' · ')}
              </div>
            )}
          </>
        )}
        {props.summary && (
          // repliée par défaut : un clic (ou le mode « Détails ») affiche le texte complet
          <details className="wr-fold" open={details} style={{ marginTop: 16, paddingTop: 16, borderTop: `1px solid ${T.border}` }}>
            <summary style={{ fontSize: T.fs.sm, color: T.textMuted, cursor: 'pointer' }}>
              Synthèse IA · {ZONE[props.summary.organId] ?? props.summary.organId}
              <span className="sz-detail"> · reçue à {hhmm(props.summaryReceivedAt)} · à valider par le médecin de bord</span>
            </summary>
            <p style={{ margin: '8px 0 0', fontSize: T.fs.md, lineHeight: 1.47, color: T.textDim }}>{props.summary.text}</p>
          </details>
        )}
      </Panel>
    </div>
  );
}
