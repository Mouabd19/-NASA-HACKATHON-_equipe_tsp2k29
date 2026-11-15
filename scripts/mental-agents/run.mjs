// SOL ZÉRO — Prototype santé mentale : fait tourner les 6 agents sur les jours clés, AVANT la démo.
// Modèle local via Ollama (traitement « à bord » : rien ne part sur Internet).
//
//   Avec l'API Claude :  export ANTHROPIC_API_KEY=sk-ant-…   puis  node scripts/mental-agents/run.mjs
//   Avec Ollama (local) : ollama pull qwen2.5:7b
//   node scripts/mental-agents/generate.mjs
//   node scripts/mental-agents/run.mjs                      # jours clés 65,74,78,85,94, scénarios drift + control
//   DAYS=78 SCENARIOS=drift node scripts/mental-agents/run.mjs   # un seul jour pour tester
//
// Sorties figées : public/data/mental/<scenario>/J<n>.json + public/data/mental/summary.json
// Ce script ne lit JAMAIS data/truth.json (la vérité sert seulement à évaluer après coup).

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { OBSERVERS, PSYCHOLOGISTS, observerPrompt, psychologistPrompt, consolidate } from './prompts.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const DATA = path.join(HERE, 'data');
const OUT = path.join(HERE, '..', '..', 'public', 'data', 'mental');
// Deux moteurs : API Claude si ANTHROPIC_API_KEY est défini, sinon Ollama en local.
const API_KEY = process.env.ANTHROPIC_API_KEY;
const ENGINE = API_KEY ? 'claude' : 'ollama';
const MODEL = process.env.SOLZERO_MODEL ?? (ENGINE === 'claude' ? 'claude-sonnet-5-5' : 'qwen2.5:7b');
const OLLAMA = process.env.OLLAMA_URL ?? 'http://localhost:11434';
const DAYS = (process.env.DAYS ?? '65,74,78,85,94').split(',').map(Number);
const SCENARIOS = (process.env.SCENARIOS ?? 'drift,control').split(',');

// Extrait le premier objet JSON d'une réponse (tolère un bloc ```json autour).
function parseJson(text) {
  const t = text.trim().replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/, '');
  const a = t.indexOf('{'), b = t.lastIndexOf('}');
  return JSON.parse(a >= 0 && b > a ? t.slice(a, b + 1) : t);
}

async function chatClaude(messages, tries = 3) {
  const system = messages.find((m) => m.role === 'system')?.content ?? '';
  const rest = messages.filter((m) => m.role !== 'system');
  for (let i = 1; i <= tries; i++) {
    const t0 = Date.now();
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-api-key': API_KEY, 'anthropic-version': '2023-06-01' },
      body: JSON.stringify({ model: MODEL, max_tokens: 6000, system, messages: rest }),
    });
    if (res.status === 429 || res.status >= 500) { console.warn(`  API ${res.status}, nouvel essai dans 10 s…`); await new Promise((r) => setTimeout(r, 10000)); continue; }
    if (!res.ok) throw new Error(`API Claude HTTP ${res.status} : ${await res.text()}`);
    const body = await res.json();
    const text = body.content.filter((c) => c.type === 'text').map((c) => c.text).join('');
    try { return { output: parseJson(text), seconds: +((Date.now() - t0) / 1000).toFixed(1) }; }
    catch (e) {
      // Garde la réponse brute pour comprendre l'échec (dossier ignoré par git).
      fs.mkdirSync(path.join(HERE, 'debug'), { recursive: true });
      fs.writeFileSync(path.join(HERE, 'debug', `echec-${Date.now()}.txt`), `stop_reason: ${body.stop_reason}\nerreur: ${e.message}\n\n${text}`);
      console.warn(`  JSON invalide (essai ${i}/${tries}, arrêt : ${body.stop_reason}) — réponse brute dans scripts/mental-agents/debug/`);
    }
  }
  return { output: null, error: 'échec après plusieurs essais' };
}

async function chat(messages, tries = 3) {
  if (ENGINE === 'claude') return chatClaude(messages, tries);
  for (let i = 1; i <= tries; i++) {
    const t0 = Date.now();
    const res = await fetch(`${OLLAMA}/api/chat`, {
      method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ model: MODEL, messages, stream: false, format: 'json', options: { temperature: 0.2, seed: 2029, num_ctx: 8192 } }),
    });
    if (!res.ok) throw new Error(`Ollama HTTP ${res.status} — Ollama est-il lancé ? Le modèle ${MODEL} est-il téléchargé ?`);
    const body = await res.json();
    try { return { output: JSON.parse(body.message.content), seconds: +((Date.now() - t0) / 1000).toFixed(1) }; }
    catch { console.warn(`  JSON invalide (essai ${i}/${tries}), on relance…`); }
  }
  return { output: null, error: 'JSON invalide après plusieurs essais' };
}

const load = (scenario, day) => JSON.parse(fs.readFileSync(path.join(DATA, scenario, `J${day}.json`), 'utf8'));

console.log(`Moteur : ${ENGINE} (${MODEL})`);
const summary = { engine: ENGINE, model: MODEL, generatedAt: new Date().toISOString(), label: 'Prototype — données SIMULÉES — signal IA, pas un diagnostic', scenarios: {} };
for (const scenario of SCENARIOS) {
  fs.mkdirSync(path.join(OUT, scenario), { recursive: true });
  const reference = JSON.parse(fs.readFileSync(path.join(DATA, scenario, 'reference.json'), 'utf8'));
  summary.scenarios[scenario] = [];
  for (const d of DAYS) {
    const day = load(scenario, d);
    const history = [];
    for (let k = d - 6; k <= d; k++) history.push(load(scenario, k));
    console.log(`[${scenario}] J${d} — 3 observateurs…`);
    const reports = [];
    for (const obs of OBSERVERS) reports.push({ id: obs.id, label: obs.label, ...(await chat(observerPrompt(obs, day))) });
    console.log(`[${scenario}] J${d} — 3 psychologues…`);
    const psys = [];
    for (const psy of PSYCHOLOGISTS) psys.push({ id: psy.id, label: psy.label, ...(await chat(psychologistPrompt(psy, day, reports, reference, history))) });
    const dossier = consolidate(psys);
    const out = { day: d, date: day.date, scenario, model: MODEL, label: summary.label, input: { transcript: day.transcript, sensors: day.sensors, biomarkers: day.biomarkers }, observers: reports, psychologists: psys, dossierPourLePsyHumain: dossier };
    fs.writeFileSync(path.join(OUT, scenario, `J${d}.json`), JSON.stringify(out, null, 1));
    summary.scenarios[scenario].push({ day: d, niveau: dossier.niveau, votes: dossier.votes });
    console.log(`[${scenario}] J${d} → ${dossier.niveau}  (${dossier.votes.map((v) => v.niveau).join(' / ')})`);
  }
}
fs.writeFileSync(path.join(OUT, 'summary.json'), JSON.stringify(summary, null, 1));
console.log('Terminé →', OUT);
