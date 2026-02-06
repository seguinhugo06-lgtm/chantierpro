/**
 * Dashboard Components Index
 * Import all dashboard components from here
 */

export { default as HeroSection, HeroSectionSkeleton } from './HeroSection';
export { default as KPICard, KPICardSkeleton, MiniKPICard } from './KPICard';
export { default as ActionBanner, ActionBannerStack } from './ActionBanner';
export {
  default as Widget,
  WidgetHeader,
  WidgetContent,
  WidgetFooter,
  WidgetEmptyState,
  WidgetMenuButton,
  WidgetLink,
  WidgetTabs,
} from './Widget';
export { default as DevisWidget, DevisWidgetSkeleton } from './DevisWidget';
export { default as ChantiersWidget, ChantiersWidgetSkeleton } from './ChantiersWidget';
export { default as TresorerieWidget, TresorerieWidgetSkeleton } from './TresorerieWidget';
export { default as StockWidget, StockWidgetSkeleton } from './StockWidget';
export { default as WeatherAlertsWidget, WeatherAlertsBadge } from './WeatherAlertsWidget';
export { default as SuggestionsSection, SuggestionsSectionSkeleton } from './SuggestionsSection';
export { default as ActionsList } from './ActionsList';

// Overview Widget (unified)
export { default as OverviewWidget, OverviewWidgetSkeleton } from './OverviewWidget';
export { default as RevenueChartWidget, RevenueChartWidgetSkeleton } from './RevenueChartWidget';

// Health Score Widget
export { default as ScoreSanteWidget, ScoreSanteWidget as ScoreSanteWidgetNamed } from './ScoreSanteWidget';

// KPI Modals
export { EncaisserModal, CeMoisModal } from './KPIModals';
