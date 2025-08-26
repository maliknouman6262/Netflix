// src/components/LeadCard.jsx
import React from 'react';
import { fmtMoney, stockPhoto } from './data';

const LeadCard = ({ lead, onClick }) => {
  return (
    <article key={lead.id} className="card" onClick={onClick}>
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
  );
};

export default LeadCard;