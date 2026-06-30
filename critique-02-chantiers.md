# Design Critique: Chantiers (Job Sites)

## Overall Impression

Chantiers is the second heaviest module — 3,676 lines, 45 useState hooks, 13 modals, and 11 tabs in the detail view. The good news: dark mode is fully compliant (no `dark:` violations), the tab ARIA implementation is excellent (`role="tablist"`, `aria-selected`, `aria-controls`), and the responsive patterns are thoughtful (touch-friendly 44px buttons on mobile). The main opportunity is **structural complexity**: 45 state variables and 13 uncoordinated modals in a single file make this fragile and hard to maintain.

---

## Usability

| Finding | Severity | Recommendation |
|---------|----------|----------------|
| **45 useState hooks** in a single component. Every state change re-renders the entire 3,676-line component including all 11 tabs. | **Critical** | Extract modal state into `useChantierModals()` hook. Split detail/list into sub-components. Target: <15 state vars in main component. |
| **11 tabs + 3 hidden "rare" tabs** in detail view. UX research recommends 5-7 tabs max. | **Moderate** | Keep the current "rare tabs" dropdown — it's a good compromise. Consider merging: "Messages" + "Notes" into one "Communication" tab. |
| **13 modals with no stacking guard** — if two modals open simultaneously, they render on top of each other with competing backdrops. | **Moderate** | Add mutual exclusion: opening one modal closes others. Or use a single `activeModal` state. |
| **Nav arrows (prev/next chantier) are 32px** — below 44px WCAG minimum. Status dropdown is 36px. | **Moderate** | Set `min-h-[44px]` on all interactive elements. |
| **Card list items are clickable divs** (~line 3218) without `role="button"`, `tabIndex`, or keyboard handler. | **Critical** | Replace with `<button>` or add `role="button"` + `tabIndex={0}` + `onKeyDown`. |
| **Margin color is the only indicator** of financial health (red/amber/green with no text label). Fails WCAG 1.4.1 (Use of Color). | **Moderate** | Add text label: "Négatif", "Faible", "Bon" alongside the percentage. |

---

## Visual Hierarchy

**What draws the eye first:** In list view: the status filter tabs with colored badges — correct, helps scan. In detail view: the sticky header with chantier name and status dropdown — correct.

**Issues:**
- Section headers in detail view use `text-[10px]` uppercase — too small to serve as visual landmarks. Should be `text-xs` minimum.
- Financial KPIs in detail view (`text-lg font-bold tabular-nums`) are well-sized, but health status next to them uses `text-[10px]` — 80% smaller, creating an unbalanced pair.
- Icon sizes vary wildly: 9px badges, 12px task icons, 15px tab icons, 20px photo icons, 28px FAB, 32px empty states. No standardized scale.

---

## Consistency

| Element | Issue | Recommendation |
|---------|-------|----------------|
| **27 hardcoded hex colors** | `#10b981` (6x), `#ef4444` (4x), `#3b82f6` (2x), `#22c55e` (2x), `#f59e0b` (2x), `#f97316` (2x), etc. | Replace with Tailwind semantic classes: `bg-emerald-500`, `bg-red-500`, `bg-blue-500`. Keep inline `style` only for dynamic `couleur` prop. |
| **z-[1050]** on merge dialog (line 3630) | Arbitrary, breaks the token system. Other modals use z-50. | Replace with `z-modal` from Tailwind config (1050). |
| **Typography: 6 custom sizes** | `text-[9px]`, `text-[10px]`, `text-[11px]` used alongside standard scale. | Eliminate sub-12px: `text-[9px]` → `text-[11px]`, `text-[10px]` → `text-xs`. |
| **Icon sizes: 8 variants** | 9px, 12px, 15px, 16px, 18px, 20px, 28px, 32px — no standardization. | Define 3 tiers: 14px (compact), 18px (standard), 24px (hero/FAB). |
| **Dark mode** | Fully compliant — no `dark:` violations. Uses `isDark` ternaries consistently. | No action needed. |

---

## Accessibility

**Excellent:** Tab implementation has full ARIA (`role="tablist"`, `aria-selected`, `aria-controls`, keyboard arrow navigation). This is best-in-class.

**Issues:**
- **Dark mode contrast:** `text-slate-400` on `bg-slate-800` is borderline (4.5:1). Switch to `text-slate-300` for better readability.
- **Touch targets:** Nav arrows (32px) and status dropdown (36px) are undersized.
- **Clickable divs:** Card list items (~line 3218) lack keyboard support.
- **Color-only information:** Margin health uses red/amber/green with no text alternative.
- **Missing ARIA:** Delete buttons in ajustement list, photo capture labels, cancel/add buttons in modals lack `aria-label`.

---

## What Works Well

- Dark mode is 100% compliant — uses `isDark` prop throughout with no `dark:` violations.
- Tab ARIA implementation is excellent — full keyboard navigation with arrow keys.
- Responsive design is thoughtful — `min-h-[44px] sm:min-h-[36px]` for mobile-first touch targets.
- FAB (Floating Action Button) with sub-actions and backdrop blur is a good mobile pattern.
- Photo categories with color-coded icons (avant/pendant/après/litige) are clear.
- Progress bars use consistent green gradient for completion visualization.
- "Rare tabs" hidden behind dropdown is a good UX compromise for 14 total tabs.

---

## Priority Recommendations

1. **Add keyboard support to card list** (~line 3218) — `role="button"` + `tabIndex={0}` + `onKeyDown`.
2. **Fix undersized touch targets** — nav arrows to 44px, status dropdown to 44px.
3. **Add text labels for color-coded margin** — "Négatif"/"Faible"/"Bon" alongside percentage.
4. **Replace hardcoded hex colors** — 27 instances → Tailwind semantic classes.
5. **Standardize typography** — eliminate `text-[9px]` and `text-[10px]`, use `text-xs` minimum.
