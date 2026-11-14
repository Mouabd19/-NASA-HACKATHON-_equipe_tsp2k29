// Propriétaire : Ahmed (B). Page War Room — ROADMAP §1 (page 2) et §3.
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { Tag, TodoItem } from '../../types';
import { MISSION_TODAY, clearCheckIn, onCheckInChange, todayCheckIn } from '../../ingest/checkin';
import { loadRealData, onRealDataChange, getRealSeries } from '../../ingest/realData';
import { pullDone, pushTodo, setDone } from '../../ingest/todoSync';
import { triage } from '../../models/triage';
import { router } from '../../models/router';
import { planDay } from '../../models/planDay';
import { getSummary } from '../../content/summaries';
import { lightTimeMin, lightTimeSource } from '../../content/horizons';
import { CheckInCard } from './CheckInCard';
import { NowNextCard } from './NowNextCard';
import { TodoList } from './TodoList';
import { LiveWidget, WatchImport } from './LiveWidget';
import { Btn, Dot, T, fr } from './ui';
import './warroom.css';

const DAY = MISSION_TODAY;
const DATE = '2026-11-14'; // J94 (horizons.json : j0 = 2026-08-12)
const POS = 'MarsScenario' as const;
const SYNC_MS = 3000;
const LOCAL_WINDOW_MS = 5000; // une coche locale récente prime sur le serveur pendant 5 s
const STORE_KEY = `todo:J${DAY}`;
const HEALTH_TIMEOUT_MS = 2000;

// TEMPORAIRE (répétitions de la démo) : bouton « Réinitialiser » visible en dev ou avec ?demo. À retirer avant le rendu.
const DEMO = import.meta.env.DEV || new URLSearchParams(location.search).has('demo');

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
  const t = useMemo(() => triage(DAY), [version]);
  const delay = lightTimeMin(DATE);
  // Valeur tabulée (JPL Horizons / test ROADMAP) → [Publié] ; approximation orbite circulaire → [H].
  const delayTag: Tag = lightTimeSource(DATE) === 'table' ? 'Publié' : 'H';
  const out = useMemo(() => router(t, POS, delay), [t, delay]);
  const plan = useMemo(() => planDay(DAY), [version]);
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
    const tick = async () => {
      if (busy || stop || document.hidden) return;
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
      }
    };
    const onVisible = () => { if (!document.hidden) tick(); };
    tick();
    const id = setInterval(tick, SYNC_MS);
    document.addEventListener('visibilitychange', onVisible);
    return () => { stop = true; clearInterval(id); document.removeEventListener('visibilitychange', onVisible); };
  }, []);

  const toggle = (id: string, d: boolean) => {
    pending.current.set(id, Date.now());
    setDoneIds((s) => { const n = new Set(s); if (d) n.add(id); else n.delete(id); return n; });
    setDone(id, d);
  };

  // TEMPORAIRE : efface check-in, coches (écran et montre) et import, puis recharge la page.
  const resetDemo = async () => {
    clearCheckIn(DAY);
    await Promise.all([...doneRef.current].map((id) => setDone(id, false)));
    pending.current.clear();
    saveDone(new Set());
    location.reload();
  };

  const hasReal = getRealSeries('RestingHeartRate').length + getRealSeries('HeartRate').length > 0;

  const dateLabel = new Date(DATE + 'T12:00:00').toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });

  return (
    <main style={{ background: T.bg, color: T.text, fontFamily: T.fontText, minHeight: '100vh', WebkitFontSmoothing: 'antialiased' }}>
      <div style={{ maxWidth: 1440, margin: '0 auto', padding: '32px clamp(16px, 3vw, 32px) 48px', boxSizing: 'border-box' }}>
        <header style={{ display: 'flex', flexWrap: 'wrap', gap: '16px 32px', alignItems: 'flex-end', marginBottom: 32 }}>
          <div>
            <h1 style={{ fontFamily: T.fontDisplay, fontSize: 'clamp(24px, 2.4vw, 32px)', fontWeight: 600, letterSpacing: '-0.015em', lineHeight: 1.1, margin: 0 }}>
              Jour {DAY} · {dateLabel}
            </h1>
            <div style={{ fontSize: 15, color: T.textDim, marginTop: 8 }}>Haddad [Persona] · en route vers Mars</div>
          </div>
          <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 8, padding: '8px 16px', borderRadius: T.radius.pill, border: `1px solid ${T.border}`, background: T.panel }}>
            <Dot color={T.holo} size={6} />
            <span style={{ fontSize: 13, color: T.textDim }}>Lien Terre</span>
            <span style={{ fontSize: 15, fontWeight: 500, fontVariantNumeric: 'tabular-nums' }}>{fr(delay)} min</span>
            <span style={{ fontSize: 13, color: T.textMuted }}>[{delayTag}]</span>
          </div>
        </header>

        <div style={{ display: 'grid', gap: 16 }}>
          {/* 1. La consigne d'abord (Maintenant puis Ensuite), toujours en haut. */}
          <NowNextCard triage={t} out={out} delayMin={delay} delayTag={delayTag} summary={summary} summaryReceivedAt={summaryAt} pending={!checkin} missionNow={MISSION_NOW} />
          {/* 2. Colonne gauche : check-in et montre. Colonne droite : la journée. */}
          <div className="wr-main">
            <div className="wr-side">
              <CheckInCard day={DAY} done={checkin} />
              <LiveWidget dataVersion={dataVersion} />
              <WatchImport hasData={hasReal} onImported={() => setDataVersion((v) => v + 1)} />
            </div>
            <TodoList items={items} onToggle={toggle} synced={synced} level={t.level} />
          </div>
        </div>
        {DEMO && (
          <Btn kind="secondary" onClick={resetDemo} style={{ position: 'fixed', right: 16, bottom: 16, zIndex: 10, border: `1px solid ${T.borderStrong}` }}>
            Réinitialiser la démo
          </Btn>
        )}
        <footer style={{ marginTop: 32, fontSize: 13, color: T.textMuted }}>Mission simulée · check-in et montre réels</footer>
      </div>
    </main>
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
