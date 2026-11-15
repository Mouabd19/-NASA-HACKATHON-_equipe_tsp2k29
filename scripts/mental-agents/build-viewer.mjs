// SOL ZÉRO — Prototype santé mentale : page de visualisation autonome (capture pour la slide Vision).
//   node scripts/mental-agents/build-viewer.mjs   →   scripts/mental-agents/viewer.html (s'ouvre dans un navigateur, sans serveur ni réseau)
// DA sobre (Apple / SpaceX) : un chiffre clé, une frise, le détail au clic.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const SRC = process.env.MENTAL_DATA ?? path.join(HERE, '..', '..', 'public', 'data', 'mental');
const ONSET = 75;
const data = {};
let engine = 'modèle de langage';
try { const sm = JSON.parse(fs.readFileSync(path.join(SRC, 'summary.json'), 'utf8')); engine = sm.engine === 'claude' ? `Claude (${sm.model})` : `${sm.model}, en local`; } catch {}
for (const sc of ['drift', 'control']) {
  const dir = path.join(SRC, sc);
  if (!fs.existsSync(dir)) continue;
  data[sc] = fs.readdirSync(dir).filter((f) => /^J\d+\.json$/.test(f)).map((f) => JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8'))).sort((a, b) => a.day - b.day)
    .map((x) => ({ // on n'embarque que l'essentiel
      day: x.day,
      niveau: x.dossierPourLePsyHumain.niveau,
      psy: x.psychologists.map((p) => ({ label: (l => l[0].toUpperCase() + l.slice(1))(p.label.replace('Psychologue — ', '')), niveau: p.output?.niveau, schema: p.output?.hypotheses?.[0]?.schema ?? null, note: p.output?.noteAuPsy ?? '' })),
      faits: x.observers.flatMap((o) => (o.output?.faits ?? []).slice(0, 3).map((f) => ({ h: f.heure, t: f.fait, q: f.citation }))).slice(0, 6),
    }));
}

const html = `<!DOCTYPE html>
<html lang="fr"><head><meta charset="utf-8"><title>SOL ZÉRO — Suivi psychologique</title>
<style>
:root{--bg:#000;--txt:#F5F5F7;--mut:#86868B;--line:rgba(255,255,255,.1);--ok:#30D158;--amb:#FF9F0A;--red:#FF453A}
*{box-sizing:border-box;margin:0}
body{background:var(--bg);color:var(--txt);font:15px/1.5 -apple-system,BlinkMacSystemFont,"SF Pro Text",Inter,system-ui,sans-serif;-webkit-font-smoothing:antialiased;padding:72px 96px;max-width:1280px;margin:auto}
.eyebrow{font-size:12px;letter-spacing:.2em;text-transform:uppercase;color:var(--mut)}
h1{font:600 44px/1.1 -apple-system,"SF Pro Display",Inter,sans-serif;letter-spacing:-.02em;margin:14px 0 10px}
.sub{color:var(--mut);font-size:17px;max-width:640px}
.hero{display:flex;gap:80px;margin:64px 0 56px}
.kpi b{display:block;font:600 64px/1 -apple-system,"SF Pro Display",Inter,sans-serif;letter-spacing:-.03em}
.kpi span{color:var(--mut);font-size:14px}
.tl{border-top:1px solid var(--line);padding:28px 0}
.row{display:grid;grid-template-columns:200px 1fr;align-items:center;padding:14px 0}
.row .name{color:var(--mut);font-size:14px}
.dots{position:relative;display:flex;justify-content:space-between}
.d{width:44px;text-align:center;cursor:pointer}
.d i{display:block;width:16px;height:16px;border-radius:50%;margin:0 auto 8px;background:var(--c);box-shadow:0 0 0 0 transparent;transition:.2s}
.d.sel i{box-shadow:0 0 0 6px rgba(255,255,255,.12)}
.d small{color:var(--mut);font-size:12px}
.onset{position:absolute;top:-10px;bottom:-34px;border-left:1px dashed rgba(255,255,255,.25)}
.onset em{position:absolute;top:-22px;left:6px;font-style:normal;font-size:12px;color:var(--mut);white-space:nowrap}
.legend{display:flex;gap:24px;color:var(--mut);font-size:13px;margin-top:22px}
.legend i{display:inline-block;width:9px;height:9px;border-radius:50%;margin-right:8px;background:var(--c)}
.detail{border-top:1px solid var(--line);padding-top:36px;margin-top:8px}
.detail h2{font:600 24px/1.2 -apple-system,"SF Pro Display",Inter,sans-serif;letter-spacing:-.01em;margin-bottom:28px}
.cards{display:grid;grid-template-columns:repeat(3,1fr);gap:40px}
.card .lv{font-size:13px;color:var(--c);margin:6px 0 12px}
.card h3{font-size:15px;font-weight:600}
.card p{color:var(--mut);font-size:14px}
.card .sch{color:var(--txt);font-size:17px;margin-bottom:6px}
details{margin-top:32px;color:var(--mut);font-size:14px}summary{cursor:pointer;color:var(--txt)}
details li{margin:6px 0 6px 18px}
.human{margin-top:40px;display:flex;align-items:center;gap:14px;color:var(--mut);font-size:14px}
.human b{color:var(--txt);font-weight:600}
.foot{margin-top:72px;color:var(--mut);font-size:12px}
</style></head><body>
<div class="eyebrow">SOL ZÉRO · Vision · Prototype · <span style="color:var(--amb)">Simulé</span></div>
<h1>Repérer tôt.<br>Laisser l'humain décider.</h1>
<p class="sub">Trois observateurs, trois psychologues IA, un psychologue humain.<br>Prototype : <span id="engine"></span>. Vision : un modèle embarqué, à bord.</p>

<div class="hero" id="hero"></div>

<div class="tl" id="tl"></div>
<div class="legend"><span style="--c:var(--ok)"><i></i>Rien à signaler</span><span style="--c:var(--amb)"><i></i>À surveiller</span><span style="--c:var(--red)"><i></i>Proposer un échange</span></div>

<div class="detail" id="detail"></div>

<div class="foot">Données entièrement simulées · aucune personne réelle · signal à regarder, jamais un diagnostic</div>
<script>
const DATA=${JSON.stringify(data)}, ONSET=${ONSET};
document.getElementById('engine').textContent=${JSON.stringify(engine)};
const C={rien:'var(--ok)',a_surveiller:'var(--amb)',proposer_un_echange:'var(--red)',donnees_insuffisantes:'#636366'};
const T={rien:'Rien à signaler',a_surveiller:'À surveiller',proposer_un_echange:'Proposer un échange',donnees_insuffisantes:'Données insuffisantes'};
const esc=s=>String(s??'').replace(/[&<>]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;'}[c]));
const days=[...new Set(Object.values(DATA).flat().map(d=>d.day))].sort((a,b)=>a-b);
const lvl=n=>['rien','a_surveiller','proposer_un_echange'].indexOf(n);

// Chiffres clés
const drift=DATA.drift||[], ctrl=DATA.control||[];
const det=drift.find(d=>d.day>=ONSET&&lvl(d.niveau)>=2);
const ctrlEsc=ctrl.filter(d=>lvl(d.niveau)>=2).length;
const ctrlCalm=ctrl.filter(d=>lvl(d.niveau)===0).length;
document.getElementById('hero').innerHTML=
 '<div class="kpi"><b>'+(det?'+'+(det.day-ONSET)+' j':'—')+'</b><span>avant de proposer un échange, après le début du trouble (J'+ONSET+')</span></div>'+
 '<div class="kpi"><b>'+ctrlEsc+'</b><span>proposition d’échange chez l’astronaute témoin, en bonne santé</span></div>'+
 '<div class="kpi"><b>'+ctrlCalm+'/'+ctrl.length+'</b><span>jours « rien à signaler » chez le témoin</span></div>';

// Frise
const N={drift:'Trouble débutant à J'+ONSET,control:'Témoin en bonne santé'};
let h='';
for(const sc of Object.keys(DATA)){
 h+='<div class="row"><div class="name">'+N[sc]+'</div><div class="dots">';
 if(sc==='drift'){const i=days.findIndex(d=>d>=ONSET);if(i>0)h+='<div class="onset" style="left:calc('+((i-.5)/(days.length-1)*100)+'% )"><em>début J'+ONSET+'</em></div>'}
 for(const d of days){const x=DATA[sc].find(y=>y.day===d);h+='<div class="d" data-k="'+sc+d+'" onclick="show(\\''+sc+'\\','+d+')" style="--c:'+(x?C[x.niveau]:'#333')+'"><i></i><small>J'+d+'</small></div>'}
 h+='</div></div>'}
document.getElementById('tl').innerHTML=h;

function show(sc,d){
 document.querySelectorAll('.d').forEach(e=>e.classList.toggle('sel',e.dataset.k===sc+d));
 const x=DATA[sc].find(y=>y.day===d); if(!x)return;
 let o='<div class="eyebrow">Dossier du jour · '+N[sc]+'</div><h2>J'+d+' — <span style="color:'+C[x.niveau]+'">'+T[x.niveau]+'</span></h2><div class="cards">';
 for(const p of x.psy){o+='<div class="card" style="--c:'+(C[p.niveau]||'var(--mut)')+'"><h3>'+esc(p.label)+'</h3><div class="lv">● '+(T[p.niveau]||'—')+'</div>'+(p.schema?'<div class="sch">'+esc(p.schema)+'</div>':'')+'<p>'+esc(p.note.length>170?p.note.slice(0,167)+'…':p.note)+'</p></div>'}
 o+='</div><details><summary>Faits relevés par les observateurs</summary><ul>'+x.faits.map(f=>'<li>'+esc(f.h)+' · '+esc(f.t)+(f.q?' — « '+esc(f.q)+' »':'')+'</li>').join('')+'</ul></details>';
 o+='<div class="human"><b>Psychologue humain au sol</b> reçoit ce dossier et décide. L\\'IA ne décide pas.</div>';
 document.getElementById('detail').innerHTML=o}
const last=drift.at(-1); if(last)show('drift',last.day);
</script></body></html>`;
fs.writeFileSync(path.join(HERE, 'viewer.html'), html);
console.log('viewer.html écrit —', Object.entries(data).map(([k, v]) => `${k}: ${v.length} jours`).join(', '));
