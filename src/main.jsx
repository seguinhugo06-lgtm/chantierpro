import React, { Suspense, lazy } from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import { AppProvider } from './context/AppContext'
import { DataProvider } from './context/DataContext'
import { DEMO_DATA, seedSecondaryDemoData } from './lib/demo-data'
import { EMPTY_DATA } from './lib/empty-data'
import { isDemo } from './supabaseClient'
import './index.css'

// Lazy load portal (separate from main app)
const ClientPortal = lazy(() => import('./components/portal/ClientPortal'))

// Check if this is a portal URL
function getPortalToken() {
  const path = window.location.pathname
  const match = path.match(/^\/portal\/([a-f0-9-]+)$/i)
  return match ? match[1] : null
}

// Check for demo data mode via URL param: ?demo=true (only works in demo mode)
function shouldUseDemoData() {
  const params = new URLSearchParams(window.location.search)
  return params.get('demo') === 'true'
}

const portalToken = getPortalToken()

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

// Render portal or main app based on URL
ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    {portalToken ? (
      <Suspense fallback={
        <div className="min-h-screen bg-slate-50 flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500"></div>
        </div>
      }>
        <ClientPortal accessToken={portalToken} />
      </Suspense>
    ) : (
      <AppProvider>
        <DataProvider initialData={initialData}>
          <App />
        </DataProvider>
      </AppProvider>
    )}
  </React.StrictMode>,
)
