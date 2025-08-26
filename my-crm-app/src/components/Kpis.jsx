// src/components/Kpis.jsx
import React from 'react';

const Kpis = ({ kpiNewLeads, kpiAppts, kpiInProg, kpiRevenue, fmtMoney }) => {
  return (
    <section id="kpis" className="kpis">
      <div className="kpi"><div className="kpi-label">New Leads (7d)</div><div id="kpiNewLeads" className="kpi-value">{kpiNewLeads}</div></div>
      <div className="kpi"><div className="kpi-label">Appointments (7d)</div><div id="kpiAppts" className="kpi-value">{kpiAppts}</div></div>
      <div className="kpi"><div className="kpi-label">Jobs in Progress</div><div id="kpiInProg" className="kpi-value">{kpiInProg}</div></div>
      <div className="kpi"><div className="kpi-label">Revenue Won (MTD)</div><div id="kpiRevenue" className="kpi-value">{fmtMoney(kpiRevenue)}</div></div>
    </section>
  );
};

export default Kpis;