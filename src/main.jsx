import React, { Suspense, lazy } from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import { AppProvider } from './context/AppContext'
import { OrgProvider } from './context/OrgContext'
import { DataProvider } from './context/DataContext'
import { DEMO_DATA, seedSecondaryDemoData } from './lib/demo-data'
import { EMPTY_DATA } from './lib/empty-data'
import { isDemo } from './supabaseClient'
import './index.css'

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

// Check for demo data mode via URL param: ?demo=true (only works in demo mode)
function shouldUseDemoData() {
  const params = new URLSearchParams(window.location.search)
  return params.get('demo') === 'true'
}

const portalToken = getPortalToken()
const signatureToken = getSignatureToken()
const invitationToken = getInvitationToken()

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
    {signatureToken ? (
      <Suspense fallback={<PublicFallback />}>
        <DevisSignaturePage signatureToken={signatureToken} />
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
          <DataProvider initialData={initialData}>
            <App />
          </DataProvider>
        </OrgProvider>
      </AppProvider>
    )}
  </React.StrictMode>,
)
