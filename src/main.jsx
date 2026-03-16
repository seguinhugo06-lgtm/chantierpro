import React, { Suspense, lazy } from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import { AppProvider } from './context/AppContext'
import { DataProvider } from './context/DataContext'
import { DEMO_DATA } from './lib/demo-data'
import { EMPTY_DATA } from './lib/empty-data'
import { isDemo } from './supabaseClient'
import { initSentry } from './lib/sentry'
import './index.css'

// Initialiser Sentry avant le rendu
initSentry();

// Lazy load portal, signature page, payment page, and legal pages (separate from main app)
const ClientPortal = lazy(() => import('./components/portal/ClientPortal'))
const DevisSignaturePage = lazy(() => import('./components/signature/DevisSignaturePage'))
const FacturePaymentPage = lazy(() => import('./components/payment/FacturePaymentPage'))
const CGU = lazy(() => import('./components/legal/CGU'))
const CGV = lazy(() => import('./components/legal/CGV'))
const MentionsLegales = lazy(() => import('./components/legal/MentionsLegales'))
const PolitiqueConfidentialite = lazy(() => import('./components/legal/PolitiqueConfidentialite'))
const ResetPasswordPage = lazy(() => import('./components/ResetPasswordPage'))
const FeaturesDetailPage = lazy(() => import('./components/landing/FeaturesDetailPage'))
const ResourcesPage = lazy(() => import('./components/landing/ResourcesPage'))

// Check if this is a portal URL
function getPortalToken() {
  const path = window.location.pathname
  const match = path.match(/^\/portal\/([a-f0-9-]+)$/i)
  return match ? match[1] : null
}

// Check if this is a signature URL: /devis/signer/{token}
function getSignatureToken() {
  const path = window.location.pathname
  const match = path.match(/^\/devis\/signer\/([a-f0-9-]+)$/i)
  return match ? match[1] : null
}

// Check if this is a payment URL: /facture/payer/{token}
function getPaymentToken() {
  const path = window.location.pathname
  const match = path.match(/^\/facture\/payer\/([a-f0-9-]+)$/i)
  return match ? match[1] : null
}

// Check if this is a legal page URL
const LEGAL_PAGES = {
  '/cgu': 'cgu',
  '/cgv': 'cgv',
  '/mentions-legales': 'mentions',
  '/confidentialite': 'confidentialite',
}

function getLegalPage() {
  const path = window.location.pathname.toLowerCase()
  return LEGAL_PAGES[path] || null
}

// Check if this is the password reset page
function isResetPasswordPage() {
  return window.location.pathname === '/reset-password'
}

// Check if this is a marketing page
const MARKETING_PAGES = {
  '/fonctionnalites': 'fonctionnalites',
  '/ressources': 'ressources',
}

function getMarketingPage() {
  const path = window.location.pathname.toLowerCase()
  return MARKETING_PAGES[path] || null
}

// Check for demo data mode via URL param: ?demo=true (only works in demo mode)
function shouldUseDemoData() {
  const params = new URLSearchParams(window.location.search)
  return params.get('demo') === 'true'
}

const portalToken = getPortalToken()
const signatureToken = getSignatureToken()
const paymentToken = getPaymentToken()
const legalPage = getLegalPage()
const marketingPage = getMarketingPage()
const isResetPw = isResetPasswordPage()

// Determine initial data:
// - If NOT in demo mode (real Supabase): use EMPTY_DATA (data comes from DB)
// - If in demo mode with ?demo=true param: use DEMO_DATA
// - If in demo mode without param: use EMPTY_DATA (new user experience)
const useDemoData = isDemo && shouldUseDemoData()
const initialData = useDemoData ? DEMO_DATA : EMPTY_DATA

// Log mode for debugging
if (import.meta.env.DEV) {
  if (isDemo) {
    console.log('Demo mode active -', useDemoData ? 'using demo data' : 'empty data (add ?demo=true for demo data)')
  } else {
    console.log('Production mode - data from Supabase')
  }
}

// Loading spinner component
const LoadingSpinner = () => (
  <div className="min-h-screen bg-slate-50 flex items-center justify-center">
    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500"></div>
  </div>
)

// Render legal page component by key
function LegalPageRenderer({ page }) {
  switch (page) {
    case 'cgu': return <CGU />
    case 'cgv': return <CGV />
    case 'mentions': return <MentionsLegales />
    case 'confidentialite': return <PolitiqueConfidentialite />
    default: return null
  }
}

// Render payment page, signature page, portal, legal pages, or main app based on URL
ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    {paymentToken ? (
      <Suspense fallback={<LoadingSpinner />}>
        <FacturePaymentPage paymentToken={paymentToken} />
      </Suspense>
    ) : signatureToken ? (
      <Suspense fallback={<LoadingSpinner />}>
        <DevisSignaturePage signatureToken={signatureToken} />
      </Suspense>
    ) : portalToken ? (
      <Suspense fallback={<LoadingSpinner />}>
        <ClientPortal accessToken={portalToken} />
      </Suspense>
    ) : legalPage ? (
      <Suspense fallback={<LoadingSpinner />}>
        <LegalPageRenderer page={legalPage} />
      </Suspense>
    ) : marketingPage === 'fonctionnalites' ? (
      <Suspense fallback={<LoadingSpinner />}>
        <FeaturesDetailPage />
      </Suspense>
    ) : marketingPage === 'ressources' ? (
      <Suspense fallback={<LoadingSpinner />}>
        <ResourcesPage />
      </Suspense>
    ) : isResetPw ? (
      <Suspense fallback={<LoadingSpinner />}>
        <ResetPasswordPage />
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
