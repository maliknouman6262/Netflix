import React, { useState, useEffect, useRef } from 'react';
// import './style.css'; // Your existing CSS

// Utility functions from app.js (we'll move these later)
function uid() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36).slice(4);
}

function fmtMoney(n) {
  n = Number(n || 0);
  return n.toLocaleString(undefined, { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });
}

function parseCSV(text) {
  const lines = text.trim().split(/\r?\n/);
  const headers = lines.shift().split(",").map(h => h.trim());
  return lines.map(line => {
    const cols = line.split(",").map(c => c.trim());
    const obj = {};
    headers.forEach((h, i) => obj[h] = cols[i] ?? "");
    return obj;
  });
}

function toCSV(rows) {
  if (!rows.length) return "";
  const headers = Object.keys(rows[0]);
  const lines = [headers.join(",")];
  for (const r of rows) {
    lines.push(headers.map(h => String(r[h] ?? "").replace(/,/g, " ")).join(","));
  }
  return lines.join("\n");
}

const stages = ["New", "Contacted", "Appointment", "Estimate Sent", "Insurance", "Scheduled", "In Progress", "Won", "Lost"];
const sources = ["Website", "Facebook", "Google Ads", "Door Knock", "Referral", "Angi", "HomeAdvisor", "Storm List"];
const owners = ["Katherine", "Jose", "Marina", "Frank", "Sam"];

function stockPhoto(keyword) {
  return `https://source.unsplash.com/collection/483251/600x400?${encodeURIComponent(keyword)}`;
}

function defaultData() {
  const today = Date.now();
  const cities = ["Corpus Christi", "Dallas", "Fort Worth", "McAllen", "Brownsville", "Arlington", "Plano", "Frisco"];
  const leads = Array.from({ length: 32 }).map((_, i) => {
    const city = cities[i % cities.length];
    const stage = stages[i % stages.length];
    const createdAt = today - (i * 86400000);
    const estValue = 7000 + (i % 9) * 1500;
    const owner = owners[i % owners.length];
    const score = 40 + (i * 7) % 55;
    const photoUrl = stockPhoto(i % 3 === 0 ? "roof" : (i % 3 === 1 ? "contractor" : "house"));
    return {
      id: uid(), name: `Lead ${i + 1}`, phone: `833-517-76${(60 + i) % 100}`,
      email: `lead${i + 1}@example.com`, address: `${120 + i} Main St`, city,
      source: sources[i % sources.length],
      stage, owner, estValue, score,
      appointmentAt: (i % 5 === 0) ? new Date(today + (i % 7) * 86400000).toISOString() : "",
      createdAt, notes: "", photoUrl
    };
  });
  const jobs = leads.filter(l => ["Scheduled", "In Progress", "Won"].includes(l.stage)).map((l, i) => ({
    id: uid(), leadId: l.id, status: l.stage === "Won" ? "closed" : "open",
    crewId: owners[i % owners.length], material: (i % 2 ? "TAMKO Titan XT" : "Metal"), squares: 20 + (i % 10),
    permitStatus: (i % 3 ? "Submitted" : "Approved"), scheduledDate: new Date(today + (i % 10) * 86400000).toISOString(),
    total: l.estValue, collected: l.stage === "Won" ? l.estValue : Math.round(l.estValue * 0.2)
  }));
  const crews = owners.map((name, i) => ({ id: name, name, capacity: (i % 2 ? 3 : 2), scheduled: (i % 3 ? 2 : 1) }));
  const activities = [];
  return { leads, jobs, crews, activities };
}

const LS_KEY = "triguardCRM_v1";

function App() {
  const [db, setDb] = useState(() => {
    const raw = localStorage.getItem(LS_KEY);
    if (raw) {
      try {
        return JSON.parse(raw);
      } catch {
        return defaultData();
      }
    }
    return defaultData();
  });

  const [query, setQuery] = useState("");
  const [filterCity, setFilterCity] = useState("");
  const [filterSource, setFilterSource] = useState("");
  const [filterStage, setFilterStage] = useState("");
  const [filterOwner, setFilterOwner] = useState("");
  const [view, setView] = useState("home"); // home, kanban, reports
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [currentLeadId, setCurrentLeadId] = useState(null);

  const detailModalRef = useRef(null);
  const fileCsvRef = useRef(null);

  // Effect to save DB to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem(LS_KEY, JSON.stringify(db));
  }, [db]);

  // Utility to find unique values for filters
  const unique = (arr) => [...new Set(arr)].sort();

  // Filtered Leads
  const filteredLeads = db.leads.filter(lead => {
    if (query) {
      const q = query.toLowerCase();
      const hay = [lead.name, lead.city, lead.phone, lead.stage, lead.owner, lead.email, lead.source].join(" ").toLowerCase();
      if (!hay.includes(q)) return false;
    }
    if (filterCity && lead.city !== filterCity) return false;
    if (filterSource && lead.source !== filterSource) return false;
    if (filterStage && lead.stage !== filterStage) return false;
    if (filterOwner && lead.owner !== filterOwner) return false;
    return true;
  });

  // Lead CRUD operations
  const addLead = (partial) => {
    const lead = Object.assign({
      id: uid(), name: "", phone: "", email: "", address: "", city: "",
      source: "Website", stage: "New", owner: "Katherine", estValue: 0, score: 50,
      appointmentAt: "", createdAt: Date.now(), notes: "", photoUrl: stockPhoto("roof")
    }, partial || {});
    setDb(prevDb => ({
      ...prevDb,
      leads: [lead, ...prevDb.leads],
      activities: [{ id: uid(), entityType: "Lead", entityId: lead.id, type: "create", notes: "Lead created", at: Date.now() }, ...prevDb.activities]
    }));
    openDetail(lead.id);
  };

  const updateLead = (id, changes) => {
    setDb(prevDb => {
      const updatedLeads = prevDb.leads.map(lead =>
        lead.id === id ? { ...lead, ...changes } : lead
      );
      return {
        ...prevDb,
        leads: updatedLeads,
        activities: [{ id: uid(), entityType: "Lead", entityId: id, type: "update", notes: Object.keys(changes).join(", "), at: Date.now() }, ...prevDb.activities]
      };
    });
  };

  const deleteLead = (id) => {
    setDb(prevDb => ({
      ...prevDb,
      leads: prevDb.leads.filter(l => l.id !== id),
      jobs: prevDb.jobs.filter(j => j.leadId !== id),
      activities: prevDb.activities.filter(a => a.entityId !== id)
    }));
    closeDetail();
  };

  // KPI Calculations
  const now = Date.now();
  const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;
  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);

  const kpiNewLeads = db.leads.filter(l => now - l.createdAt <= sevenDaysMs).length;
  const kpiAppts = db.leads.filter(l => l.appointmentAt && (new Date(l.appointmentAt).getTime() - now) <= sevenDaysMs && (new Date(l.appointmentAt).getTime()) >= 0).length;
  const kpiInProg = db.leads.filter(l => l.stage === "In Progress").length;
  const kpiRevenue = db.leads.filter(l => l.stage === "Won" && l.createdAt >= monthStart.getTime()).reduce((s, l) => s + Number(l.estValue || 0), 0);

  // Modal handlers
  const openDetail = (id) => {
    setCurrentLeadId(id);
    setShowDetailModal(true);
    detailModalRef.current?.showModal();
  };

  const closeDetail = () => {
    setShowDetailModal(false);
    setCurrentLeadId(null);
    detailModalRef.current?.close();
  };

  const handleSaveDetail = (e) => {
    e.preventDefault();
    const currentLead = db.leads.find(l => l.id === currentLeadId);
    if (!currentLead) return;

    const updatedData = {
      name: document.getElementById("detailName").value.trim(),
      phone: document.getElementById("detailPhone").value.trim(),
      email: document.getElementById("detailEmail").value.trim(),
      address: document.getElementById("detailAddress").value.trim(),
      city: document.getElementById("detailCity").value.trim(),
      source: document.getElementById("detailSource").value.trim(),
      stage: document.getElementById("detailStage").value,
      owner: document.getElementById("detailOwner").value.trim(),
      estValue: Number(document.getElementById("detailValue").value || 0),
      score: Math.max(0, Math.min(100, Number(document.getElementById("detailScore").value || 0))),
      notes: document.getElementById("detailNotes").value
    };
    updateLead(currentLeadId, updatedData);
    closeDetail();
  };

  const handleDeleteDetail = (e) => {
    e.preventDefault();
    if (window.confirm("Delete this lead? This cannot be undone.")) { // Replace with custom modal later
      deleteLead(currentLeadId);
    }
  };

  // CSV Import/Export handlers
  const onCsvSelect = (e) => {
    const f = e.target.files[0];
    if (!f) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const rows = parseCSV(reader.result);
        rows.forEach(r => addLead({
          name: r.name, phone: r.phone, email: r.email, address: r.address, city: r.city,
          source: r.source || "Website", stage: stages.includes(r.stage) ? r.stage : "New",
          owner: r.owner || "Katherine", estValue: Number(r.estValue || 0), score: Number(r.score || 50),
          photoUrl: r.photoUrl || stockPhoto("roof")
        }));
        alert(`Imported ${rows.length} leads.`); // Replace with custom modal later
        e.target.value = "";
      } catch (err) {
        alert("Import failed: " + err.message); // Replace with custom modal later
      }
    };
    reader.readAsText(f);
  };

  const exportCsv = () => {
    const rows = db.leads.map(l => ({
      id: l.id, name: l.name, phone: l.phone, email: l.email, address: l.address, city: l.city,
      source: l.source, stage: l.stage, owner: l.owner, estValue: l.estValue, score: l.score, photoUrl: l.photoUrl
    }));
    const csv = toCSV(rows);
    const blob = new Blob([csv], { type: "text/csv" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "leads.csv";
    a.click();
    URL.revokeObjectURL(a.href);
  };

  // AI Template handler
  const handleAiTemplate = (kind) => {
    const lead = db.leads.find(l => l.id === currentLeadId);
    let text = "";
    if (kind === "call") {
      text = `Hi ${lead?.name || ""}, this is Triguard. I'm reviewing your roof request. I can get you a same‑week inspection and a written estimate. Does tomorrow 3–5pm work?`;
    } else if (kind === "adjuster") {
      text = `Hi ${lead?.name || ""}, Triguard here. I can coordinate your insurance adjuster window and be on‑site. What’s your preferred day/time?`;
    } else if (kind === "promo") {
      text = `Good news: 0% APR promo available for qualified customers. Quick pre‑qual—no impact on credit. Want the link?`;
    }
    navigator.clipboard.writeText(text).then(() => alert("Copied to clipboard.")); // Replace with custom modal later
  };

  // Renderers for charts (will be moved to separate components)
  const drawAxes = (ctx, w, h, padding = 40) => {
    ctx.strokeStyle = "#38405a"; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(padding, 10); ctx.lineTo(padding, h - padding); ctx.lineTo(w - 10, h - padding); ctx.stroke();
  };

  const renderRevenueChart = (canvas) => {
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    drawAxes(ctx, canvas.width, canvas.height);

    const labels = [];
    const buckets = [];
    const now = new Date();
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      labels.push(d.toLocaleString(undefined, { month: "short" }));
      const start = new Date(d.getFullYear(), d.getMonth(), 1).getTime();
      const end = new Date(d.getFullYear(), now.getMonth() + 1, 1).getTime(); // Corrected to use now.getMonth() for end calculation
      const sum = db.leads.filter(l => l.stage === "Won" && l.createdAt >= start && l.createdAt < end)
        .reduce((s, l) => s + Number(l.estValue || 0), 0);
      buckets.push(sum);
    }

    const padding = 40, w = canvas.width, h = canvas.height;
    const max = Math.max(1, ...buckets);
    const bw = (w - padding - 20) / (buckets.length);
    ctx.fillStyle = "#6aa9ff";
    buckets.forEach((v, i) => {
      const x = padding + i * bw + 8;
      const bh = Math.round((v / max) * (h - padding - 20));
      const y = h - padding - bh;
      ctx.fillRect(x, y, bw - 16, bh);
      ctx.fillStyle = "#9aa3b2"; ctx.font = "12px system-ui"; ctx.fillText(labels[i], x, h - padding + 14);
      ctx.fillStyle = "#6aa9ff";
    });
  };

  const renderFunnelChart = (canvas) => {
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    drawAxes(ctx, canvas.width, canvas.height);
    const rangeMs = 90 * 86400000;
    const inRange = db.leads.filter(l => now - l.createdAt <= rangeMs);
    const counts = [
      inRange.length,
      inRange.filter(l => ["Contacted", "Appointment", "Estimate Sent", "Insurance", "Scheduled", "In Progress", "Won"].includes(l.stage)).length,
      inRange.filter(l => ["Appointment", "Estimate Sent", "Insurance", "Scheduled", "In Progress", "Won"].includes(l.stage)).length,
      inRange.filter(l => ["Estimate Sent", "Insurance", "Scheduled", "In Progress", "Won"].includes(l.stage)).length,
      inRange.filter(l => ["Scheduled", "In Progress", "Won"].includes(l.stage)).length,
      inRange.filter(l => ["Won"].includes(l.stage)).length,
    ];
    const labels = ["Leads", "Contacted", "Appt", "Est", "Sched", "Won"];
    const padding = 40, w = canvas.width, h = canvas.height;
    const max = Math.max(...counts, 1);
    const bw = (w - padding - 20) / (counts.length);
    ctx.fillStyle = "#22c55e";
    counts.forEach((v, i) => {
      const x = padding + i * bw + 8;
      const bh = Math.round((v / max) * (h - padding - 20));
      const y = h - padding - bh;
      ctx.fillRect(x, y, bw - 16, bh);
      ctx.fillStyle = "#9aa3b2"; ctx.font = "12px system-ui"; ctx.fillText(labels[i], x, h - padding + 14);
      ctx.fillStyle = "#22c55e";
    });
  };

  const renderSourcesChart = (canvas) => {
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const counts = {};
    for (const l of db.leads) {
      counts[l.source] = (counts[l.source] || 0) + 1;
    }
    const entries = Object.entries(counts);
    const total = entries.reduce((s, [, v]) => s + v, 0) || 1;
    const cx = canvas.width / 2, cy = canvas.height / 2, r = Math.min(cx, cy) - 10;
    let start = -Math.PI / 2;
    entries.forEach(([k, v], i) => {
      const angle = (v / total) * Math.PI * 2;
      const hue = (i * 67) % 360;
      ctx.fillStyle = `hsl(${hue}deg 60% 50%)`;
      ctx.beginPath();
      ctx.moveTo(cx, cy); ctx.arc(cx, cy, r, start, start + angle); ctx.closePath(); ctx.fill();
      const mid = start + angle / 2;
      const lx = cx + Math.cos(mid) * (r * 0.65);
      const ly = cy + Math.sin(mid) * (r * 0.65);
      ctx.fillStyle = "#e6e6e6"; ctx.font = "12px system-ui"; ctx.fillText(k, lx - 20, ly);
      start += angle;
    });
    ctx.strokeStyle = "#1e2236"; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.stroke();
  };

  const renderCrewChart = (canvas) => {
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    drawAxes(ctx, canvas.width, canvas.height);
    const crews = db.crews;
    const capacity = crews.map(c => c.capacity);
    const scheduled = crews.map(c => c.scheduled);
    const labels = crews.map(c => c.name);
    const padding = 40, w = canvas.width, h = canvas.height, max = Math.max(...capacity, ...scheduled, 1);
    const colw = (w - padding - 20) / (crews.length);
    labels.forEach((lab, i) => {
      const x = padding + i * colw + 10;
      const capH = Math.round((capacity[i] / max) * (h - padding - 30));
      const schH = Math.round((scheduled[i] / max) * (h - padding - 30));
      const base = h - padding;
      ctx.fillStyle = "#64748b"; ctx.fillRect(x, base - capH, colw / 2 - 6, capH);
      ctx.fillStyle = "#f59e0b"; ctx.fillRect(x + colw / 2, base - schH, colw / 2 - 6, schH);
      ctx.fillStyle = "#9aa3b2"; ctx.font = "12px system-ui"; ctx.fillText(lab, x, h - padding + 14);
    });
  };

  useEffect(() => {
    if (view === "reports") {
      renderRevenueChart(document.getElementById("chartRevenue"));
      renderFunnelChart(document.getElementById("chartFunnel"));
      renderSourcesChart(document.getElementById("chartSources"));
      renderCrewChart(document.getElementById("chartCrew"));
    }
  }, [view, db]); // Re-render charts when view or db changes

  const currentLead = db.leads.find(l => l.id === currentLeadId);
  const auditLog = db.activities.filter(a => a.entityId === currentLeadId).slice(0, 30);


  return (
    <>
      <header className="topbar">
        <div className="brand">
          <img src="https://images.unsplash.com/photo-1505852679233-d9fd70aff56d?q=80&w=2000&auto=format&fit=crop" alt="Roof hero" />
          <h1>Triguard CRM</h1>
        </div>
        <div className="global-actions">
          <button id="btnAddLead" className="btn primary" onClick={() => addLead({ name: "New Lead", city: "Dallas", source: "Website" })}>+ New Lead</button>
          <button id="btnImportCsv" className="btn" onClick={() => fileCsvRef.current.click()}>Import CSV</button>
          <input type="file" id="fileCsv" accept=".csv" style={{ display: 'none' }} ref={fileCsvRef} onChange={onCsvSelect} />
          <button id="btnExportCsv" className="btn" onClick={exportCsv}>Export CSV</button>
          <button id="btnToggleKanban" className="btn" onClick={() => setView("kanban")}>Kanban</button>
          <button id="btnToggleReports" className="btn" onClick={() => setView("reports")}>Reports</button>
        </div>
      </header>

      <section className="toolbar">
        <input
          id="q"
          className="input"
          placeholder="Search (name, city, phone, stage)…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <select id="fCity" className="input" value={filterCity} onChange={(e) => setFilterCity(e.target.value)}>
          <option value="">All Cities</option>
          {unique(db.leads.map(l => l.city).filter(Boolean)).map(city => <option key={city}>{city}</option>)}
        </select>
        <select id="fSource" className="input" value={filterSource} onChange={(e) => setFilterSource(e.target.value)}>
          <option value="">All Sources</option>
          {unique(db.leads.map(l => l.source).filter(Boolean)).map(source => <option key={source}>{source}</option>)}
        </select>
        <select id="fStage" className="input" value={filterStage} onChange={(e) => setFilterStage(e.target.value)}>
          <option value="">All Stages</option>
          {stages.map(stage => <option key={stage}>{stage}</option>)}
        </select>
        <select id="fOwner" className="input" value={filterOwner} onChange={(e) => setFilterOwner(e.target.value)}>
          <option value="">All Owners</option>
          {unique(db.leads.map(l => l.owner).filter(Boolean)).map(owner => <option key={owner}>{owner}</option>)}
        </select>
        <button className="btn" onClick={() => { setQuery(""); setFilterCity(""); setFilterSource(""); setFilterStage(""); setFilterOwner(""); }}>Clear</button>
      </section>

      <section id="kpis" className="kpis">
        <div className="kpi"><div className="kpi-label">New Leads (7d)</div><div id="kpiNewLeads" className="kpi-value">{kpiNewLeads}</div></div>
        <div className="kpi"><div className="kpi-label">Appointments (7d)</div><div id="kpiAppts" className="kpi-value">{kpiAppts}</div></div>
        <div className="kpi"><div className="kpi-label">Jobs in Progress</div><div id="kpiInProg" className="kpi-value">{kpiInProg}</div></div>
        <div className="kpi"><div className="kpi-label">Revenue Won (MTD)</div><div id="kpiRevenue" className="kpi-value">{fmtMoney(kpiRevenue)}</div></div>
      </section>

      <main id="app">
        <section id="homeView" className={view !== "home" ? "hidden" : ""}>
          <h2 className="row-title">AI Picks — Next Best Actions</h2>
          <div id="rowNba" className="row">
            {db.leads
              .filter(l => !["Won", "Lost"].includes(l.stage))
              .sort((a, b) => b.score - a.score).slice(0, 12)
              .map(lead => (
                <article key={lead.id} className="card" onClick={() => openDetail(lead.id)}>
                  <img className="card-img" src={lead.photoUrl || stockPhoto("roofing")} alt={`Photo for ${lead.name}`} />
                  <div className="card-content">
                    <div className="card-title">{lead.name || "(no name)"}</div>
                    <div className="card-sub">{`${lead.city || "—"} • ${lead.source}`}</div>
                    <div className="pill-row">
                      <span className="pill pill-stage">{lead.stage}</span>
                      <span className="pill pill-score">Score {lead.score}</span>
                      <span className="pill pill-value">{fmtMoney(lead.estValue)}</span>
                    </div>
                  </div>
                </article>
              ))}
          </div>

          <h2 className="row-title">Leads For You</h2>
          <div id="rowLeads" className="row">
            {filteredLeads.slice(0, 20).map(lead => (
              <article key={lead.id} className="card" onClick={() => openDetail(lead.id)}>
                <img className="card-img" src={lead.photoUrl || stockPhoto("roofing")} alt={`Photo for ${lead.name}`} />
                <div className="card-content">
                  <div className="card-title">{lead.name || "(no name)"}</div>
                  <div className="card-sub">{`${lead.city || "—"} • ${lead.source}`}</div>
                  <div className="pill-row">
                    <span className="pill pill-stage">{lead.stage}</span>
                    <span className="pill pill-score">Score {lead.score}</span>
                    <span className="pill pill-value">{fmtMoney(lead.estValue)}</span>
                  </div>
                </div>
              </article>
            ))}
          </div>

          <h2 className="row-title">Jobs In Progress</h2>
          <div id="rowJobs" className="row">
            {db.leads.filter(l => l.stage === "In Progress" || l.stage === "Scheduled").slice(0, 20).map(lead => (
              <article key={lead.id} className="card" onClick={() => openDetail(lead.id)}>
                <img className="card-img" src={lead.photoUrl || stockPhoto("roofing")} alt={`Photo for ${lead.name}`} />
                <div className="card-content">
                  <div className="card-title">{lead.name || "(no name)"}</div>
                  <div className="card-sub">{`${lead.city || "—"} • ${lead.source}`}</div>
                  <div className="pill-row">
                    <span className="pill pill-stage">{lead.stage}</span>
                    <span className="pill pill-score">Score {lead.score}</span>
                    <span className="pill pill-value">{fmtMoney(lead.estValue)}</span>
                  </div>
                </div>
              </article>
            ))}
          </div>

          <h2 className="row-title">Follow-ups</h2>
          <div id="rowFollow" className="row">
            {db.leads.filter(l => l.stage === "Estimate Sent" || l.stage === "Insurance").slice(0, 20).map(lead => (
              <article key={lead.id} className="card" onClick={() => openDetail(lead.id)}>
                <img className="card-img" src={lead.photoUrl || stockPhoto("roofing")} alt={`Photo for ${lead.name}`} />
                  <div className="card-content">
                    <div className="card-title">{lead.name || "(no name)"}</div>
                    <div className="card-sub">{`${lead.city || "—"} • ${lead.source}`}</div>
                    <div className="pill-row">
                      <span className="pill pill-stage">{lead.stage}</span>
                      <span className="pill pill-score">Score {lead.score}</span>
                      <span className="pill pill-value">{fmtMoney(lead.estValue)}</span>
                    </div>
                  </div>
                </article>
              ))}
          </div>
        </section>

        <section id="kanbanView" className={view !== "kanban" ? "hidden" : ""}>
          <div id="kanban" className="kanban">
            {["New", "Appointment", "Estimate Sent", "Scheduled", "In Progress"].map(stageName => (
              <div key={stageName} className="column">
                <h4>{stageName}</h4>
                <div className="col-list" data-stage={stageName}>
                  {db.leads.filter(l => l.stage === stageName).slice(0, 30).map(lead => (
                    <div key={lead.id} className="col-card" onClick={() => openDetail(lead.id)}>
                      <div className="title">{lead.name || "(no name)"} — <span className="pill">{lead.city || "—"}</span></div>
                      <div className="meta"><span>{lead.source}</span><span>{fmtMoney(lead.estValue)}</span></div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>

        <section id="reportsView" className={view !== "reports" ? "hidden" : "reports"}>
          <div className="report-card">
            <div className="report-header">
              <h3>Revenue Trend (Last 6 Months)</h3>
            </div>
            <canvas id="chartRevenue" width="1200" height="320" aria-label="Revenue trend chart"></canvas>
          </div>

          <div className="report-grid">
            <div className="report-card">
              <div className="report-header"><h3>Pipeline Funnel (Last 90d)</h3></div>
              <canvas id="chartFunnel" width="500" height="320" aria-label="Pipeline funnel chart"></canvas>
            </div>
            <div className="report-card">
              <div className="report-header"><h3>Lead Source Mix</h3></div>
              <canvas id="chartSources" width="500" height="320" aria-label="Lead source pie chart"></canvas>
            </div>
          </div>

          <div className="report-card">
            <div className="report-header"><h3>Crew Utilization (Next 2 Weeks)</h3></div>
            <canvas id="chartCrew" width="1200" height="320" aria-label="Crew utilization bar chart"></canvas>
          </div>
        </section>
      </main>

      {/* Lead/Job Detail Modal */}
      {showDetailModal && (
        <dialog id="detailModal" ref={detailModalRef}>
          <form method="dialog" className="modal">
            <header className="modal-header">
              <h3 id="detailTitle">Lead — {currentLead?.name || "(no name)"}</h3>
              <button className="btn icon" id="btnCloseModal" aria-label="Close" onClick={closeDetail}>✕</button>
            </header>
            <div className="modal-body">
              <div className="modal-left">
                <img id="detailPhoto" className="lead-photo" src={currentLead?.photoUrl || stockPhoto("roofing")} alt="lead photo" />
                <div className="field">
                  <label>Name</label>
                  <input id="detailName" className="input" defaultValue={currentLead?.name || ""} />
                </div>
                <div className="field grid2">
                  <div>
                    <label>Phone</label>
                    <input id="detailPhone" className="input" defaultValue={currentLead?.phone || ""} />
                  </div>
                  <div>
                    <label>Email</label>
                    <input id="detailEmail" className="input" defaultValue={currentLead?.email || ""} />
                  </div>
                </div>
                <div className="field">
                  <label>Address</label>
                  <input id="detailAddress" className="input" defaultValue={currentLead?.address || ""} />
                </div>
                <div className="field grid2">
                  <div>
                    <label>City</label>
                    <input id="detailCity" className="input" defaultValue={currentLead?.city || ""} />
                  </div>
                  <div>
                    <label>Source</label>
                    <input id="detailSource" className="input" defaultValue={currentLead?.source || ""} />
                  </div>
                </div>
                <div className="field grid2">
                  <div>
                    <label>Stage</label>
                    <select id="detailStage" className="input" defaultValue={currentLead?.stage || "New"}>
                      {stages.map(stage => <option key={stage}>{stage}</option>)}
                    </select>
                  </div>
                  <div>
                    <label>Owner</label>
                    <input id="detailOwner" className="input" defaultValue={currentLead?.owner || ""} />
                  </div>
                </div>
                <div className="field grid2">
                  <div>
                    <label>Est. Value ($)</label>
                    <input id="detailValue" type="number" className="input" defaultValue={currentLead?.estValue || 0} />
                  </div>
                  <div>
                    <label>Score</label>
                    <input id="detailScore" type="number" min="0" max="100" className="input" defaultValue={currentLead?.score || 50} />
                  </div>
                </div>
              </div>
              <div className="modal-right">
                <div className="actions">
                  <button type="button" className="btn primary" onClick={() => alert("Dialer integration placeholder. Use tel: or Twilio/CallRail APIs.")}>Call</button>
                  <button type="button" className="btn" onClick={() => alert("SMS integration placeholder. Hook to Twilio/CallRail.")}>Text</button>
                  <button type="button" className="btn" onClick={() => alert("Email integration placeholder. Use mailto: or SMTP API.")}>Email</button>
                  <button type="button" className="btn" onClick={() => navigator.clipboard.writeText("Hi! Ask about our 0% APR promo. Reply YES for details and quick pre-qual.").then(() => alert("Promo text copied to clipboard."))}>Send 0% Promo</button>
                </div>
                <div className="field">
                  <label>Notes</label>
                  <textarea id="detailNotes" className="input" rows="8" placeholder="Add a note…" defaultValue={currentLead?.notes || ""}></textarea>
                </div>
                <div className="ai-templates">
                  <div className="ai-title">AI Templates</div>
                  <button className="btn small" onClick={() => handleAiTemplate("call")}>Call Script</button>
                  <button className="btn small" onClick={() => handleAiTemplate("adjuster")}>Adjuster Scheduling SMS</button>
                  <button className="btn small" onClick={() => handleAiTemplate("promo")}>0% Promo SMS</button>
                </div>
                <div className="audit" id="auditLog">
                  <div><b>Activity</b></div>
                  {auditLog.length > 0 ? (
                    auditLog.map(activity => (
                      <div key={activity.id}>• <b>{activity.type}</b> — {new Date(activity.at).toLocaleString()} — <span className="muted">{activity.notes || ""}</span></div>
                    ))
                  ) : (
                    <div className='muted'>No activity yet.</div>
                  )}
                </div>
              </div>
            </div>
            <footer className="modal-footer">
              <button className="btn danger" type="button" onClick={handleDeleteDetail}>Delete</button>
              <div className="spacer"></div>
              <button className="btn primary" onClick={handleSaveDetail}>Save</button>
            </footer>
          </form>
        </dialog>
      )}
    </>
  );
}

export default App;
