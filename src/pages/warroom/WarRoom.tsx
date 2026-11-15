// Propriétaire : Ahmed (B). Page « Plan du jour » (route /warroom) — ROADMAP §1 (page 2) et §3.
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { Tag, TodoItem } from '../../types';
import { MISSION_TODAY, clearCheckIn, onCheckInChange, todayCheckIn } from '../../ingest/checkin';
import { loadRealData, onRealDataChange } from '../../ingest/realData';
import { pullDone, pushTodo, setDone } from '../../ingest/todoSync';
import { onServerChange } from '../../ingest/events';
import { triage } from '../../models/triage';
import { router } from '../../models/router';
import { planDay } from '../../models/planDay';
import { getSummary } from '../../content/summaries';
import { lightTimeMin, lightTimeSource } from '../../content/horizons';
import { CheckInCard } from './CheckInCard';
import { NowNextCard } from './NowNextCard';
import { TodoList } from './TodoList';
import { MoodCard } from './MoodCard';
import { LiveWidget } from './LiveWidget';
import { Btn } from './ui';
import './warroom.css';

const DAY = MISSION_TODAY;
const DATE = '2026-11-14'; // J94 (horizons.json : j0 = 2026-08-12)
const POS = 'MarsScenario' as const;
const SYNC_MS = 3000;
const LOCAL_WINDOW_MS = 5000; // une coche locale récente prime sur le serveur pendant 5 s
const STORE_KEY = `todo:J${DAY}`;
const HEALTH_TIMEOUT_MS = 2000;

// Répétitions de la démo : le bouton « Réinitialiser » n'apparaît qu'avec ?demo dans l'URL.
const DEMO = new URLSearchParams(location.search).has('demo');

// Horloge de mission unique : la démo se joue le J94 à 07:00, jamais l'heure réelle.
const MISSION_NOW = new Date(DATE + 'T07:00:00');

let memoryStore: string[] = []; // repli si localStorage est indisponible
function loadDone(): Set<string> {
  try {
    const raw = localStorage.getItem(STORE_KEY);
    if (raw) { const ids = JSON.parse(raw); if (Array.isArray(ids)) return new Set(ids.filter((x) => typeof x === 'string')); }
    return new Set();
  } catch {
    return new Set(memoryStore);
  }
}
function saveDone(s: Set<string>) {
  memoryStore = [...s];
  try { localStorage.setItem(STORE_KEY, JSON.stringify(memoryStore)); } catch { /* repli mémoire */ }
}

export function WarRoom() {
  const [version, setVersion] = useState(0); // incrémenté à chaque check-in : recalcule triage, router et plan
  const [dataVersion, setDataVersion] = useState(0);
  const [done, setDoneIds] = useState<Set<string>>(loadDone);
  const [synced, setSynced] = useState(false);
  const bump = useCallback(() => setVersion((v) => v + 1), []);

  useEffect(() => onCheckInChange(bump), [bump]);
  useEffect(() => {
    loadRealData();
    return onRealDataChange(() => setDataVersion((v) => v + 1));
  }, []);

  const checkin = useMemo(() => todayCheckIn(), [version]);
  // dataVersion : l'arrivée des vraies données montre recalcule le triage et le plan (fusion RÉEL de Mouad).
  const t = useMemo(() => triage(DAY), [version, dataVersion]);
  const delay = lightTimeMin(DATE);
  // Valeur tabulée (JPL Horizons / test ROADMAP) → Publié ; approximation orbite circulaire → Hypothèse.
  const delayTag: Tag = lightTimeSource(DATE) === 'table' ? 'Publié' : 'H';
  const out = useMemo(() => router(t, POS, delay), [t, delay]);
  const plan = useMemo(() => planDay(DAY), [version, dataVersion]);
  const items: TodoItem[] = useMemo(() => plan.map((i) => ({ ...i, done: i.done || done.has(i.id) })), [plan, done]);
  const summary = useMemo(() => getSummary('hanche', DAY), []);
  const summaryAt = useMemo(() => new Date(new Date(DATE + 'T06:00:00').getTime() + delay * 60_000), [delay]);

  // Synchro montre : on pousse le plan à chaque recalcul, puis on récupère les coches toutes les 3 s.
  // Serveur joignable → il fait foi (remplacement), sauf pour les coches locales des 5 dernières secondes.
  const doneRef = useRef(done);
  doneRef.current = done;
  const pending = useRef(new Map<string, number>());
  useEffect(() => saveDone(done), [done]);
  useEffect(() => { pushTodo(plan.map((i) => ({ ...i, done: doneRef.current.has(i.id) }))); }, [plan]);
  useEffect(() => {
    let stop = false;
    let busy = false;
    let again = false; // un changement est arrivé pendant une synchro : on relance juste après
    const tick = async () => {
      if (stop || document.hidden) return;
      if (busy) { again = true; return; }
      busy = true;
      try {
        const up = await serverUp();
        const ids = up ? await pullDone() : null;
        if (stop) return;
        setSynced(up);
        if (!ids) return;
        const now = Date.now();
        for (const [id, at] of pending.current) if (now - at > LOCAL_WINDOW_MS) pending.current.delete(id);
        setDoneIds((s) => {
          const next = new Set(ids);
          for (const id of pending.current.keys()) { if (s.has(id)) next.add(id); else next.delete(id); }
          return next.size === s.size && [...next].every((id) => s.has(id)) ? s : next;
        });
      } finally {
        busy = false;
        if (again) { again = false; tick(); }
      }
    };
    const onVisible = () => { if (!document.hidden) tick(); };
    tick();
    const id = setInterval(tick, SYNC_MS);
    document.addEventListener('visibilitychange', onVisible);
    const off = onServerChange(['todo'], tick); // coche faite sur la montre → visible tout de suite
    return () => { stop = true; off(); clearInterval(id); document.removeEventListener('visibilitychange', onVisible); };
  }, []);

  const toggle = (id: string, d: boolean) => {
    pending.current.set(id, Date.now());
    setDoneIds((s) => { const n = new Set(s); if (d) n.add(id); else n.delete(id); return n; });
    setDone(id, d);
  };

  // Démo : efface check-in, coches (écran et montre) et import, puis recharge la page.
  const resetDemo = async () => {
    clearCheckIn(DAY);
    await Promise.all([...doneRef.current].map((id) => setDone(id, false)));
    pending.current.clear();
    saveDone(new Set());
    location.reload();
  };

  const dateLabel = new Date(DATE + 'T12:00:00').toLocaleDateString('en-US', { day: 'numeric', month: 'long', year: 'numeric' });

  return (
    <div className="sz-page wr-page">
      {/* La barre haute porte déjà le nom de l'onglet : le titre reste pour les lecteurs d'écran. */}
      <header className="wr-head">
        <h1 className="wr-sr-only">Today's plan</h1>
        <span className="wr-head__day">Day {DAY} · {dateLabel}</span>
        <span className="wr-head__clock sz-mono">Onboard time 07:00</span>
        <span className="sz-detail"> · Scott Kelly · en route to Mars</span>
      </header>

      <div className="wr-grid">
        {/* 1. La consigne d'abord (Maintenant puis Ensuite), toujours en haut. */}
        <NowNextCard triage={t} out={out} delayMin={delay} delayTag={delayTag} summary={summary} summaryReceivedAt={summaryAt} pending={!checkin} missionNow={MISSION_NOW} />
        {/* 2. Colonne gauche : check-in et montre. Colonne droite : la journée, puis le signal d'humeur. */}
        <div className="wr-main">
          <div className="wr-side">
            <CheckInCard day={DAY} done={checkin} />
            <LiveWidget dataVersion={dataVersion} />
          </div>
          <div className="wr-side">
            <TodoList items={items} onToggle={toggle} synced={synced} level={t.level} />
            <MoodCard key={version} />
          </div>
        </div>
      </div>
      {DEMO && (
        <footer className="wr-foot">
          <Btn kind="quiet" size="sm" onClick={resetDemo}>Reset demo</Btn>
        </footer>
      )}
    </div>
  );
}

async function serverUp(): Promise<boolean> {
  try {
    const r = await fetch('/api/health', { cache: 'no-store', signal: AbortSignal.timeout(HEALTH_TIMEOUT_MS) });
    return r.ok;
  } catch {
    return false;
  }
}
