import React, { Suspense, lazy } from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import { AppProvider } from './context/AppContext'
import { DataProvider } from './context/DataContext'
import { DEMO_DATA } from './lib/demo-data'
import './index.css'

// Lazy load portal (separate from main app)
const ClientPortal = lazy(() => import('./components/portal/ClientPortal'))

// Check if this is a portal URL
function getPortalToken() {
  const path = window.location.pathname
  const match = path.match(/^\/portal\/([a-f0-9-]+)$/i)
  return match ? match[1] : null
}

const portalToken = getPortalToken()

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
        <DataProvider initialData={DEMO_DATA}>
          <App />
        </DataProvider>
      </AppProvider>
    )}
  </React.StrictMode>,
)
