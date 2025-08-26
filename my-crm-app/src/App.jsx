// src/App.jsx
// src/App.jsx
import React, { useState, useEffect, useRef } from 'react';
import { defaultData, stages, sources, owners, parseCSV, toCSV, fmtMoney, uid, stockPhoto } from './components/data'; // <-- stockPhoto yahan add karein
// ... rest of imports
import Header from './components/Header';
import Toolbar from './components/Toolbar';
import Kpis from './components/Kpis';
import HomeView from './components/HomeView';
import KanbanView from './components/KanbanView';
import ReportsView from './components/ReportsView';
import DetailModal from './components/DetailModal';
import './style.css'; // Your existing CSS

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

  const fileCsvRef = useRef(null);

  useEffect(() => {
    localStorage.setItem(LS_KEY, JSON.stringify(db));
  }, [db]);

  const unique = (arr) => [...new Set(arr)].sort();
  const uniqueCities = unique(db.leads.map(l => l.city).filter(Boolean));
  const uniqueSources = unique(db.leads.map(l => l.source).filter(Boolean));
  const uniqueOwners = unique(db.leads.map(l => l.owner).filter(Boolean));

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

  const now = Date.now();
  const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;
  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);

  const kpiNewLeads = db.leads.filter(l => now - l.createdAt <= sevenDaysMs).length;
  const kpiAppts = db.leads.filter(l => l.appointmentAt && (new Date(l.appointmentAt).getTime() - now) <= sevenDaysMs && (new Date(l.appointmentAt).getTime()) >= 0).length;
  const kpiInProg = db.leads.filter(l => l.stage === "In Progress").length;
  const kpiRevenue = db.leads.filter(l => l.stage === "Won" && l.createdAt >= monthStart.getTime()).reduce((s, l) => s + Number(l.estValue || 0), 0);

  const openDetail = (id) => {
    setCurrentLeadId(id);
    setShowDetailModal(true);
  };

  const closeDetail = () => {
    setShowDetailModal(false);
    setCurrentLeadId(null);
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
    if (window.confirm("Delete this lead? This cannot be undone.")) {
      deleteLead(currentLeadId);
    }
  };

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
        alert(`Imported ${rows.length} leads.`);
        e.target.value = "";
      } catch (err) {
        alert("Import failed: " + err.message);
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

  const currentLead = db.leads.find(l => l.id === currentLeadId);
  const auditLog = db.activities.filter(a => a.entityId === currentLeadId).slice(0, 30);

  return (
    <>
      <Header
        onAddLead={() => addLead({ name: "New Lead", city: "Dallas", source: "Website" })}
        onImportCsv={onCsvSelect}
        onExportCsv={exportCsv}
        onViewChange={setView}
        fileCsvRef={fileCsvRef}
      />

      <Toolbar
        query={query}
        setQuery={setQuery}
        filterCity={filterCity}
        setFilterCity={setFilterCity}
        filterSource={filterSource}
        setFilterSource={setFilterSource}
        filterStage={filterStage}
        setFilterStage={setFilterStage}
        filterOwner={filterOwner}
        setFilterOwner={setFilterOwner}
        uniqueCities={uniqueCities}
        uniqueSources={uniqueSources}
        uniqueOwners={uniqueOwners}
      />

      <Kpis
        kpiNewLeads={kpiNewLeads}
        kpiAppts={kpiAppts}
        kpiInProg={kpiInProg}
        kpiRevenue={kpiRevenue}
        fmtMoney={fmtMoney}
      />

      <main id="app">
        {view === "home" && <HomeView leads={db.leads} filteredLeads={filteredLeads} openDetail={openDetail} />}
        {view === "kanban" && <KanbanView leads={db.leads} openDetail={openDetail} />}
        {view === "reports" && <ReportsView db={db} />}
      </main>

      <DetailModal
        show={showDetailModal}
        onClose={closeDetail}
        currentLead={currentLead}
        auditLog={auditLog}
        onSave={handleSaveDetail}
        onDelete={handleDeleteDetail}
      />
    </>
  );
}

export default App;