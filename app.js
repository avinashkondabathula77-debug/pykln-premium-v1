(() => {
"use strict";
const cfg=window.PYKLN_CONFIG;
const state={page:"home",tab:"live",tournaments:[],matches:[],teams:[],error:null};
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
function renderOther(){
const p=state.page;
const headings={profile:["PLAYER PROFILE","Your pickleball identity"],tournaments:["TOURNAMENTS","Every event. One club."],scores:["SCORE CENTER","Every point matters."],leaderboard:["LEADERBOARD","Rise through the ranks."],register:["REGISTRATION","Join the next tournament."]};
const [label,title]=headings[p];
let content="";
if(p==="tournaments")content=`<div class="event-grid">${state.tournaments.length?state.tournaments.map(t=>eventCard(t)).join(""):empty("No tournaments yet","Events will appear once they are created in Supabase.")}</div>`;
if(p==="scores")content=`<div class="tabs"><button data-tab="live" class="${state.tab==="live"?"selected":""}">Live</button><button data-tab="completed" class="${state.tab==="completed"?"selected":""}">Completed</button><button data-tab="upcoming" class="${state.tab==="upcoming"?"selected":""}">Upcoming</button></div><div class="match-grid">${matchSection()}</div>`;
if(p==="register"){const open=state.tournaments.filter(t=>t.registration_open);content=`<div class="notice">Registration submissions are not enabled in V1. Secure player authentication, registration forms and payment rules will be added in the next release. No payment should be made through this preview.</div><br><div class="event-grid">${open.length?open.map(t=>eventCard(t,true)).join(""):empty("Registration currently closed","Upcoming registration opportunities will appear here.")}</div>`}
if(p==="profile")content='<div id="profileContent"></div>';
if(p==="leaderboard")content='<div class="notice">The individual player leaderboard will become available after verified match results, player rosters and scoring rules are connected. No rankings are fabricated in this preview.</div>';
$("main").innerHTML=`<div class="page-intro"><div class="eyebrow">${label}</div><h1>${title}</h1><p>PYKLN CLUB · VISAKHAPATNAM</p></div>${content}`;
if(p==="profile")window.PYKLN_AUTH?.renderProfile();
}
function render(){
$("pageName").textContent=state.page.charAt(0).toUpperCase()+state.page.slice(1);
document.querySelectorAll("#nav button").forEach(b=>b.classList.toggle("active",b.dataset.page===state.page));
if(state.page==="home")renderHome();else renderOther();
}
document.addEventListener("click",e=>{
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
