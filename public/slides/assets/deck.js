/* TriFlow · moteur du deck : mise à l'échelle, navigation, versions 4/5/7 min et C,
   notes, chrono, plan, fenêtre présentateur. JS sans dépendance, marche en file://. */
(function () {
  'use strict';
  const q = new URLSearchParams(location.search);
  const PRESENTER = q.has('presenter');
  const STATIC = q.get('static') === '1';
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)');
  const MODES = { '5': '5 min version' }; // Steve : une seule version, 5 min
  const TARGET = { '5': '5:00' };
  const NOTES = window.SZ_NOTES || {};
  const { figs, builds } = window.SZ_SLIDES;

  const $ = (s, r = document) => r.querySelector(s);
  const slides = Array.from(document.querySelectorAll('.slide'));
  const byId = (id) => slides.find((s) => s.dataset.id === String(id));

  let mode = '5';
  let cur = null;
  let run = null;
  let t0 = null;          // départ du chrono (Date.now())
  let presWin = null;

  /* ---------------- Séquence selon la version ---------------- */
  function inMode(s, m = mode) {
    const only = s.dataset.modes ? s.dataset.modes.split(' ') : null;
    if (only && !only.includes(m)) return false;
    const skip = s.dataset.skip ? s.dataset.skip.split(' ') : [];
    return !skip.includes(m);
  }
  const seq = () => slides.filter((s) => inMode(s));
  function step(dir) {
    const i = slides.indexOf(cur);
    for (let j = i + dir; j >= 0 && j < slides.length; j += dir) if (inMode(slides[j])) return slides[j];
    return null;
  }

  /* ---------------- Animation : un « run » par entrée de slide ---------------- */
  const EASE = {
    linear: (t) => t,
    out: (t) => (t === 1 ? 1 : 1 - Math.pow(2, -10 * t)),
    inOut: (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2),
  };
  class Run {
    constructor(instant) { this.instant = instant; this.anims = []; this.timers = []; this.rafs = new Set(); this.finals = []; this.dead = false; this.pending = null; }
    set(fn) { if (!this.instant) fn(); }
    /** Suite de l'animation lancée au prochain appui « suivante » au lieu de changer de slide. */
    hold(fn) { if (!this.instant) this.pending = fn; }
    final(fn) { this.finals.push(fn); }
    a(node, kf, o = {}) {
      if (!node || this.instant) return null;
      const an = node.animate(kf, { duration: o.d ?? 500, delay: o.delay ?? 0, easing: o.e ?? 'cubic-bezier(0.16, 1, 0.3, 1)', fill: o.fill ?? 'both' });
      this.anims.push(an);
      return an;
    }
    at(ms, fn) {
      if (this.instant) return;
      this.timers.push(setTimeout(() => { if (!this.dead) fn(); }, ms));
    }
    tween({ delay = 0, d = 500, e = 'out', step }) {
      if (this.instant) return;
      const ease = typeof e === 'function' ? e : EASE[e] || EASE.out;
      const start = performance.now() + delay;
      const tick = (now) => {
        if (this.dead) return;
        const k = Math.min(1, Math.max(0, (now - start) / d));
        if (now >= start) step(ease(k));
        if (k < 1) { const id = requestAnimationFrame((n) => { this.rafs.delete(id); tick(n); }); this.rafs.add(id); }
      };
      const id = requestAnimationFrame((n) => { this.rafs.delete(id); tick(n); });
      this.rafs.add(id);
    }
    finish() { if (this.instant) this.finals.forEach((f) => f()); }
    kill() {
      this.dead = true;
      this.anims.forEach((a) => a.cancel());
      this.timers.forEach(clearTimeout);
      this.rafs.forEach(cancelAnimationFrame);
    }
  }

  function enter(s, { instant }) {
    if (run) run.kill();
    run = new Run(instant);
    const b = builds[s.dataset.id];
    if (b) b(run, s);
    run.finish();
  }

  /* ---------------- Affichage ---------------- */
  function label(s) {
    const id = s.dataset.id;
    // Steve : numérotation par position (des slides ont été retirées ou ajoutées).
    if (/^\d+$/.test(id)) { const nums = slides.filter((x) => /^\d+$/.test(x.dataset.id) && !x.hasAttribute('data-nonum')); const i = nums.indexOf(s); return i < 0 ? '' : `${i + 1} / ${nums.length}`; }
    if (s.hasAttribute('data-demo')) return 'Demo';
    if (s.hasAttribute('data-annex')) return 'Appendix ' + id.slice(0, 2).toUpperCase();
    return '';
  }
  function go(s, { dir = 1, instant = false } = {}) {
    if (!s) return;
    const prev = cur;
    if (prev && prev !== s) prev.classList.remove('is-current', 'is-entering');
    cur = s;
    s.classList.add('is-current');
    // Steve : pas d'animation, tout le contenu de la slide s'affiche d'un coup.
    enter(s, { instant: true });
    $('#num').style.display = s.hasAttribute('data-nonum') ? 'none' : '';
    $('#num').innerHTML = label(s) + (false && label(s) ? `<span class="mode">${MODES[mode]}</span>` : '');
    document.title = `${label(s) || 'TriFlow'} · ${s.dataset.title} · TriFlow`;
    if (!STATIC) history.replaceState(null, '', urlFor(s.dataset.id));
    renderNotes();
    renderTimer();
    if ($('#overview').classList.contains('on')) renderOverview();
    syncPresenter();
  }
  function urlFor(id, extra = {}) {
    const p = new URLSearchParams();

    p.set('slide', id);
    for (const k in extra) p.set(k, extra[k]);
    return location.pathname + '?' + p.toString();
  }
  const next = () => {
    startClock();
    if (run && run.pending) { const f = run.pending; run.pending = null; f(); return; }
    const n = step(1); if (n) go(n, { dir: 1 });
  };
  const prev = () => { const p = step(-1); if (p) go(p, { dir: -1 }); };
  // R relance aussi les vidéos de la slide depuis le début.
  const restartVideos = (s) => s.querySelectorAll('video').forEach(v => {
    v.currentTime = 0;
    const p = v.play(); if (p && p.catch) p.catch(() => {});
  });
  const replay = () => { if (!cur) return; go(cur, { dir: 1 }); restartVideos(cur); };

  /* ---------------- Mise à l'échelle 16:9 ---------------- */
  function fit() {
    const k = Math.min(window.innerWidth / 1920, window.innerHeight / 1080);
    $('#stage').style.transform = `translate(-50%, -50%) scale(${k})`;
  }

  /* ---------------- Notes orateur ---------------- */
  function notesFor(s, m = mode) {
    const n = (NOTES[m] || {})[s.dataset.id];
    return n && n.length ? n : null;
  }
  function notesHTML(s) {
    const blocks = notesFor(s);
    if (!blocks) {
      return `<p class="do">${s.hasAttribute('data-annex') ? 'Appendix: show only if asked.' : 'No script for this slide in this version: continues the previous block.'}</p>`;
    }
    const esc = (t) => t.replace(/&/g, '&amp;').replace(/</g, '&lt;');
    return blocks.map((b) => `<div class="blk"><div class="hd"><b>${esc(b.who)}</b><span>${b.start} → ${b.end}</span><span>${esc(b.code)} · ${esc(b.title)}</span></div>` +
      b.lines.map((l) => `<p class="${l.k}">${esc(l.t)}</p>`).join('') + '</div>').join('');
  }
  function renderNotes() {
    const n = $('#notes');
    if (n.classList.contains('on') && cur) n.innerHTML = notesHTML(cur);
  }

  /* ---------------- Chrono ---------------- */
  const fmt = (ms) => { const s = Math.max(0, Math.round(ms / 1000)); return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`; };
  const parse = (t) => { const [m, s] = t.split(':').map(Number); return (m * 60 + s) * 1000; };
  function startClock() { if (t0 === null) { t0 = Date.now(); syncPresenter(); } }
  function plannedFor(s) { const b = notesFor(s); return b ? b[0].start : null; }
  function timerLine() {
    const el = t0 === null ? 0 : Date.now() - t0;
    const plan = cur && plannedFor(cur);
    let pl = `objectif ${TARGET[mode]}`;
    let late = false;
    if (plan && t0 !== null) {
      const delta = el - parse(plan);
      late = delta > 10000;
      pl = `planned ${plan} · ${delta >= 0 ? '+' : '−'}${fmt(Math.abs(delta))} · target ${TARGET[mode]}`;
    } else if (plan) pl = `planned ${plan} · target ${TARGET[mode]}`;
    return { el: t0 === null ? '0:00' : fmt(el), pl, late };
  }
  function renderTimer() {
    const t = $('#timer');
    if (!t.classList.contains('on')) return;
    const l = timerLine();
    t.querySelector('.el').textContent = l.el;
    t.querySelector('.pl').innerHTML = l.late ? `<span class="late">${l.pl}</span>` : l.pl;
  }
  setInterval(renderTimer, 500);

  /* ---------------- Toast, plan, aide ---------------- */
  let toastT;
  function toast(msg) {
    const t = $('#toast'); t.textContent = msg; t.classList.add('on');
    clearTimeout(toastT); toastT = setTimeout(() => t.classList.remove('on'), 2200);
  }
  function renderOverview() {
    const o = $('#overview');
    const items = slides.filter((s) => !s.dataset.modes || s.dataset.modes.split(' ').includes(mode));
    o.innerHTML = `<h2>All slides · ${MODES[mode]}</h2><p>Struck through: skipped in this version. Esc to close.</p><ol>` +
      items.map((s) => `<li class="${inMode(s) ? '' : 'skip'} ${s === cur ? 'cur' : ''}"><button data-go="${s.dataset.id}"><span class="n">${label(s).replace(/ \/ \d+$/, '') || '·'}</span><span>${s.dataset.title}</span></button></li>`).join('') + '</ol>';
  }
  function toggle(id, force) {
    const n = $(id); const on = force ?? !n.classList.contains('on');
    n.classList.toggle('on', on);
    return on;
  }
  function setMode(m) {
    mode = m;
    const skipped = slides.filter((s) => /^\d+$/.test(s.dataset.id) && !inMode(s)).map((s) => s.dataset.id);
    toast(`${MODES[m]}${skipped.length ? ' · skipped slides: ' + skipped.join(', ') : ''}`);
    if (cur) go(cur, { instant: true });
  }

  /* ---------------- Fenêtre présentateur ---------------- */
  function syncPresenter() {
    if (!presWin || presWin.closed || !cur) return;
    const n = step(1);
    presWin.postMessage({ type: 'sz-state', id: cur.dataset.id, mode, t0, next: n ? n.dataset.id : null }, '*');
  }
  function openPresenter() {
    presWin = window.open(location.pathname + '?presenter=1', 'sz-presenter', 'width=1280,height=800');
    setTimeout(syncPresenter, 600);
  }
  window.addEventListener('message', (e) => {
    const m = e.data || {};
    if (m.type === 'sz-cmd') {
      if (m.cmd === 'next') next(); else if (m.cmd === 'prev') prev(); else if (m.cmd === 'replay') replay();
      else if (m.cmd === 'reset') { t0 = null; renderTimer(); syncPresenter(); }
      else if (m.cmd === 'hello') { presWin = e.source; syncPresenter(); }
    }
  });

  /* ---------------- Clavier, souris ---------------- */
  let digits = '';
  function onKey(e) {
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    const k = e.key;
    if (/^[0-9]$/.test(k) && !(k === '0' && digits === '')) { digits += k; toast('Go to slide ' + digits + ' (Enter)'); return; }
    if (k === 'Enter' && digits) { const s = byId(digits); digits = ''; if (s) go(s, { dir: 1 }); e.preventDefault(); return; }
    digits = '';
    switch (k) {
      case 'ArrowRight': case 'ArrowDown': case 'PageDown': case ' ': case 'Enter': e.preventDefault(); next(); break;
      case 'ArrowLeft': case 'ArrowUp': case 'PageUp': case 'Backspace': e.preventDefault(); prev(); break;
      case 'Home': go(seq()[0], { dir: -1 }); break;
      case 'End': go(byId('13'), { dir: -1 }); break;
      case 'n': case 'N': toggle('#notes') && renderNotes(); break;
      case 't': case 'T': startClock(); toggle('#timer') && renderTimer(); break;
      case '0': t0 = null; toast('Timer reset, restarts on the next slide'); renderTimer(); syncPresenter(); break;

      case 'o': case 'O': if (toggle('#overview')) renderOverview(); break;
      case 'p': case 'P': openPresenter(); break;
      case 'f': case 'F': if (document.fullscreenElement) document.exitFullscreen(); else document.documentElement.requestFullscreen().catch(() => {}); break;
      case 'r': case 'R': replay(); break;
      case '?': case 'h': case 'H': toggle('#help'); break;
      case 'Escape': ['#overview', '#help', '#notes'].forEach((id) => toggle(id, false)); break;
      default: return;
    }
  }

  /* ---------------- Vue présentateur ---------------- */
  function presenterMain() {
    document.body.classList.add('presenter');
    document.title = 'Presenter · TriFlow';
    const opener = window.opener;
    const send = (cmd) => opener && opener.postMessage({ type: 'sz-cmd', cmd }, '*');
    let state = null, lastNext = null;
    window.addEventListener('message', (e) => {
      if (!e.data || e.data.type !== 'sz-state') return;
      state = e.data; mode = state.mode; t0 = state.t0;
      const s = byId(state.id); cur = s;
      $('#pnow').innerHTML = `<b>${label(s) || '·'}</b>${s.dataset.title} · ${MODES[mode]}`;
      $('#pnotes').innerHTML = notesHTML(s);
      const nx = state.next ? byId(state.next) : null;
      $('#pnexttitle').textContent = nx ? `${label(nx)} · ${nx.dataset.title}` : 'Fin';
      if (state.next !== lastNext) {
        lastNext = state.next;
        $('#pnext').src = state.next ? urlFor(state.next, { static: 1 }) : 'about:blank';
      }
      tick();
    });
    const tick = () => {
      if (!state) return;
      const l = timerLine();
      $('#pclock').textContent = l.el;
      $('#pplan').innerHTML = l.late ? `<span class="late" style="color:var(--amber)">${l.pl}</span>` : l.pl;
    };
    setInterval(tick, 500);
    document.querySelectorAll('#pres button').forEach((b) => b.addEventListener('click', () => send(b.dataset.cmd)));
    document.addEventListener('keydown', (e) => {
      if (['ArrowRight', 'ArrowDown', 'PageDown', ' '].includes(e.key)) { e.preventDefault(); send('next'); }
      if (['ArrowLeft', 'ArrowUp', 'PageUp'].includes(e.key)) { e.preventDefault(); send('prev'); }
      if (e.key === 'r' || e.key === 'R') send('replay');
    });
    send('hello');
    if (!opener) $('#pnotes').innerHTML = '<p class="do">Ouvrez cette vue avec la touche P depuis le deck.</p>';
  }

  /* ---------------- Démarrage ---------------- */
  function init() {
    document.querySelectorAll('svg[data-fig]').forEach((svg) => figs[svg.dataset.fig](svg));
    if (PRESENTER) { presenterMain(); return; }
    fit();
    window.addEventListener('resize', fit);
    document.addEventListener('keydown', onKey);
    $('#viewport').addEventListener('click', (e) => { if (e.button === 0) next(); });
    $('#viewport').addEventListener('contextmenu', (e) => { e.preventDefault(); prev(); });
    $('#overview').addEventListener('click', (e) => {
      const b = e.target.closest('[data-go]');
      if (b) { toggle('#overview', false); go(byId(b.dataset.go), { dir: 1 }); }
      else if (e.target.id === 'overview') toggle('#overview', false);
    });
    if (q.get('notes') === '1') toggle('#notes', true);
    const start = byId(q.get('slide')) || seq()[0];
    go(start, { dir: 1 });
    if (!STATIC && !q.get('slide')) toast('Touche ? pour l\'aide · N : notes · T : chrono');
  }
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(init); else init();
})();
