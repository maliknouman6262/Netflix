// src/components/HomeView.jsx
import React from 'react';
import LeadCard from './LeadCard';

const HomeView = ({ leads, filteredLeads, openDetail }) => {
  return (
    <section id="homeView">
      <h2 className="row-title">AI Picks — Next Best Actions</h2>
      <div id="rowNba" className="row">
        {leads
          .filter(l => !["Won", "Lost"].includes(l.stage))
          .sort((a, b) => b.score - a.score).slice(0, 12)
          .map(lead => (
            <LeadCard key={lead.id} lead={lead} onClick={() => openDetail(lead.id)} />
          ))}
      </div>

      <h2 className="row-title">Leads For You</h2>
      <div id="rowLeads" className="row">
        {filteredLeads.slice(0, 20).map(lead => (
          <LeadCard key={lead.id} lead={lead} onClick={() => openDetail(lead.id)} />
        ))}
      </div>

      <h2 className="row-title">Jobs In Progress</h2>
      <div id="rowJobs" className="row">
        {leads.filter(l => l.stage === "In Progress" || l.stage === "Scheduled").slice(0, 20).map(lead => (
          <LeadCard key={lead.id} lead={lead} onClick={() => openDetail(lead.id)} />
        ))}
      </div>

      <h2 className="row-title">Follow-ups</h2>
      <div id="rowFollow" className="row">
        {leads.filter(l => l.stage === "Estimate Sent" || l.stage === "Insurance").slice(0, 20).map(lead => (
          <LeadCard key={lead.id} lead={lead} onClick={() => openDetail(lead.id)} />
        ))}
      </div>
    </section>
  );
};

export default HomeView;