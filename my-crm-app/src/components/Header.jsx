// src/components/Header.jsx
import React from 'react';

const Header = ({ onAddLead, onImportCsv, onExportCsv, onViewChange, fileCsvRef }) => {
  return (
    <header className="topbar">
      <div className="brand">
        <img src="https://images.unsplash.com/photo-1505852679233-d9fd70aff56d?q=80&w=2000&auto=format&fit=crop" alt="Roof hero" />
        <h1>Triguard CRM</h1>
      </div>
      <div className="global-actions">
        <button id="btnAddLead" className="btn primary" onClick={onAddLead}>+ New Lead</button>
        <button id="btnImportCsv" className="btn" onClick={() => fileCsvRef.current.click()}>Import CSV</button>
        <input type="file" id="fileCsv" accept=".csv" style={{ display: 'none' }} ref={fileCsvRef} onChange={onImportCsv} />
        <button id="btnExportCsv" className="btn" onClick={onExportCsv}>Export CSV</button>
        <button id="btnToggleKanban" className="btn" onClick={() => onViewChange("kanban")}>Kanban</button>
        <button id="btnToggleReports" className="btn" onClick={() => onViewChange("reports")}>Reports</button>
        <button id="btnHome" className="btn" onClick={() => onViewChange("home")}>Home</button>
      </div>
    </header>
  );
};

export default Header;