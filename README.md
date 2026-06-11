# Luckin Counting

A daily inventory counting app for a Luckin Coffee store, replacing the manual `Counting (n).xlsx` workflow with a guided, mobile-friendly web app.

## Stack

- [Next.js 14](https://nextjs.org/) (App Router) + TypeScript
- [Tailwind CSS](https://tailwindcss.com/)
- [Zustand](https://github.com/pmndrs/zustand) for client-side state
- [Supabase](https://supabase.com/) for storage/auth
- [SheetJS (xlsx)](https://sheetjs.com/) for exporting daily records

## Counting flow

Each day's count moves through 5 stages:

1. **Back** (store room) — open bags + full boxes
2. **Front** (bar area) — full boxes only
3. **Material Expired** — Loss (thrown premix), with a container-tare selector
4. **Closing** — remaining stock after service, including the inventory items moved here from Material Expired
5. **Sheet2 / Final** — read-only, auto-computed from Back + Front + Closing (`Total = Back + Front + Closing`, displayed to 1 decimal place)

The full counting logic, formulas, and item list live in [`countingflow.md`](countingflow.md). The app architecture and data model live in [`appflow.md`](appflow.md). **Both files must stay in sync with any change to counting logic, formulas, app structure, routes, or the data model.**

## Project structure

```
src/
  app/
    page.tsx                  # home / stage selector
    count/[date]/             # per-stage counting pages (back/front/expired/closing/result)
    admin/                     # admin overlay (final results, records, approvals, settings)
  components/                 # shared UI (stage tabs, hooks)
  data/seedItems.ts           # master item list (categories, units, formulas)
  lib/                         # types, calculation logic, xlsx export, Supabase clients
  store/useCountingStore.ts   # Zustand store for in-progress counts

mockups/dark_theme.html        # standalone HTML mockup (UI reference)
supabase/schema.sql            # database schema
```

## Development

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Docs

- [`countingflow.md`](countingflow.md) — counting stages, formulas, item-to-tab mapping, known data issues
- [`appflow.md`](appflow.md) — app architecture, data model, UI conventions, change log
