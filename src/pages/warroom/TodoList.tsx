// Propriétaire : Ahmed (B). Liste du jour : une seule liste, priorité 1 médicale en tête puis l'ordre de la journée.
// Chaque ligne : case, heure, titre (détail en mode Détails), catégorie, chevron « Pourquoi » (comme les alertes de Corps).
import { Link } from 'react-router-dom';
import type { Level, TodoItem } from '../../types';
import { Panel } from '../../ui';
import { Dot } from './ui';

const KIND: Record<TodoItem['kind'], string> = {
  exercice: 'Exercise', repas: 'Meal', test: 'Test', medical: 'Medical',
};

/** Niveau ORANGE/ROUGE : toute tâche en charge lourde est suspendue (la carte Maintenant dit quoi faire). */
const isSuspended = (t: TodoItem, level: Level) =>
  (level === 'ORANGE' || level === 'ROUGE') && /charge lourde|heavy load/i.test(`${t.title} ${t.detail ?? ''}`);

const isUrgent = (t: TodoItem) => t.kind === 'medical' && t.priority === 1;

/** Urgent d'abord, puis l'heure (les tâches sans heure ferment la journée), puis la priorité. */
const order = (a: TodoItem, b: TodoItem) =>
  Number(isUrgent(b)) - Number(isUrgent(a)) || (a.time ?? '99').localeCompare(b.time ?? '99') || a.priority - b.priority;

export function TodoList({ items, onToggle, synced, level }: { items: TodoItem[]; onToggle: (id: string, done: boolean) => void; synced: boolean; level: Level }) {
  if (items.length === 0) {
    return (
      <Panel title="Today" provenance="SIMULÉ">
        <p className="sz-dim">No tasks scheduled today</p>
      </Panel>
    );
  }
  const list = [...items].sort(order);
  const doneCount = items.filter((t) => t.done).length;

  return (
    <Panel
      title="Today"
      className="wr-flush"
      provenance="SIMULÉ"
      right={
        <>
          {synced
            ? <span className="sz-detail">List synced</span>
            : <span title="Checkmarks are kept on this screen">List not synced</span>}
          <span className="sz-num" aria-label={`${doneCount} of ${items.length} tasks done`}>{doneCount} / {items.length}</span>
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
          aria-label={`Done: ${t.title}`}
          checked={t.done}
          disabled={suspended}
          onChange={(e) => onToggle(t.id, e.target.checked)}
        />
      </label>
      <span className="wr-todo__time">{t.time && <><span className="wr-sr-only">at </span>{t.time}</>}</span>
      <div className="wr-todo__main">
        <div className="wr-todo__title">{t.title}</div>
        {t.detail && !suspended && <div className="wr-todo__detail sz-detail">{t.detail}</div>}
      </div>
      <span className="wr-todo__kind" data-flag={suspended || urgent || undefined}>
        {suspended ? (
          <><Dot color="amber" size={6} /><span title="See the “Now” instruction">Suspended</span></>
        ) : urgent ? (
          <><Dot color="red" size={6} />Urgent</>
        ) : (
          KIND[t.kind]
        )}
      </span>
      <Link className="wr-todo__why" to={`/reasoning/${encodeURIComponent(t.reasoningId)}`} aria-label={`Why: ${t.title}`} title="Why">
        <svg viewBox="0 0 12 12" aria-hidden="true"><path d="M4.5 2.5L8 6l-3.5 3.5" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" /></svg>
      </Link>
    </li>
  );
}
