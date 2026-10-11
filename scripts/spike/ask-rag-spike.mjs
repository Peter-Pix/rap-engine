import fs from 'node:fs';
const KEY = fs.readFileSync('.env.local','utf8').match(/OLLAMA_API_KEY=(.+)/)[1].trim();
const MODEL='deepseek-v4.1-flash', URL='https://ollama.com/v1/chat/completions';
const ents = JSON.parse(fs.readFileSync('.content-cache/entities.json','utf8'));
const graph = JSON.parse(fs.readFileSync('.content-cache/graph.json','utf8'));
const title = id => ents[id]?.title ?? id;
const norm = s => (s||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'');

const docs = Object.values(ents).map(e=>({id:e.id,type:e.type,title:e.title,desc:e.description||'',slug:e.slug}));

// ── VYLEPŠENÝ retrieval ────────────────────────────────────────────────────
// 1) multi-word fráze (celý dotaz bez stop-slov) 2) exact title boost 3) type-agnostic
const STOP=new Set(['s','kym','kdo','kolik','ma','má','jaké','jake','jsou','je','o','čem','cem','od','na','nejlepsi','nejlepší','nejcasteji','nejčastěji','spolupracoval','tracky','skladby','české','ceske','scéně','scene']);
function retrieve(query,k=6){
  const words = norm(query).split(/[^\p{L}\p{N}]+/u).filter(w=>w.length>2&&!STOP.has(w));
  const scored = docs.map(d=>{
    const t=norm(d.title), hay=t+' '+norm(d.desc);
    let s=0;
    // exact celý dotaz v titulu entity → obrovský boost
    const fullPhrase = norm(query).replace(/[^\p{L}\p{N}]+/gu,' ').trim();
    if(t===fullPhrase) s+=50;
    for(const w of words){
      if(t===w) s+=20;                 // přesný název entity
      else if(t.includes(w)) s+=8;
      else if(hay.includes(w)) s+=2;
    }
    // bonus: artist má přednost, když dotaz zmiňuje osobu (heuristika)
    if(d.type==='artist'&&s>0) s+=3;
    return {d,s};
  }).filter(x=>x.s>0).sort((a,b)=>b.s-a.s).slice(0,k);
  return scored.map(x=>x.d);
}

const outIdx={}, inIdx={};
for(const g of graph){ (outIdx[g.from]??=[]).push(g); (inIdx[g.to]??=[]).push(g); }

// ── Graph expansion — včetně INBOUND (kdo odkazuje NA entitu) ─────────────
function expand(ids, maxEdges=70){
  const lines=[]; let n=0;
  for(const id of ids){
    for(const e of (outIdx[id]||[])){ if(n++>maxEdges)return lines; lines.push(`${title(e.from)} —[${e.relation}]→ ${title(e.to)}`); }
    for(const e of (inIdx[id]||[])){ if(n++>maxEdges)return lines; lines.push(`${title(e.from)} —[${e.relation}]→ ${title(e.to)}`); }
  }
  return lines;
}

// ── Agregace vztahů pro "s kým spolupracoval" ──────────────────────────────
function collabSummary(found){
  const artistIds = found.filter(f=>f.type==='artist').map(f=>f.id);
  if(!artistIds.length) return null;
  const out=[];
  for(const aid of artistIds){
    const partners=new Map();
    for(const e of (outIdx[aid]||[])){
      if(['RELATED_ARTIST','RELATED_TO','FEATURES'].includes(e.relation)){
        partners.set(e.to,(partners.get(e.to)||0)+1);
      }
    }
    for(const e of (inIdx[aid]||[])){
      if(e.relation==='FEATURES'){ partners.set(e.from,(partners.get(e.from)||0)+1); }
    }
    if(partners.size) out.push(`Spolupráce ${title(aid)}: ${[...partners.entries()].map(([id])=>title(id)).join(', ')}`);
  }
  return out.join('\n');
}

function buildContext(query){
  const hits = retrieve(query, 6);
  const ids = hits.map(h=>h.id);
  const parts = hits.map(h=>{
    const e = ents[h.id];
    const url = e.type==='artist'?`/raperi/${e.slug}`:e.type==='track'?`/skladby/${e.slug}`:`/${e.type}/${e.slug}`;
    return `### ${e.title} (${e.type}, id: ${e.id})\nURL: ${url}\n${(e.content||e.description||'').slice(0,1500)}`;
  });
  const edges = expand(ids, 60);
  const collab = collabSummary(hits);
  return {context:parts.join('\n\n'), edges, collab, hits};
}

const SYSTEM=`Jsi asistent databáze českého a slovenského rapu 4rap.cz.
ODPOVÍDEJ POUZE Z POSKYTNUTÉHO KONTEXTU. Nikdy nepřidávej fakta mimo kontext.
- Pokud odpověď v kontextu není, řekni: "Tuhle informaci v databázi nemáme." a nabídni, na co se lze zeptat.
- Nevymýšlej si jména, kolaborace, alba ani data.
- Když cituješ entitu, použij její URL z kontextu.
- Buď konkrétní, stručný. Česky.`;

async function ask(question){
  const {context,edges,collab,hits}=buildContext(question);
  const extra = collab?`\n\nSOUHRN SPOLUPRACÍ (z grafu):\n${collab}`:'';
  const user=`KONTEXT:\n${context}\n\nVZTAHY:\n${edges.join('\n')}${extra}\n\nOTÁZKA: ${question}`;
  const t0=Date.now();
  const r=await fetch(URL,{method:'POST',headers:{'Content-Type':'application/json',Authorization:`Bearer ${KEY}`},
    body:JSON.stringify({model:MODEL,messages:[{role:'system',content:SYSTEM},{role:'user',content:user}],stream:false,reasoning_effort:'none',temperature:0.1})});
  const dt=Date.now()-t0; const j=await r.json();
  return {ans:j.choices?.[0]?.message?.content||'',dt,hits:hits.map(h=>`${h.title}[${h.type}]`).join(', '),ctxLen:user.length,tokens:j.usage?.total_tokens};
}

const questions=[
  'S kým nejčastěji spolupracoval ADiss?',
  'Kolik má Iso Alp skladeb?',
  'Kdo je ADiss a odkud je?',
  'O čem je skladba Boh dal love od 7krát3?',
  'Jaké žánry dělá ADiss?',
];
for(const q of questions){
  const {ans,dt,hits,ctxLen,tokens}=await ask(q);
  console.log('\n'+'═'.repeat(70));
  console.log('❓ '+q);
  console.log('🔍 '+hits);
  console.log(`⏱  ${dt}ms | ctx ${ctxLen} | tok ${tokens}`);
  console.log('💬 '+ans.trim());
}
