// Propriétaire : Ahmed (B). To-do du jour : une seule liste, priorité 1 médicale en tête puis l'ordre de la journée.
// Chaque ligne : case, titre en grand, ligne de contexte (type · détail), heure dans une pastille, lien « Pourquoi ».
import { Link } from 'react-router-dom';
import type { Level, TodoItem } from '../../types';
import { Dot, Panel, Prov, T, mono } from './ui';

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
      <Panel title="Aujourd'hui" prov={<Prov p="SIMULÉ" />}>
        <p style={{ color: T.textDim, margin: 0, fontSize: 15 }}>Aucune tâche prévue aujourd'hui</p>
      </Panel>
    );
  }
  const list = [...items].sort(order);
  const doneCount = items.filter((t) => t.done).length;

  return (
    <Panel
      title="Aujourd'hui"
      prov={
        <>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 13, color: T.textMuted }}>
            <Dot color={synced ? T.holo : T.status.grey} size={6} />
            {synced ? 'Montre synchronisée' : 'Montre non reliée · coches gardées sur cet écran'}
          </span>
          <span style={{ ...mono, color: T.textDim }}>{doneCount}/{items.length}</span>
          <Prov p="SIMULÉ" />
        </>
      }
    >
      <ul className="wr-todo" style={{ listStyle: 'none', margin: '-8px 0 -16px', padding: 0 }}>
        {list.map((t) => <Row key={t.id} t={t} onToggle={onToggle} suspended={isSuspended(t, level)} />)}
      </ul>
    </Panel>
  );
}

function Row({ t, onToggle, suspended }: { t: TodoItem; onToggle: (id: string, done: boolean) => void; suspended: boolean }) {
  const urgent = isUrgent(t);
  const dim = suspended ? 0.45 : t.done ? 0.55 : 1;
  return (
    <li className="wr-todo-row" style={{ display: 'grid', gridTemplateColumns: '44px minmax(0, 1fr)', columnGap: 12, alignItems: 'center' }}>
      <label style={{ display: 'grid', placeItems: 'center', width: 44, height: 44, cursor: suspended ? 'not-allowed' : 'pointer' }}>
        <input
          type="checkbox"
          className="wr-check"
          aria-label={`Fait : ${t.title}`}
          checked={t.done}
          disabled={suspended}
          onChange={(e) => onToggle(t.id, e.target.checked)}
        />
      </label>
      {/* Le filet part du titre, pas de la case : la colonne des cases reste d'un seul tenant. */}
      <div className="wr-todo-body" style={{ padding: '18px 0', borderBottom: `1px solid ${T.border}` }}>
        <div style={{ minWidth: 0 }}>
          <div style={{
            fontSize: 19, fontWeight: 500, lineHeight: 1.3, letterSpacing: '-0.01em', color: T.text,
            opacity: dim, textDecoration: t.done || suspended ? 'line-through' : 'none',
            textDecorationColor: T.textMuted, transition: `opacity 150ms ${T.ease}`,
          }}>
            {t.title}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 4, fontSize: 15, lineHeight: 1.4, color: T.textMuted, minWidth: 0 }}>
            {suspended ? (
              <span style={{ color: T.status.amber }}>Suspendu · voir Maintenant</span>
            ) : urgent ? (
              <>
                <Dot color={T.status.red} size={6} />
                <span style={{ color: T.status.red, whiteSpace: 'nowrap' }}>Priorité 1</span>
                {t.detail && <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', opacity: dim }}>· {t.detail}</span>}
              </>
            ) : (
              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', opacity: dim }}>
                {KIND[t.kind]}{t.detail ? ` · ${t.detail}` : ''}
              </span>
            )}
          </div>
        </div>
        <div className="wr-todo-side">
        {t.time && (
          <span style={{
            ...mono, fontSize: 15, color: T.text, opacity: dim, padding: '4px 8px',
            border: `1px solid ${T.borderStrong}`, borderRadius: T.radius.control - 2, lineHeight: 1.2, flexShrink: 0,
          }}>
            <span className="wr-sr-only">à </span>{t.time}
          </span>
        )}
        <Link className="wr-link" to={`/reasoning/${encodeURIComponent(t.reasoningId)}`} style={{ fontSize: 15, whiteSpace: 'nowrap', flexShrink: 0 }}
          aria-label={`Pourquoi : ${t.title}`}>
          Pourquoi
        </Link>
        </div>
      </div>
    </li>
  );
}
