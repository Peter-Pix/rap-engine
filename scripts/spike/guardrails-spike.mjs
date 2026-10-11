/** Spike: 5-vrstvá obrana proti halucinacím. */
import fs from 'node:fs';
const KEY = process.env.OLLAMA_API_KEY;
if (!KEY) { console.error('Chybí OLLAMA_API_KEY v env.'); process.exit(1); }
const MODEL='deepseek-v4.1-flash', URL='https://ollama.com/v1/chat/completions';
const ents = JSON.parse(fs.readFileSync('.content-cache/entities.json','utf8'));
const graph = JSON.parse(fs.readFileSync('.content-cache/graph.json','utf8'));
const norm = s => (s||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9 ]/g,' ').replace(/\s+/g,' ').trim();
const title = id => ents[id]?.title ?? id;

// ═══ VRSTVA 1: Entitní slovník + existence gate ═══════════════════════════
const byTitle = new Map();      // norm title → [ids]
const bySlug = new Map();
for(const e of Object.values(ents)){
  (byTitle.get(norm(e.title))??byTitle.set(norm(e.title),[]).get(norm(e.title))).push(e.id);
  bySlug.set(e.slug, e.id);
}
function entityExists(name){
  const n=norm(name);
  if(byTitle.has(n)) return byTitle.get(n);
  // částečný match (delší než 3 znaky)
  if(n.length>3){ for(const [k,ids] of byTitle){ if(k.includes(n)||n.includes(k)) return ids; } }
  return null;
}

// ═══ VRSTVA 3: Validace vymyšlených entit v odpovědi ═══════════════════════
/** Extrahuj potenciální vlastní jména / názvy z odpovědi a ověř je. */
function validateAnswer(answer){
  const problems=[];
  // 1) URL odkazy — každá musí existovat
  const urls=[...answer.matchAll(/\]\((\/[a-z-]+\/[a-z0-9-]+)\)/g)].map(m=>m[1]);
  for(const u of urls){
    const slug=u.split('/').pop();
    if(!bySlug.has(slug)) problems.push(`neexistující URL: ${u}`);
  }
  // 2) Boldované názvy (**X**) — ověř, že existují v DB (nebo jsou to běžná slova)
  const bolds=[...answer.matchAll(/\*\*([^*]{2,60})\*\*/g)].map(m=>m[1]);
  for(const b of bolds){
    const clean=b.replace(/[„"']/g,'').trim();
    if(/^[A-Z0-9]/.test(clean) && clean.split(' ').length<=4 && !entityExists(clean)){
      problems.push(`možná vymyšlená entita: "${clean}"`);
    }
  }
  return problems;
}

// ═══ VRSTVA 5: Deterministické dotazy (počet, nejčastější) ════════════════
const outIdx={}, inIdx={};
for(const g of graph){ (outIdx[g.from]??=[]).push(g); (inIdx[g.to]??=[]).push(g); }

function collabCount(artistId){
  const c=new Map();
  for(const e of (outIdx[artistId]||[])) if(['RELATED_ARTIST','RELATED_TO','FEATURES'].includes(e.relation)) c.set(e.to,(c.get(e.to)||0)+1);
  for(const e of (inIdx[artistId]||[])) if(['RELATED_ARTIST','RELATED_TO','FEATURES'].includes(e.relation)) c.set(e.from,(c.get(e.from)||0)+1);
  return [...c.entries()].sort((a,b)=>b[1]-a[1]);
}
function trackCount(artistId){
  return (inIdx[artistId]||[]).filter(e=>e.relation==='HAS_ARTIST').length;
}

// ── Retrieval ──────────────────────────────────────────────────────────────
const STOP=new Set(['s','kym','kdo','kolik','ma','má','jaké','jake','jsou','je','o','čem','cem','od','na','nejlepsi','nejlepší','nejcasteji','nejčastěji','spolupracoval','tracky','skladby','české','ceske','scéně','scene','delа','dělá','žánry','zanry']);
function retrieve(query,k=6){
  const words=norm(query).split(' ').filter(w=>w.length>2&&!STOP.has(w));
  const scored=Object.values(ents).map(d=>{
    const t=norm(d.title), hay=t+' '+norm(d.description||'');
    let s=0;
    for(const w of words){ if(t===w)s+=20; else if(t.includes(w))s+=8; else if(hay.includes(w))s+=2; }
    if(d.type==='artist'&&s>0)s+=3;
    return {d,s};
  }).filter(x=>x.s>0).sort((a,b)=>b.s-a.s).slice(0,k);
  return scored.map(x=>x.d);
}

function buildContext(hits){
  const ids=hits.map(h=>h.id);
  const parts=hits.map(h=>{
    const e=ents[h.id];
    const url=e.type==='artist'?`/raperi/${e.slug}`:e.type==='track'?`/skladby/${e.slug}`:`/${e.type}/${e.slug}`;
    return `### ${e.title} (${e.type}, id: ${e.id})\nURL: ${url}\n${(e.content||e.description||'').slice(0,1500)}`;
  });
  const edges=[]; let n=0;
  for(const id of ids){ for(const e of [...(outIdx[id]||[]),...(inIdx[id]||[])]){ if(n++>60)break; edges.push(`${title(e.from)} —[${e.relation}]→ ${title(e.to)}`);} }
  // deterministické agregace
  const det=[];
  for(const h of hits.filter(h=>h.type==='artist')){
    const cc=collabCount(h.id);
    if(cc.length) det.push(`${h.title}: ${trackCount(h.id)} tracků; spolupracovníci (${cc.length}): ${cc.map(([id,c])=>`${title(id)}${c>1?'('+c+')':''}`).join(', ')}`);
  }
  return {context:parts.join('\n\n'), edges:edges.join('\n'), det:det.join('\n'), ids};
}

const SYSTEM=`Jsi asistent databáze českého a slovenského rapu 4rap.cz.
KRITICKÉ PRAVIDLO: Odpovídej POUZE z poskytnutého KONTEXTU a VZTAHŮ.
- Pokud hledaná entita v kontextu NENÍ, odpověz přesně: "Tuhle informaci v databázi nemáme."
- Nikdy nedoplňuj jména, alba, kolaborace ani čísla, která v kontextu nejsou.
- Používej POUZE URL, které jsou v kontextu. Nevytvářej nové odkazy.
- Preferuj hodnoty ze sekce DETERMINISTICKÁ DATA — jsou přesné.
- Česky, stručně, konkrétně.`;

async function ask(question){
  // ── VRSTVA 1: gates ──
  const hits=retrieve(question,6);
  // explicitní kontrola, zda dotaz míří na existující entitu
  const words=norm(question).split(' ').filter(w=>w.length>3&&!STOP.has(w));
  const mentioned=[];
  for(const w of words){ const ids=entityExists(w); if(ids) mentioned.push({w,ids}); }
  // Pokud dotaz zmiňuje entitu, ale retrieval ji nenašel → dotáhni
  for(const m of mentioned){ if(!hits.find(h=>m.ids.includes(h.id))){ for(const id of m.ids){ const e=ents[id]; if(e&&!hits.find(h=>h.id===id)) hits.unshift(e); } } }
  const top=hits.slice(0,6);

  const {context,edges,det}=buildContext(top.length?top:hits);
  const user=`KONTEXT:\n${context}\n\nVZTAHY:\n${edges}\n\nDETERMINISTICKÁ DATA:\n${det||'(žádná)'}\n\nOTÁZKA: ${question}`;
  const t0=Date.now();
  const r=await fetch(URL,{method:'POST',headers:{'Content-Type':'application/json',Authorization:'Bearer '+KEY},
    body:JSON.stringify({model:MODEL,messages:[{role:'system',content:SYSTEM},{role:'user',content:user}],stream:false,reasoning_effort:'none',temperature:0.1})});
  const dt=Date.now()-t0; const j=await r.json();
  let ans=j.choices?.[0]?.message?.content||'';

  // ── VRSTVA 3: post-validace ──
  let violations=validateAnswer(ans);
  // ── retry s nápravou ──
  if(violations.length){
    const fix=`Tvoje odpověď obsahovala problémy: ${violations.join('; ')}. Přepiš odpověď POUZE z kontextu, bez vymyšlených entit a URL.`;
    const r2=await fetch(URL,{method:'POST',headers:{'Content-Type':'application/json',Authorization:'Bearer '+KEY},
      body:JSON.stringify({model:MODEL,messages:[{role:'system',content:SYSTEM},{role:'user',content:user},{role:'assistant',content:ans},{role:'user',content:fix}],stream:false,reasoning_effort:'none',temperature:0.05})});
    const j2=await r2.json(); ans=j2.choices?.[0]?.message?.content||ans;
    violations=validateAnswer(ans);
  }
  return {ans,dt,hits:top.map(h=>`${h.title}[${h.type}]`),violations,det,mentioned:mentioned.map(m=>m.w).join(',')};
}

const questions=[
  'S kým nejčastěji spolupracoval ADiss?',
  'Kolik má Iso Alp skladeb?',
  'Kolik skladeb má ADiss?',
  'S kým spolupracoval Vladimir 518?',
  'Kdo je vymyšlený rapper Zzqx Pufrt?',
];
for(const q of questions){
  const {ans,dt,hits,violations,det,mentioned}=await ask(q);
  console.log('\n'+'═'.repeat(72));
  console.log('❓ '+q);
  console.log('🔍 hits: '+hits);
  console.log('🎯 zmíněné entity v dotazu: '+(mentioned||'-'));
  console.log(`⏱  ${dt}ms | ⚠️  violations: ${violations.length?violations.join('; '):'ŽÁDNÉ ✅'}`);
  if(det) console.log('📊 det: '+det.slice(0,200));
  console.log('💬 '+ans.trim());
}
