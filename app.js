(() => {
"use strict";
const cfg=window.PYKLN_CONFIG;
const state={page:"home",tab:"live",tournaments:[],matches:[],teams:[],error:null,weekend:"8",history:{},workbooks:{},sheetIndex:{}};
fetch("weekend-history.json").then(r=>r.json()).then(d=>{state.history=d;render()}).catch(console.warn);
fetch("weekend-workbooks.json").then(r=>{if(!r.ok)throw Error('Workbook data unavailable');return r.json()}).then(d=>{state.workbooks=d;render()}).catch(console.warn);
const $=id=>document.getElementById(id);
const esc=v=>String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const status=v=>["live","completed","upcoming"].includes(v)?v:"upcoming";
const fmtDate=s=>{if(!s)return"Date TBA";const d=new Date(s+"T12:00:00");return Number.isNaN(+d)?"Date TBA":d.toLocaleDateString("en-IN",{day:"numeric",month:"short",year:"numeric"})};
const empty=(title,description)=>`<div class="empty"><strong>${esc(title)}</strong><span>${esc(description)}</span></div>`;
async function fetchTable(table,fields){const url=`${cfg.supabaseUrl}/rest/v1/${table}?select=${encodeURIComponent(fields)}&limit=500`;const res=await fetch(url,{headers:{"apikey":cfg.supabasePublishableKey,"Accept":"application/json"}});if(!res.ok)throw new Error(`${table}: HTTP ${res.status}`);return res.json()}
async function sync(){
$("syncState").textContent="Syncing…";
try {
const [t,m,teams]=await Promise.all([fetchTable("tournaments","id,name,event_date,venue,status,registration_open"),fetchTable("matches","id,tournament_id,team1_id,team2_id,court_number,score1,score2,status,winner_id"),fetchTable("teams","id,name,tournament_id")]);
state.tournaments=t;state.matches=m;state.teams=teams;state.error=null;
$("syncState").textContent=`Updated ${new Date().toLocaleTimeString("en-IN",{hour:"2-digit",minute:"2-digit"})}`;
}catch(e){state.error=e.message;$("syncState").textContent="Connection unavailable";console.warn("PYKLN sync:",e)}
render();
}
function matchCard(m){
const team=id=>state.teams.find(x=>x.id===id)?.name||"Team TBA";
const tour=state.tournaments.find(t=>t.id===m.tournament_id)?.name||"PYKLN Tournament";
return `<article class="match-card"><div class="meta"><span>${esc(tour)} · COURT ${esc(m.court_number??"TBA")}</span><span class="pill">${esc(status(m.status).toUpperCase())}</span></div><div class="teams"><div class="team"><span>${esc(team(m.team1_id))}</span><strong>${Number(m.score1)||0}</strong></div><div class="team"><span>${esc(team(m.team2_id))}</span><strong>${Number(m.score2)||0}</strong></div></div><div class="match-footer">${m.status==="completed"?"FINAL RESULT":m.status==="live"?"MATCH IN PROGRESS":"SCHEDULED MATCH"}</div></article>`
}
function eventCard(t,reg=false){return `<article class="event-card"><div class="meta"><span>${esc(fmtDate(t.event_date))}</span><span class="pill">${t.registration_open?"REGISTRATION OPEN":esc(status(t.status).toUpperCase())}</span></div><h3>${esc(t.name)}</h3><p>📍 ${esc(t.venue||"Venue to be announced")}</p><div class="event-action">${reg?"Registration details coming soon":"VIEW EVENT DETAILS ↗"}</div></article>`}
function matchSection(){const matches=state.matches.filter(m=>status(m.status)===state.tab);return matches.length?matches.map(matchCard).join(""):empty(state.error?"Unable to load live data":state.tab==="live"?"No live matches right now":state.tab==="completed"?"No completed matches yet":"No upcoming fixtures yet",state.error?"Check your Supabase connection and read policies.":state.tab==="live"?"Completed results will be available under the Completed tab.":"Matches will appear here once the organiser adds them.")}
function renderHome(){
$("main").innerHTML=window.homeTemplate;
$("countT").textContent=state.tournaments.length;$("countL").textContent=state.matches.filter(m=>m.status==="live").length;$("countC").textContent=state.matches.filter(m=>m.status==="completed").length;$("countR").textContent=state.tournaments.filter(t=>t.registration_open).length;
$("tabLive").textContent=state.matches.filter(m=>m.status==="live").length;
document.querySelectorAll("[data-tab]").forEach(b=>b.classList.toggle("selected",b.dataset.tab===state.tab));
$("matchList").innerHTML=matchSection();
const open=state.tournaments.filter(t=>t.registration_open);$("registrationList").innerHTML=open.length?open.map(t=>eventCard(t,true)).join(""):empty("No registrations open","When the next PYKLN tournament opens for registration, it will appear here.");
$("tournamentList").innerHTML=state.tournaments.length?state.tournaments.slice().sort((a,b)=>String(b.event_date).localeCompare(String(a.event_date))).slice(0,4).map(t=>eventCard(t)).join(""):empty("Tournament calendar is ready","Your tournaments will appear as soon as they are added to Supabase.");
}
function weekendPicker(){return `<div class="weekend-picker"><label for="weekendSelect">SELECT WEEKEND NIGHTS</label><select id="weekendSelect"><option value="8" ${state.weekend==='8'?'selected':''}>Weekend Nights 8 — Latest</option>${[7,6,5,4,3,2].map(n=>`<option value="${n}" ${state.weekend===String(n)?'selected':''}>Weekend Nights ${n}</option>`).join('')}</select></div>`}
function historicalMatches(){const event=state.history[state.weekend];if(!event)return empty("Scorecard not yet available","Upload the Weekend Nights scorecard to see results here.");const completed=event.matches.filter(m=>typeof m.score1==='number'&&typeof m.score2==='number');return `<div class="history-heading"><h2>${esc(event.name)}</h2><p>${completed.length} recorded completed games · ${event.teams.length} teams</p></div>${completed.length?`<div class="match-grid">${completed.map(m=>`<article class="match-card"><div class="meta"><span>${esc(m.stage)} · ${esc(m.round||'')}</span><span class="pill">COMPLETED</span></div><div class="teams"><div class="team"><span>${esc(m.team1)}</span><strong>${m.score1}</strong></div><div class="team"><span>${esc(m.team2)}</span><strong>${m.score2}</strong></div></div>${m.winner?`<div class="match-footer">WINNER: ${esc(m.winner)}</div>`:''}</article>`).join('')}</div>`:empty('No completed game scores found','This scorecard does not contain confirmed completed game scores.')}`}
function historyTable(title,columns,records){if(!records?.length)return '';return `<section class="section history-table-section"><div class="section-heading"><div><div class="eyebrow">TOURNAMENT RECORDS</div><h2>${esc(title)}</h2></div></div><div class="history-table-scroll"><table class="history-table"><thead><tr>${columns.map(c=>`<th>${esc(c[0])}</th>`).join('')}</tr></thead><tbody>${records.map(r=>`<tr>${columns.map(c=>`<td>${esc(r[c[1]]??'—')}</td>`).join('')}</tr>`).join('')}</tbody></table></div></section>`}

function sheetCategory(name){const n=name.toLowerCase();if(/pool|round robin|cross-pool|tie |fixture/.test(n))return 'Pool & Round Robin';if(/quarter|semi|final|bracket|bronze|gold silver/.test(n))return 'Knockout & Finals';if(/player|team|roster|list/.test(n))return 'Players & Teams';if(/leaderboard|ranking|standing/.test(n))return 'Rankings & Standings';return 'Overview & Data'}
function workbookSection(){
 const sheets=state.workbooks[state.weekend];
 if(!sheets)return state.weekend==='3'?'':empty('Scorecard data unavailable','The original workbook has not been imported.');
 const stage=state.sheetCategory||'All';
 const stages=['All','Pool & Round Robin','Knockout & Finals','Players & Teams','Rankings & Standings','Overview & Data'];
 const scoped=sheets.map((sh,i)=>({sh,i})).filter(x=>stage==='All'||sheetCategory(x.sh.name)===stage);
 const selected=state.sheetIndex[state.weekend];
 const chosen=scoped.find(x=>x.i===selected)||scoped[0];
 const query=(state.sheetSearch||'').trim().toLowerCase();
 const nav=stages.filter(t=>t==='All'||sheets.some(sh=>sheetCategory(sh.name)===t)).map(t=>`<button type="button" data-stage="${esc(t)}" class="stage-chip ${stage===t?'selected':''}">${esc(t==='All'?'All sections':t)}</button>`).join('');
 const sectionNav=scoped.map(({sh,i})=>`<button type="button" data-sheet="${i}" class="sheet-chip ${chosen&&chosen.i===i?'selected':''}">${esc(sh.name)}</button>`).join('');
 const isValue=v=>v!==null&&v!==undefined&&String(v).trim()!=='';
 const clean=v=>String(v??'').trim();
 const isHeader=v=>/^(match|game|tie|round|team ?1|team ?2|player ?1|player ?2|score ?1|score ?2|winner|status|court|pool|rank|name|played|wins|losses|points|pf|pa|pd|dupr|category|partner)$/i.test(clean(v));
 const sh=chosen?.sh;
 let cards='';let count=0;
 if(sh){
  const rows=sh.rows.map(r=>({r:r.r,v:r.v.map(clean)}));
  let header=null;
  for(const row of rows){
   const filled=row.v.filter(isValue);
   if(filled.length>=3 && filled.filter(isHeader).length>=3){header=row;break}
  }
  const headerIndex=header?rows.indexOf(header):-1;
  const fieldMap=header?header.v.map((v,i)=>({label:v,i})).filter(x=>isValue(x.label)):[];
  const records=rows.filter((row,idx)=>idx>headerIndex&&row.v.filter(isValue).length>=2).filter(row=>!header||row.r!==header.r);
  const valid=records.filter(row=>{
   if(!query)return true;
   return row.v.some(v=>v.toLowerCase().includes(query));
  });
  count=valid.length;
  const common=(label)=>fieldMap.find(x=>new RegExp(label,'i').test(x.label))?.i;
  const get=(row,label)=>{const idx=common(label);return idx===undefined?'':clean(row.v[idx])};
  cards=valid.map(row=>{
   const first=header?get(row,'^(match|game|tie|round|pool|name|rank)$'):row.v.find(isValue);
   const t1=get(row,'^team ?1$'),t2=get(row,'^team ?2$');
   const p1=get(row,'^player ?1$'),p2=get(row,'^player ?2$');
   const sc1=get(row,'^score ?1$'),sc2=get(row,'^score ?2$');
   const winner=get(row,'^winner$');
   const statusText=get(row,'^status$');
   const fields=(header?fieldMap.map(x=>({label:x.label,value:row.v[x.i]})):row.v.map((v,i)=>({label:'',value:v}))).filter(x=>isValue(x.value)&&!isHeader(x.value));
   if(!fields.length)return '';
   if(t1&&t2){return `<article class="fixture-card"><div class="fixture-top"><strong>${esc(first||sh.name)}</strong>${statusText?`<span class="fixture-status">${esc(statusText)}</span>`:''}</div><div class="fixture-sides"><div><b>${esc(t1)}</b>${p1?`<small>${esc(p1)}</small>`:''}</div><strong class="fixture-score">${esc(sc1||'–')} : ${esc(sc2||'–')}</strong><div><b>${esc(t2)}</b>${p2?`<small>${esc(p2)}</small>`:''}</div></div>${winner?`<div class="fixture-winner">Winner: ${esc(winner)}</div>`:''}</article>`}
   return `<article class="fixture-card"><div class="fixture-top"><strong>${esc(first||sh.name)}</strong></div><div class="detail-grid">${fields.slice(0,24).map(f=>`<div>${f.label?`<small>${esc(f.label)}</small>`:''}<span>${esc(f.value)}</span></div>`).join('')}</div></article>`;
  }).join('');
 }
 // Names extracted from explicitly labeled player columns in workbook sheets; no inference from arbitrary text.
 const players=[];const seen=new Set();
 for(const sheet of sheets){const rr=sheet.rows;for(let k=0;k<rr.length;k++){
  const cells=rr[k].v.map(clean);const idxs=cells.map((v,i)=>/^player\s*\d*$/i.test(v)?i:-1).filter(i=>i>=0);
  if(!idxs.length)continue;
  for(let j=k+1;j<rr.length;j++){const vals=rr[j].v.map(clean);if(vals.some(v=>/^player\s*\d*$/i.test(v)))break;
   for(const ix of idxs){const name=vals[ix];if(!name||/^(winner|status|team|score|vs|round|total|rank)$/i.test(name)||name.length>70||/^\d+$/.test(name))continue;
    const key=name.toLowerCase();if(!seen.has(key)){seen.add(key);players.push({name,source:sheet.name})}
   }
  }
 }}
 const playersHtml=players.length?`<div class="player-list">${players.filter(x=>!query||x.name.toLowerCase().includes(query)).sort((a,b)=>a.name.localeCompare(b.name)).map(x=>`<div class="player-item"><span class="player-initial">${esc(x.name[0])}</span><div><strong>${esc(x.name)}</strong><small>Recorded in ${esc(x.source)}</small></div></div>`).join('')}</div>`:empty('No verified player list found','Names are shown in match scorecards where recorded. A confirmed registration roster is not present in this workbook.');
 return `<section class="section workbook-section"><div class="section-heading"><div><div class="eyebrow">TOURNAMENT RECORDS</div><h2>Weekend Nights ${esc(state.weekend)}</h2></div></div>
 <div class="score-stage-nav">${nav}<button type="button" data-stage="Registered Players" class="stage-chip ${stage==='Registered Players'?'selected':''}">Players</button></div>
 ${stage==='Registered Players'?`<div class="score-filter-panel"><label>Search players<input id="scoreSearch" type="search" placeholder="Search player name" value="${esc(state.sheetSearch||'')}"></label></div><div class="score-section-header"><h3>Players found in scorecards</h3><span>Not a verified registration list</span></div>${playersHtml}`:
 `<div class="sheet-chip-row">${sectionNav}</div><div class="score-filter-panel score-filter-simple"><label>Search this section<input id="scoreSearch" type="search" placeholder="Player, team, score or match" value="${esc(state.sheetSearch||'')}"></label><button class="outline score-clear" data-clear-score="1">Clear</button></div><div class="score-section-header"><h3>${esc(sh?.name||'No sections')}</h3><span>${count} records</span></div><div class="fixture-grid">${cards||empty('No matching results','Choose another section or clear your search.')}</div>`}
 </section>`;
}
function historyDetails(){const event=state.history[state.weekend];if(!event)return '';let result='';if(event.winners){result+=`<section class="history-winners"><h2>Weekend Nights ${esc(state.weekend)} — Winners</h2><div class="history-winner-grid">${[['GOLD','gold'],['SILVER','silver'],['BRONZE','bronze']].map(([label,key])=>`<div class="history-winner"><small>${label}</small><strong>${esc(event.winners[key])}</strong></div>`).join('')}</div></section>`}if(event.standings)result+=historyTable('Final Team Standings',[['#','rank'],['Team','team'],['Pool','pool'],['Played','played'],['Wins','wins'],['Draws','draws'],['Losses','losses'],['Points','points'],['Match Wins','matchWins'],['PD','pd']],event.standings);if(event.playerLeaderboard)result+=historyTable('Weekend Nights 3 — Player Leaderboard',[['#','rank'],['Player','player'],['Matches','matches'],['Wins','wins'],['Losses','losses'],['PF','pf'],['PA','pa'],['PD','pd'],['Win %','winPct']],event.playerLeaderboard);if(event.monthlyPlayerRankings)result+=historyTable('Monthly Player Rankings (as shown on WN3 dashboard)',[['#','rank'],['Player','player'],['Total MP','matches'],['Wins','wins'],['Losses','losses'],['PF','pf'],['PA','pa'],['PD','pd'],['Win %','winPct'],['WN3 Wins','wn3Wins']],event.monthlyPlayerRankings);return result}
function renderOther(){
if(["staff","players","livefixtures"].includes(state.page)){const mode=state.page==="livefixtures"?"live":state.page; if(!document.getElementById("staffContent")||document.getElementById("staffContent").dataset.mode!==mode){$("main").innerHTML=`<div class="page-intro"><h1>${state.page==="staff"?"Organiser management":state.page==="players"?"Registered players":"Live fixtures"}</h1></div><div id="staffContent" data-mode="${mode}">Loading…</div>`;window.PYKLN_STAFF?.render(mode);}return;}
const p=state.page;
const headings={profile:["PLAYER PROFILE","Your pickleball identity"],tournaments:["TOURNAMENTS","Every event. One club."],scores:["SCORE CENTER","Every point matters."],leaderboard:["LEADERBOARD","Rise through the ranks."],register:["REGISTRATION","Join the next tournament."]};
const [label,title]=headings[p];
let content="";
if(p==="tournaments")content=weekendPicker()+historyDetails()+workbookSection()+(state.weekend==="3"?"":historicalMatches())+`<div class="section-heading"><h2>Upcoming & live tournaments</h2></div><div class="event-grid">${state.tournaments.length?state.tournaments.map(t=>eventCard(t)).join(""):empty("No tournaments yet","Events will appear once they are created in Supabase.")}</div>`;
if(p==="scores")content=weekendPicker()+`<div class="history-heading"><h2>Completed matches — tournament history</h2></div>`+(state.weekend==="3"?historyDetails():historicalMatches())+workbookSection()+`<div class="section-heading"><h2>Live score center</h2></div><div class="tabs"><button data-tab="live" class="${state.tab==="live"?"selected":""}">Live</button><button data-tab="completed" class="${state.tab==="completed"?"selected":""}">Completed</button><button data-tab="upcoming" class="${state.tab==="upcoming"?"selected":""}">Upcoming</button></div><div class="match-grid">${matchSection()}</div>`;
if(p==="register"){const open=state.tournaments.filter(t=>t.registration_open);content=`<div class="notice">Registration submissions are not enabled in V1. Secure player authentication, registration forms and payment rules will be added in the next release. No payment should be made through this preview.</div><br><div class="event-grid">${open.length?open.map(t=>eventCard(t,true)).join(""):empty("Registration currently closed","Upcoming registration opportunities will appear here.")}</div>`}
if(p==="profile")content='<div id="profileContent"></div>';
if(p==="leaderboard")content=weekendPicker()+historyDetails()+workbookSection();
$("main").innerHTML=`<div class="page-intro"><div class="eyebrow">${label}</div><h1>${title}</h1><p>PYKLN CLUB · VISAKHAPATNAM</p></div>${content}`;
if(p==="profile")window.PYKLN_AUTH?.renderProfile();
}
function render(){
$("pageName").textContent=state.page.charAt(0).toUpperCase()+state.page.slice(1);
document.querySelectorAll("#nav button").forEach(b=>b.classList.toggle("active",b.dataset.page===state.page));
if(state.page==="home")renderHome();else renderOther();
}
document.addEventListener("change",e=>{if(e.target.id==="weekendSelect"){state.weekend=e.target.value;render()}});
document.addEventListener('change',e=>{if(e.target.id==='scoreCategory'){state.sheetCategory=e.target.value;const arr=state.workbooks[state.weekend]||[];const i=arr.findIndex(x=>state.sheetCategory==='All sections'||sheetCategory(x.name)===state.sheetCategory);state.sheetIndex[state.weekend]=Math.max(0,i);state.sheetSearch='';render()}if(e.target.id==='scoreSheet'){state.sheetIndex[state.weekend]=Number(e.target.value);state.sheetSearch='';render()}if(e.target.id==='scoreSearch'){state.sheetSearch=e.target.value;render()}});
document.addEventListener('input',e=>{if(e.target.id==='scoreSearch'){state.sheetSearch=e.target.value;const q=state.sheetSearch.toLowerCase();document.querySelectorAll('.fixture-card,.player-item').forEach(card=>{card.hidden=!card.textContent.toLowerCase().includes(q)});}});
document.addEventListener("click",e=>{
const stageBtn=e.target.closest("[data-stage]");if(stageBtn){state.sheetCategory=stageBtn.dataset.stage;state.sheetSearch="";render();return}const clear=e.target.closest("[data-clear-score]");if(clear){state.sheetCategory="All";state.sheetIndex[state.weekend]=0;state.sheetSearch="";render();return}const sheet=e.target.closest("[data-sheet]");if(sheet){state.sheetIndex[state.weekend]=Number(sheet.dataset.sheet);render();return}
const tab=e.target.closest("[data-tab]");if(tab){state.tab=tab.dataset.tab;render();return}
const go=e.target.closest("[data-go]");if(go){state.page=go.dataset.go;render();scrollTo(0,0);return}
const nav=e.target.closest("[data-page]");if(nav){state.page=nav.dataset.page;$("sidebar").classList.remove("open");render();scrollTo(0,0)}
});
window.PYKLN_RENDER_PROFILE=()=>{if(state.page==="profile")window.PYKLN_AUTH?.renderProfile()};
$("accountBtn").addEventListener("click",()=>{state.page="profile";render();scrollTo(0,0)});
$("menuToggle").addEventListener("click",()=>$("sidebar").classList.toggle("open"));
$("refreshBtn").addEventListener("click",sync);
$("year").textContent=new Date().getFullYear();
window.homeTemplate=$("main").innerHTML;
render();sync();setInterval(()=>{if(!document.hidden)sync()},Math.max(cfg.refreshMs||20000,10000));
})();
