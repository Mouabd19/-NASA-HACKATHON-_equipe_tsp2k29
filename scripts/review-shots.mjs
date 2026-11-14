#!/usr/bin/env node
// Captures de revue : chaque état visuel nommé de l'app -> status/shots/<nom>.png + report.json.
//
//   npm run shots                 toutes les captures (build d'abord si dist/ est absent)
//   npm run shots -- 10 12        seulement celles dont le nom contient « 10 » ou « 12 »
//   npm run shots -- --2x         deviceScaleFactor 2 (captures nettes pour les slides)
//   npm run shots -- --build      force un « npm run build » avant
//
// Le script ne construit rien lui-même : il sert dist/ avec « vite preview » sur le port 4179,
// pilote Chromium (Playwright, préinstallé — jamais de « playwright install ») et éteint le serveur.
// Les états viennent des paramètres d'URL de la page Body (src/pages/body/urlState.ts).
import { spawn, spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = join(ROOT, 'status', 'shots');
const PORT = 4179;
const BASE = `http://localhost:${PORT}`;
const SETTLE_MS = 2500;
const DAY_SOL0 = 'sol0';                 // alias résolu par urlState.ts (DAY_SOL0 de mocks/mission)
const FIRST_REASONING = 'r-hanche-ared'; // premier raisonnement de planDay(94)

const argv = process.argv.slice(2);
const flags = new Set(argv.filter((a) => a.startsWith('--')));
const filters = argv.filter((a) => !a.startsWith('--'));
const SCALE = flags.has('--2x') ? 2 : 1;

/** name · url · wait (ms, défaut SETTLE_MS) · sceneTime (wait en temps de scène, corrigé du ralenti logiciel) · viewport */
const SHOTS = [
  { name: '01-body-today', url: '/body?noscan=1' },
  { name: '02-scan-sweep', url: '/body', wait: 1200, sceneTime: true },
  { name: '03-layer-squelette', url: '/body?noscan=1&layers=squelette' },
  { name: '04-layer-muscles', url: '/body?noscan=1&layers=muscles' },
  { name: '05-layer-organes', url: '/body?noscan=1&layers=organes' },
  { name: '06-layer-cardio', url: '/body?noscan=1&layers=cardio' },
  { name: '07-layer-nerveux', url: '/body?noscan=1&layers=nerveux' },
  { name: '08-layer-exposition', url: '/body?noscan=1&layers=exposition' },
  { name: '09-all-layers', url: '/body?noscan=1&layers=all' },
  { name: '10-hover-hanche', url: '/body?noscan=1&hover=hanche' },
  { name: '11-selected-coeur', url: '/body?noscan=1&organ=coeur', wait: 3500 },
  { name: '12-window-hanche', url: '/body?noscan=1&window=hanche', wait: 3500 },
  { name: '13-window-global', url: '/body?noscan=1&window=global' },
  { name: '14-blood-hemoglobine', url: '/body?noscan=1&blood=hemoglobine' },
  { name: '15-day-0', url: '/body?noscan=1&day=0' },
  { name: '16-sol0', url: `/body?noscan=1&day=${DAY_SOL0}` },
  { name: '17-j860-rythme', url: '/body?noscan=1&day=860&plan=0' },
  { name: '18-j860-plan', url: '/body?noscan=1&day=860&plan=1&window=hanche', wait: 3500 },
  { name: '19-warroom', url: '/warroom' },
  { name: '20-reasoning', url: `/reasoning/${FIRST_REASONING}` },
  { name: '21-body-1280x720', url: '/body?noscan=1', viewport: { width: 1280, height: 720 } },
  { name: '22-j860-plan-corps', url: '/body?noscan=1&day=860&plan=1' },
  { name: '23-window-global-1280x720', url: '/body?noscan=1&window=global', viewport: { width: 1280, height: 720 } },
  { name: '24-selected-hanche-j300-plan', url: '/body?noscan=1&day=300&plan=1&organ=hanche', wait: 3500 },
];

/** Avertissements de bibliothèques / du pilote GL logiciel : notés à part, pas comptés comme erreurs à nous. */
const THIRD_PARTY = [
  /THREE\.Clock: This module has been deprecated/, // émis par @react-three/fiber 9 avec three >= 0.183
  /GL Driver Message/,                             // SwiftShader : « GPU stall due to ReadPixels »
];

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function loadPlaywright() {
  const require = createRequire(import.meta.url);
  for (const from of [import.meta.url, join(process.cwd(), 'x.js'), '/usr/lib/node_modules/x.js', '/usr/local/lib/node_modules/x.js']) {
    try { return createRequire(from)('playwright'); } catch { /* suivant */ }
  }
  try { return require('playwright'); } catch { /* ci-dessous */ }
  const g = spawnSync('npm', ['root', '-g'], { encoding: 'utf8' }).stdout?.trim();
  if (g) { try { return createRequire(join(g, 'x.js'))('playwright'); } catch { /* ci-dessous */ } }
  throw new Error('Playwright introuvable (npm i -D playwright, ou NODE_PATH vers une installation globale).');
}

async function waitForServer(url, ms = 30_000) {
  const t0 = Date.now();
  while (Date.now() - t0 < ms) {
    try { const r = await fetch(url); if (r.ok) return; } catch { /* pas encore prêt */ }
    await sleep(250);
  }
  throw new Error(`Le serveur ne répond pas sur ${url}`);
}

async function hasWebGL(browser) {
  const page = await browser.newPage();
  const ok = await page.evaluate(() => {
    const c = document.createElement('canvas');
    return !!(c.getContext('webgl2') || c.getContext('webgl'));
  });
  await page.close();
  return ok;
}

async function launch(chromium) {
  let browser = await chromium.launch();
  if (await hasWebGL(browser)) return { browser, gl: 'défaut' };
  await browser.close();
  browser = await chromium.launch({ args: ['--enable-unsafe-swiftshader', '--use-angle=swiftshader'] });
  return { browser, gl: (await hasWebGL(browser)) ? 'swiftshader' : 'AUCUN WEBGL' };
}

async function main() {
  if (flags.has('--build') || !existsSync(join(ROOT, 'dist', 'index.html'))) {
    console.log('dist/ absent ou --build : npm run build…');
    const b = spawnSync('npm', ['run', 'build'], { cwd: ROOT, stdio: 'inherit' });
    if (b.status !== 0) process.exit(b.status ?? 1);
  }
  mkdirSync(OUT, { recursive: true });

  const server = spawn('npx', ['vite', 'preview', '--port', String(PORT), '--strictPort'], {
    cwd: ROOT, stdio: ['ignore', 'pipe', 'pipe'], detached: true,
  });
  let serverLog = '';
  server.stdout.on('data', (d) => { serverLog += d; });
  server.stderr.on('data', (d) => { serverLog += d; });
  const killServer = () => { try { process.kill(-server.pid, 'SIGTERM'); } catch { /* déjà mort */ } };
  process.on('exit', killServer);
  process.on('SIGINT', () => { killServer(); process.exit(130); });

  let browser;
  const report = [];
  let fps = null;
  let gl = '?';
  try {
    await waitForServer(`${BASE}/`).catch((e) => { throw new Error(`${e.message}\n${serverLog}`); });
    const { chromium } = loadPlaywright();
    ({ browser, gl } = await launch(chromium));
    console.log(`WebGL : ${gl} · échelle ×${SCALE}`);

    const list = SHOTS.filter((s) => filters.length === 0 || filters.some((f) => s.name.includes(f)));
    for (const shot of list) {
      const ctx = await browser.newContext({
        viewport: shot.viewport ?? { width: 1600, height: 900 },
        deviceScaleFactor: SCALE,
      });
      const page = await ctx.newPage();
      const errors = [];
      const ignored = [];
      page.on('console', (m) => {
        if (m.type() !== 'error' && m.type() !== 'warning') return;
        const line = `[${m.type()}] ${m.text()}`;
        if (THIRD_PARTY.some((re) => re.test(line))) { if (!ignored.includes(line)) ignored.push(line); } else errors.push(line);
      });
      page.on('pageerror', (e) => errors.push(`[pageerror] ${e.message}`));
      page.on('requestfailed', (r) => errors.push(`[requestfailed] ${r.url()}`));

      await page.goto(BASE + shot.url, { waitUntil: 'load' });
      if (shot.url.startsWith('/body')) {
        await page.waitForSelector('canvas', { timeout: 20_000 }).catch(() => errors.push('[shots] aucun <canvas> après 20 s'));
      }
      await page.evaluate(() => document.fonts.ready);
      if (shot.sceneTime) {
        // La scène plafonne dt à 0,1 s : sous 10 img/s (rendu logiciel) elle tourne au ralenti.
        // On mesure la cadence 0,5 s et on allonge l'attente d'autant pour tomber en plein balayage.
        const quick = await page.evaluate(() => new Promise((resolve) => {
          let n = 0; const t = performance.now();
          const tick = () => { n++; if (performance.now() - t >= 500) resolve(n * 2); else requestAnimationFrame(tick); };
          requestAnimationFrame(tick);
        }));
        const slow = Math.max(1, 10 / Math.max(1, quick));
        await sleep(Math.max(0, shot.wait * slow - 500));
      } else {
        await sleep(shot.wait ?? SETTLE_MS);
      }
      // carte de survol / épinglée : on attend qu'elle ait fini de glisser (2 lectures identiques)
      if (/[?&](hover|organ)=/.test(shot.url)) {
        let prev = '';
        for (let i = 0; i < 20; i++) {
          const cur = await page.evaluate(() => document.querySelector('.hvc__card')?.getAttribute('style') ?? '');
          if (cur && cur === prev) break;
          prev = cur;
          await sleep(400);
        }
      }
      await page.screenshot({ path: join(OUT, `${shot.name}.png`) });
      const finalUrl = page.url().replace(BASE, '');
      report.push({ name: shot.name, url: shot.url, finalUrl, errors, ignoredThirdParty: ignored });
      console.log(`${errors.length ? '✗' : '✓'} ${shot.name}  ${shot.url}${errors.length ? `\n    ${errors.join('\n    ')}` : ''}`);
      await ctx.close();
    }

    // Test clavier : maintenir → ne doit lever aucune exception (régression React #185 « Maximum update depth »)
    if (filters.length === 0 || filters.includes('keys')) {
      const ctx = await browser.newContext({ viewport: { width: 1600, height: 900 }, deviceScaleFactor: 1 });
      const page = await ctx.newPage();
      const errors = [];
      page.on('pageerror', (e) => errors.push(`[pageerror] ${e.message}`));
      page.on('console', (m) => { if (m.type() === 'error' && /Maximum update depth/.test(m.text())) errors.push(`[error] ${m.text().slice(0, 160)}`); });
      await page.goto(`${BASE}/body?noscan=1`, { waitUntil: 'load' });
      await page.waitForSelector('canvas', { timeout: 20_000 }).catch(() => {});
      await sleep(1500);
      for (let i = 0; i < 160; i++) await page.keyboard.press('ArrowRight');
      await sleep(500);
      const day = await page.evaluate(() => new URLSearchParams(location.search).get('day'));
      report.push({ name: 'keys-160-arrowright', url: '/body?noscan=1', finalUrl: page.url().replace(BASE, ''), errors, ignoredThirdParty: [] });
      console.log(`${errors.length ? '✗' : '✓'} 160 × ArrowRight → day=${day}${errors.length ? `\n    ${errors.join('\n    ')}` : ''}`);
      await ctx.close();
    }

    // FPS indicatif sur /body (rendu logiciel SwiftShader ici : ne préjuge pas d'un vrai GPU)
    if (filters.length === 0 || filters.includes('fps')) {
      const ctx = await browser.newContext({ viewport: { width: 1600, height: 900 }, deviceScaleFactor: 1 });
      const page = await ctx.newPage();
      await page.goto(`${BASE}/body?noscan=1`, { waitUntil: 'load' });
      await page.waitForSelector('canvas', { timeout: 20_000 }).catch(() => {});
      await sleep(2000);
      fps = await page.evaluate(() => new Promise((resolve) => {
        let n = 0;
        const t0 = performance.now();
        const tick = () => {
          n++;
          if (performance.now() - t0 >= 3000) resolve(Math.round((n / (performance.now() - t0)) * 10000) / 10);
          else requestAnimationFrame(tick);
        };
        requestAnimationFrame(tick);
      }));
      console.log(`FPS indicatif /body : ${fps} (WebGL ${gl}, rendu logiciel en CI)`);
      await ctx.close();
    }
  } finally {
    if (browser) await browser.close();
    killServer();
  }

  const out = {
    generatedAt: new Date().toISOString(),
    viewport: '1600x900',
    deviceScaleFactor: SCALE,
    webgl: gl,
    fpsBody: fps,
    fpsNote: 'requestAnimationFrame sur 3 s ; rendu logiciel (SwiftShader) en CI, indicatif seulement',
    shots: report,
  };
  if (filters.length === 0) writeFileSync(join(OUT, 'report.json'), `${JSON.stringify(out, null, 2)}\n`);
  else console.log('(filtre actif : report.json non réécrit)');
  const bad = report.filter((r) => r.errors.length > 0);
  console.log(`${report.length} capture(s) dans status/shots/ · ${bad.length} page(s) avec erreurs console`);
}

main().catch((e) => { console.error(e); process.exit(1); });
