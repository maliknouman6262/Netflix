// src/components/data.js

export function uid() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36).slice(4);
}

export function fmtMoney(n) {
  n = Number(n || 0);
  return n.toLocaleString(undefined, { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });
}

export function parseCSV(text) {
  const lines = text.trim().split(/\r?\n/);
  const headers = lines.shift().split(",").map(h => h.trim());
  return lines.map(line => {
    const cols = line.split(",").map(c => c.trim());
    const obj = {};
    headers.forEach((h, i) => obj[h] = cols[i] ?? "");
    return obj;
  });
}

export function toCSV(rows) {
  if (!rows.length) return "";
  const headers = Object.keys(rows[0]);
  const lines = [headers.join(",")];
  for (const r of rows) {
    lines.push(headers.map(h => String(r[h] ?? "").replace(/,/g, " ")).join(","));
  }
  return lines.join("\n");
}

export const stages = ["New", "Contacted", "Appointment", "Estimate Sent", "Insurance", "Scheduled", "In Progress", "Won", "Lost"];
export const sources = ["Website", "Facebook", "Google Ads", "Door Knock", "Referral", "Angi", "HomeAdvisor", "Storm List"];
export const owners = ["Katherine", "Jose", "Marina", "Frank", "Sam"];

export function stockPhoto(keyword) {
  return `https://source.unsplash.com/collection/483251/600x400?${encodeURIComponent(keyword)}`;
}

export function defaultData() {
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