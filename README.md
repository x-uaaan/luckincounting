# Luckin Counting

A mobile-first daily inventory counting web app for a Luckin Coffee store. Replaces the manual `Counting (n).xlsx` workflow with a guided, structured digital process — from back-room stock counts through material expiry tracking to closing inventory, producing a final sheet automatically.

---

## Purpose

Each day, staff must count every item across multiple store locations (back room, front bar, closing stock) and log material expiry loss. Previously done on spreadsheets, this app:

- Guides staff through each counting stage in order
- Auto-calculates totals, box conversions, and loss amounts
- Persists all data to Supabase in real time
- Allows managers to configure items, loss rates, and formulas through an admin panel — counting pages always reflect exactly what is configured in admin

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | [Next.js 14](https://nextjs.org/) (App Router) |
| Language | TypeScript |
| Styling | Custom CSS (dark theme, mobile-first) |
| State | [Zustand](https://github.com/pmndrs/zustand) |
| Database | [Supabase](https://supabase.com/) (PostgreSQL) |
| Auth | Google OAuth (server-side httpOnly cookies) |
| Export | [SheetJS (xlsx)](https://sheetjs.com/) |
| Deployment | [Vercel](https://vercel.com/) |

---

## How to Use

### Daily Counting Flow

1. **Start Counting** — tap Start Counting (or Start with latest data to carry over yesterday's figures)
2. **Back tab** — count back-room stock: open bags/stacks + full boxes per item
3. **Material Exp tab** — weigh expired/thrown product, select container, record gross weight; loss report auto-calculates net loss per material
4. **Closing tab** — count remaining stock at end of service
5. **Final tab** — read-only; totals are auto-computed from Back + Closing

### Admin Panel (`/admin`)

All item data and counting logic is configured here. Counting pages and Supabase always follow what is set in admin.

| Page | What it manages |
|---|---|
| `/admin/items` | All items — name, unit, category, per-box/bag counts, which tabs they appear in, sort order |
| `/admin/loss` | Material expiry products — which raw materials each product uses and at what loss rate |
| `/admin/containers` | Tare weights for containers used in material expiry weighing |
| `/admin/records` | Historical daily count records |
| `/admin/activity` | Audit log of all data changes |
| `/admin/settings` | App settings, Google Drive integration |

**Right-click a column header** in `/admin/items` to insert, rename, or remove columns per category.

---

## Project Structure

```
src/
  app/
    page.tsx                  # Home — start counting / admin entry
    count/
      back/                   # Back room counting
      expired/                # Material expiry + loss report
      closing/                # Closing stock counting
      front/                  # Front bar counting
      result/                 # Final auto-computed sheet
    admin/
      items/                  # Item CRUD + column management
      loss/                   # Loss product config
      containers/             # Container tare weights
      records/                # Historical records
      activity/               # Audit log
      settings/               # App settings
  components/                 # Shared UI components
  store/
    useItemsStore.ts          # Items state + Supabase sync
    useCountingStore.ts       # In-progress count state
  lib/
    types.ts                  # TypeScript types
    calculations.ts           # Counting formulas
    expr.ts                   # Expression evaluator for numeric inputs
  data/
    seedItems.ts              # Master item list

public/
  logo.jpg                    # App icon (favicon + Apple touch icon)

supabase/
  schema.sql                  # Database schema
```

---

## Key Rules

- **Admin is source of truth** — item data, formulas, and loss rates are always configured in `/admin`. Counting pages consume this data and never override it. Supabase always reflects the current admin state.
- **Supabase is always in sync** — every change (add, edit, delete, reorder) is persisted to Supabase immediately. `localStorage` is only a local cache.
- **No direct Supabase edits** — all data changes go through the app's admin pages, not raw SQL or Supabase dashboard edits.

---

## Development

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

Requires environment variables:
```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
```

> `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` must never be committed — store in Vercel environment variables only.

---

## Docs

- [`countingflow.md`](countingflow.md) — counting stages, formulas, item-to-tab mapping
- [`appflow.md`](appflow.md) — app architecture, data model, UI conventions
