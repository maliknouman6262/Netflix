# Triguard Netflix‑Style CRM (Vanilla JS)

A single‑page, dependency‑free CRM UI inspired by Netflix rows. It persists to `localStorage`, supports CSV import/export, Kanban, and simple reports drawn with `<canvas>` — ready to be wired to EspoCRM or your APIs.

## Features
- Netflix‑style carousels (AI Picks, Leads, Jobs, Follow‑ups)
- Filters: search, city, source, stage, owner
- KPI cards (New Leads 7d, Appointments 7d, In Progress, Revenue MTD)
- Lead detail modal with quick actions + AI templates
- Kanban view (New → Appt → Estimate → Scheduled → In Progress)
- Reports: Revenue Trend, Pipeline Funnel, Lead Source Mix, Crew Utilization
- LocalStorage CRUD, CSV import/export (no dependencies)
- Stock images via Unsplash/Source endpoints

## Run
Just open `index.html` in a modern browser. No build step.

## CSV Import
Headers expected (order not strict):
```
name,phone,email,address,city,source,stage,owner,estValue,score,photoUrl
```
Unknown `stage` values fallback to `New`. Missing `photoUrl` auto‑fills a stock photo.

## Wire to EspoCRM
Replace store functions in `app.js` with `fetch()` calls to your Espo endpoints:
- `GET /Lead?sort=-score&limit=50`
- `PATCH /Lead/{id}`
- `POST /Lead`
- `DELETE /Lead/{id}`

Map fields to your schema (insurance flags, adjuster, financing, etc.).

## Notes
- Charts are implemented using Canvas to avoid any libs.
- This code is intentionally simple to make integration fast.
npm install
  npm run dev