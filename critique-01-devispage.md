# Design Critique: DevisPage (Devis & Factures)

## Overall Impression

DevisPage is the **most critical and most complex** module in BatiGesti — 5,691 lines, 52 useState hooks, 6 view modes, 18+ modals, and ~80 inline styles. It handles everything from quote creation to invoice PDF generation to payment tracking. The design direction is solid (clean cards, accent-colored CTAs, responsive grid), but the component is far beyond a reasonable complexity threshold. The user experience suffers from too many competing actions in toolbar mode, inconsistent touch targets, and clickable divs that break keyboard navigation.

---

## Usability

| Finding | Severity | Recommendation |
|---------|----------|----------------|
| **5,691-line mega-component** with 52 useState hooks. Every state change re-renders the entire page including all 6 view modes. | **Critical** | Split into 4 sub-components: `DevisListView`, `DevisPreviewView`, `DevisCreateView`, `DevisSignView`. Each gets its own state. |
| **Preview toolbar has 8+ buttons** (download, preview, edit, more, chantier, vue client, WhatsApp, email) all visible at once. On mobile this overflows. | **Critical** | Group secondary actions (WhatsApp, email, vue client) into the "more" menu. Keep only: Download, Edit, and the primary CTA visible. |
| **KPI grid jumps from 2 to 5 columns** (`grid-cols-2 sm:grid-cols-5`) with no intermediate breakpoint. On tablet-width screens, KPIs are too narrow to read. | **Moderate** | Add `md:grid-cols-3 lg:grid-cols-5` for a smoother responsive flow. |
| **Clickable `<div>` elements** in the card list (~line 5198) — no `role="button"`, no keyboard handler, no focus state. | **Critical** | Replace with `<button>` elements. Add `focus-visible:ring-2` styling. |
| **18+ modals managed inconsistently** — 11 via `useDevisModals()` hook, 7 as standalone `useState` booleans. No guard against multiple modals opening simultaneously. | **Moderate** | Move all modals into the centralized hook. Add mutual exclusion logic. |
| **PDF generation embedded in component** (lines 1300-1630) — inline HTML/CSS styles mixed with business logic. | **Moderate** | Extract to `src/services/DevisPdfService.js` + `src/lib/pdfStyles.js`. |

---

## Visual Hierarchy

**What draws the eye first:** The KPI bar at the top (5 metrics: total CA, devis en attente, etc.) — correct for a business module.

**Reading flow:** KPIs → search/filter bar → action button → list cards. This is a good flow.

**Issues:**
- In preview mode, the status progress indicator is clear, but the toolbar below it has too many equally-weighted buttons — nothing stands out as the primary action.
- Card list items have a thin left border color indicating status — effective, but the status text inside the card competes with it (double encoding of the same information).
- Typography in KPI values uses `text-[9px] sm:text-[10px]` for labels — too small, below minimum readable size for body text.

---

## Consistency

| Element | Issue | Recommendation |
|---------|-------|----------------|
| **STATUS_BAR_COLORS** (line 227) | 10 hardcoded hex values (`#94a3b8`, `#3b82f6`, `#10b981`, `#f59e0b`, `#ef4444`, etc.) | Move to `src/constants/colors.js` using semantic tokens. |
| **Border-radius** | 5 different values: `rounded`, `rounded-lg`, `rounded-xl`, `rounded-2xl`, `rounded-full` | Standardize on `rounded-xl` for cards, `rounded-lg` for inputs, `rounded-full` for badges. |
| **Touch targets** | 6+ buttons below 44px: "vue client" (`min-w-[40px]`), chantier button, WhatsApp/email icons, line move buttons (`p-1` only). | Set all interactive elements to `min-h-[44px] min-w-[44px]`. |
| **Icon containers** | Mix of 16px and 20px icons with no container standardization. | Use `w-8 h-8 rounded-lg` containers consistently. |
| **Typography** | KPI labels use `text-[9px]`, badges use `text-[10px]`, subtitles use `text-[11px]`. Three sub-xs sizes. | Standardize: `text-xs` (12px) minimum for any readable text. |

---

## Accessibility

**Dark mode contrast:** Uses `textMuted = isDark ? "text-slate-400" : "text-slate-600"` — technically WCAG AA on `bg-slate-800` (~4.3:1) but borderline. Should be `text-slate-300` for comfortable reading.

**Touch targets:** 6+ buttons are undersized (40px instead of 44px minimum).

**Keyboard:** Clickable `<div>` elements have no keyboard support. Status dropdown and actions menu lack `aria-expanded`.

**Screen reader:** Cards are clickable divs without `role` — invisible to screen readers. Missing `aria-label` on status selector and actions menu.

---

## What Works Well

- KPI bar gives instant financial overview without scrolling.
- Status progress indicator in preview mode is clear and scannable.
- Debounced search (300ms) prevents performance issues.
- Split-button CTA ("+ Nouveau devis" with dropdown for subtypes) is efficient.
- Color-coded left borders on list cards give quick visual status scanning.
- The `modeDiscret` feature works throughout — all financial data can be hidden.

---

## Priority Recommendations

1. **Replace clickable divs with buttons** in the card list (~line 5198) — accessibility critical.
2. **Split the mega-component** into 4 view sub-components to reduce re-render scope and cognitive load.
3. **Collapse the preview toolbar** — move 5 secondary actions into the existing "more" menu.
4. **Fix touch targets** — 6+ buttons need `min-h-[44px] min-w-[44px]`.
5. **Extract STATUS_BAR_COLORS** to `src/constants/colors.js` with semantic tokens.
