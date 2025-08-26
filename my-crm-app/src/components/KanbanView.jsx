// src/components/KanbanView.jsx
import React from 'react';
import { stages, fmtMoney } from './data';

const KanbanView = ({ leads, openDetail }) => {
  return (
    <section id="kanbanView" className="kanban">
      <div id="kanban" className="kanban">
        {stages.map(stageName => (
          <div key={stageName} className="column">
            <h4>{stageName}</h4>
            <div className="col-list" data-stage={stageName}>
              {leads.filter(l => l.stage === stageName).slice(0, 30).map(lead => (
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
  );
};

export default KanbanView;