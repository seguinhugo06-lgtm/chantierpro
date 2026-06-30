# Design Critique: Dashboard BatiGesti

## Overall Impression

The Dashboard follows a Linear/Notion-inspired aesthetic with a clean greeting, contextual badges, and action-oriented cards — a strong direction for a BTP SaaS targeting artisans. The main opportunity is **information overload**: the page stacks 15+ distinct sections vertically (hero, profile banner, urgent banner, KPI duo, sparkline chart, actions du jour, 2-column grid with chantiers + onboarding + F26 compliance, then a collapsible "Tableau de bord" with Overview, Consolidated, Revenue chart, and a 3-column widget grid). A user arriving for the first time sees a wall of cards competing for attention with no clear focal point beyond the greeting.

---

## Usability

| Finding | Severity | Recommendation |
|---------|----------|----------------|
| **15+ stacked sections before fold** — Hero, profile banner, urgent banner, KPI duo, sparkline, actions, 2-col grid, overview toggle, widgets. Users have to scroll 3+ screens to see it all. | **Critical** | Collapse the top half. Move the sparkline chart into the "Tableau de bord" collapsible section. Remove the profile/F26 banners once dismissed — they currently reappear on every load if < 80%. Limit the "above fold" to: greeting, KPI duo, actions du jour. |
| **Two separate customization systems** — The "Personnaliser" button controls `widgetConfig` visibility/ordering for the bottom grid, but the top half (KPI duo, actions, sparkline, chantiers sidebar) is hardcoded. Users can't hide or reorder the most prominent sections. | **Moderate** | Unify widget configuration. Let the same system control all sections, or split the dashboard into a fixed "Today" header (greeting + KPIs + actions) and a customizable "Tableau de bord" below. |
| **Duplicate profile completion banners** — Profile < 50%: compact banner above KPIs. Profile 50-80%: full banner in right column. Both show simultaneously if profile is exactly 50%. | **Moderate** | Show one banner at a time. Use the compact version above the fold, and a detail view in Settings only. |
| **Hidden sections with `{false && ...}`** — "Hero Duo" (Devis IA + Express) and "Secondary Shortcuts" are wrapped in `{false && ...}` or `className="hidden"`. Dead code adds 150+ lines of noise. | **Minor** | Delete dead code. If the features are deprecated, remove them entirely. If planned, move to a feature flag. |
| **"Tableau de bord" collapsed by default** — `showOverviewSection` starts as `false`. The operational widgets (Devis, Chantiers, Trésorerie, Score Santé, Météo) are invisible until the user expands. Core business data shouldn't require a manual toggle. | **Critical** | Default to expanded, or better: promote the most valuable widgets (Devis to follow up, Chantiers) above the fold and leave the toggle for secondary widgets. |
| **Actions du jour limited to 3** — The section truncates at 3 items with "Voir toutes les X actions →", but navigates to a separate Tasks page. The action list mixes devis relances, AI suggestions, and memos without clear grouping. | **Moderate** | Group by type (financial actions vs. tasks) or show 5 items. Add category pills ("Relances", "Tâches") so users can scan faster. |

---

## Visual Hierarchy

**What draws the eye first:** The greeting ("Bonjour, Hugo") with the user's name in the accent color. This is correct — it personalizes the experience.

**Reading flow:** The eye moves from greeting → context badges → profile banner (amber, draws attention disproportionately) → KPI duo → sparkline chart → action cards. The problem is that the profile banner's amber background creates a visual "speed bump" that competes with the KPIs, which are the actual priority.

**Emphasis issues:**

- The **KPI duo** ("À encaisser" + "Ce mois") is visually quiet — white cards with a thin 3px left border. These are the most important numbers on the dashboard but look like secondary elements.
- The **urgent action banner** (red border-left + red background) correctly uses color to signal urgency, but it sits below the profile banner, which is amber. Both use warm alert colors, creating confusion about which needs attention first.
- The **sparkline chart** is well-designed (gradient fill, clean axis labels) but it's sandwiched between KPIs and actions — it's neither a headline metric nor a detail, and its position forces other content down.
- The **"Tableau de bord"** section header with "Personnaliser" looks like a page footer, not the start of the main content area.

**Whitespace:** Spacing is tight — `mb-2`, `mb-3`, `gap-3` throughout. The dashboard feels dense. The right column in the 2-col grid (340px) stacks chantiers + onboarding + profile banner + F26 compliance in a narrow space — this column feels cramped on 1440px screens and collapses into a single column on mobile, doubling the scroll length.

---

## Consistency

| Element | Issue | Recommendation |
|---------|-------|----------------|
| **Card corner radius** | KPI cards use `rounded-xl`, action cards use `rounded-lg`, chantiers widget uses `rounded-2xl`, urgent banner uses `rounded-xl`. Three different radii on one page. | Standardize on `rounded-xl` for all dashboard cards. Use `rounded-2xl` only for the full-width container sections. |
| **Icon container sizing** | HeroSection: no container. KPI duo: `w-7 h-7`. Actions: 14px raw icon. Chantiers header: 16px raw icon. Activity widget: `w-9 h-9`. At least 4 different icon presentation patterns. | Define 2 sizes: `w-8 h-8 rounded-lg` (standard) and `w-10 h-10 rounded-xl` (hero). Use consistently. |
| **Typography in KPI values** | "À encaisser" value: `text-lg font-bold`. HeroSection active chantiers count: `font-semibold` with inline color. Progress bar percentage: `text-xs font-bold`. Trend badge: `text-[11px] font-bold`. | Establish a type scale for metrics: XL for headline KPIs (`text-2xl`), LG for secondary (`text-lg`), SM for supporting (`text-sm`). |
| **Hardcoded colors in progress bars** | Chantier progress: `#10b981`, `#3b82f6`, `couleur` (accent), `#cbd5e1` — all inline styles. Margin color: `#10b981`, `#f59e0b`, `#ef4444` via `getMargeColor()`. | Use Tailwind semantic colors: `bg-success-500`, `bg-info-500`, `bg-warning-500`, `bg-danger-500`. Reference the token system. |
| **Touch target inconsistency** | Some buttons have `min-h-[44px]` (WCAG compliant). Others are text-only with no minimum (`text-xs px-2 py-1`). The "Voir tous" link in chantiers header: `min-h-[44px]`. The "Voir détails →" sparkline link: no minimum height. | Add `min-h-[44px]` to all interactive elements, or use the `Button` component from `ui/Button` which handles this. |
| **Two different drag-and-drop systems** | `DashboardGrid.jsx` uses `@dnd-kit` (professional library). The "Personnaliser" panel uses native HTML5 `draggable` with `onDragStart/onDrop`. | Use `@dnd-kit` everywhere for consistent drag behavior, accessibility, and keyboard support. |

---

## Accessibility

**Color contrast:**
- Profile banner: amber-800 on amber-50 background — passes AA (7.3:1).
- KPI trend badges: `text-[11px]` at `text-emerald-600` on `bg-emerald-50` — passes, but the 11px size is below WCAG's 14px bold minimum for large text. At this size, it qualifies as body text and needs 4.5:1 contrast.
- Action card subtitle: `text-gray-500` on white — 4.6:1, barely passes AA.
- In dark mode: `text-slate-400` on `bg-slate-800` — 3.6:1, **fails AA**.

**Touch targets:**
- The chantier progress bar items are full-width buttons — good.
- The "Voir tous" links and "Voir détails →" are small text targets without sufficient padding. Mix of `min-h-[44px]` and no minimum.
- Profile completion missing-field pills (`px-2.5 py-1`) are ~28px tall — fails the 44px WCAG 2.5.5 target.

**Screen reader:**
- KPI cards are `<button>` elements — good for interactivity.
- The sparkline chart has no `aria-label`. A screen reader would encounter the Recharts SVG with no context.
- The "Personnaliser" toggle lacks `aria-expanded` state.

**Keyboard:**
- `focus-visible:ring-2` is used on most buttons — good.
- The drag-and-drop reorder in Personnaliser uses native HTML5 drag, which is not keyboard-accessible. The up/down buttons mitigate this, but only partially.

---

## What Works Well

- **Contextual greeting** with time-of-day logic and recap badges ("2 factures en retard", "3 devis en attente") gives an instant status snapshot.
- **Action-oriented design** — every card is clickable and routes to the relevant page. The "Relancer maintenant" CTA in the urgent banner is clear and direct.
- **Discrete mode** (`modeDiscret`) that hides financial amounts is a thoughtful feature for on-site use.
- **RBAC-aware rendering** — finance widgets are hidden for non-finance roles. Devis widgets hidden for "ouvrier" role. Smart role gating.
- **Widget customization** with persistence in localStorage is a good power-user feature.
- **New user experience** — the `NewUserWelcome` component with 3-step onboarding (configure, add client, create devis) is clear and well-designed.
- **Empty states** — the "Aucun chantier planifié" state with a "+Planifier" CTA is better than a blank space.

---

## Priority Recommendations

1. **Reduce the above-fold density from 15 sections to 5.** Keep: greeting, KPI duo (make larger), actions du jour (show 5), chantiers en cours. Move the sparkline, profile banner, and F26 compliance into a "Configuration" nudge or the Settings page. Default the "Tableau de bord" section to expanded.

2. **Elevate the KPI duo visually.** These are the most important numbers ("À encaisser" and "Ce mois") but they're styled like secondary cards. Make them larger (`text-2xl` for the value), add a subtle gradient or the accent color as background tint, and give them more vertical space. Compare to Stripe Dashboard's top metrics — they command the page.

3. **Fix dark mode contrast failures.** `text-slate-400` on `bg-slate-800` (3.6:1) fails AA. Switch all dark-mode secondary text to `text-slate-300` (5.8:1) or lighter. Audit every `text-slate-400`, `text-slate-500`, `text-gray-500` in dark mode.

4. **Unify card styling.** Pick one border-radius (`rounded-xl`), one icon container size (`w-8 h-8`), one shadow level (`shadow-sm` → `shadow-md` on hover). The current mix of `rounded-lg`, `rounded-xl`, `rounded-2xl` and `w-7`/`w-9`/`w-10` icon containers creates visual noise.

5. **Delete dead code and consolidate layout.** Remove the `{false && ...}` Hero Duo section (~40 lines), the `className="hidden"` shortcuts section (~30 lines), and `Dashboard.jsx.backup`. Consolidate the 2-column grid: the right column (chantiers + onboarding + profile + F26) has too many concerns for a 340px sidebar — promote chantiers to the main column and move the rest into contextual banners or Settings.
