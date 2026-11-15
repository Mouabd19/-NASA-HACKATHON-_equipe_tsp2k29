// Propriétaire : Ahmed (B). Liste du jour : une seule liste, priorité 1 médicale en tête puis l'ordre de la journée.
// Chaque ligne : case, heure, titre (détail en mode Détails), catégorie, chevron « Pourquoi » (comme les alertes de Corps).
import { Link } from 'react-router-dom';
import type { Level, TodoItem } from '../../types';
import { Panel } from '../../ui';
import { Dot } from './ui';

const KIND: Record<TodoItem['kind'], string> = {
  exercice: 'Exercice', repas: 'Repas', test: 'Test', medical: 'Médical',
};

/** Niveau ORANGE/ROUGE : toute tâche en charge lourde est suspendue (la carte Maintenant dit quoi faire). */
const isSuspended = (t: TodoItem, level: Level) =>
  (level === 'ORANGE' || level === 'ROUGE') && /charge lourde/i.test(`${t.title} ${t.detail ?? ''}`);

const isUrgent = (t: TodoItem) => t.kind === 'medical' && t.priority === 1;

/** Urgent d'abord, puis l'heure (les tâches sans heure ferment la journée), puis la priorité. */
const order = (a: TodoItem, b: TodoItem) =>
  Number(isUrgent(b)) - Number(isUrgent(a)) || (a.time ?? '99').localeCompare(b.time ?? '99') || a.priority - b.priority;

export function TodoList({ items, onToggle, synced, level }: { items: TodoItem[]; onToggle: (id: string, done: boolean) => void; synced: boolean; level: Level }) {
  if (items.length === 0) {
    return (
      <Panel title="Aujourd'hui" provenance="SIMULÉ">
        <p className="sz-dim">Aucune tâche prévue aujourd'hui</p>
      </Panel>
    );
  }
  const list = [...items].sort(order);
  const doneCount = items.filter((t) => t.done).length;

  return (
    <Panel
      title="Aujourd'hui"
      className="wr-flush"
      provenance="SIMULÉ"
      right={
        <>
          {synced
            ? <span className="sz-detail">Liste synchronisée</span>
            : <span title="Les coches sont gardées sur cet écran">Liste non synchronisée</span>}
          <span className="sz-num" aria-label={`${doneCount} tâches faites sur ${items.length}`}>{doneCount} / {items.length}</span>
        </>
      }
    >
      <ul className="wr-todo">
        {list.map((t) => <Row key={t.id} t={t} onToggle={onToggle} suspended={isSuspended(t, level)} />)}
      </ul>
    </Panel>
  );
}

function Row({ t, onToggle, suspended }: { t: TodoItem; onToggle: (id: string, done: boolean) => void; suspended: boolean }) {
  const urgent = isUrgent(t);
  return (
    <li className="wr-todo-row" data-state={suspended ? 'suspended' : t.done ? 'done' : undefined}>
      <label className="wr-todo__check">
        <input
          type="checkbox"
          className="wr-check"
          aria-label={`Fait : ${t.title}`}
          checked={t.done}
          disabled={suspended}
          onChange={(e) => onToggle(t.id, e.target.checked)}
        />
      </label>
      <span className="wr-todo__time">{t.time && <><span className="wr-sr-only">à </span>{t.time}</>}</span>
      <div className="wr-todo__main">
        <div className="wr-todo__title">{t.title}</div>
        {t.detail && !suspended && <div className="wr-todo__detail sz-detail">{t.detail}</div>}
      </div>
      <span className="wr-todo__kind" data-flag={suspended || urgent || undefined}>
        {suspended ? (
          <><Dot color="amber" size={6} /><span title="Voir la consigne « Maintenant »">Suspendu</span></>
        ) : urgent ? (
          <><Dot color="red" size={6} />Urgent</>
        ) : (
          KIND[t.kind]
        )}
      </span>
      <Link className="wr-todo__why" to={`/reasoning/${encodeURIComponent(t.reasoningId)}`} aria-label={`Pourquoi : ${t.title}`} title="Pourquoi">
        <svg viewBox="0 0 12 12" aria-hidden="true"><path d="M4.5 2.5L8 6l-3.5 3.5" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" /></svg>
      </Link>
    </li>
  );
}
