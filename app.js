// Triguard Netflix-style CRM — Vanilla JS, no deps.
// Data is persisted in localStorage. CSV import/export supported.

const LS_KEY = "triguardCRM_v1";

// ---------- Utility ----------
const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => Array.from(document.querySelectorAll(sel));

function uid() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36).slice(4);
}

function fmtMoney(n) {
  n = Number(n||0);
  return n.toLocaleString(undefined, {style: 'currency', currency: 'USD', maximumFractionDigits: 0});
}

// Naive CSV parser (no quoted commas). Good enough for simple imports.
function parseCSV(text){
  const lines = text.trim().split(/\r?\n/);
  const headers = lines.shift().split(",").map(h=>h.trim());
  return lines.map(line=>{
    const cols = line.split(",").map(c=>c.trim());
    const obj = {};
    headers.forEach((h,i)=> obj[h] = cols[i] ?? "");
    return obj;
  });
}

function toCSV(rows){
  if(!rows.length) return "";
  const headers = Object.keys(rows[0]);
  const lines = [headers.join(",")];
  for(const r of rows){
    lines.push(headers.map(h => String(r[h] ?? "").replace(/,/g," ")).join(","));
  }
  return lines.join("\n");
}

// ---------- Data Store ----------
const stages = ["New","Contacted","Appointment","Estimate Sent","Insurance","Scheduled","In Progress","Won","Lost"];
const sources = ["Website","Facebook","Google Ads","Door Knock","Referral","Angi","HomeAdvisor","Storm List"];
const owners = ["Katherine","Jose","Marina","Frank","Sam"];

function samplePhoto(i){
  const tags = ["roof","house","contractor","home","suburb","texas","neighborhood"];
  return `https://images.unsplash.com/photo-15${80 + (i%20)}${60 + (i%30)}${40 + (i%10)}-?q=80&w=1200&auto=format&fit=crop`;
}

function stockPhoto(keyword){
  return `https://source.unsplash.com/collection/483251/600x400?${encodeURIComponent(keyword)}`;
}

function defaultData(){
  const today = Date.now();
  const cities = ["Corpus Christi","Dallas","Fort Worth","McAllen","Brownsville","Arlington","Plano","Frisco"];
  const leads = Array.from({length: 32}).map((_,i)=>{
    const city = cities[i % cities.length];
    const stage = stages[i % stages.length];
    const createdAt = today - (i*86400000);
    const estValue = 7000 + (i%9)*1500;
    const owner = owners[i % owners.length];
    const score = 40 + (i*7)%55;
    const photoUrl = stockPhoto(i%3===0? "roof" : (i%3===1? "contractor" : "house"));
    return {
      id: uid(), name: `Lead ${i+1}`, phone: `833-517-76${(60+i)%100}`,
      email: `lead${i+1}@example.com`, address: `${120+i} Main St`, city,
      source: sources[i % sources.length],
      stage, owner, estValue, score,
      appointmentAt: (i%5===0) ? new Date(today + (i%7)*86400000).toISOString() : "",
      createdAt, notes: "", photoUrl
    };
  });
  const jobs = leads.filter(l => ["Scheduled","In Progress","Won"].includes(l.stage)).map((l, i)=> ({
    id: uid(), leadId: l.id, status: l.stage === "Won" ? "closed" : "open",
    crewId: owners[i % owners.length], material: (i%2?"TAMKO Titan XT":"Metal"), squares: 20+(i%10),
    permitStatus: (i%3? "Submitted":"Approved"), scheduledDate: new Date(today + (i%10)*86400000).toISOString(),
    total: l.estValue, collected: l.stage==="Won"? l.estValue : Math.round(l.estValue*0.2)
  }));
  const crews = owners.map((name,i)=>({id:name, name, capacity: (i%2? 3:2), scheduled: (i%3? 2:1)}));
  const activities = [];
  return {leads, jobs, crews, activities};
}

let DB = null;

function load() {
  const raw = localStorage.getItem(LS_KEY);
  if(raw){
    try { DB = JSON.parse(raw); }
    catch { DB = defaultData(); save(); }
  } else {
    DB = defaultData(); save();
  }
}

function save() {
  localStorage.setItem(LS_KEY, JSON.stringify(DB));
  renderAll();
}

function addLead(partial){
  const lead = Object.assign({
    id: uid(), name:"", phone:"", email:"", address:"", city:"",
    source:"Website", stage:"New", owner:"Katherine", estValue:0, score:50,
    appointmentAt:"", createdAt: Date.now(), notes:"", photoUrl: stockPhoto("roof")
  }, partial||{});
  DB.leads.unshift(lead);
  save();
  logActivity({entityType:"Lead", entityId: lead.id, type:"create", notes:"Lead created"});
  openDetail(lead.id);
}

function updateLead(id, changes){
  const idx = DB.leads.findIndex(l=>l.id===id);
  if(idx>=0){
    DB.leads[idx] = {...DB.leads[idx], ...changes};
    save();
    logActivity({entityType:"Lead", entityId: id, type:"update", notes: Object.keys(changes).join(", ")});
  }
}
function deleteLead(id){
  DB.leads = DB.leads.filter(l=>l.id!==id);
  DB.jobs = DB.jobs.filter(j=>j.leadId!==id);
  DB.activities = DB.activities.filter(a=>a.entityId!==id);
  save();
}

function logActivity({entityType, entityId, type, notes}){
  DB.activities.unshift({
    id: uid(), entityType, entityId, type, userId:"current", at: Date.now(), notes
  });
  localStorage.setItem(LS_KEY, JSON.stringify(DB));
}

// ---------- UI State ----------
const state = {
  query:"", city:"", source:"", stage:"", owner:"",
  view:"home"
};

// ---------- Rendering ----------
function renderFilters(){
  // Populate dropdowns from data
  fillSelect($("#fCity"), unique(DB.leads.map(l=>l.city).filter(Boolean)));
  fillSelect($("#fSource"), unique(DB.leads.map(l=>l.source).filter(Boolean)));
  fillSelect($("#fOwner"), unique(DB.leads.map(l=>l.owner).filter(Boolean)));
}
function fillSelect(sel, values){
  const val = sel.value;
  sel.innerHTML = `<option value="">All</option>` + values.map(v=>`<option>${v}</option>`).join("");
  sel.value = val;
}
function unique(arr){ return [...new Set(arr)].sort(); }

function applyFilters(arr){
  return arr.filter(l => {
    if(state.query){
      const q = state.query.toLowerCase();
      const hay = [l.name,l.city,l.phone,l.stage,l.owner,l.email,l.source].join(" ").toLowerCase();
      if(!hay.includes(q)) return false;
    }
    if(state.city && l.city !== state.city) return false;
    if(state.source && l.source !== state.source) return false;
    if(state.stage && l.stage !== state.stage) return false;
    if(state.owner && l.owner !== state.owner) return false;
    return true;
  });
}

function cardFromLead(lead){
  const tpl = $("#cardTemplate").content.cloneNode(true);
  const el = tpl.querySelector(".card");
  el.dataset.id = lead.id;
  const img = tpl.querySelector(".card-img");
  img.src = lead.photoUrl || stockPhoto("roofing");
  img.alt = `Photo for ${lead.name}`;
  tpl.querySelector(".card-title").textContent = lead.name || "(no name)";
  tpl.querySelector(".card-sub").textContent = `${lead.city || "—"} • ${lead.source}`;
  tpl.querySelector(".pill-stage").textContent = lead.stage;
  tpl.querySelector(".pill-score").textContent = `Score ${lead.score}`;
  tpl.querySelector(".pill-value").textContent = fmtMoney(lead.estValue);
  el.addEventListener("click", ()=> openDetail(lead.id));
  return tpl;
}

function renderRows(){
  // AI Picks: highest score not in Won/Lost
  const ai = DB.leads
    .filter(l=> !["Won","Lost"].includes(l.stage))
    .sort((a,b)=> b.score - a.score).slice(0,12);
  const leads = applyFilters(DB.leads).slice(0,20);
  const jobs = DB.leads.filter(l=> l.stage==="In Progress" || l.stage==="Scheduled").slice(0,20);
  const follow = DB.leads.filter(l=> l.stage==="Estimate Sent" || l.stage==="Insurance").slice(0,20);

  fillRow($("#rowNba"), ai);
  fillRow($("#rowLeads"), leads);
  fillRow($("#rowJobs"), jobs);
  fillRow($("#rowFollow"), follow);
}

function fillRow(container, list){
  container.innerHTML = "";
  list.forEach(lead=> container.appendChild(cardFromLead(lead)));
}

function renderKPIs(){
  const now = Date.now();
  const seven = 7*86400000;
  const mStart = new Date(); mStart.setDate(1); mStart.setHours(0,0,0,0);
  const newLeads = DB.leads.filter(l=> now - l.createdAt <= seven).length;
  const appts = DB.leads.filter(l=> l.appointmentAt && (new Date(l.appointmentAt)-0) - now <= seven && (new Date(l.appointmentAt)-0) >= 0).length;
  const inProg = DB.leads.filter(l=> l.stage==="In Progress").length;
  const revenue = DB.leads.filter(l=> l.stage==="Won" && l.createdAt >= mStart.getTime()).reduce((s,l)=> s+Number(l.estValue||0),0);
  $("#kpiNewLeads").textContent = newLeads;
  $("#kpiAppts").textContent = appts;
  $("#kpiInProg").textContent = inProg;
  $("#kpiRevenue").textContent = fmtMoney(revenue);
}

function renderKanban(){
  const cols = [
    {name:"New"}, {name:"Appointment"}, {name:"Estimate Sent"}, {name:"Scheduled"}, {name:"In Progress"}
  ];
  const wrap = $("#kanban");
  wrap.innerHTML = "";
  for(const c of cols){
    const column = document.createElement("div");
    column.className = "column";
    column.innerHTML = `<h4>${c.name}</h4><div class="col-list" data-stage="${c.name}"></div>`;
    wrap.appendChild(column);
    const list = wrap.querySelector(`.col-list[data-stage="${c.name}"]`);
    const items = DB.leads.filter(l=> l.stage===c.name).slice(0,30);
    for(const l of items){
      const card = document.createElement("div");
      card.className = "col-card";
      card.innerHTML = `
        <div class="title">${l.name || "(no name)"} — <span class="pill">${l.city||"—"}</span></div>
        <div class="meta"><span>${l.source}</span><span>${fmtMoney(l.estValue)}</span></div>
      `;
      card.addEventListener("click", ()=> openDetail(l.id));
      list.appendChild(card);
    }
  }
}

function renderReports(){
  renderRevenueChart();
  renderFunnelChart();
  renderSourcesChart();
  renderCrewChart();
}

function drawAxes(ctx, w, h, padding=40){
  ctx.strokeStyle = "#38405a"; ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(padding, 10); ctx.lineTo(padding, h-padding); ctx.lineTo(w-10, h-padding); ctx.stroke();
}

function renderRevenueChart(){
  const c = $("#chartRevenue"); const ctx = c.getContext("2d");
  ctx.clearRect(0,0,c.width,c.height);
  drawAxes(ctx, c.width, c.height);

  // last 6 months buckets
  const now = new Date();
  const labels = [];
  const buckets = [];
  for(let i=5;i>=0;i--){
    const d = new Date(now.getFullYear(), now.getMonth()-i, 1);
    labels.push(d.toLocaleString(undefined,{month:"short"}));
    const start = new Date(d.getFullYear(), d.getMonth(), 1).getTime();
    const end = new Date(d.getFullYear(), d.getMonth()+1, 1).getTime();
    const sum = DB.leads.filter(l=> l.stage==="Won" && l.createdAt>=start && l.createdAt<end)
      .reduce((s,l)=> s + Number(l.estValue||0), 0);
    buckets.push(sum);
  }

  const padding = 40, w=c.width, h=c.height;
  const max = Math.max(1, ...buckets);
  const bw = (w - padding - 20) / (buckets.length);
  ctx.fillStyle = "#6aa9ff";
  buckets.forEach((v, i)=>{
    const x = padding + i * bw + 8;
    const bh = Math.round((v/max) * (h - padding - 20));
    const y = h - padding - bh;
    ctx.fillRect(x, y, bw - 16, bh);
    // label
    ctx.fillStyle = "#9aa3b2"; ctx.font = "12px system-ui"; ctx.fillText(labels[i], x, h - padding + 14);
    ctx.fillStyle = "#6aa9ff";
  });
}

function renderFunnelChart(){
  const c = $("#chartFunnel"); const ctx = c.getContext("2d");
  ctx.clearRect(0,0,c.width,c.height);
  drawAxes(ctx, c.width, c.height);
  const rangeMs = 90*86400000, now = Date.now();
  const inRange = DB.leads.filter(l=> now - l.createdAt <= rangeMs);
  const counts = [
    inRange.length,
    inRange.filter(l=> ["Contacted","Appointment","Estimate Sent","Insurance","Scheduled","In Progress","Won"].includes(l.stage)).length,
    inRange.filter(l=> ["Appointment","Estimate Sent","Insurance","Scheduled","In Progress","Won"].includes(l.stage)).length,
    inRange.filter(l=> ["Estimate Sent","Insurance","Scheduled","In Progress","Won"].includes(l.stage)).length,
    inRange.filter(l=> ["Scheduled","In Progress","Won"].includes(l.stage)).length,
    inRange.filter(l=> ["Won"].includes(l.stage)).length,
  ];
  const labels = ["Leads","Contacted","Appt","Est","Sched","Won"];
  const padding = 40, w=c.width, h=c.height;
  const max = Math.max(...counts, 1);
  const bw = (w - padding - 20) / (counts.length);
  ctx.fillStyle = "#22c55e";
  counts.forEach((v, i)=>{
    const x = padding + i * bw + 8;
    const bh = Math.round((v/max) * (h - padding - 20));
    const y = h - padding - bh;
    ctx.fillRect(x, y, bw - 16, bh);
    ctx.fillStyle = "#9aa3b2"; ctx.font = "12px system-ui"; ctx.fillText(labels[i], x, h - padding + 14);
    ctx.fillStyle = "#22c55e";
  });
}

function renderSourcesChart(){
  const c = $("#chartSources"); const ctx = c.getContext("2d");
  ctx.clearRect(0,0,c.width,c.height);
  // Pie chart
  const counts = {};
  for(const l of DB.leads){
    counts[l.source] = (counts[l.source]||0)+1;
  }
  const entries = Object.entries(counts);
  const total = entries.reduce((s,[,v])=>s+v,0) || 1;
  const cx=c.width/2, cy=c.height/2, r=Math.min(cx,cy)-10;
  let start = -Math.PI/2;
  entries.forEach(([k,v],i)=>{
    const angle = (v/total) * Math.PI*2;
    // auto color via HSL
    const hue = (i*67) % 360;
    ctx.fillStyle = `hsl(${hue}deg 60% 50%)`;
    ctx.beginPath();
    ctx.moveTo(cx,cy); ctx.arc(cx,cy,r,start,start+angle); ctx.closePath(); ctx.fill();
    // label
    const mid = start + angle/2;
    const lx = cx + Math.cos(mid)*(r*0.65);
    const ly = cy + Math.sin(mid)*(r*0.65);
    ctx.fillStyle="#e6e6e6"; ctx.font="12px system-ui"; ctx.fillText(k, lx-20, ly);
    start += angle;
  });
  // border
  ctx.strokeStyle="#1e2236"; ctx.lineWidth=2; ctx.beginPath(); ctx.arc(cx,cy,r,0,Math.PI*2); ctx.stroke();
}

function renderCrewChart(){
  const c = $("#chartCrew"); const ctx = c.getContext("2d");
  ctx.clearRect(0,0,c.width,c.height);
  drawAxes(ctx, c.width, c.height);
  const crews = DB.crews;
  const capacity = crews.map(c=>c.capacity);
  const scheduled = crews.map(c=>c.scheduled);
  const labels = crews.map(c=>c.name);
  const padding=40, w=c.width, h=c.height, max = Math.max(...capacity, ...scheduled, 1);
  const colw = (w - padding - 20) / (crews.length);
  labels.forEach((lab, i)=>{
    const x = padding + i*colw + 10;
    const capH = Math.round((capacity[i]/max) * (h - padding - 30));
    const schH = Math.round((scheduled[i]/max) * (h - padding - 30));
    const base = h - padding;
    // capacity
    ctx.fillStyle = "#64748b"; ctx.fillRect(x, base-capH, colw/2 - 6, capH);
    // scheduled
    ctx.fillStyle = "#f59e0b"; ctx.fillRect(x + colw/2, base-schH, colw/2 - 6, schH);
    ctx.fillStyle="#9aa3b2"; ctx.font="12px system-ui"; ctx.fillText(lab, x, h - padding + 14);
  });
}

// ---------- Modal ----------
let currentId = null;
function openDetail(id){
  const lead = DB.leads.find(l=>l.id===id);
  if(!lead) return;
  currentId = id;
  $("#detailTitle").textContent = `Lead — ${lead.name || "(no name)"}`;
  $("#detailPhoto").src = lead.photoUrl || stockPhoto("roofing");
  $("#detailName").value = lead.name || "";
  $("#detailPhone").value = lead.phone || "";
  $("#detailEmail").value = lead.email || "";
  $("#detailAddress").value = lead.address || "";
  $("#detailCity").value = lead.city || "";
  $("#detailSource").value = lead.source || "";
  $("#detailStage").value = lead.stage || "New";
  $("#detailOwner").value = lead.owner || "";
  $("#detailValue").value = lead.estValue || 0;
  $("#detailScore").value = lead.score || 50;
  $("#detailNotes").value = lead.notes || "";

  // audit
  const acts = DB.activities.filter(a=>a.entityId===id).slice(0,30);
  const log = acts.map(a=>{
    const d = new Date(a.at).toLocaleString();
    return `<div>• <b>${a.type}</b> — ${d} — <span class="muted">${a.notes||""}</span></div>`;
  }).join("");
  $("#auditLog").innerHTML = `<div><b>Activity</b></div>${log || "<div class='muted'>No activity yet.</div>"}`;

  $("#detailModal").showModal();
}

function saveDetail(){
  if(!currentId) return;
  updateLead(currentId, {
    name: $("#detailName").value.trim(),
    phone: $("#detailPhone").value.trim(),
    email: $("#detailEmail").value.trim(),
    address: $("#detailAddress").value.trim(),
    city: $("#detailCity").value.trim(),
    source: $("#detailSource").value.trim(),
    stage: $("#detailStage").value,
    owner: $("#detailOwner").value.trim(),
    estValue: Number($("#detailValue").value||0),
    score: Math.max(0, Math.min(100, Number($("#detailScore").value||0))),
    notes: $("#detailNotes").value
  });
  $("#detailModal").close();
}

function deleteDetail(){
  if(!currentId) return;
  if(confirm("Delete this lead? This cannot be undone.")){
    deleteLead(currentId);
    $("#detailModal").close();
  }
}

// ---------- Event Wiring ----------
function bindEvents(){
  $("#btnAddLead").addEventListener("click", ()=> addLead({name:"New Lead", city:"Dallas", source:"Website"}));
  $("#btnImportCsv").addEventListener("click", ()=> $("#fileCsv").click());
  $("#fileCsv").addEventListener("change", onCsvSelect);
  $("#btnExportCsv").addEventListener("click", exportCsv);
  $("#btnToggleKanban").addEventListener("click", ()=> toggleView("kanban"));
  $("#btnToggleReports").addEventListener("click", ()=> toggleView("reports"));
  $("#btnClearFilters").addEventListener("click", ()=> { state.query=state.city=state.source=state.stage=state.owner=""; $("#q").value=""; $("#fCity").value=""; $("#fSource").value=""; $("#fStage").value=""; $("#fOwner").value=""; renderAll(); });

  $("#q").addEventListener("input", (e)=>{ state.query=e.target.value; renderAll(); });
  $("#fCity").addEventListener("change", (e)=>{ state.city=e.target.value; renderAll(); });
  $("#fSource").addEventListener("change", (e)=>{ state.source=e.target.value; renderAll(); });
  $("#fStage").addEventListener("change", (e)=>{ state.stage=e.target.value; renderAll(); });
  $("#fOwner").addEventListener("change", (e)=>{ state.owner=e.target.value; renderAll(); });

  $("#btnSave").addEventListener("click", (e)=>{ e.preventDefault(); saveDetail(); });
  $("#btnDelete").addEventListener("click", (e)=>{ e.preventDefault(); deleteDetail(); });
  $("#btnCloseModal").addEventListener("click", (e)=>{ e.preventDefault(); $("#detailModal").close(); });

  // Quick actions
  $("#btnCall").addEventListener("click", ()=> alert("Dialer integration placeholder. Use tel: or Twilio/CallRail APIs."));
  $("#btnText").addEventListener("click", ()=> alert("SMS integration placeholder. Hook to Twilio/CallRail."));
  $("#btnEmail").addEventListener("click", ()=> alert("Email integration placeholder. Use mailto: or SMTP API."));
  $("#btnFinance").addEventListener("click", ()=> navigator.clipboard.writeText("Hi! Ask about our 0% APR promo. Reply YES for details and quick pre-qual.").then(()=> alert("Promo text copied to clipboard.")));

  // AI templates
  $$(".ai-templates .btn.small").forEach(btn=>{
    btn.addEventListener("click", (e)=>{
      e.preventDefault();
      const kind = btn.dataset.tpl;
      const lead = DB.leads.find(l=>l.id===currentId);
      let text = "";
      if(kind==="call"){
        text = `Hi ${lead?.name||""}, this is Triguard. I'm reviewing your roof request. I can get you a same‑week inspection and a written estimate. Does tomorrow 3–5pm work?`;
      }else if(kind==="adjuster"){
        text = `Hi ${lead?.name||""}, Triguard here. I can coordinate your insurance adjuster window and be on‑site. What’s your preferred day/time?`;
      }else if(kind==="promo"){
        text = `Good news: 0% APR promo available for qualified customers. Quick pre‑qual—no impact on credit. Want the link?`;
      }
      navigator.clipboard.writeText(text).then(()=> alert("Copied to clipboard."));
    });
  });
}

function toggleView(which){
  state.view = which==="kanban" ? "kanban" : which==="reports" ? "reports" : "home";
  $("#homeView").classList.toggle("hidden", state.view!=="home");
  $("#kanbanView").classList.toggle("hidden", state.view!=="kanban");
  $("#reportsView").classList.toggle("hidden", state.view!=="reports");
  if(state.view==="kanban") renderKanban();
  if(state.view==="reports") renderReports();
}

function onCsvSelect(e){
  const f = e.target.files[0];
  if(!f) return;
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const rows = parseCSV(reader.result);
      // Expected fields: name,phone,email,address,city,source,stage,owner,estValue,score,photoUrl
      rows.forEach(r=> addLead({
        name:r.name, phone:r.phone, email:r.email, address:r.address, city:r.city,
        source:r.source||"Website", stage: stages.includes(r.stage)? r.stage : "New",
        owner:r.owner||"Katherine", estValue: Number(r.estValue||0), score: Number(r.score||50),
        photoUrl: r.photoUrl || stockPhoto("roof")
      }));
      alert(`Imported ${rows.length} leads.`);
      e.target.value = "";
    } catch(err){
      alert("Import failed: " + err.message);
    }
  };
  reader.readAsText(f);
}

function exportCsv(){
  const rows = DB.leads.map(l=> ({
    id:l.id, name:l.name, phone:l.phone, email:l.email, address:l.address, city:l.city,
    source:l.source, stage:l.stage, owner:l.owner, estValue:l.estValue, score:l.score, photoUrl:l.photoUrl
  }));
  const csv = toCSV(rows);
  const blob = new Blob([csv], {type: "text/csv"});
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = "leads.csv";
  a.click();
  URL.revokeObjectURL(a.href);
}

// ---------- Main Render ----------
function renderAll(){
  renderFilters();
  renderKPIs();
  renderRows();
  if(state.view==="kanban") renderKanban();
  if(state.view==="reports") renderReports();
}

// ---------- Init ----------
load();
bindEvents();
renderAll();
toggleView("home");
