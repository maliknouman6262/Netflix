// src/components/DetailModal.jsx
import React, { useEffect, useRef } from 'react';
import { stages, stockPhoto } from './data'; // 'stockPhoto' yahan theek tarah se imported hai

const DetailModal = ({ show, onClose, currentLead, auditLog, onSave, onDelete }) => {
  const modalRef = useRef(null);

  useEffect(() => {
    if (show) {
      modalRef.current?.showModal();
    } else {
      modalRef.current?.close();
    }
  }, [show]);

  const handleAiTemplate = (kind) => {
    let text = "";
    if (kind === "call") {
      text = `Hi ${currentLead?.name || ""}, this is Triguard. I'm reviewing your roof request. I can get you a same-week inspection and a written estimate. Does tomorrow 3–5pm work?`;
    } else if (kind === "adjuster") {
      text = `Hi ${currentLead?.name || ""}, Triguard here. I can coordinate your insurance adjuster window and be on-site. What’s your preferred day/time?`;
    } else if (kind === "promo") {
      text = `Good news: 0% APR promo available for qualified customers. Quick pre-qual—no impact on credit. Want the link?`;
    }
    navigator.clipboard.writeText(text).then(() => alert("Copied to clipboard."));
  };

  const handleSaveAndClose = (e) => {
    onSave(e);
    onClose();
  };

  const handleDeleteAndClose = (e) => {
    onDelete(e);
    onClose();
  };

  if (!currentLead) return null;

  return (
    <dialog id="detailModal" ref={modalRef}>
      <form method="dialog" className="modal" onSubmit={handleSaveAndClose}>
        <header className="modal-header">
          <h3 id="detailTitle">Lead — {currentLead?.name || "(no name)"}</h3>
          <button className="btn icon" id="btnCloseModal" type="button" aria-label="Close" onClick={onClose}>✕</button>
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
              <button className="btn small" type="button" onClick={() => handleAiTemplate("call")}>Call Script</button>
              <button className="btn small" type="button" onClick={() => handleAiTemplate("adjuster")}>Adjuster Scheduling SMS</button>
              <button className="btn small" type="button" onClick={() => handleAiTemplate("promo")}>0% Promo SMS</button>
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
          <button className="btn danger" type="button" onClick={handleDeleteAndClose}>Delete</button>
          <div className="spacer"></div>
          <button className="btn primary" type="submit">Save</button>
        </footer>
      </form>
    </dialog>
  );
};

export default DetailModal;