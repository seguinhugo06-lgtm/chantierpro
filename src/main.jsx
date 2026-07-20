import React, { Suspense, lazy } from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import { AppProvider } from './context/AppContext'
import { OrgProvider } from './context/OrgContext'
import { EntrepriseProvider } from './context/EntrepriseContext'
import { DataProvider } from './context/DataContext'
import { DEMO_DATA, seedSecondaryDemoData } from './lib/demo-data'
import { EMPTY_DATA } from './lib/empty-data'
import { isDemo } from './supabaseClient'
import { initSentry } from './lib/sentry'
import './index.css'

// ── Initialize Sentry error monitoring (production only) ────────────
initSentry()

// ── Stale chunk reload handler ──────────────────────────────────────
// When a new deployment happens, old JS chunks (e.g. DevisPage-abc123.js)
// no longer exist on the server. Lazy imports fail with ChunkLoadError.
// This handler auto-reloads the page once to get fresh bundles.
const RELOAD_KEY = 'batigesti_chunk_reload';
window.addEventListener('error', (event) => {
  const msg = event?.message || event?.error?.message || '';
  if (
    msg.includes('Failed to fetch dynamically imported module') ||
    msg.includes('ChunkLoadError') ||
    msg.includes('Loading chunk') ||
    msg.includes('Importing a module script failed')
  ) {
    // Prevent infinite reload loop — only reload once per session
    const lastReload = sessionStorage.getItem(RELOAD_KEY);
    if (!lastReload || Date.now() - parseInt(lastReload, 10) > 30000) {
      console.warn('[ChunkError] Stale bundle detected, reloading...', msg);
      sessionStorage.setItem(RELOAD_KEY, Date.now().toString());
      window.location.reload();
    }
  }
});

// Also catch unhandled promise rejections (dynamic import() returns a promise)
window.addEventListener('unhandledrejection', (event) => {
  const msg = event?.reason?.message || '';
  if (
    msg.includes('Failed to fetch dynamically imported module') ||
    msg.includes('ChunkLoadError') ||
    msg.includes('Importing a module script failed')
  ) {
    const lastReload = sessionStorage.getItem(RELOAD_KEY);
    if (!lastReload || Date.now() - parseInt(lastReload, 10) > 30000) {
      console.warn('[ChunkError] Stale dynamic import, reloading...', msg);
      sessionStorage.setItem(RELOAD_KEY, Date.now().toString());
      window.location.reload();
    }
  }
});

// Lazy load public pages (separate from main app — no AuthGuard, no DataProvider)
const ClientPortal = lazy(() => import('./components/portal/ClientPortal'))
const DevisSignaturePage = lazy(() => import('./components/signature/DevisSignaturePage'))
const AcceptInvitation = lazy(() => import('./components/auth/AcceptInvitation'))
const PublicPaymentPage = lazy(() => import('./components/payment/PublicPaymentPage'))

// Marketing sub-pages (lazy loaded, light-mode only)
const FeaturesDetailPage = lazy(() => import('./components/landing/FeaturesDetailPage'))
const FeatureDeepDivePage = lazy(() => import('./components/landing/FeatureDeepDivePage'))
const ResourcesPage = lazy(() => import('./components/landing/ResourcesPage'))

// Check if this is a marketing sub-page
function getMarketingPage() {
  const path = window.location.pathname
  if (path === '/fonctionnalites') return 'features'
  const featureMatch = path.match(/^\/fonctionnalites\/([a-z0-9-]+)\/?$/)
  if (featureMatch) return { page: 'feature-detail', slug: featureMatch[1] }
  if (path === '/ressources') return 'resources'
  return null
}

// Check if this is a portal URL
function getPortalToken() {
  const path = window.location.pathname
  const match = path.match(/^\/portal\/([a-f0-9-]+)$/i)
  return match ? match[1] : null
}

// Check if this is a signature URL: /devis/signer/{uuid}
function getSignatureToken() {
  const path = window.location.pathname
  const match = path.match(/^\/devis\/signer\/([a-f0-9-]+)$/i)
  return match ? match[1] : null
}

// Check if this is an invitation URL: /invitation/{uuid}
function getInvitationToken() {
  const path = window.location.pathname
  const match = path.match(/^\/invitation\/([a-f0-9-]+)$/i)
  return match ? match[1] : null
}

// Check if this is a payment URL: /pay/{token} (uuid ou token démo)
function getPayToken() {
  const path = window.location.pathname
  const match = path.match(/^\/pay\/([a-z0-9_-]+)\/?$/i)
  return match ? match[1] : null
}

// Check for demo data mode via URL param: ?demo=true (only works in demo mode)
function shouldUseDemoData() {
  const params = new URLSearchParams(window.location.search)
  return params.get('demo') === 'true'
}

const portalToken = getPortalToken()
const signatureToken = getSignatureToken()
const invitationToken = getInvitationToken()
const payToken = getPayToken()
const marketingPage = getMarketingPage()

// Determine initial data:
// - If NOT in demo mode (real Supabase): use EMPTY_DATA (data comes from DB)
// - If in demo mode with ?demo=true param: use DEMO_DATA
// - If in demo mode without param: use EMPTY_DATA (new user experience)
const useDemoData = isDemo && shouldUseDemoData()
const initialData = useDemoData ? DEMO_DATA : EMPTY_DATA

// Log mode for debugging
if (isDemo) {
  console.log('🎭 Demo mode active -', useDemoData ? 'using demo data' : 'empty data (add ?demo=true for demo data)')
  // Seed secondary localStorage data (previsions, fournisseurs, etc.) when using demo data
  if (useDemoData) {
    // Les données démo persistées vieillissent (dates décalées au moment du seed).
    // Au-delà de 14 jours, on repart d'un jeu frais — la démo est jetable.
    // NB : on ne touche qu'à batigesti_demo_data (clé exclusivement démo) —
    // cp_entreprise & co servent aussi de cache au mode réel.
    try {
      const seededAt = localStorage.getItem('batigesti_demo_seeded_at')
      const stale = seededAt && (Date.now() - new Date(seededAt).getTime()) > 14 * 86400000
      if (stale) localStorage.removeItem('batigesti_demo_data')
      if (!seededAt || stale) localStorage.setItem('batigesti_demo_seeded_at', new Date().toISOString())
    } catch { /* localStorage indisponible */ }
    seedSecondaryDemoData()
  }
} else {
  console.log('🔐 Production mode - data from Supabase')
}

// Public page loading spinner
const PublicFallback = () => (
  <div className="min-h-screen bg-slate-50 flex items-center justify-center">
    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500"></div>
  </div>
)

// Render public pages or main app based on URL
// Public routes (/portal/:token, /devis/signer/:token) bypass AuthGuard & DataProvider
ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    {marketingPage === 'features' ? (
      <Suspense fallback={<PublicFallback />}>
        <FeaturesDetailPage />
      </Suspense>
    ) : marketingPage?.page === 'feature-detail' ? (
      <Suspense fallback={<PublicFallback />}>
        <FeatureDeepDivePage slug={marketingPage.slug} />
      </Suspense>
    ) : marketingPage === 'resources' ? (
      <Suspense fallback={<PublicFallback />}>
        <ResourcesPage />
      </Suspense>
    ) : signatureToken ? (
      <Suspense fallback={<PublicFallback />}>
        <DevisSignaturePage signatureToken={signatureToken} />
      </Suspense>
    ) : payToken ? (
      <Suspense fallback={<PublicFallback />}>
        <PublicPaymentPage payToken={payToken} />
      </Suspense>
    ) : portalToken ? (
      <Suspense fallback={<PublicFallback />}>
        <ClientPortal accessToken={portalToken} />
      </Suspense>
    ) : invitationToken ? (
      <Suspense fallback={<PublicFallback />}>
        <AcceptInvitation token={invitationToken} />
      </Suspense>
    ) : (
      <AppProvider>
        <OrgProvider>
          <EntrepriseProvider>
            <DataProvider initialData={initialData}>
              <App />
            </DataProvider>
          </EntrepriseProvider>
        </OrgProvider>
      </AppProvider>
    )}
  </React.StrictMode>,
)
