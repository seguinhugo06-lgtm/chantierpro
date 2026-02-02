# UI/UX Audit Report - ChantierPro
## Prompts for Claude Code (No Code, Only Precise Comments)

---

## CRITICAL ISSUES (Priority 1)

### 1. Chantiers Page - Incoherence: "Terminé" Status with Incomplete Progress
**Location:** `src/components/Chantiers.jsx`
**Issue:** Projects marked as "Terminé" (Completed) display progress percentages like 41.6% and 37.4%, which is incoherent. A completed project should show 100% progress or hide the progress bar entirely.
**Screenshot evidence:** "Peinture appartement Bernard" shows "Terminé" badge with 41.6% progress.

**Prompt for Claude Code:**
```
In Chantiers.jsx, fix the incoherence between status badges and progress percentages. When a chantier has status "termine" or "terminé", either:
1. Force the progress display to 100%, OR
2. Hide the progress bar and percentage entirely for completed projects
Search for where the progress percentage is displayed alongside the status badge and add conditional logic to handle "terminé" status appropriately.
```

---

### 2. Dashboard - "Sans titre" Placeholder Text Displayed
**Location:** `src/components/dashboard/DevisWidget.jsx`
**Issue:** In the "Devis en attente" section, devis items show "Sans titre" (No title) as the subtitle. This looks like missing data or a fallback placeholder that should not be visible to users.

**Prompt for Claude Code:**
```
In DevisWidget.jsx, investigate why devis items display "Sans titre" as subtitle. Either:
1. Ensure the devis title/objet field is properly fetched and displayed
2. If no title exists, show the client name or devis number instead of "Sans titre"
3. If this is a fallback, make it more user-friendly like "Devis sans objet" or hide the subtitle line entirely
```

---

## HIGH PRIORITY ISSUES (Priority 2)

### 3. Dashboard - Unbalanced Three-Column Layout
**Location:** `src/components/Dashboard.jsx`, `src/components/dashboard/` widgets
**Issue:** The three-column layout (Devis en attente / Chantiers à venir / Trésorerie) has uneven widths. The left column appears narrower than the middle column.

**Prompt for Claude Code:**
```
In Dashboard.jsx, review the grid layout for the three dashboard widgets (DevisWidget, ChantiersWidget, TresorerieWidget). Ensure equal column widths using:
- CSS Grid with equal fractions: grid-cols-3
- Or Flexbox with flex-1 on each column
Verify the widgets don't have conflicting width constraints that override the grid.
```

---

### 4. Amounts Cut Off at Screen Edge
**Location:** Multiple pages (Chantiers list, Devis & Factures)
**Issue:** Some monetary amounts appear cut off at the right edge of the screen, particularly visible on the Chantiers list where amounts like "37€..." and "7480,0..." are truncated.

**Prompt for Claude Code:**
```
Search for all components displaying monetary amounts (formatMoney, formatCurrency, currency display).
Ensure:
1. Container has sufficient padding-right
2. Text doesn't overflow its container
3. Consider using text-overflow: ellipsis or responsive font sizes for very large amounts
4. Add min-width constraints if needed to prevent truncation
Files to check: Chantiers.jsx, DevisPage.jsx, dashboard widgets
```

---

### 5. Chantiers - Inconsistent Percentage Display Format
**Location:** `src/components/Chantiers.jsx`
**Issue:** Progress percentages are displayed with inconsistent decimal precision: some show "84.9%", "81.2%", "-13%" while others show whole numbers like "100%", "30%".

**Prompt for Claude Code:**
```
In Chantiers.jsx, standardize the percentage display format. Either:
1. Always show whole numbers (round to nearest integer): Math.round(percentage) + '%'
2. Or always show one decimal place: percentage.toFixed(1) + '%'
Apply this consistently across progress bars, margin displays, and all percentage indicators.
Search for: percentage display, avancement, marge calculations
```

---

### 6. Negative Margin Warning Inconsistency
**Location:** `src/components/Chantiers.jsx`
**Issue:** The "-13%" margin on "Rénovation cuisine Dupont" displays with a warning icon (triangle), but the visual hierarchy is unclear. The warning should be more prominent.

**Prompt for Claude Code:**
```
In Chantiers.jsx, enhance the visual warning for negative margins:
1. Make the negative percentage more visually distinct (red background or border)
2. Add tooltip explaining what the negative margin means
3. Consider adding a subtle shake animation or pulsing effect for critical low margins
4. Ensure the AlertTriangle icon is properly sized and colored (should be red/orange)
```

---

## MEDIUM PRIORITY ISSUES (Priority 3)

### 7. Équipe Page - Employee Cards Low Contrast
**Location:** `src/components/Equipe.jsx`
**Issue:** Employee cards at the bottom of the Équipe page appear with very low contrast/opacity, making them hard to read.

**Prompt for Claude Code:**
```
In Equipe.jsx, review the employee card styling:
1. Check if there's conditional opacity being applied
2. Ensure text contrast meets WCAG AA standards (4.5:1 for normal text)
3. Remove any unintended transparency/opacity on card backgrounds
4. Verify the card doesn't have a filter or reduced opacity on inactive states
```

---

### 8. Dashboard Hero - Large Empty Space
**Location:** `src/components/dashboard/HeroSection.jsx`
**Issue:** On wider screens, there's significant empty space in the dashboard header area. The greeting section could use the space more efficiently.

**Prompt for Claude Code:**
```
In HeroSection.jsx, optimize the layout for wider screens:
1. Consider adding quick stats or mini widgets to the right of the greeting
2. Or center the content for a more balanced appearance
3. Ensure max-width constraints work well across breakpoints
4. Review padding/margin values for desktop vs mobile
```

---

### 9. Sidebar Badge Alignment
**Location:** `src/App.jsx` or sidebar component
**Issue:** The notification badges on sidebar items (Devis & Factures: 2, Chantiers: 4) appear well-aligned, but verify consistency across all badge positions.

**Prompt for Claude Code:**
```
Review the sidebar navigation badges:
1. Ensure badges are consistently positioned (right-aligned with same spacing)
2. Check badge color consistency (orange for notifications)
3. Verify badges update reactively when counts change
4. Test with larger numbers (double digits) to ensure they don't overflow
```

---

### 10. Settings Page - Form Layout Optimization
**Location:** `src/components/Settings.jsx`
**Issue:** The profile completion indicator shows 7% which is very low. The form fields are well-organized but the "Capital" field's euro symbol appears misaligned.

**Prompt for Claude Code:**
```
In Settings.jsx, fix the Capital input field:
1. The euro symbol (€) should be properly positioned as a suffix inside the input
2. Use input group styling with addon suffix
3. Ensure consistent spacing with other form fields
4. Consider using InputAdornment pattern for currency inputs
```

---

### 11. Planning Calendar - Event Overflow
**Location:** `src/components/Planning.jsx`
**Issue:** Calendar dates with many events show "+1 autres", "+2 autres" links. Verify these overflow indicators are consistently styled and clickable.

**Prompt for Claude Code:**
```
In Planning.jsx, review the calendar event overflow handling:
1. Ensure "+X autres" links are clickable and open a modal/popover with all events
2. Verify consistent styling of the overflow indicator
3. Consider showing a tooltip on hover with event names
4. Test with many events on a single day (5+)
```

---

### 12. Clients Page - Inconsistent Footer Data
**Location:** `src/components/Clients.jsx`
**Issue:** Most client cards show dashes (-) in the footer, while "Bernard Sophie" shows "2337,5€". This might be intentional (unpaid balance) but the meaning is unclear.

**Prompt for Claude Code:**
```
In Clients.jsx, clarify the client card footer display:
1. Add a label or tooltip explaining what the amount represents (e.g., "Impayé", "Solde dû")
2. Or standardize the display - if it's unpaid balance, show "0 €" instead of "-" when there's no balance
3. Ensure consistent formatting of the monetary values
4. Consider color coding (green for paid/no balance, red for unpaid)
```

---

## LOW PRIORITY / POLISH (Priority 4)

### 13. Weather Integration Polish
**Location:** `src/components/dashboard/WeatherAlertsWidget.jsx`, `src/components/dashboard/ChantiersWidget.jsx`
**Issue:** Weather displays are present but could be more consistent. Some show "Pluie Légère" with icons while others show temperature + conditions.

**Prompt for Claude Code:**
```
Review weather display consistency across:
1. ChantiersWidget - shows weather per chantier
2. WeatherAlertsWidget - shows alerts
3. Dashboard chantier cards
Ensure consistent format: temperature + condition + appropriate icon
Verify weather API fallbacks work when offline
```

---

### 14. FAB Button Position
**Location:** Multiple pages (bottom-right floating action button)
**Issue:** The orange FAB (+) button and microphone button are positioned at the bottom-right. Verify they don't overlap with content when scrolling.

**Prompt for Claude Code:**
```
Review the FAB positioning across all pages:
1. Ensure adequate spacing from page content
2. Verify FAB doesn't overlap with important UI elements
3. Check mobile responsiveness of FAB position
4. Consider z-index layering if overlapping issues exist
Files to check: VoiceAssistant.jsx, FABMenu.jsx
```

---

### 15. Dark Mode Consistency
**Location:** `src/App.jsx`, all components with isDark prop
**Issue:** The app has "Mode sombre" option in sidebar. Ensure dark mode styling is consistent across all pages and components.

**Prompt for Claude Code:**
```
Audit dark mode implementation:
1. Search for all isDark prop usage
2. Verify consistent dark color palette (bg-slate-800, text-slate-100, etc.)
3. Check for any hardcoded white/black colors that don't adapt
4. Test all pages in dark mode for contrast issues
5. Ensure charts, graphs, and badges remain readable in dark mode
```

---

## SUMMARY OF FILES TO MODIFY

| File | Issues |
|------|--------|
| `src/components/Chantiers.jsx` | #1 (Terminé/progress incoherence), #5 (percentage format), #6 (negative margin) |
| `src/components/dashboard/DevisWidget.jsx` | #2 (Sans titre) |
| `src/components/Dashboard.jsx` | #3 (layout balance) |
| `src/components/dashboard/ChantiersWidget.jsx` | #4 (amounts cut off), #13 (weather) |
| `src/components/DevisPage.jsx` | #4 (amounts cut off) |
| `src/components/Equipe.jsx` | #7 (card contrast) |
| `src/components/dashboard/HeroSection.jsx` | #8 (empty space) |
| `src/components/Settings.jsx` | #10 (capital field) |
| `src/components/Planning.jsx` | #11 (event overflow) |
| `src/components/Clients.jsx` | #12 (footer data) |

---

## TESTING CHECKLIST

After implementing fixes:
- [ ] Test on desktop (1920x1080, 1440x900)
- [ ] Test on tablet (768x1024)
- [ ] Test on mobile (375x667)
- [ ] Verify dark mode for all changed components
- [ ] Check offline behavior (service worker)
- [ ] Test with empty data states
- [ ] Test with very long text content
- [ ] Test with large numbers (millions of euros)
