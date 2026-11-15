// Propriétaire : Ahmed (B). Panneaux « Maintenant » (calculé à bord) et « Ensuite » (dépend du lien Terre).
// « Maintenant » porte la consigne du jour : le seul texte en 24 px de la page, avec la puce de statut.
// Le délai Terre n'est affiché qu'une fois, dans l'en-tête de « Ensuite ».
// Avant le check-in du jour, aucune consigne n'est affichée : l'inconnu se voit (gris).
import { useState } from 'react';
import type { OrganSummary, RouterOutput, Tag, TriageResult } from '../../types';
import { AlarmMark, Panel, StatusChip, TagBadge, fmt, levelColor, levelPriority, sentenceCase } from '../../ui';
import { alertsForDay } from '../../models/alerts';
import { DAY_TODAY } from '../../mocks/mission';
import { alarmNumbers, sortAlarms } from '../body/alarmOrder';
import { usePrefs } from '../../ui/prefs';
import { Btn, LEVEL_LABEL, hhmm } from './ui';
import { ANALYSIS_STEPS, useAnalysis } from '../../ingest/analysis';

const DECIDEUR: Record<RouterOutput['ensuite']['decideur'], string> = {
  moi: 'You', CMO: 'Crew Medical Officer (CMO)', sol: 'Ground flight surgeon', equipage: 'Crew',
};

const ZONE: Record<string, string> = { rachis: 'back', cerveau: 'head', paravertebraux: 'back', hanche: 'hip' };

/** Id du titre « Maintenant » : le check-in y renvoie le focus après validation. */
export const NOW_TITLE_ID = 'wr-now-title';

/**
 * Raisons dans l'ordre de lecture : d'abord ce qui a déclenché le niveau au check-in (règle R13),
 * puis les alertes du corps dans l'ordre de la liste « Alertes » de la page Corps (gravité, puis de haut en bas),
 * puis le reste (résumé du check-in, prélèvement…).
 */
function orderReasons(reasons: readonly string[]): { r: string; num?: number }[] {
  const alerts = alertsForDay(DAY_TODAY);
  // numéros fixés pour la journée : les mêmes que sur la page Corps, quels que soient les calques affichés
  const nums = alarmNumbers(alerts);
  // alertes dans l'ordre des repères (1, 2, 3…), puis celles qui n'en ont pas
  const order = sortAlarms(alerts, false)
    .sort((a, b) => (nums.get(a.id) ?? 999) - (nums.get(b.id) ?? 999))
    .map((a) => ({ text: `${a.title} [${a.rule}]`, num: nums.get(a.id) }));
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

/**
 * Raisons affichées sous la consigne : toujours les déclencheurs du check-in et toutes les alertes qui portent un
 * numéro de repère (un repère cité sur le Corps ne doit jamais manquer ici). Le reste tient sur une ligne qui
 * renvoie à la page Corps.
 */
const keepReason = (x: { r: string; num?: number }): boolean => x.num !== undefined || /\[R13\]$/.test(x.r);

/** « le CMO de bord décide… » → « Le CMO de bord décide… » (texte du routeur, en minuscule initiale). */
const capFirst = (s: string): string => s.charAt(0).toLocaleUpperCase('en-US') + s.slice(1);

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
  const analysis = useAnalysis();
  const { triage: t, out, delayMin } = props;
  // pendant l'analyse du check-in, l'ancienne consigne n'est plus valable : même rendu qu'« en attente »
  const pending = props.pending || analysis.running;
  const insufficient = !pending && t.level === 'DONNEES_INSUFFISANTES';
  const grey = pending || insufficient; // l'inconnu se voit : puce grise, consigne atténuée
  const red = !pending && t.level === 'ROUGE';
  const details = usePrefs((s) => s.details);
  const reasons = pending ? [] : orderReasons(t.reasons);
  const kept = reasons.filter(keepReason);
  const [allReasons, setAllReasons] = useState(false);
  // une seule raison en plus : on l'affiche plutôt que « + 1 autre raison »
  const shownReasons = allReasons || reasons.length - kept.length <= 1 ? reasons : kept;
  const moreReasons = reasons.length - shownReasons.length;
  const reply = out.ensuite.reponseMin != null ? new Date(props.missionNow.getTime() + out.ensuite.reponseMin * 60_000) : null;
  const levelText = analysis.running ? 'Analyzing' : pending ? 'Pending' : LEVEL_LABEL[t.level];

  return (
    <div className="wr-now">
      {/* ROUGE : un filet rouge en haut du secteur, visible de loin (rien ne clignote) */}
      <section className="sz-panel wr-now__main" data-red={red || undefined} aria-labelledby={NOW_TITLE_ID}>
        <header className="sz-panel__head">
          <h2 id={NOW_TITLE_ID} tabIndex={-1} className="sz-panel__title">Now</h2>
          <span className="sz-panel__fill" />
          <span className="sz-panel__right">
            <span className="sz-detail">Computed onboard</span>
            {/* niveau codé une seule fois : marqueur + mot pour une alarme, voyant + mot sinon */}
            {/* en ROUGE, le marqueur et le mot passent devant la consigne, à sa taille */}
            {red ? null : !grey && levelPriority[t.level]
              ? <span aria-hidden><AlarmMark level={t.level} withLabel /></span>
              : <span aria-hidden><StatusChip color={grey ? 'grey' : levelColor[t.level]} label={levelText} /></span>}
          </span>
        </header>
        <div className="sz-panel__body wr-now__body">
          <div role={red ? 'alert' : 'status'} aria-live={red ? 'assertive' : 'polite'}>
            <span className="wr-sr-only">{levelText}. </span>
            {analysis.running
              ? <p className="wr-order" data-muted="true">Updating the instruction… <span className="wr-order__step">{ANALYSIS_STEPS[analysis.step].label}</span></p>
              : pending
              ? <p className="wr-order" data-muted="true">No instruction until the check-in</p>
              : (
                <p className="wr-order" data-muted={grey}>
                  {red ? (
                    <span className="wr-order__alarm" aria-hidden>
                      <AlarmMark level={t.level} className="wr-order__mark" />
                      <span className="wr-order__word">{LEVEL_LABEL[t.level]}</span>
                    </span>
                  ) : null}
                  {out.maintenant}
                </p>
              )}
          </div>
          {pending && !analysis.running && <div><Btn kind="primary" onClick={goToCheckIn}>Do the check-in</Btn></div>}
          {shownReasons.length > 0 && (
            <ul className="wr-reasons">
              {shownReasons.map(({ r, num }) => {
                // « HANCHE — PERTE OSSEUSE ESTIMÉE [V1 4027] » : casse de phrase ; la règle citée passe en mode Détails.
                const m = /^(.*?)\s*\[([^\]]+)\]$/.exec(r);
                return (
                  <li key={r}>
                    <span className="wr-reasons__num" title={num ? `Marker ${num} on the Body page` : undefined}>{num ?? ''}</span>
                    <span>{sentenceCase(m ? m[1] : r)}{m && <> <span className="sz-tag">{m[2]}</span></>}</span>
                  </li>
                );
              })}
              {moreReasons > 0 ? (
                <li>
                  <span className="wr-reasons__num" />
                  <button type="button" className="wr-reasons__more" onClick={() => setAllReasons(true)}>
                    + {moreReasons} more reasons
                  </button>
                </li>
              ) : null}
            </ul>
          )}
        </div>
      </section>

      <Panel
        title="Next"
        provenance="SIMULÉ"
        right={<span className="sz-num">Earth delay {fmt(delayMin, 1)} min <TagBadge tag={props.delayTag} /></span>}
      >
        {pending ? (
          <p className="wr-text sz-dim">After the check-in</p>
        ) : (
          <div className="wr-next">
            <div className="wr-next__who">
              <span className="sz-label">Decides</span>
              <strong>{DECIDEUR[out.ensuite.decideur]}</strong>
            </div>
            <p className="wr-text">{capFirst(out.ensuite.texte)}</p>
            {reply && <div className="wr-note">Reply around {hhmm(reply)}</div>}
            {t.groundRoutine.length > 0 && (
              <div className="wr-note">Ground follow-up: {t.groundRoutine.join(' · ')}</div>
            )}
          </div>
        )}
        {props.summary && (
          // repliée par défaut : un clic (ou le mode « Détails ») affiche le texte complet
          <details className="wr-fold" open={details}>
            <summary>
              <span>
                <span className="wr-fold__line">AI summary · {ZONE[props.summary.organId] ?? props.summary.organId} · received at {hhmm(props.summaryReceivedAt)}</span>
                <span className="wr-fold__line wr-fold__sub sz-detail">To be reviewed by the CMO</span>
              </span>
            </summary>
            <p>{props.summary.text}</p>
          </details>
        )}
      </Panel>
    </div>
  );
}
