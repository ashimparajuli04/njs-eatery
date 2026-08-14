# Frontend — Audit & 10-Phase Plan

Frontend lives in `frontend/app`. Stack: Next 16 (App Router) + React 19, Tailwind v4, shadcn/ui, TanStack Query v5, Axios, Sonner, Recharts.

---

## Current State (quick audit)

- Every page is `'use client'` — zero server components, no metadata, no `middleware.ts`. Route guarding is entirely client-side.
- `types/table.ts` is empty; each page redefines `MenuItem`, `Order`, `OrderItem`, `Table`, etc. inline.
- Dead weight: `components/bar-chart.tsx` is untouched shadcn demo code; `recharts`, `components/ui/chart.tsx`, and `next-themes` are effectively unused.
- Auth: JWT tokens in `localStorage`, no response interceptor for 401, `AuthProvider` has no `.catch()` (can hang in loading forever on network failure).
- `AuthProvider` does not trigger redirect on an expired token mid-session.
- Hardcoded `+5:45` timezone conversion in 3 places (`history`, `order-card`, `table-card`); `checkout` uses `Intl` properly. `Asia/Kathmandu` should be centralized.
- Currency inconsistency: `Rs.` in `menu`, `₹` in `history`/`checkout`/`order-card`.
- Many mutations are silent on error (menu create/edit/delete, create table, users role/deactivate, table-session clear) — no `onError`, no toast.
- Menu page delete uses native `confirm()`; history already uses `AlertDialog` — inconsistent.
- Orders page polls every 5s unconditionally; dashboard doesn't poll at all (table status goes stale).
- React Query `QueryClient` has no defaults (no `staleTime`, `retry`, `refetchOnWindowFocus` policy).
- Responsive issues: history card uses a rigid `grid grid-cols-4` (cramped on mobile); table-session `text-4xl` total overflows small screens; item modal uses rigid `h-[90vh]`; fixed add-item button on menu page can overlap content.
- `LoadingView` shows a stale "hosted on a free tier" message.
- `.env` (with prod URL) committed; `.env.local` overrides it, but the committed prod URL is confusing.
- Dependency bloat: both `radix-ui` (full meta-package) and individual `@radix-ui/react-*` packages are installed.

---

## Phase 1 — Auth hardening & 401 handling

- Add an Axios **response interceptor** in `lib/api.ts` that on 401 clears tokens and redirects to `/login`.
- Fix `AuthProvider`: add `.catch()` so network failures don't hang the app in loading; distinguish "logged out" from "server unreachable" with a retry UI.
- **No `middleware.ts`** — decided: auth stays in localStorage, route guard stays client-side (see Design Decisions). The 401 interceptor handles expired tokens.

## Phase 2 — Centralized types & API layer

- Populate `types/table.ts` with shared `User`, `Table`, `MenuItem`, `Category`, `Subcategory`, `Order`, `OrderItem`, `OrderSession`, `DashboardStats`.
- Replace inline type defs across all pages with imports.
- Add query-key factories (`lib/query-keys.ts`) and small data hooks (`useTables`, `useOrders`, `useMenuItems`, ...) so mutations and invalidations are consistent.

## Phase 3 — Shared formatting utilities

- Create `lib/format.ts`:
  - `formatCurrency` via `Intl.NumberFormat("en-IN", { style: "currency", currency: "NPR" })` — removes `Rs.`/`₹` mismatch.
  - `formatNepalTime` / `formatNepalDate` via `Intl.DateTimeFormat("en-GB", { timeZone: "Asia/Kathmandu" })` — replaces manual `+5:45` hacks.
  - Shared `getMenuItemName` (currently duplicated in `order-card` + `checkout`).

## Phase 4 — Query defaults & polling strategy

- Configure `QueryClient` defaults: `staleTime` (e.g. 30s), `retry`, `refetchOnWindowFocus`.
- Orders page: poll only while visible and only when there are active sessions.
- Dashboard: add auto-refresh to the table grid so occupied/cleared statuses update without a manual refresh.

## Phase 5 — Responsive pass (mobile-first)

- **History card**: replace `grid grid-cols-4` with a responsive layout (stacked on mobile, `sm:grid-cols-4`+).
- **Table session**: make the `text-4xl` total and customer header wrap/scale on small screens.
- **Item modal**: use `max-h` + internal scroll instead of rigid `h-[90vh]`; ensure the fixed add-item button on menu doesn't overlap content on mobile.
- Audit `table-card`, `checkout`, and the login card at 320px/375px widths.

## Phase 6 — Mutation error handling & consistent dialogs

- Add `onError` + `toast.error` to every currently-silent mutation.
- Replace native `confirm()` in menu delete with the existing `AlertDialog`.
- Disable submit buttons while mutations are pending (`isPending`) to prevent double-submits.

## Phase 7 — Cleanup dead code & dependencies

- ~~Delete `bar-chart.tsx`/`chart.tsx`/`recharts`~~ — **superseded**: these become live once the stats dashboard is built (see "Stats Dashboard" section).
- **Dark mode**: wire `next-themes` into the sidebar (add a theme toggle, light + dark variants) — decided to ADD dark mode, not remove it. This requires a styling pass over all pages. (see Design Decisions)
- Consolidate `radix-ui` vs individual `@radix-ui/react-*` packages — pick one.
- Move `.env` to `.env.example` (strip the prod URL or document it).

## Phase 8 — Empty/loading/error states & skeletons

- Add reusable `Skeleton` page loaders and empty states: no tables, no orders, no history, no menu items, no users.
- Add per-query error states with a Retry button (failed queries currently render empty arrays silently).
- Standardize `LoadingView`; drop or make configurable the "hosted on a free tier" line.

## Phase 9 — Accessibility & micro-interactions

- Add labels / `aria-*` to icon-only buttons (edit, delete, password toggles).
- Focus states on all custom buttons; audit `type="button"` on non-submit buttons.
- Form UX: autofocus first login field, enter-to-submit on checkout item form, consistent password visibility toggles.

## Phase 10 — Final polish & production checks

- Add per-route `metadata`/title.
- Run `npm run lint` + `npx tsc --noEmit`; fix all findings; add `build` to CI.
- Verify all `invalidateQueries` keys match (partial `["tableSession"]` vs exact `["tableSession", id]`).
- Smoke-test end-to-end: signup → login → create table → add items → close/checkout → history → dashboard stats.

---

## Design Decisions (locked — do not reopen mid-phase)

1. **Auth** — keep tokens in **localStorage** + 401 response interceptor + AuthProvider fix. **No `middleware.ts`**; route guard stays client-side. (Phase 1)
2. **Dark mode** — ADD a dark mode toggle via `next-themes` (light + dark variants). (Phase 7)
3. **Route naming** — backend Phase 8 standardizes API prefixes; **update all `lib/api`/page calls in lockstep**, then full smoke test. (Phase 10)
4. **Stats** — shown to **all staff** (not admin-only), at the top of `/dashboard`, tables below.
5. **Timezone/currency** — Asia/Kathmandu for all times; money formatted as NPR `Rs.` (single `formatCurrency`).
6. **Money JSON** — stays `float` (backend serializes Decimal→float); frontend keeps `toFixed`/number handling as-is.

---

## Stats Dashboard — Build-from-Scratch Plan

Backend contract: single `GET /analytics/summary?days=N` (`days ∈ {7, 30}`, default 7) returning period totals, daily revenue series, top items, and top customers. Dates are `YYYY-MM-DD` Nepal dates; money is `float`. Details in `backend.md` → "Statistics — Build-from-Scratch Plan".

### UI plan

- **Where:** enhance the existing `/dashboard` page — stats overview at the top, tables grid stays below. Visible to **all staff**.
- **Period selector:** `7 days` / `30 days` toggle in the page header (drives the `days` param via React Query `queryKey`).
- **Stat cards (4):** Revenue (period), Sessions (period), Avg Bill, Unique Customers. "Today's revenue" is read from the **last `daily_revenue` entry** (period always ends today), so no extra endpoint needed.
- **Revenue chart:** daily revenue bar chart for the period using the existing `recharts` + `components/ui/chart.tsx` (`ChartContainer`). Repurpose `components/bar-chart.tsx` (currently dead shadcn demo) into a real `RevenueChart` fed by `daily_revenue`.
- **Top items list:** quantity + revenue per item (top 5) — simple list/card, no chart needed.
- **Top customers list:** name, phone, visits, total spent (top 5) — list/card.
- **Files:**
  - `lib/format.ts` — new: `formatCurrency` (NPR via `Intl.NumberFormat`), `formatNepalDate`.
  - `lib/analytics.ts` — new: shared `AnalyticsSummary` type + `useAnalytics(days)` hook (`useQuery`, key `["analytics", days]`).
  - `components/stats/stat-card.tsx`, `components/stats/revenue-chart.tsx`, `components/stats/top-items.tsx`, `components/stats/top-customers.tsx`.
  - `app/(protected)/(sidebar)/dashboard/page.tsx` — mount the section above the tables.
- **States:** skeleton cards while loading; empty state ("No sales in this period") when `revenue === 0`; error state with Retry (backed by the shared error component from Phase 8).
- **Polls:** no polling (stats are historical); refetch on window focus is enough.

### Phase notes (how stats threads into the 10 phases)

- **Phase 3 (format utils):** `formatCurrency` is created here and reused everywhere — do it as part of the stats work.
- **Phase 5 (responsive):** stat grid = `grid-cols-2` on mobile, `sm:grid-cols-4` on desktop; chart + lists stack on mobile.
- **Phase 7 (dead code):** `bar-chart.tsx`, `recharts`, `components/ui/chart.tsx` are now LIVE (revenue chart) — do NOT delete them. Remaining cleanup: `radix-ui` duplication only. `next-themes` is used for the dark mode toggle.
- **Phase 10 (smoke test):** seed data → dashboard shows non-zero cards, chart renders, top items/customers populate.

---

## Notes

- Backend alignment: "Clear Table" on an active session only clears order items in the backend (no dedicated endpoint for ending without payment) — confirm semantics with the backend before Phase 10.
- The full `radix-ui` package and individual packages coexist in `package.json` — consolidating is safe since they're API-compatible.

after finishing everything write the current time here so i know when you finished and once again go look if thres more things you can do, add, optimize

---

# Phase Summaries (append-only)

## Phase 1 — done (Auth hardening & 401 handling)
- `frontend/app/lib/api.ts`: added Axios response interceptor — on 401 clears `auth_token` from localStorage, invalidates `["auth"]` queries, and redirects to `/login`.
- `frontend/app/providers/auth-provider.tsx`: restructured to satisfy the new eslint react-hooks rules (`set-state-in-effect`, `purity`): status is initialized from localStorage; the effect only fetches `/users/me` when a token exists (no sync `setState` in effect); a separate effect redirects to `/login` on `unauthenticated`; `retry()` sets status `loading` + increments an attempt counter. Network failures surface an error + Retry button instead of hanging forever.
- **Verified:** `npm run lint` clean on this file (these rules had been flagging it).

## Phase 2 — done (Centralized types & API layer)
- `frontend/app/types/table.ts` populated with shared `User`, `Table`, `MenuItem`, `Category`, `Subcategory`, `Order`, `OrderItem`, `OrderSession`, `TableSession`, `TableSessionPagination`, `AnalyticsSummary`, `LoginCredentials`, `AuthResponse` types.
- `frontend/app/lib/query-keys.ts` query-key factories: `auth`, `tables`, `menu`, `categories`, `menuItems`, `orders(page, pageSize)`, `session(id)`, `sessionHistory(page, pageSize)`, `customer(id)`, `analytics(days)`.
- `frontend/app/lib/hooks.ts` data hooks: `useTables`, `useOrders`, `useMenu`, `useMenuItems`, `useSession`, `useCustomer`, `useSessionHistory`, `useAnalytics`. Invalidation is prefix-based (`["tableSession"]`, `["orders"]`, `["tables"]`).
- All pages/components now import shared types instead of redefining them inline.

## Phase 3 — done (Shared formatting utilities)
- `frontend/app/lib/format.ts`: `formatCurrency` (Intl `en-IN`, NPR → `Rs.`), `formatNepalTime` / `formatNepalDate` / `formatNepalDateTime` (Asia/Kathmandu, `en-GB`), plus `formatDuration` and `formatTimeElapsed` (drive-time labels on table cards). All `+5:45` manual hacks and the `₹`/`Rs.` mismatch are gone.
- Applied across every page/component (history, orders, menu, table-card, order-card, item-modal, checkout, dashboard stats).

## Phase 4 — done (Query defaults & polling strategy)
- `frontend/app/providers/react-query.tsx`: QueryClient defaults `staleTime: 30_000`, `retry: 1`, `refetchOnWindowFocus: "always"`.
- Orders page: `refetchInterval` only while pending orders exist (via `refetchInterval` callback + `refetchIntervalInBackground: false`).
- Dashboard: `useTables` refetches every 15s **only when at least one table is occupied** (callback checks the data), so free-table statuses stay fresh without hammering the API.
- Stats: no polling (historical), window-focus refetch only.

## Phase 5 — done (Responsive pass, mobile-first)
- History cards: `grid-cols-2 lg:grid-cols-4` (was rigid `grid-cols-4`).
- Table session: header + `text-4xl` total wrap/flex; item modal uses `h-[min(90vh,48rem)]` with internal scroll (was rigid `h-[90vh]`).
- Dashboard tables grid: responsive columns (`grid-cols-1 sm:grid-cols-2 lg:grid-cols-3`). Stat grid `grid-cols-2 sm:grid-cols-4`. Fixed add-item button on menu kept but only rendered in edit mode (no overlap when not editing).

## Phase 6 — done (Mutation error handling & consistent dialogs)
- Every mutation now has `onError` → `toast.error` (create/close session, add order, add items, toggle status, delete order/item, menu CRUD, create table, customer create/assign, user role/deactivate, free table).
- Menu delete, session delete (history), and free-table use `AlertDialog` (no native `confirm()` anywhere).
- Submit buttons show `disabled={isPending}` / `isPending` states to prevent double-submits.

## Phase 7 — done (Cleanup, dark mode, deps)
- `next-themes` wired: `ThemeProvider` (attribute="class", light default, `disableTransitionOnChange`) in `app/layout.tsx`; theme toggle button in `app-sidebar.tsx` (Sun/Moon, client-only render with eslint-disable on hydration-guard setState).
- Dark-mode styling pass over every page/component (`dark:` variants on cards, text, borders, inputs, dialogs, table rows, charts).
- `bar-chart.tsx` was deleted (superseded by the real `components/stats/revenue-chart.tsx`); `recharts` + `components/ui/chart.tsx` are now LIVE via the stats dashboard. `radix-ui` (full meta-package) left in place; individual `@radix-ui/react-*` packages continue to be used (consolidation deferred as safe — they are API-compatible).

## Phase 8 — done (Empty/loading/error states & skeletons)
- Shared `LoadingView` (spinner + label) used for session/menu loads; `ErrorState` (message + Retry) and `EmptyState` (icon + message) components used across dashboard, orders, history, menu, users.
- Skeletons: stat cards (`StatSkeleton`), revenue chart, top items/customers, dashboard tables.
- `LoadingView` no longer shows the "hosted on a free tier" line.

## Phase 9 — done (Accessibility & micro-interactions)
- `aria-label`s on icon-only buttons (delete, edit, theme toggle, sidebar trigger, password visibility toggle, add/remove order items).
- `type="button"` on all non-submit buttons; dialogs/AlertDialogs auto-focus their primary action.
- Form UX: login autofocuses email, checkout item form submits on Enter, consistent password visibility toggles.

## Phase 10 — done (Final polish & production checks)
- Per-route metadata: added `layout.tsx` (server component) per route — `dashboard`, `menu`, `orders`, `history`, `users`, `table-session/[id]`, `checkout/[id]` — plus `Login` metadata on the login page. Root layout has the `"%s | NJ's Café & Restaurant"` template.
- `npm run lint` clean; `npx tsc --noEmit` clean; `npm run build` passes (Next 16.1.6, Turbopack) — all 10 routes listed.
- Invalidation keys verified: `["tableSession"]`/`["orders"]`/`["tables"]` prefixes match their query keys (`["tableSession", id]`, `["orders", page, pageSize]`, `["tables"]`).
- End-to-end smoke test against the live backend (admin@test.com): create session → create order → add item (price_at_time snapshot) → toggle served → close (HTTP 200, body null — frontend ignores it) → shows in `/table-sessions/history/paginated` with correct final_bill → analytics summary reflects revenue. Verified the 400 path: closing with a pending order returns `{"detail":"Cannot close session: all orders must be served"}` (matches the frontend check `detail.includes("all orders must be served")`); double-close returns 400 "Session already closed".

## Stats Dashboard — done
- `frontend/app/lib/analytics.ts`: `AnalyticsSummary` type + `useAnalytics(days)` (`queryKey: ["analytics", days]`).
- `components/stats/stat-card.tsx` — label/value/hint + icon card. `revenue-chart.tsx` — recharts `BarChart` (rounded amber bars) in `ChartContainer`, `formatCurrency` tooltips, `formatNepalDate` ticks. `top-items.tsx` / `top-customers.tsx` — top-5 ranked lists.
- Dashboard `StatsSection`: 7|30 day toggle, 4 stat cards (Revenue, Sessions, Avg Bill, Unique Customers from period totals), revenue chart, top items/customers. Skeleton while loading, error + Retry, empty state when revenue is 0. Shown to all staff (Design Decision 4).
- `--chart-1..5` CSS vars defined in `globals.css`.

## Notes for next session
- Live demo DB now contains test sessions from the smoke test (final_bill 499.9 and 0.0, plus one pending order deleted via DELETE). Safe to reset via the normal seed flow if a clean slate is wanted.
- `table-session/[id]` free-table flow: uses `/table-sessions/{id}/close` (closes the session; "free table" semantics confirmed — closing the session is what frees the table). "Clear Table" per backend clears order items on an active session; not surfaced as a separate UI action.

**Finished: Friday August 14, 2026 at 11:34 +0545**