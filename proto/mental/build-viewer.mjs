// SOL ZÉRO — Prototype santé mentale : page de visualisation autonome (pour la capture de la slide Vision).
//   node proto/mental/build-viewer.mjs   →   proto/mental/viewer.html (ouvrir dans un navigateur, aucun serveur)
// Les données sont embarquées dans la page : aucun appel réseau.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const SRC = path.join(HERE, '..', '..', 'public', 'data', 'mental');
const data = {};
for (const sc of ['drift', 'control']) {
  const dir = path.join(SRC, sc);
  if (!fs.existsSync(dir)) continue;
  data[sc] = fs.readdirSync(dir).filter((f) => /^J\d+\.json$/.test(f)).map((f) => JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8'))).sort((a, b) => a.day - b.day);
}

const html = `<!DOCTYPE html>
<html lang="fr"><head><meta charset="utf-8"><title>SOL ZÉRO — Suivi psychologique (prototype)</title>
<style>
:root{--bg:#050607;--panel:rgba(255,255,255,0.03);--line:rgba(255,255,255,0.12);--txt:#E8E8E6;--mut:#8A8F98;--ok:#30D158;--amb:#FF9F0A;--red:#FF453A;--unk:#636366;--mono:"JetBrains Mono",ui-monospace,Menlo,monospace}
*{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--txt);font:14px/1.5 Inter,system-ui,sans-serif;padding:28px}
.lbl{font-family:var(--mono);text-transform:uppercase;letter-spacing:.12em;font-size:11px;color:var(--mut)}
h1{font-family:var(--mono);font-size:18px;letter-spacing:.14em;text-transform:uppercase;margin:0 0 4px}
.warn{display:inline-block;border:1px solid var(--amb);color:var(--amb);font-family:var(--mono);font-size:11px;letter-spacing:.1em;padding:3px 8px;margin:8px 0 22px;text-transform:uppercase}
.panel{background:var(--panel);border:1px solid var(--line);padding:16px;margin-bottom:16px}
.chain{display:flex;gap:10px;align-items:stretch;margin-bottom:18px;flex-wrap:wrap}
.chain .step{flex:1;min-width:150px;border:1px solid var(--line);background:var(--panel);padding:10px}
.chain .arrow{align-self:center;color:var(--mut);font-family:var(--mono)}
.step b{display:block;font-size:13px;margin-top:4px}.step.human{border-color:var(--txt)}
table{border-collapse:collapse;width:100%}td,th{border-bottom:1px solid var(--line);padding:8px 6px;text-align:center}
th{font-family:var(--mono);font-weight:400;font-size:11px;letter-spacing:.1em;color:var(--mut)}td:first-child,th:first-child{text-align:left}
.cell{display:inline-block;min-width:150px;padding:6px 8px;font-family:var(--mono);font-size:11px;letter-spacing:.06em;text-transform:uppercase;border:1px solid;cursor:pointer}
.l0{color:var(--ok);border-color:var(--ok)}.l1{color:var(--amb);border-color:var(--amb)}.l2{color:var(--red);border-color:var(--red);background:repeating-linear-gradient(135deg,rgba(255,69,58,.15) 0 6px,transparent 6px 12px)}.lx{color:var(--unk);border-color:var(--unk)}
.votes{display:block;font-size:10px;color:var(--mut);margin-top:3px;letter-spacing:.04em}
.onset{color:var(--amb);font-family:var(--mono);font-size:11px}
.grid{display:grid;grid-template-columns:repeat(3,1fr);gap:12px}.grid .panel{margin:0}
.panel h3{margin:0 0 8px;font-size:13px}.panel ul{margin:6px 0 0;padding-left:18px}.panel li{margin:3px 0}
.quote{color:var(--mut);font-style:italic}.note{border-left:2px solid var(--txt);padding-left:10px;margin-top:8px}
.foot{color:var(--mut);font-size:12px;margin-top:18px}
</style></head><body>
<div class="lbl">SOL ZÉRO · SYS-07 / SANTÉ MENTALE · VISION</div>
<h1>Suivi psychologique assisté — Cdt Haddad</h1>
<span class="warn">Prototype — données SIMULÉES — signal IA, pas un diagnostic</span>

<div class="chain">
 <div class="step"><span class="lbl">Entrée</span><b>Lunettes (journée simulée)</b>scènes, paroles, capteurs</div><div class="arrow">→</div>
 <div class="step"><span class="lbl">3 observateurs</span><b>Actions · Paroles · Corps</b>faits, sans interprétation</div><div class="arrow">→</div>
 <div class="step"><span class="lbl">3 psychologues IA</span><b>Physico-psychique · Anxiété · Lien social</b>vs référence personnelle</div><div class="arrow">→</div>
 <div class="step"><span class="lbl">Dossier</span><b>Niveau = 2 psychologues sur 3</b>règle fixe, auditable</div><div class="arrow">→</div>
 <div class="step human"><span class="lbl">Décision</span><b>Psychologue HUMAIN au sol</b>l'IA ne décide pas</div>
</div>

<div class="panel"><div class="lbl" style="margin-bottom:8px">Niveau du dossier par jour — glissement injecté à partir de J75 (scénario « avec glissement »), témoin sans glissement · cliquer une case</div>
<table id="tbl"></table></div>
<div id="detail"></div>
<div class="foot">Modèle local (Ollama) : traitement à bord, aucune donnée brute envoyée vers la Terre. Données 100 % simulées, aucune personne réelle. Garde-fous : consentement de tout l'équipage avant le départ, mode privé, jamais utilisé pour la sélection ni pour un retrait de mission.</div>
<script>
const DATA=${JSON.stringify(data)};
const LV={rien:['l0','Rien à signaler'],a_surveiller:['l1','À surveiller'],proposer_un_echange:['l2','Proposer un échange']};
const lv=n=>LV[n]||['lx',n||'—'];
const days=[...new Set(Object.values(DATA).flat().map(d=>d.day))].sort((a,b)=>a-b);
const NAMES={drift:'Avec glissement (dès J75)',control:'Témoin (sans glissement)'};
let h='<tr><th>Scénario</th>'+days.map(d=>'<th>J'+d+(d>=75?' <span class="onset">●</span>':'')+'</th>').join('')+'</tr>';
for(const sc of Object.keys(DATA)){h+='<tr><td>'+NAMES[sc]+'</td>'+days.map(d=>{const x=DATA[sc].find(y=>y.day===d);if(!x)return'<td>—</td>';const [c,t]=lv(x.dossierPourLePsyHumain.niveau);return '<td><span class="cell '+c+'" onclick="show(\\''+sc+'\\','+d+')">'+t+'<span class="votes">'+x.dossierPourLePsyHumain.votes.map(v=>lv(v.niveau)[1]).join(' · ')+'</span></span></td>'}).join('')+'</tr>'}
document.getElementById('tbl').innerHTML=h;
const esc=s=>String(s??'').replace(/[&<>]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;'}[c]));
function show(sc,d){const x=DATA[sc].find(y=>y.day===d);let o='<div class="lbl" style="margin:6px 0 10px">Dossier transmis au psychologue humain — '+NAMES[sc]+' — J'+d+' ('+x.date+')</div><div class="grid">';
for(const p of x.psychologists){const r=p.output||{};const [c,t]=lv(r.niveau);o+='<div class="panel"><h3>'+esc(p.label)+'</h3><span class="cell '+c+'">'+t+' · confiance '+esc(r.confiance)+'</span>';
 o+='<ul>'+(r.hypotheses||[]).map(hy=>'<li><b>'+esc(hy.schema)+'</b><ul>'+(hy.preuves||[]).slice(0,3).map(pr=>'<li>'+esc(pr)+'</li>').join('')+'</ul></li>').join('')+'</ul>';
 if((r.pointsRassurants||[]).length)o+='<div class="lbl" style="margin-top:8px">Points rassurants</div><ul>'+r.pointsRassurants.slice(0,3).map(pr=>'<li>'+esc(pr)+'</li>').join('')+'</ul>';
 o+='<div class="note">'+esc(r.noteAuPsy)+'</div></div>'}
o+='</div><div class="grid" style="margin-top:12px">';
for(const ob of x.observers){const r=ob.output||{};o+='<div class="panel"><h3>'+esc(ob.label)+'</h3><ul>'+(r.faits||[]).slice(0,6).map(f=>'<li>'+esc(f.heure)+' — '+esc(f.fait)+(f.citation?' <span class="quote">« '+esc(f.citation)+' »</span>':'')+'</li>').join('')+'</ul></div>'}
document.getElementById('detail').innerHTML=o+'</div>'}
const last=(DATA.drift||[]).at(-1);if(last)show('drift',last.day);
</script></body></html>`;
fs.writeFileSync(path.join(HERE, 'viewer.html'), html);
console.log('viewer.html écrit —', Object.entries(data).map(([k, v]) => `${k}: ${v.length} jours`).join(', '));
