/* TriFlow · contenu animé des slides.
   figs : dessine les figures SVG une fois au chargement (données de assets/data.js).
   builds : animation de construction de chaque slide. `run` vient de deck.js ;
   en mode statique ou mouvement réduit, run est « instantané » et chaque build pose son état final. */
(function () {
  'use strict';
  const NS = 'http://www.w3.org/2000/svg';
  const D = window.SZ_DATA;

  function el(tag, attrs, parent, text) {
    const n = document.createElementNS(NS, tag);
    for (const k in attrs || {}) n.setAttribute(k, attrs[k]);
    if (text != null) n.textContent = text;
    if (parent) parent.appendChild(n);
    return n;
  }
  const fr = (v, d = 1) => v.toFixed(d).replace('.', ',');

  /* ------------------------------------------------------------------ */
  /* Géométrie partagée Terre – Mars (slides 1, 10, 13) : Terre à gauche, toujours. */
  const LINK = { ex: 180, mx: 1740, y: 640, er: 22, mr: 13 };
  const EARTH_EDGE = LINK.ex + LINK.er + 10;
  const MARS_EDGE = LINK.mx - LINK.mr - 10;

  function pulse(svg, id) {
    const g = el('g', { class: 'pulse', opacity: 0 }, svg);
    const grad = el('linearGradient', { id, x1: 0, x2: 1, y1: 0, y2: 0 }, el('defs', {}, g));
    el('stop', { offset: '0', 'stop-color': '#E6E8EB', 'stop-opacity': 0 }, grad);
    el('stop', { offset: '1', 'stop-color': '#E6E8EB', 'stop-opacity': 0.9 }, grad);
    const tail = el('rect', { x: -90, y: -1.5, width: 90, height: 3, fill: `url(#${id})` }, g);
    el('circle', { r: 7, fill: '#E6E8EB' }, g);
    return { g, tail };
  }
  function placePulse(p, x, dir) {
    p.g.setAttribute('transform', `translate(${x} ${LINK.y}) scale(${dir} 1)`);
  }

  const figs = {
    link(svg) {
      const ship = svg.hasAttribute('data-ship');
      el('line', { class: 'track', x1: EARTH_EDGE, x2: MARS_EDGE, y1: LINK.y, y2: LINK.y }, svg);
      el('line', { class: 'lit up', x1: EARTH_EDGE, x2: MARS_EDGE, y1: LINK.y, y2: LINK.y, stroke: '#959CA6' }, svg);
      el('line', { class: 'lit down', x1: MARS_EDGE, x2: EARTH_EDGE, y1: LINK.y, y2: LINK.y, style: 'stroke:#E6E8EB' }, svg);
      el('circle', { class: 'ring-e', cx: LINK.ex, cy: LINK.y, r: LINK.er, fill: 'none', stroke: '#7F9AB0', 'stroke-width': 2, opacity: 0 }, svg);
      el('circle', { class: 'ring-m', cx: LINK.mx, cy: LINK.y, r: LINK.mr, fill: 'none', stroke: '#B0714A', 'stroke-width': 2, opacity: 0 }, svg);
      el('circle', { cx: LINK.ex, cy: LINK.y, r: LINK.er, fill: '#7F9AB0' }, svg);
      el('circle', { cx: LINK.mx, cy: LINK.y, r: LINK.mr, fill: '#B0714A' }, svg);
      el('text', { x: LINK.ex, y: LINK.y + 72, 'text-anchor': 'middle', 'font-size': 28 }, svg, 'Terre');
      el('text', { x: LINK.mx, y: LINK.y + 72, 'text-anchor': 'middle', 'font-size': 28 }, svg, 'Mars');
      // Slide 13 (data-ship) : plus de point « Kelly » sur la ligne. Placé à 45 % du trajet, il suggérait
      // ≈ 5 min de délai alors que l'app prend 11,0 min (majorant Terre–Mars). Retour du jury du 15/11.
      if (!ship) {
        el('text', { class: 'lbl-q', x: 960, y: LINK.y - 28, 'text-anchor': 'middle', 'font-size': 28 }, svg, 'la question');
        el('text', { class: 'lbl-r', x: 960, y: LINK.y + 52, 'text-anchor': 'middle', 'font-size': 28, class: 'lbl-r t-text' }, svg, 'la réponse');
      }
      svg._pulse = pulse(svg, 'pg-' + (ship ? 13 : 1));
    },

    mission(svg) {
      const X = (d) => 120 + d * (1680 / 860), Y = 780;
      el('line', { class: 'proj', x1: X(94), x2: X(860), y1: Y, y2: Y, stroke: '#69707B', 'stroke-width': 3, 'stroke-dasharray': '2 10', 'stroke-linecap': 'round' }, svg);
      el('line', { class: 'done', x1: X(0), x2: X(94), y1: Y, y2: Y, stroke: '#E6E8EB', 'stroke-width': 6, 'stroke-linecap': 'round' }, svg);
      // Phases
      [[0, 'Outbound, 210 d'], [210, 'On Mars, 500 d'], [710, 'Return, 150 d']].forEach(([d, t]) =>
        el('text', { x: X(d) + 12, y: Y - 22, 'font-size': 22, class: 't-muted' }, svg, t));
      // Événements
      const ev = [[0, 'D0', 'launch', 'start'], [210, 'D210', 'Sol 0, arrival', 'start'], [710, 'D710', 'leaving Mars', 'start'], [860, 'D860', 'return', 'end']];
      ev.forEach(([d, a, b, anchor]) => {
        el('line', { x1: X(d), x2: X(d), y1: Y - 12, y2: Y + 12, stroke: '#959CA6', 'stroke-width': 2 }, svg);
        const dx = anchor === 'end' ? 0 : 0;
        el('text', { x: X(d) + dx, y: Y + 56, 'text-anchor': anchor, 'font-size': 28, class: 't-text', 'font-weight': 500 }, svg, a);
        el('text', { x: X(d) + dx, y: Y + 92, 'text-anchor': anchor, 'font-size': 24 }, svg, b);
      });
      // Curseur « aujourd'hui »
      const cur = el('g', { class: 'cursor' }, svg);
      el('line', { x1: 0, x2: 0, y1: -110, y2: 14, stroke: '#E6E8EB', 'stroke-width': 2 }, cur);
      el('circle', { cx: 0, cy: 0, r: 10, fill: '#E6E8EB' }, cur);
      el('text', { class: 'cnt', x: 0, y: -128, 'text-anchor': 'middle', 'font-size': 48, 'font-weight': 500, class: 'cnt t-text' }, cur, 'D94');
      el('text', { x: 0, y: 56, 'text-anchor': 'middle', 'font-size': 24, class: 't-dim' }, cur, 'today');
      cur.setAttribute('transform', `translate(${X(94)} ${Y})`);
      // Compte à rebours vers Sol 0
      const mars = el('text', { class: 'mars', x: X(210), y: Y - 128, 'font-size': 36, class: 'mars t-text', 'font-weight': 500 }, svg);
      mars.innerHTML = 'Mars in <tspan class="n">116</tspan> days';
      el('line', { x1: X(210), x2: X(210), y1: Y - 110, y2: Y - 12, stroke: '#39404B', 'stroke-width': 2 }, svg);
      svg._X = X; svg._Y = Y;
    },

    gauge(svg) {
      const X = (p) => 200 + (100 - p) * 90, Y = 640;
      el('text', { x: X(100), y: Y + 120, 'font-size': 26 }, svg, 'Densité osseuse de la hanche, % du pré-vol');
      el('line', { x1: X(100), x2: X(90), y1: Y, y2: Y, stroke: '#39404B', 'stroke-width': 4 }, svg);
      el('line', { class: 'zone', x1: X(95), x2: X(90), y1: Y, y2: Y, stroke: '#E5544B', 'stroke-width': 4 }, svg);
      for (let p = 100; p >= 90; p--) {
        const major = p % 5 === 0;
        el('line', { x1: X(p), x2: X(p), y1: Y - (major ? 14 : 8), y2: Y + (major ? 14 : 8), stroke: '#69707B', 'stroke-width': 2 }, svg);
        if (major) el('text', { x: X(p), y: Y + 62, 'text-anchor': 'middle', 'font-size': 30, class: p === 95 ? 't-red' : 't-dim' }, svg, p + '%');
      }
      // Kelly à J94
      const h = el('g', { class: 'haddad' }, svg);
      el('circle', { cx: X(98.01), cy: Y, r: 11, fill: '#E6E8EB' }, h);
      el('text', { x: X(98.01), y: Y - 34, 'text-anchor': 'middle', 'font-size': 26, class: 't-text' }, h, 'Kelly, J94 · 98,0 %');
      // Ligne rouge et renvoi vers la citation
      el('line', { class: 'redline', x1: X(95), x2: X(95), y1: 420, y2: Y + 30, stroke: '#E5544B', 'stroke-width': 4, pathLength: 1 }, svg);
      el('polyline', { class: 'leader', points: `${X(95)},420 1196,420`, fill: 'none', stroke: '#69707B', 'stroke-width': 1.5, pathLength: 1 }, svg);
      const fo = el('foreignObject', { class: 'quote', x: 1220, y: 392, width: 600, height: 300 }, svg);
      fo.innerHTML = '<div xmlns="http://www.w3.org/1999/xhtml" style="font-size:30px;line-height:1.38;color:#E6E8EB;letter-spacing:-0.005em">« Countermeasures shall maintain bone mineral density of the hip and spine at or above 95% of pre-mission values… »<div style="margin-top:18px;font-size:22px;color:#959CA6">NASA-STD-3001 Vol. 1 Rév. C · V1 4027</div></div>';
      // Étiquettes de provenance
      const tags = [['[NASA]', 'norme NASA'], ['[Publié]', 'étude publiée'], ['[H]', 'hypothèse de l\'équipe'], ['[Persona]', 'personnage fictif']];
      let x = 120;
      tags.forEach(([t, d]) => {
        const g = el('g', { class: 'ptag' }, svg);
        const a = el('text', { x, y: 890, 'font-size': 32, class: 't-text', 'font-weight': 500 }, g, t);
        const b = el('text', { x: x + a.getComputedTextLength() + 14, y: 890, 'font-size': 28 }, g, d);
        x += a.getComputedTextLength() + 14 + b.getComputedTextLength() + 64;
      });
    },

    router(svg) {
      const Y = 800, E = 180;
      const NX = [420, 676, 932, 1188, 1444, 1700];
      const STOPS = [
        ['ISS', '< 1 s', 'Médecin au sol', '≈ 30 min', '< 1 s'],
        ['Lune', '1,3 s', 'Médecin au sol', '≈ 30 min', '1,3 s'],
        ['Mars proche', '3,0 min', 'Médecin au sol', '≈ 36 min', '3,0 min'],
        ['Mars aujourd\'hui', '11,0 min', 'Médecin au sol', '≈ 52 min', '11,0 min'],
        ['Mars au plus loin', '22,3 min', 'Médecin au sol', '≈ 75 min', '22,3 min'],
        ['Conjonction', 'pas de lien', 'CMO de bord', 'dès que le lien revient', 'pas de lien'],
      ];
      el('line', { x1: E, x2: NX[5], y1: Y, y2: Y, stroke: '#252A32', 'stroke-width': 2 }, svg);
      const link = el('line', { class: 'link', x1: E + 30, x2: NX[3], y1: Y, y2: Y, stroke: '#959CA6', 'stroke-width': 3 }, svg);
      el('circle', { cx: E, cy: Y, r: 20, fill: '#7F9AB0' }, svg);
      el('text', { x: E, y: Y + 62, 'text-anchor': 'middle', 'font-size': 26 }, svg, 'Terre');
      const labels = [], delays = [];
      STOPS.forEach((s, i) => {
        el('line', { x1: NX[i], x2: NX[i], y1: Y - 10, y2: Y + 10, stroke: '#39404B', 'stroke-width': 2 }, svg);
        labels.push(el('text', { x: NX[i], y: Y + 62, 'text-anchor': 'middle', 'font-size': 26, class: 't-muted' }, svg, s[0]));
        delays.push(el('text', { x: NX[i], y: Y - 34, 'text-anchor': 'middle', 'font-size': 26, class: 't-muted' }, svg, s[1]));
      });
      const ship = el('g', { class: 'shipm' }, svg);
      el('circle', { r: 12, fill: '#E6E8EB' }, ship);
      svg._r = { Y, E, NX, STOPS, link, ship, labels, delays };
    },

    bone(svg) {
      const X0 = 220, X1 = 1420, Y0 = 330, Y1 = 870, P0 = 100, P1 = 88;
      const X = (d) => X0 + (d / 860) * (X1 - X0);
      const Y = (p) => Y0 + ((P0 - p) / (P0 - P1)) * (Y1 - Y0);
      const defs = el('defs', {}, svg);
      const clip = (id) => { const c = el('clipPath', { id }, defs); return el('rect', { x: X0 - 10, y: 0, width: 1920, height: 1080 }, c); };
      svg._clips = { m: clip('cm'), c: clip('cc'), p: clip('cp') };
      // Grille et axes
      [100, 90].forEach((p) => {
        el('line', { class: 'grid', x1: X0, x2: X1, y1: Y(p), y2: Y(p) }, svg);
        el('text', { x: X0 - 20, y: Y(p) + 9, 'text-anchor': 'end', 'font-size': 26 }, svg, p + '%');
      });
      el('line', { class: 'limit', x1: X0, x2: X1, y1: Y(95), y2: Y(95) }, svg);
      el('text', { x: X0 - 20, y: Y(95) + 9, 'text-anchor': 'end', 'font-size': 26, class: 't-red' }, svg, '95%');
      el('text', { x: X0 + 12, y: Y(95) + 40, 'font-size': 24, class: 't-red' }, svg, 'NASA limit');
      [[94, 'today', 't-text'], [210, 'Sol 0', 't-dim']].forEach(([d, t, c]) => {
        el('line', { x1: X(d), x2: X(d), y1: Y0, y2: Y1, stroke: '#252A32', 'stroke-width': 1.5 }, svg);
        el('text', { x: X(d) + 10, y: Y0 + 30, 'font-size': 24, class: c }, svg, t);
      });
      el('text', { x: X0, y: Y1 + 44, 'font-size': 24 }, svg, 'D0');
      el('text', { x: X(94), y: Y1 + 44, 'text-anchor': 'middle', 'font-size': 24, class: 't-text' }, svg, 'D94');
      el('text', { x: X(210), y: Y1 + 44, 'text-anchor': 'middle', 'font-size': 24 }, svg, 'D210');
      el('text', { x: X(860), y: Y1 + 44, 'text-anchor': 'end', 'font-size': 24 }, svg, 'D860');
      el('text', { x: X0, y: Y0 - 54, 'font-size': 24 }, svg, 'Hip bone density, % of pre-flight');
      el('text', { x: X1, y: Y0 - 54, 'text-anchor': 'end', 'font-size': 22, class: 't-muted' }, svg, 'solid: estimated · dotted: projected · bar: 10–90%');

      // Bandes 10–90 % à J860 (modèle B)
      const band = (lo, hi, color, dx, cls) => {
        const g = el('g', { class: cls }, svg);
        const x = X(860) + dx, y1 = Y(100 - lo), y2 = Y(100 - hi);
        el('line', { x1: x, x2: x, y1, y2, stroke: color, 'stroke-width': 2.5 }, g);
        el('line', { x1: x - 8, x2: x + 8, y1, y2: y1, stroke: color, 'stroke-width': 2.5 }, g);
        el('line', { x1: x - 8, x2: x + 8, y1: y2, y2, stroke: color, 'stroke-width': 2.5 }, g);
        return g;
      };
      band(D.boneBand.current[0], D.boneBand.current[1], '#E5544B', 20, 'band band-c');
      band(D.boneBand.plan[0], D.boneBand.plan[1], '#E3A22E', 40, 'band band-p');

      const pts = D.bone;
      const path = (arr) => 'M' + arr.map(([d, p]) => `${X(d).toFixed(1)},${Y(p).toFixed(1)}`).join('L');
      const meas = pts.filter((r) => r[0] <= 94).map((r) => [r[0], 100 - r[1]]);
      // Passage sous 95 % (rythme actuel)
      let cross = 860;
      for (let i = 1; i < pts.length; i++) {
        if (pts[i - 1][1] < 5 && pts[i][1] >= 5) { const a = pts[i - 1], b = pts[i]; cross = a[0] + (b[0] - a[0]) * (5 - a[1]) / (b[1] - a[1]); break; }
      }
      const curAmber = pts.filter((r) => r[0] >= 94 && r[0] < cross).map((r) => [r[0], 100 - r[1]]).concat([[cross, 95]]);
      const curRed = [[cross, 95]].concat(pts.filter((r) => r[0] > cross).map((r) => [r[0], 100 - r[1]]));
      // Avec le plan, la règle de l'app (rules.ts boneColor) donne vert tant que la perte reste sous 3,75 %.
      const AMBER_LOSS = 3.75;
      let pcross = 860;
      for (let i = 1; i < pts.length; i++) {
        if (pts[i - 1][2] < AMBER_LOSS && pts[i][2] >= AMBER_LOSS) { const a = pts[i - 1], b = pts[i]; pcross = a[0] + (b[0] - a[0]) * (AMBER_LOSS - a[2]) / (b[2] - a[2]); break; }
      }
      const planGreen = pts.filter((r) => r[0] >= 94 && r[0] < pcross).map((r) => [r[0], 100 - r[2]]).concat([[pcross, 100 - AMBER_LOSS]]);
      const planAmber = [[pcross, 100 - AMBER_LOSS]].concat(pts.filter((r) => r[0] > pcross).map((r) => [r[0], 100 - r[2]]));
      const proj = { fill: 'none', 'stroke-width': 5, 'stroke-dasharray': '14 10', 'stroke-linejoin': 'round' };
      const gc = el('g', { 'clip-path': 'url(#cc)' }, svg);
      el('path', Object.assign({ d: path(curAmber), stroke: '#E3A22E' }, proj), gc);
      el('path', Object.assign({ d: path(curRed), stroke: '#E5544B' }, proj), gc);
      const gp = el('g', { 'clip-path': 'url(#cp)' }, svg);
      el('path', Object.assign({ d: path(planGreen), stroke: '#3DB46D' }, proj), gp);
      el('path', Object.assign({ d: path(planAmber), stroke: '#E3A22E' }, proj), gp);
      const gm = el('g', { 'clip-path': 'url(#cm)' }, svg);
      el('path', { d: path(meas), fill: 'none', stroke: '#E6E8EB', 'stroke-width': 5, 'stroke-linecap': 'round' }, gm);
      el('circle', { cx: X(94), cy: Y(100 - 1.99), r: 9, fill: '#E6E8EB' }, gm);

      // Valeurs finales, posées au bout des courbes
      const endC = 100 - pts[pts.length - 1][1], endP = 100 - pts[pts.length - 1][2];
      // Le chiffre « avec le plan » reste en blanc : l'ambre est réservé au trait (sinon on lit « le plan échoue »).
      const lab = (cls, y, big, color, cap, ink = color) => {
        const g = el('g', { class: cls }, svg);
        el('circle', { cx: X(860), cy: y, r: 9, fill: color }, g);
        el('text', { x: X1 + 64, y: y + 30, 'font-size': 88, 'font-weight': 500, style: `fill:${ink}`, 'letter-spacing': '-0.03em' }, g, big);
        el('text', { x: X1 + 66, y: y + 72, 'font-size': 24 }, g, cap);
        return g;
      };
      lab('end-c', Y(endC), '8.7%', '#E5544B', 'loss · current pace');
      lab('end-p', Y(endP), '4.2%', '#E3A22E', 'loss · with the plan', '#E6E8EB');
      svg._X = X; svg._cross = cross;
    },

    tail(svg) {
      // Zoom J700 → J860 de la courbe « avec le plan »
      const X0 = 200, X1 = 920, Y0 = 380, Y1 = 900, P0 = 97.5, P1 = 93.3;
      const X = (d) => X0 + ((d - 700) / 160) * (X1 - X0);
      const Y = (p) => Y0 + ((P0 - p) / (P0 - P1)) * (Y1 - Y0);
      const pts = D.bone.filter((r) => r[0] >= 700).map((r) => [r[0], 100 - r[2]]);
      [97, 96, 94].forEach((p) => {
        el('line', { class: 'grid', x1: X0, x2: X1, y1: Y(p), y2: Y(p) }, svg);
        el('text', { x: X0 - 20, y: Y(p) + 9, 'text-anchor': 'end', 'font-size': 24 }, svg, p + '%');
      });
      el('line', { class: 'limit', x1: X0, x2: X1 + 40, y1: Y(95), y2: Y(95) }, svg);
      el('text', { x: X0 - 20, y: Y(95) + 9, 'text-anchor': 'end', 'font-size': 24, class: 't-red' }, svg, '95%');
      el('text', { x: X0 + 12, y: Y(95) + 40, 'font-size': 24, class: 't-red' }, svg, 'NASA limit');
      el('text', { x: X0, y: Y1 + 44, 'font-size': 24 }, svg, 'J700');
      el('text', { x: X(860), y: Y1 + 44, 'text-anchor': 'middle', 'font-size': 24, class: 't-text' }, svg, 'D860');
      el('text', { x: X0, y: Y0 - 30, 'font-size': 24, class: 't-dim' }, svg, 'Hanche, avec le plan');
      el('path', { class: 'curve', d: 'M' + pts.map(([d, p]) => `${X(d).toFixed(1)},${Y(p).toFixed(1)}`).join('L'), fill: 'none', stroke: '#E3A22E', 'stroke-width': 5, 'stroke-dasharray': '14 10' }, svg);
      const lo = 100 - D.boneBand.plan[1], hi = 100 - D.boneBand.plan[0];
      const band = el('g', { class: 'band' }, svg);
      el('rect', { x: X(860) - 9, y: Y(hi), width: 18, height: Y(lo) - Y(hi), fill: 'none', stroke: '#E3A22E', 'stroke-width': 2, rx: 3 }, band);
      el('line', { x1: X(860) - 18, x2: X(860) + 18, y1: Y(hi), y2: Y(hi), stroke: '#E3A22E', 'stroke-width': 2 }, band);
      el('line', { x1: X(860) - 18, x2: X(860) + 18, y1: Y(lo), y2: Y(lo), stroke: '#E3A22E', 'stroke-width': 2 }, band);
      el('rect', { class: 'contact', x: X(860) - 9, y: Y(95), width: 18, height: Y(lo) - Y(95), fill: '#E5544B', rx: 3 }, svg);
      const dot = el('g', { class: 'enddot' }, svg);
      const end = pts[pts.length - 1][1];
      el('circle', { cx: X(860), cy: Y(end), r: 10, fill: '#E3A22E' }, dot);
      el('text', { x: X(860) - 40, y: Y(end) - 24, 'text-anchor': 'end', 'font-size': 30, class: 't-amber', 'font-weight': 500 }, dot, fr(end) + ' %');
      const bl = el('text', { class: 'bandlbl', x: X(860) - 30, y: Y(lo) + 8, 'text-anchor': 'end', 'font-size': 24 }, svg, 'fourchette basse : ' + fr(lo, 1) + ' %');
    },

    mood(svg) {
      const X0 = 280, X1 = 1380, Y0 = 400, Y1 = 860;
      const X = (d) => X0 + ((d - 27) / (94 - 27)) * (X1 - X0);
      const Y = (s) => Y1 - s * (Y1 - Y0);
      const defs = el('defs', {}, svg);
      const c = el('clipPath', { id: 'cmood' }, defs);
      svg._clip = el('rect', { x: 0, y: 0, width: 1920, height: 1080 }, c);
      [0, 1].forEach((s) => {
        el('line', { class: 'grid', x1: X0, x2: X1, y1: Y(s), y2: Y(s) }, svg);
        el('text', { x: X0 - 20, y: Y(s) + 9, 'text-anchor': 'end', 'font-size': 24 }, svg, s ? '1' : '0');
      });
      el('line', { x1: X0, x2: X1, y1: Y(D.moodThreshold), y2: Y(D.moodThreshold), stroke: '#69707B', 'stroke-width': 2, 'stroke-dasharray': '8 8' }, svg);
      el('text', { x: X0 - 20, y: Y(D.moodThreshold) + 9, 'text-anchor': 'end', 'font-size': 24 }, svg, 'seuil');
      el('text', { x: X0, y: Y1 + 44, 'font-size': 24 }, svg, 'J27 · premier score');
      el('text', { x: X1, y: Y1 + 44, 'text-anchor': 'end', 'font-size': 24 }, svg, 'D94');
      el('text', { x: X0, y: Y0 - 30, 'font-size': 24, class: 't-dim' }, svg, 'Score de glissement d\'humeur, comparé à sa propre référence (J0–J20)');
      const m1 = el('g', { class: 'mk-shift' }, svg);
      el('line', { x1: X(D.moodShift), x2: X(D.moodShift), y1: Y0 + 30, y2: Y1, stroke: '#69707B', 'stroke-width': 2 }, m1);
      el('text', { x: X(D.moodShift) - 14, y: Y0 + 58, 'text-anchor': 'end', 'font-size': 24 }, m1, 'J75 · glissement injecté par l\'équipe');
      const g = el('g', { 'clip-path': 'url(#cmood)' }, svg);
      el('path', { d: 'M' + D.mood.map(([d, s]) => `${X(d).toFixed(1)},${Y(s).toFixed(1)}`).join('L'), fill: 'none', stroke: '#E6E8EB', 'stroke-width': 4, 'stroke-linejoin': 'round' }, g);
      const sig = D.mood.find((r) => r[0] === D.moodSignal);
      const m2 = el('g', { class: 'mk-signal' }, svg);
      el('line', { x1: X(D.moodSignal), x2: X(D.moodSignal), y1: Y0 + 30, y2: Y1, stroke: '#E3A22E', 'stroke-width': 2 }, m2);
      el('circle', { cx: X(D.moodSignal), cy: Y(sig[1]), r: 10, fill: '#E3A22E' }, m2);
      const big = el('g', { class: 'big' }, svg);
      el('text', { x: 1470, y: 560, 'font-size': 120, 'font-weight': 500, class: 't-amber', 'letter-spacing': '-0.03em' }, big, 'J83');
      el('text', { x: 1474, y: 612, 'font-size': 28, class: 't-text' }, big, 'signal à regarder');
      el('text', { x: 1474, y: 652, 'font-size': 26 }, big, '8 jours après le début injecté');
      svg._X = X;
    },

    data(svg) {
      const tx = 1300;
      el('line', { class: 'track', x1: EARTH_EDGE, x2: tx - 16, y1: LINK.y, y2: LINK.y }, svg);
      el('line', { class: 'lit', x1: tx - 16, x2: EARTH_EDGE, y1: LINK.y, y2: LINK.y, style: 'stroke:#E6E8EB' }, svg);
      el('circle', { class: 'ring-e', cx: LINK.ex, cy: LINK.y, r: LINK.er, fill: 'none', stroke: '#7F9AB0', 'stroke-width': 2, opacity: 0 }, svg);
      el('circle', { cx: LINK.ex, cy: LINK.y, r: LINK.er, fill: '#7F9AB0' }, svg);
      el('text', { x: LINK.ex, y: LINK.y + 72, 'text-anchor': 'middle', 'font-size': 28 }, svg, 'Terre');
      el('text', { x: 1480, y: 880, 'text-anchor': 'middle', 'font-size': 28 }, svg, 'Scan du jour : reste à bord');
      const pk = el('g', { class: 'pk' }, svg);
      el('rect', { x: -8, y: -8, width: 16, height: 16, fill: '#E6E8EB', rx: 2 }, pk);
      const lb = el('text', { x: -8, y: -30, 'font-size': 32, 'font-weight': 500, class: 't-text' }, pk);
      lb.innerHTML = '4 Ko<tspan font-size="26" font-weight="400" class="t-dim" dx="14">mesures par organe</tspan>';
      pk.setAttribute('transform', `translate(${EARTH_EDGE + 30} ${LINK.y})`);
      svg._tx = tx;
    },
  };

  /* ------------------------------------------------------------------ */
  const E = { out: 'cubic-bezier(0.16, 1, 0.3, 1)', inOut: 'cubic-bezier(0.65, 0, 0.35, 1)' };
  const rise = (run, node, delay, d = 600, dy = 12) =>
    run.a(node, [{ opacity: 0, transform: `translateY(${dy}px)` }, { opacity: 1, transform: 'none' }], { d, delay });
  const fade = (run, node, delay, d = 400) => run.a(node, [{ opacity: 0 }, { opacity: 1 }], { d, delay });
  const draw = (run, node, delay, d = 600, e) => run.a(node, [{ strokeDasharray: '1 1', strokeDashoffset: 1 }, { strokeDasharray: '1 1', strokeDashoffset: 0 }], { d, delay, e });

  /** Lumière Terre ↔ Mars (slide 1). La lumière va à vitesse constante : easing linéaire. */
  function lightTrip(run, svg, { from, to, delay, d, dir, onStep }) {
    const p = svg._pulse;
    run.at(delay, () => p.g.setAttribute('opacity', 1));
    run.tween({ delay, d, e: 'linear', step: (k) => { placePulse(p, from + (to - from) * k, dir); onStep && onStep(k); } });
    run.at(delay + d, () => p.g.setAttribute('opacity', 0));
  }
  function ring(run, node, r0, r1, delay, d = 900) {
    run.a(node, [{ opacity: 0.8, r: r0 }, { opacity: 0, r: r1 }], { d, delay, e: E.out, fill: 'backwards' });
  }
  const mmss = (s) => [String(Math.floor(s / 60)).padStart(2, '0'), String(Math.floor(s % 60)).padStart(2, '0')];

  const LIGHT_MS = 6000;                          // Terre → Mars, slides 1 et 13
  const SPEED = (MARS_EDGE - EARTH_EDGE) / LIGHT_MS; // même vitesse sur la slide 10

  const builds = {
    '1'(run, s) {
      // Steve : « le corps s'use plus vite » — les trois chiffres apparaissent l'un après l'autre.
      s.querySelectorAll('.decline .it').forEach((it, i) => rise(run, it, 300 + i * 600, 700, 16));
    },
    '2'(run, s) { /* Steve : slide statique */ },
    '4'(run, s) {
      const svg = s.querySelector('svg'), X = svg._X, Y = svg._Y;
      const cur = svg.querySelector('.cursor'), done = svg.querySelector('.done');
      const cnt = svg.querySelector('.cnt'), n = svg.querySelector('.mars .n');
      const set = (d) => {
        cur.setAttribute('transform', `translate(${X(d)} ${Y})`);
        done.setAttribute('x2', X(d));
        cnt.textContent = 'J' + Math.round(d);
        n.textContent = String(210 - Math.round(d));
      };
      run.set(() => set(0));
      run.tween({ delay: 500, d: 2000, e: 'inOut', step: (k) => set(94 * k) });
      run.final(() => set(94));
    },

    '3'(run, s) { /* Steve : slide statique */ },
    '5'(run, s) {
      const svg = s.querySelector('svg');
      fade(run, svg.querySelector('.haddad'), 300, 500);
      draw(run, svg.querySelector('.redline'), 700, 700, E.inOut);
      fade(run, svg.querySelector('.zone'), 1200, 500);
      draw(run, svg.querySelector('.leader'), 1500, 500, E.inOut);
      rise(run, svg.querySelector('.quote'), 1900, 700, 8);
      svg.querySelectorAll('.ptag').forEach((t, i) => rise(run, t, 3400 + i * 500, 500, 8));
    },

    '6'(run, s) {
      const svg = s.querySelector('svg'), R = svg._r;
      const v = (k) => s.querySelector(`[data-k="${k}"]`);
      let at = 0;
      const place = (x) => { R.ship.setAttribute('transform', `translate(${x} ${R.Y})`); R.link.setAttribute('x2', x - 14); };
      const setStop = (i, animate) => {
        const st = R.STOPS[i];
        R.labels.forEach((l, j) => l.setAttribute('class', j === i ? 't-text' : 't-muted'));
        R.delays.forEach((l, j) => l.setAttribute('class', j === i ? 't-text' : 't-muted'));
        const conj = i === 5;
        R.link.setAttribute('stroke-dasharray', conj ? '6 10' : 'none');
        R.link.setAttribute('opacity', conj ? 0.45 : 1);
        [['delay', conj ? 'Lien Terre : coupé' : 'Délai Terre : ' + st[4]], ['who', st[2]], ['resp', st[3]]].forEach(([k, t]) => {
          const n = v(k);
          if (n.textContent !== t) { n.textContent = t; if (animate) run.a(n, [{ opacity: 0 }, { opacity: 1 }], { d: 260 }); }
        });
      };
      run.set(() => { place(R.NX[0]); setStop(0, false); });
      for (let i = 1; i < 6; i++) {
        const t = 1000 + (i - 1) * 1500;
        run.tween({ delay: t, d: 520, e: 'out', step: (k) => place(R.NX[i - 1] + (R.NX[i] - R.NX[i - 1]) * k) });
        run.at(t + 300, () => setStop(i, true));
      }
      run.final(() => { place(R.NX[5]); setStop(5, false); });
    },

    '7'(run, s) {
      const svg = s.querySelector('svg'), X = svg._X, C = svg._clips;
      const wTo = (r, d) => r.setAttribute('width', Math.max(0, X(d) - (+r.getAttribute('x'))));
      run.set(() => { wTo(C.m, 0); wTo(C.c, 94); wTo(C.p, 94); });
      run.tween({ delay: 400, d: 1100, e: 'inOut', step: (k) => wTo(C.m, 94 * k + 2) });
      const t2 = 1700, d2 = 2600;
      run.tween({ delay: t2, d: d2, e: 'inOut', step: (k) => wTo(C.c, 94 + 766 * k + 8) });
      rise(run, svg.querySelector('.end-c'), t2 + d2 - 100, 600, 8);
      const t3 = t2 + d2 + 900;
      run.tween({ delay: t3, d: 2000, e: 'inOut', step: (k) => wTo(C.p, 94 + 766 * k + 8) });
      rise(run, svg.querySelector('.end-p'), t3 + 1900, 600, 8);
      svg.querySelectorAll('.band').forEach((b) => fade(run, b, t3 + 2600, 800));
      run.final(() => { wTo(C.m, 100); wTo(C.c, 870); wTo(C.p, 870); });
    },

    '8'(run, s) {
      const svg = s.querySelector('svg');
      run.a(svg.querySelector('.curve'), [{ clipPath: 'inset(0 100% 0 0)' }, { clipPath: 'inset(0 0 0 0)' }], { d: 1000, delay: 300, e: E.inOut });
      fade(run, svg.querySelector('.enddot'), 1200, 400);
      run.a(svg.querySelector('.band'), [{ transform: 'scaleY(0)', opacity: 0 }, { transform: 'scaleY(1)', opacity: 1 }], { d: 700, delay: 1600, e: E.out });
      fade(run, svg.querySelector('.bandlbl'), 2000, 400);
      run.a(svg.querySelector('.contact'), [{ opacity: 0 }, { opacity: 1, offset: 0.3 }, { opacity: 0.55 }], { d: 900, delay: 2300, e: 'ease-out' });
      run.a(s.querySelector('.msg'), [{ opacity: 0, transform: 'translateX(-48px)' }, { opacity: 1, transform: 'none' }], { d: 700, delay: 3200 });
    },

    '9'(run, s) {
      const svg = s.querySelector('svg'), X = svg._X, clip = svg._clip;
      const set = (d) => clip.setAttribute('width', X(d) + 6);
      const t0 = 600, d = 4200, at = (day) => t0 + d * (day - 27) / (94 - 27);
      run.set(() => set(27));
      run.tween({ delay: t0, d, e: 'linear', step: (k) => set(27 + 67 * k) });
      fade(run, svg.querySelector('.mk-shift'), at(75), 400);
      fade(run, svg.querySelector('.mk-signal'), at(83), 300);
      rise(run, svg.querySelector('.big'), at(83) + 200, 700, 8);
      run.final(() => set(94));
    },

    '10'(run, s) {
      const svg = s.querySelector('svg'), tx = svg._tx;
      const pk = svg.querySelector('.pk'), lit = svg.querySelector('.lit'), block = s.querySelector('.block');
      const x0 = tx - 16, x1 = EARTH_EDGE + 30;
      const place = (x) => { pk.setAttribute('transform', `translate(${x} ${LINK.y})`); lit.setAttribute('x2', x); };
      run.set(() => place(x0));
      // Le scan reste à bord : seule une mesure en sort.
      run.a(block, [{ borderColor: '#E6E8EB' }, { borderColor: '#39404B' }], { d: 900, delay: 300, e: 'ease-out' });
      run.a(pk, [{ opacity: 0 }, { opacity: 1 }], { d: 300, delay: 700 });
      const d = (x0 - x1) / SPEED;
      run.tween({ delay: 900, d, e: 'linear', step: (k) => place(x0 + (x1 - x0) * k) });
      ring(run, svg.querySelector('.ring-e'), 22, 60, 900 + d);
      run.final(() => place(x1));
    },

    '12'(run, s) {
      ['.fact', '.what', '.carry'].forEach((c, i) => rise(run, s.querySelector(c), 300 + i * 500, 600, 10));
    },

    '13'(run, s) {
      const svg = s.querySelector('svg');
      const up = svg.querySelector('.up'), down = svg.querySelector('.down');
      run.set(() => { up.setAttribute('x2', EARTH_EDGE); down.setAttribute('x2', MARS_EDGE); });
      lightTrip(run, svg, { from: EARTH_EDGE, to: MARS_EDGE, delay: 500, d: LIGHT_MS, dir: 1, onStep: (k) => up.setAttribute('x2', EARTH_EDGE + (MARS_EDGE - EARTH_EDGE) * k) });
      rise(run, s.querySelector('.close .b'), 1000, 800, 10);
      run.final(() => { up.setAttribute('x2', MARS_EDGE); });
    },
  };

  function demoIn(run, s) {
    rise(run, s.querySelector('.h1'), 100, 600, 10);
    rise(run, s.querySelector('.lead'), 250, 600, 10);
    fade(run, s.querySelector('.where'), 600, 500);
  }

  window.SZ_SLIDES = { figs, builds };
})();
