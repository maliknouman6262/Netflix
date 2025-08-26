// src/components/ReportsView.jsx
import React, { useEffect } from 'react';
import { fmtMoney } from './data';

const ReportsView = ({ db }) => {
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
      const end = new Date(d.getFullYear(), d.getMonth() + 1, 1).getTime();
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
    const now = Date.now();
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
    renderRevenueChart(document.getElementById("chartRevenue"));
    renderFunnelChart(document.getElementById("chartFunnel"));
    renderSourcesChart(document.getElementById("chartSources"));
    renderCrewChart(document.getElementById("chartCrew"));
  }, [db]); // Rerender charts when db changes

  return (
    <section id="reportsView" className="reports">
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
  );
};

export default ReportsView;