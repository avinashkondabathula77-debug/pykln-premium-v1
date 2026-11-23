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
 if(!sheets)return state.weekend==='3'?'':empty('Loading tournament data','The scorecard sections will appear here.');
 const selected=Math.min(state.sheetIndex[state.weekend]||0,sheets.length-1),sh=sheets[selected];
 const category=state.sheetCategory||'All sections';
 const categories=['All sections',...new Set(sheets.map(s=>sheetCategory(s.name)))];
 const options=categories.map(c=>`<option value="${esc(c)}" ${c===category?'selected':''}>${esc(c)}</option>`).join('');
 const filtered=sheets.map((s,i)=>({s,i})).filter(x=>category==='All sections'||sheetCategory(x.s.name)===category);
 const sectionOptions=filtered.map(({s,i})=>`<option value="${i}" ${i===selected?'selected':''}>${esc(s.name)}</option>`).join('');
 const search=(state.sheetSearch||'').trim().toLowerCase();
 const nonempty=v=>v!==null&&v!==undefined&&String(v).trim()!=='';
 const entries=sh.rows.map(row=>({r:row.r,values:row.v.map((v,i)=>({i,v})).filter(x=>nonempty(x.v))})).filter(x=>x.values.length);
 const matched=entries.filter(x=>!search||x.values.some(z=>String(z.v).toLowerCase().includes(search)));
 const rowCard=x=>{
  const cells=x.values;
  const first=cells[0],second=cells[1];
  const title=first&&String(first.v).length<=90?first.v:`Record ${x.r}`;
  const fields=(first&&title===first.v?cells.slice(1):cells).filter(z=>nonempty(z.v));
  return `<article class="score-record"><div class="record-top"><strong>${esc(title)}</strong><span>Entry ${x.r}</span></div><div class="record-fields">${fields.map((z,i)=>`<div class="record-field"><small>${esc(z.i===0?'Detail':`Field ${z.i+1}`)}</small><span>${esc(z.v)}</span></div>`).join('')||'<span class="record-single">Section heading</span>'}</div></article>`;
 };
 const cards=matched.map(rowCard).join('')||empty('No matching records','Try another player, team or score.');
 return `<section class="section workbook-section"><div class="section-heading"><div><div class="eyebrow">TOURNAMENT SCORECARD</div><h2>Explore WN${esc(state.weekend)} results</h2></div></div>
 <div class="score-filter-panel"><label>Stage / Category<select id="scoreCategory">${options}</select></label><label>Scorecard Section<select id="scoreSheet">${sectionOptions}</select></label><label>Find player, team or score<input id="scoreSearch" type="search" placeholder="Search within this section" value="${esc(state.sheetSearch||'')}"></label><button class="outline score-clear" data-clear-score="1">Clear filters</button></div>
 <div class="score-section-header"><div><span class="eyebrow">${esc(sheetCategory(sh.name))}</span><h3>${esc(sh.name)}</h3></div><span>${matched.length} of ${entries.length} records</span></div>
 <p class="workbook-note">Readable scorecard view from the original Excel data. Each populated record is preserved; unnamed columns are shown as fields rather than guessed as players or scores.</p>
 <div class="score-record-grid">${cards}</div></section>`;
}
function historyDetails(){const event=state.history[state.weekend];if(!event)return '';let result='';if(event.winners){result+=`<section class="history-winners"><h2>Weekend Nights ${esc(state.weekend)} — Winners</h2><div class="history-winner-grid">${[['GOLD','gold'],['SILVER','silver'],['BRONZE','bronze']].map(([label,key])=>`<div class="history-winner"><small>${label}</small><strong>${esc(event.winners[key])}</strong></div>`).join('')}</div></section>`}if(event.standings)result+=historyTable('Final Team Standings',[['#','rank'],['Team','team'],['Pool','pool'],['Played','played'],['Wins','wins'],['Draws','draws'],['Losses','losses'],['Points','points'],['Match Wins','matchWins'],['PD','pd']],event.standings);if(event.playerLeaderboard)result+=historyTable('Weekend Nights 3 — Player Leaderboard',[['#','rank'],['Player','player'],['Matches','matches'],['Wins','wins'],['Losses','losses'],['PF','pf'],['PA','pa'],['PD','pd'],['Win %','winPct']],event.playerLeaderboard);if(event.monthlyPlayerRankings)result+=historyTable('Monthly Player Rankings (as shown on WN3 dashboard)',[['#','rank'],['Player','player'],['Total MP','matches'],['Wins','wins'],['Losses','losses'],['PF','pf'],['PA','pa'],['PD','pd'],['Win %','winPct'],['WN3 Wins','wn3Wins']],event.monthlyPlayerRankings);return result}
function renderOther(){
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
document.addEventListener('input',e=>{if(e.target.id==='scoreSearch'){state.sheetSearch=e.target.value;const q=state.sheetSearch.toLowerCase();document.querySelectorAll('.score-record').forEach(card=>{card.hidden=!card.textContent.toLowerCase().includes(q)});}});
document.addEventListener("click",e=>{
const clear=e.target.closest("[data-clear-score]");if(clear){state.sheetCategory="All sections";state.sheetIndex[state.weekend]=0;state.sheetSearch="";render();return}const sheet=e.target.closest("[data-sheet]");if(sheet){state.sheetIndex[state.weekend]=Number(sheet.dataset.sheet);render();return}
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
