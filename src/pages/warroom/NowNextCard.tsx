// Propriétaire : Ahmed (B). Panneaux « Maintenant » (calculé à bord) et « Ensuite » (dépend du lien Terre).
// « Maintenant » porte la consigne du jour : le seul texte en 24 px de la page, avec la puce de statut.
// Le délai Terre n'est affiché qu'une fois, dans l'en-tête de « Ensuite ».
// Avant le check-in du jour, aucune consigne n'est affichée : l'inconnu se voit (gris).
import type { OrganSummary, RouterOutput, Tag, TriageResult } from '../../types';
import { AlarmMark, Panel, StatusChip, TagBadge, fmt, levelColor, levelPriority, sentenceCase } from '../../ui';
import { alertsForDay } from '../../models/alerts';
import { DAY_TODAY } from '../../mocks/mission';
import { alarmNumbers, isOnBody, sortAlarms } from '../body/alarmOrder';
import { useBody } from '../body/store';
import { usePrefs } from '../../ui/prefs';
import { Btn, LEVEL_LABEL, hhmm } from './ui';

const DECIDEUR: Record<RouterOutput['ensuite']['decideur'], string> = {
  moi: 'Toi', CMO: 'Médecin de bord', sol: 'Médecin au sol', equipage: 'Équipage',
};

const ZONE: Record<string, string> = { rachis: 'dos', cerveau: 'tête', paravertebraux: 'dos' };

/** Id du titre « Maintenant » : le check-in y renvoie le focus après validation. */
export const NOW_TITLE_ID = 'wr-now-title';

/**
 * Raisons dans l'ordre de lecture : d'abord ce qui a déclenché le niveau au check-in (règle R13),
 * puis les alertes du corps dans l'ordre de la liste « Alertes » de la page Corps (gravité, puis de haut en bas),
 * puis le reste (résumé du check-in, prélèvement…).
 */
function orderReasons(reasons: readonly string[], layers: Parameters<typeof isOnBody>[1]): { r: string; num?: number }[] {
  const alerts = alertsForDay(DAY_TODAY);
  const visible = (a: (typeof alerts)[number]): boolean => isOnBody(a, layers);
  const nums = alarmNumbers(alerts, visible);
  const order = sortAlarms(alerts, false, visible).map((a) => ({ text: `${a.title} [${a.rule}]`, num: nums.get(a.id) }));
  const rank = (r: string): number => {
    if (/\[R13\]$/.test(r)) return -1;
    const i = order.findIndex((o) => o.text === r);
    return i >= 0 ? i : 1000;
  };
  return reasons
    .map((r, i) => ({ r, k: rank(r), i }))
    .sort((a, b) => a.k - b.k || a.i - b.i)
    .map(({ r, k }) => ({ r, num: k >= 0 && k < 1000 ? order[k].num : undefined }));
}

/** Amène l'utilisateur sur la première note du check-in (panneau .wr-checkin). */
function goToCheckIn() {
  const first = document.querySelector<HTMLElement>('.wr-checkin [role="radio"][tabindex="0"]');
  first?.scrollIntoView({ block: 'nearest' });
  first?.focus();
}

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
  const insufficient = !pending && t.level === 'DONNEES_INSUFFISANTES';
  const grey = pending || insufficient; // l'inconnu se voit : puce grise, consigne atténuée
  const red = !pending && t.level === 'ROUGE';
  const details = usePrefs((s) => s.details);
  // calques de la page Corps (état partagé) : mêmes numéros de repère que la liste « Alertes »
  const layers = useBody((s) => s.layers);
  const reply = out.ensuite.reponseMin != null ? new Date(props.missionNow.getTime() + out.ensuite.reponseMin * 60_000) : null;
  const levelText = pending ? 'En attente' : LEVEL_LABEL[t.level];

  return (
    <div className="wr-now">
      <section className="sz-panel" aria-labelledby={NOW_TITLE_ID}>
        <header className="sz-panel__head">
          <h2 id={NOW_TITLE_ID} tabIndex={-1} className="sz-panel__title">Maintenant</h2>
          <span className="sz-panel__fill" />
          <span className="sz-panel__right">
            <span className="sz-detail">Calculé à bord</span>
            {/* niveau codé une seule fois : marqueur + mot pour une alarme, voyant + mot sinon */}
            {!grey && levelPriority[t.level]
              ? <span aria-hidden><AlarmMark level={t.level} withLabel /></span>
              : <span aria-hidden><StatusChip color={grey ? 'grey' : levelColor[t.level]} label={levelText} /></span>}
          </span>
        </header>
        <div className="sz-panel__body wr-now__body">
          <div role={red ? 'alert' : 'status'} aria-live={red ? 'assertive' : 'polite'}>
            <span className="wr-sr-only">{levelText}. </span>
            {pending
              ? <p className="wr-order" data-muted="true">Aucune consigne avant le check-in</p>
              : <p className="wr-order" data-muted={grey}>{out.maintenant}</p>}
          </div>
          {pending && <div><Btn kind="primary" onClick={goToCheckIn}>Faire le check-in</Btn></div>}
          {!pending && t.reasons.length > 0 && (
            <ul className="wr-reasons">
              {orderReasons(t.reasons, layers).slice(0, 4).map(({ r, num }) => {
                // « HANCHE — PERTE OSSEUSE ESTIMÉE [V1 4027] » : casse de phrase ; la règle citée passe en mode Détails.
                const m = /^(.*?)\s*\[([^\]]+)\]$/.exec(r);
                return (
                  <li key={r}>
                    <span className="wr-reasons__num" title={num ? `Repère ${num} sur la page Corps` : undefined}>{num ?? ''}</span>
                    <span>{sentenceCase(m ? m[1] : r)}{m && <> <span className="sz-tag">{m[2]}</span></>}</span>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </section>

      <Panel
        title="Ensuite"
        provenance="SIMULÉ"
        right={<span className="sz-num">Délai Terre {fmt(delayMin, 1)} min <TagBadge tag={props.delayTag} /></span>}
      >
        {pending ? (
          <p className="wr-text sz-dim">Après le check-in</p>
        ) : (
          <div className="wr-next">
            <div className="wr-next__who">
              <span className="sz-label">Décide</span>
              <strong>{DECIDEUR[out.ensuite.decideur]}</strong>
            </div>
            <p className="wr-text">{out.ensuite.texte}</p>
            {reply && <div className="wr-note">Réponse vers {hhmm(reply)}</div>}
            {t.groundRoutine.length > 0 && (
              <div className="wr-note">Suivi par le sol : {t.groundRoutine.join(' · ')}</div>
            )}
          </div>
        )}
        {props.summary && (
          // repliée par défaut : un clic (ou le mode « Détails ») affiche le texte complet
          <details className="wr-fold" open={details}>
            <summary>
              <span>
                Synthèse IA · {ZONE[props.summary.organId] ?? props.summary.organId} · reçue à {hhmm(props.summaryReceivedAt)}
                <span className="sz-detail"> · à valider par le médecin de bord</span>
              </span>
            </summary>
            <p>{props.summary.text}</p>
          </details>
        )}
      </Panel>
    </div>
  );
}
