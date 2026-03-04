# PROMPT 5: Checklist de Lancement - ChantierPro

**Prompt 5 de 5 pour ChantierPro** — Préparation finale, lancement et mise en production.
Stack: React 18, Vite 5, Supabase, Zustand, Tailwind CSS.

---

## PROMPT COMPLET POUR CLAUDE

```
Tu es développeur senior fullstack spécialisé dans les lancements de SaaS B2B.
Tu dois préparer ChantierPro pour le lancement en production.

## PRIORITÉS

1. **SEO & Performance**: Scores Lighthouse > 90, PWA complète, Core Web Vitals optimisés
2. **Conformité légale**: CGV, CGU, Mentions légales, Politique de confidentialité (RGPD)
3. **Sécurité & RGPD**: Consentement cookies, suppression de compte, export données
4. **Analytics & Monitoring**: Sentry, Analytics, Error tracking, Uptime monitoring
5. **Tests & QA**: E2E critiques, tests unitaires, responsive design, dark mode
6. **Documentation**: Centre d'aide, FAQ, guides, changelog

---

## 1. SEO & PERFORMANCE

### 1.1 Meta Tags et SEO

**Créer** `src/components/SEO.tsx` (wrapper pour useEffect + Helmet ou react-helmet-async):

```typescript
import { useEffect } from 'react'

export const useSEO = ({
  title = 'ChantierPro — Logiciel de gestion de chantier pour artisans BTP',
  description = 'Créez vos devis et factures BTP en 5 minutes. Gestion de chantier, trésorerie, conformité. Essai gratuit 14 jours.',
  image = 'https://chantierpro.fr/og-image.jpg',
  url = 'https://chantierpro.fr',
  type = 'website'
}: {
  title?: string
  description?: string
  image?: string
  url?: string
  type?: string
} = {}) => {
  useEffect(() => {
    // Mettre à jour le titre
    document.title = title

    // Meta tags
    const updateMeta = (name: string, content: string, isProperty = false) => {
      let el = document.querySelector(
        isProperty ? `meta[property="${name}"]` : `meta[name="${name}"]`
      ) as HTMLMetaElement | null

      if (!el) {
        el = document.createElement('meta')
        isProperty ? el.setAttribute('property', name) : el.setAttribute('name', name)
        document.head.appendChild(el)
      }
      el.content = content
    }

    updateMeta('description', description)
    updateMeta('viewport', 'width=device-width, initial-scale=1')
    updateMeta('theme-color', '#1f2937')

    // Open Graph
    updateMeta('og:title', title, true)
    updateMeta('og:description', description, true)
    updateMeta('og:image', image, true)
    updateMeta('og:url', url, true)
    updateMeta('og:type', type, true)
    updateMeta('og:site_name', 'ChantierPro', true)

    // Twitter
    updateMeta('twitter:card', 'summary_large_image')
    updateMeta('twitter:title', title)
    updateMeta('twitter:description', description)
    updateMeta('twitter:image', image)

    // Canonical
    let canonical = document.querySelector('link[rel="canonical"]') as HTMLLinkElement | null
    if (!canonical) {
      canonical = document.createElement('link')
      canonical.rel = 'canonical'
      document.head.appendChild(canonical)
    }
    canonical.href = url

  }, [title, description, image, url, type])
}
```

**Créer** `public/robots.txt`:
```
User-agent: *
Allow: /
Disallow: /admin/
Disallow: /api/

Sitemap: https://chantierpro.fr/sitemap.xml
```

**Créer** `public/sitemap.xml`:
```xml
<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>https://chantierpro.fr/</loc>
    <lastmod>2024-02-07</lastmod>
    <changefreq>weekly</changefreq>
    <priority>1.0</priority>
  </url>
  <url>
    <loc>https://chantierpro.fr/pricing</loc>
    <changefreq>monthly</changefreq>
    <priority>0.8</priority>
  </url>
  <url>
    <loc>https://chantierpro.fr/cgv</loc>
    <changefreq>yearly</changefreq>
    <priority>0.5</priority>
  </url>
  <url>
    <loc>https://chantierpro.fr/confidentialite</loc>
    <changefreq>yearly</changefreq>
    <priority>0.5</priority>
  </url>
  <url>
    <loc>https://chantierpro.fr/mentions-legales</loc>
    <changefreq>yearly</changefreq>
    <priority>0.5</priority>
  </url>
  <url>
    <loc>https://chantierpro.fr/aide</loc>
    <changefreq>weekly</changefreq>
    <priority>0.7</priority>
  </url>
</urlset>
```

**Créer** `public/manifest.json`:
```json
{
  "name": "ChantierPro — Gestion de chantier pour BTP",
  "short_name": "ChantierPro",
  "description": "Devis, factures, chantier. Logiciel BTP simplifié.",
  "start_url": "/",
  "scope": "/",
  "display": "standalone",
  "theme_color": "#1f2937",
  "background_color": "#ffffff",
  "orientation": "portrait-primary",
  "icons": [
    {
      "src": "/icon-192x192.png",
      "sizes": "192x192",
      "type": "image/png",
      "purpose": "any"
    },
    {
      "src": "/icon-512x512.png",
      "sizes": "512x512",
      "type": "image/png",
      "purpose": "any"
    },
    {
      "src": "/icon-maskable-192x192.png",
      "sizes": "192x192",
      "type": "image/png",
      "purpose": "maskable"
    },
    {
      "src": "/icon-maskable-512x512.png",
      "sizes": "512x512",
      "type": "image/png",
      "purpose": "maskable"
    }
  ],
  "screenshots": [
    {
      "src": "/screenshot-1.png",
      "sizes": "540x720",
      "type": "image/png"
    },
    {
      "src": "/screenshot-2.png",
      "sizes": "1080x1440",
      "type": "image/png"
    }
  ],
  "categories": ["productivity", "business"],
  "shortcuts": [
    {
      "name": "Nouveau devis",
      "short_name": "Devis",
      "description": "Créer un nouveau devis",
      "url": "/devis/new",
      "icons": [{ "src": "/shortcut-devis.png", "sizes": "192x192" }]
    }
  ]
}
```

**Ajouter** dans `index.html`:
```html
<head>
  <link rel="manifest" href="/manifest.json">
  <link rel="apple-touch-icon" href="/apple-touch-icon.png">
  <meta name="apple-mobile-web-app-capable" content="yes">
  <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
  <meta name="apple-mobile-web-app-title" content="ChantierPro">
</head>
```

**Créer** `src/lib/structured-data.ts` (JSON-LD):
```typescript
export const softwareApplicationSchema = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  "name": "ChantierPro",
  "description": "Logiciel de gestion de chantier pour artisans et entreprises BTP",
  "url": "https://chantierpro.fr",
  "image": "https://chantierpro.fr/og-image.jpg",
  "applicationCategory": "BusinessApplication",
  "offers": [
    {
      "@type": "Offer",
      "name": "Plan Starter",
      "price": "29",
      "priceCurrency": "EUR",
      "priceValidUntil": "2025-12-31"
    }
  ],
  "aggregateRating": {
    "@type": "AggregateRating",
    "ratingValue": "4.8",
    "ratingCount": "47"
  },
  "author": {
    "@type": "Organization",
    "name": "ChantierPro",
    "url": "https://chantierpro.fr"
  }
}
```

### 1.2 Performance — Code Splitting et Lazy Loading

**Configurer Vite** `vite.config.ts`:
```typescript
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { compression } from 'vite-plugin-compression'

export default defineConfig({
  plugins: [
    react(),
    compression({
      algorithm: 'brotli'
    })
  ],
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor': ['react', 'react-dom', 'zustand'],
          'supabase': ['@supabase/supabase-js'],
          'ui': ['lucide-react', 'date-fns'],
          'forms': ['react-hook-form', 'zod']
        }
      }
    },
    minify: 'terser',
    terserOptions: {
      compress: { drop_console: true }
    },
    sourcemap: true // Pour Sentry
  },
  server: {
    headers: {
      'X-Content-Type-Options': 'nosniff',
      'X-Frame-Options': 'DENY',
      'X-XSS-Protection': '1; mode=block'
    }
  }
})
```

**Implémenter** route lazy loading dans `src/router/index.tsx`:
```typescript
import { lazy, Suspense } from 'react'

// Lazy load les pages
const Dashboard = lazy(() => import('../pages/Dashboard'))
const DevisPage = lazy(() => import('../pages/Devis'))
const FacturesPage = lazy(() => import('../pages/Factures'))
const ClientsPage = lazy(() => import('../pages/Clients'))
const SettingsPage = lazy(() => import('../pages/Settings'))
const AidePage = lazy(() => import('../pages/Aide'))
const ChangelogPage = lazy(() => import('../pages/Changelog'))
const CGVPage = lazy(() => import('../pages/legal/CGV'))
const ConfidentialitePage = lazy(() => import('../pages/legal/Confidentialite'))
const MentionsLegalesPage = lazy(() => import('../pages/legal/MentionsLegales'))
const CGUPage = lazy(() => import('../pages/legal/CGU'))

// Loading skeleton component
function PageLoader() {
  return <div className="flex items-center justify-center min-h-screen">
    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
  </div>
}

export const routes = [
  {
    path: '/dashboard',
    element: <Suspense fallback={<PageLoader />}><Dashboard /></Suspense>
  },
  // ... autres routes
]
```

**Optimiser les images** — créer `src/components/OptimizedImage.tsx`:
```typescript
import { ImgHTMLAttributes } from 'react'

interface OptimizedImageProps extends ImgHTMLAttributes<HTMLImageElement> {
  src: string
  alt: string
  webpSrc?: string
  sizes?: string
  priority?: boolean
}

export function OptimizedImage({
  src,
  webpSrc,
  alt,
  sizes,
  priority = false,
  ...props
}: OptimizedImageProps) {
  const loading = priority ? 'eager' : 'lazy'

  return (
    <picture>
      {webpSrc && <source srcSet={webpSrc} type="image/webp" sizes={sizes} />}
      <img
        src={src}
        alt={alt}
        loading={loading}
        sizes={sizes}
        {...props}
      />
    </picture>
  )
}
```

**Route prefetching** — dans le router ou layout principal:
```typescript
import { useEffect } from 'react'

export function RoutePrefetcher() {
  useEffect(() => {
    const prefetchRoutes = ['/dashboard', '/devis', '/factures']

    prefetchRoutes.forEach(route => {
      const link = document.createElement('link')
      link.rel = 'prefetch'
      link.as = 'document'
      link.href = route
      document.head.appendChild(link)
    })
  }, [])

  return null
}
```

### 1.3 PWA Complète — Service Worker

**Créer** `src/service-worker.ts`:
```typescript
const CACHE_VERSION = 'v1'
const CACHE_ASSETS = `${CACHE_VERSION}-assets`
const CACHE_API = `${CACHE_VERSION}-api`

// Assets statiques
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/logo.svg'
]

// Installation
self.addEventListener('install', (event: ExtendableEvent) => {
  event.waitUntil(
    caches.open(CACHE_ASSETS).then((cache) => {
      return cache.addAll(STATIC_ASSETS)
    })
  )
  self.skipWaiting()
})

// Activation
self.addEventListener('activate', (event: ExtendableEvent) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (!cacheName.startsWith(CACHE_VERSION)) {
            return caches.delete(cacheName)
          }
        })
      )
    })
  )
  self.clients.claim()
})

// Fetch: Cache-first pour assets, Network-first pour API
self.addEventListener('fetch', (event: FetchEvent) => {
  const { request } = event
  const url = new URL(request.url)

  // Exclure les requêtes non-GET
  if (request.method !== 'GET') {
    return
  }

  // API: Network-first
  if (url.pathname.startsWith('/api/') || url.hostname !== self.location.hostname) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response.ok) {
            const cache = caches.open(CACHE_API)
            cache.then((c) => c.put(request, response.clone()))
          }
          return response
        })
        .catch(() => caches.match(request))
    )
    return
  }

  // Assets: Cache-first
  event.respondWith(
    caches.match(request).then((response) => {
      return response || fetch(request).then((response) => {
        if (response.ok && request.method === 'GET') {
          caches.open(CACHE_ASSETS).then((cache) => {
            cache.put(request, response.clone())
          })
        }
        return response
      })
    })
  )
})

// Push notifications
self.addEventListener('push', (event: PushEvent) => {
  const data = event.data?.json() ?? {}
  const title = data.title || 'ChantierPro'
  const options = {
    body: data.body,
    icon: '/icon-192x192.png',
    badge: '/badge-72x72.png'
  }
  event.waitUntil(self.registration.showNotification(title, options))
})
```

**Enregistrer** le SW dans `src/main.tsx`:
```typescript
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('/service-worker.js')
      .then((reg) => console.log('SW registered'))
      .catch((err) => console.error('SW registration failed:', err))
  })
}
```

**Ajouter build du SW** dans `vite.config.ts` (ou utiliser `workbox-vite`):
```bash
npm install workbox-build workbox-window
```

---

## 2. PAGES LÉGALES

### 2.1 Conditions Générales de Vente (CGV)

**Créer** `src/pages/legal/CGV.tsx`:
```typescript
import { useSEO } from '../../components/SEO'

export default function CGVPage() {
  useSEO({
    title: 'Conditions Générales de Vente - ChantierPro',
    description: 'CGV de ChantierPro. Abonnement, paiement, rétractation, responsabilité.'
  })

  return (
    <div className="max-w-4xl mx-auto px-4 py-12">
      <h1 className="text-4xl font-bold mb-8">Conditions Générales de Vente</h1>
      <div className="prose prose-invert max-w-none">

        <h2>1. Éditeur et Responsable</h2>
        <p>
          <strong>[À REMPLIR]</strong><br/>
          Raison sociale: [Nom entreprise]<br/>
          SIRET: [Numéro SIRET]<br/>
          Adresse: [Adresse complète]<br/>
          Email: contact@chantierpro.fr<br/>
          Téléphone: [Numéro]
        </p>

        <h2>2. Description des Services</h2>
        <p>
          ChantierPro est un logiciel (SaaS) de gestion de chantier et de trésorerie
          destiné aux artisans et petites entreprises du BTP. Les services incluent:
        </p>
        <ul>
          <li>Création et envoi de devis en PDF</li>
          <li>Facturation et suivi de paiements</li>
          <li>Gestion de chantiers et clients</li>
          <li>Génération de rapports comptables</li>
          <li>Signature électronique de devis</li>
          <li>Intégration bancaire (optionnel)</li>
        </ul>

        <h2>3. Modalités d'Abonnement et de Paiement</h2>
        <p>
          <strong>3.1 Plans disponibles:</strong>
        </p>
        <ul>
          <li><strong>Starter:</strong> 29€/mois (10 devis, 10 factures, 1 utilisateur)</li>
          <li><strong>Pro:</strong> 79€/mois (illimité, jusqu'à 5 utilisateurs)</li>
          <li><strong>Enterprise:</strong> Devis personnalisé</li>
        </ul>
        <p>
          <strong>3.2 Essai gratuit:</strong> 14 jours sans engagement ni CB requise.<br/>
          <strong>3.3 Paiement:</strong> Par CB via Stripe, payable mensuellement ou annuellement (20% de réduction).<br/>
          <strong>3.4 Facturation:</strong> Facture électronique générée automatiquement et disponible dans le compte.
        </p>

        <h2>4. Droit de Rétractation</h2>
        <p>
          Conformément à la Directive 2011/83/UE, le client dispose d'un délai de <strong>14 jours</strong>
          à compter de l'activation du plan payant pour exercer son droit de rétractation sans justification.
        </p>
        <p>
          Pour exercer ce droit, contacter support@chantierpro.fr avec la mention "Rétractation".
        </p>

        <h2>5. Résiliation</h2>
        <p>
          L'abonnement peut être résilié à tout moment via le panneau de contrôle.
          La résiliation prend effet à la fin du mois en cours. Aucun remboursement
          n'est dû pour la période en cours.
        </p>

        <h2>6. Responsabilité et Garanties</h2>
        <p>
          <strong>6.1 Limitation de responsabilité:</strong>
          ChantierPro n'est pas responsable des pertes de données, interruptions de service,
          ou dommages indirects. La responsabilité totale est limitée au montant payé
          par le client au cours des 12 derniers mois.
        </p>
        <p>
          <strong>6.2 Disponibilité:</strong>
          Nous visons 99.5% de disponibilité (hors maintenance programmée).
          Les maintenances sont annoncées 7 jours à l'avance.
        </p>

        <h2>7. Protection des Données (RGPD)</h2>
        <p>
          Les données personnelles sont traitées conformément à la Politique de Confidentialité
          et au RGPD. Voir la page <a href="/confidentialite">Politique de Confidentialité</a>.
        </p>

        <h2>8. Propriété Intellectuelle</h2>
        <p>
          Tous les contenus, logos, et fonctionnalités de ChantierPro sont la propriété
          exclusive de [Nom Entreprise] et sont protégés par le droit d'auteur.
          Toute reproduction sans autorisation est interdite.
        </p>

        <h2>9. Droit Applicable et Juridiction</h2>
        <p>
          Ces CGV sont régies par la loi française. Tout litige est de la juridiction
          exclusive des tribunaux compétents de [Ville].
        </p>

        <p className="text-sm text-gray-400 mt-12">
          Dernière mise à jour: {new Date().toLocaleDateString('fr-FR')}
        </p>
      </div>
    </div>
  )
}
```

### 2.2 Politique de Confidentialité (RGPD)

**Créer** `src/pages/legal/Confidentialite.tsx`:
```typescript
import { useSEO } from '../../components/SEO'

export default function ConfidentialitePage() {
  useSEO({
    title: 'Politique de Confidentialité - ChantierPro',
    description: 'RGPD, données personnelles, cookies, droits des utilisateurs.'
  })

  return (
    <div className="max-w-4xl mx-auto px-4 py-12">
      <h1 className="text-4xl font-bold mb-8">Politique de Confidentialité</h1>
      <div className="prose prose-invert max-w-none">

        <h2>1. Responsable du Traitement</h2>
        <p>
          <strong>[À REMPLIR]</strong><br/>
          Raison sociale: [Nom entreprise]<br/>
          Email: privacy@chantierpro.fr<br/>
          Délégué à la Protection des Données: [Email/Contact DPO]
        </p>

        <h2>2. Données Collectées et Finalités</h2>
        <table className="w-full border border-gray-600">
          <thead>
            <tr className="bg-gray-800">
              <th className="border border-gray-600 p-2">Données</th>
              <th className="border border-gray-600 p-2">Finalité</th>
              <th className="border border-gray-600 p-2">Base légale</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td className="border border-gray-600 p-2">Email, nom, prénom</td>
              <td className="border border-gray-600 p-2">Création compte, authentification</td>
              <td className="border border-gray-600 p-2">Consentement (art. 6.1.a RGPD)</td>
            </tr>
            <tr>
              <td className="border border-gray-600 p-2">Données de paiement (CB derniers 4 chiffres)</td>
              <td className="border border-gray-600 p-2">Facturation, paiement abonnement</td>
              <td className="border border-gray-600 p-2">Contrat (art. 6.1.b RGPD)</td>
            </tr>
            <tr>
              <td className="border border-gray-600 p-2">Données client/devis/factures</td>
              <td className="border border-gray-600 p-2">Fourniture du service</td>
              <td className="border border-gray-600 p-2">Contrat (art. 6.1.b RGPD)</td>
            </tr>
            <tr>
              <td className="border border-gray-600 p-2">Logs d'accès, IP, User-Agent</td>
              <td className="border border-gray-600 p-2">Sécurité, détection fraude</td>
              <td className="border border-gray-600 p-2">Intérêt légitime (art. 6.1.f RGPD)</td>
            </tr>
            <tr>
              <td className="border border-gray-600 p-2">Événements d'utilisation (Analytics)</td>
              <td className="border border-gray-600 p-2">Amélioration du service</td>
              <td className="border border-gray-600 p-2">Consentement (art. 6.1.a RGPD)</td>
            </tr>
          </tbody>
        </table>

        <h2>3. Durée de Conservation</h2>
        <ul>
          <li>Données de compte actif: Pendant toute la durée du contrat</li>
          <li>Après résiliation: 7 jours (délai de grâce pour reactivation)</li>
          <li>Données comptables: 6 ans (obligation légale en France)</li>
          <li>Logs de sécurité: 1 an</li>
          <li>Données de paiement: 13 mois minimum (PCI-DSS)</li>
        </ul>

        <h2>4. Sous-traitants</h2>
        <ul>
          <li><strong>Supabase (Firebase/Google):</strong> Hébergement données, authentification</li>
          <li><strong>Stripe:</strong> Paiements et facturation</li>
          <li><strong>Sendgrid/Resend:</strong> Emails transactionnels</li>
          <li><strong>Plausible/PostHog:</strong> Analytics privé (anonymisé)</li>
          <li><strong>Sentry:</strong> Monitoring erreurs</li>
          <li><strong>Vercel:</strong> Hébergement application et logs</li>
        </ul>

        <h2>5. Droits de l'Utilisateur</h2>
        <p>
          Conformément au RGPD, vous disposez des droits suivants:
        </p>
        <ul>
          <li><strong>Droit d'accès:</strong> Recevoir une copie de vos données</li>
          <li><strong>Droit de rectification:</strong> Corriger vos données</li>
          <li><strong>Droit à l'oubli:</strong> Suppression de vos données (délai 30 jours)</li>
          <li><strong>Droit à la portabilité:</strong> Récupérer vos données en format standard (ZIP JSON)</li>
          <li><strong>Droit d'opposition:</strong> Vous opposer au traitement</li>
          <li><strong>Droit de limitation:</strong> Limiter le traitement de vos données</li>
        </ul>
        <p>
          Pour exercer ces droits, contacter: privacy@chantierpro.fr
        </p>

        <h2>6. Cookies et Technologies de Suivi</h2>
        <p>
          <strong>Catégories de cookies:</strong>
        </p>
        <ul>
          <li><strong>Nécessaires (toujours actif):</strong> Authentification, sécurité, préférences interface</li>
          <li><strong>Analytiques (opt-in):</strong> Plausible Analytics (pas de tracking identifiant)</li>
          <li><strong>Marketing (opt-in):</strong> Pixel Facebook/Google pour retargeting</li>
        </ul>
        <p>
          La banneau de consentement aux cookies est présenté au premier accès.
          Le choix est stocké pour 12 mois.
        </p>

        <h2>7. Sécurité</h2>
        <p>
          Nous utilisons:
        </p>
        <ul>
          <li>HTTPS/TLS pour tous les échanges</li>
          <li>Chiffrement des données sensibles en base de données</li>
          <li>Authentification par JWT tokens</li>
          <li>Row-Level Security (RLS) Supabase</li>
          <li>Rate limiting sur API</li>
          <li>Monitoring de sécurité (Sentry)</li>
        </ul>

        <h2>8. Contact et Réclamations</h2>
        <p>
          Pour toute question: privacy@chantierpro.fr<br/>
          CNIL (France): <a href="https://www.cnil.fr" target="_blank" rel="noopener">www.cnil.fr</a>
        </p>

        <p className="text-sm text-gray-400 mt-12">
          Dernière mise à jour: {new Date().toLocaleDateString('fr-FR')}
        </p>
      </div>
    </div>
  )
}
```

### 2.3 Mentions Légales

**Créer** `src/pages/legal/MentionsLegales.tsx`:
```typescript
import { useSEO } from '../../components/SEO'

export default function MentionsLegalesPage() {
  useSEO({
    title: 'Mentions Légales - ChantierPro',
    description: 'Mentions légales, éditeur, hébergeur.'
  })

  return (
    <div className="max-w-4xl mx-auto px-4 py-12">
      <h1 className="text-4xl font-bold mb-8">Mentions Légales</h1>
      <div className="prose prose-invert max-w-none">

        <h2>Éditeur du site</h2>
        <p>
          <strong>[À REMPLIR]</strong><br/>
          Raison sociale: [Nom de l'entreprise]<br/>
          Forme juridique: [SARL/SAS/Auto-entreprise]<br/>
          SIRET: [Numéro SIRET]<br/>
          Capital social: [Montant]€<br/>
          Adresse: [Adresse complète]<br/>
          Téléphone: [Numéro]<br/>
          Email: contact@chantierpro.fr
        </p>

        <h2>Directeur de Publication</h2>
        <p>
          [Nom et prénom du responsable]<br/>
          [Email]
        </p>

        <h2>Hébergement</h2>
        <p>
          <strong>Application:</strong><br/>
          Vercel Inc.<br/>
          340 S Lemon Ave<br/>
          Walnut, CA 91789<br/>
          USA<br/>
          <a href="https://vercel.com" target="_blank" rel="noopener">www.vercel.com</a>
        </p>
        <p>
          <strong>Base de données:</strong><br/>
          Supabase (Firebase/Google Cloud)<br/>
          <a href="https://supabase.com" target="_blank" rel="noopener">www.supabase.com</a>
        </p>

        <h2>Responsable de Modération</h2>
        <p>
          [Nom et email] - support@chantierpro.fr
        </p>

        <p className="text-sm text-gray-400 mt-12">
          Dernière mise à jour: {new Date().toLocaleDateString('fr-FR')}
        </p>
      </div>
    </div>
  )
}
```

### 2.4 Conditions Générales d'Utilisation (CGU)

**Créer** `src/pages/legal/CGU.tsx`:
```typescript
import { useSEO } from '../../components/SEO'

export default function CGUPage() {
  useSEO({
    title: 'Conditions Générales d\'Utilisation - ChantierPro',
    description: 'CGU, obligations utilisateur, limitation responsabilité.'
  })

  return (
    <div className="max-w-4xl mx-auto px-4 py-12">
      <h1 className="text-4xl font-bold mb-8">Conditions Générales d'Utilisation</h1>
      <div className="prose prose-invert max-w-none">

        <h2>1. Objet et Acceptation</h2>
        <p>
          Les présentes CGU régissent l'accès et l'utilisation de la plateforme ChantierPro.
          En créant un compte ou en utilisant le service, vous acceptez ces conditions.
        </p>

        <h2>2. Création de Compte</h2>
        <ul>
          <li>Vous devez fournir des informations exactes et complètes</li>
          <li>Vous êtes responsable de la confidentialité de votre mot de passe</li>
          <li>Vous êtes responsable de toute activité sous votre compte</li>
          <li>Vous devez être âgé d'au minimum 18 ans ou agir avec l'accord d'un responsable légal</li>
          <li>Vous ne pouvez pas utiliser des données ou identités fausses</li>
        </ul>

        <h2>3. Obligations de l'Utilisateur</h2>
        <p>Vous vous engagez à:</p>
        <ul>
          <li>Respecter les lois applicables (notamment le droit du travail, fiscal, commercial)</li>
          <li>Ne pas utiliser ChantierPro à des fins illégales ou frauduleuses</li>
          <li>Ne pas divulguer vos identifiants de connexion</li>
          <li>Ne pas accéder à d'autres comptes sans autorisation</li>
          <li>Respecter les droits de propriété intellectuelle</li>
          <li>Ne pas effectuer de scraping, reverse engineering, ou accès non autorisé</li>
          <li>Signaler tout bug de sécurité à security@chantierpro.fr</li>
        </ul>

        <h2>4. Propriété Intellectuelle</h2>
        <p>
          Tous les éléments de ChantierPro (code, design, textes, logos) sont la propriété
          de [Nom Entreprise]. Vous accordez une licence limitée d'utilisation pour
          votre usage personnel conformément au contrat.
        </p>

        <h2>5. Limitation de Responsabilité</h2>
        <p>
          ChantierPro est fourni "tel quel". Nous ne sommes pas responsables de:
        </p>
        <ul>
          <li>Pertes de données ou interruptions de service</li>
          <li>Dommages indirects, consécutifs, ou punitifs</li>
          <li>Erreurs dans les calculs de devis/factures (l'utilisateur reste responsable)</li>
          <li>Utilisation du service non conforme à la loi</li>
        </ul>
        <p>
          La responsabilité totale est limitée au montant payé au cours des 12 derniers mois.
        </p>

        <h2>6. Suspension et Résiliation</h2>
        <p>
          Nous pouvons suspendre ou supprimer votre compte en cas de:
        </p>
        <ul>
          <li>Violation de ces CGU</li>
          <li>Non-paiement d'un abonnement</li>
          <li>Activité frauduleuse ou illégale</li>
          <li>Abus de service (spam, hacking, DDoS)</li>
        </ul>

        <h2>7. Modifications des CGU et Service</h2>
        <p>
          Nous nous réservons le droit de modifier ces CGU et le service à tout moment.
          Les modifications majeures seront communiquées par email.
          La continuation d'utilisation vaut acceptation.
        </p>

        <h2>8. Loi Applicable</h2>
        <p>
          Ces CGU sont régies par la loi française et tout litige relève de la juridiction
          compétente de [Ville].
        </p>

        <p className="text-sm text-gray-400 mt-12">
          Dernière mise à jour: {new Date().toLocaleDateString('fr-FR')}
        </p>
      </div>
    </div>
  )
}
```

---

## 3. SÉCURITÉ ET RGPD

### 3.1 Bannière Cookie (Consent)

**Créer** `src/components/CookieConsent.tsx`:
```typescript
import { useEffect, useState } from 'react'
import { X } from 'lucide-react'

export function CookieConsent() {
  const [isVisible, setIsVisible] = useState(false)
  const [showDetails, setShowDetails] = useState(false)
  const [consent, setConsent] = useState({
    necessary: true,
    analytics: false,
    marketing: false
  })

  useEffect(() => {
    const stored = localStorage.getItem('cookieConsent')
    if (!stored) {
      setIsVisible(true)
    } else {
      setConsent(JSON.parse(stored))
    }
  }, [])

  const handleAcceptAll = () => {
    const newConsent = { necessary: true, analytics: true, marketing: true }
    localStorage.setItem('cookieConsent', JSON.stringify(newConsent))
    setConsent(newConsent)
    setIsVisible(false)
    // Charger les scripts analytics/marketing
    loadAnalytics()
  }

  const handleRejectAll = () => {
    const newConsent = { necessary: true, analytics: false, marketing: false }
    localStorage.setItem('cookieConsent', JSON.stringify(newConsent))
    setConsent(newConsent)
    setIsVisible(false)
  }

  const handleSavePreferences = () => {
    localStorage.setItem('cookieConsent', JSON.stringify(consent))
    setIsVisible(false)
    if (consent.analytics) loadAnalytics()
  }

  const loadAnalytics = () => {
    // Charger Plausible Analytics
    const script = document.createElement('script')
    script.defer = true
    script.src = 'https://plausible.io/js/script.js'
    script.setAttribute('data-domain', 'chantierpro.fr')
    document.head.appendChild(script)
  }

  if (!isVisible) return null

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-gray-900 border-t border-gray-700 p-4 z-40">
      <div className="max-w-6xl mx-auto">
        {!showDetails ? (
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex-1">
              <h3 className="font-semibold mb-2">Nous utilisons des cookies</h3>
              <p className="text-sm text-gray-300">
                Nous utilisons des cookies nécessaires, analytiques et marketing pour améliorer votre expérience.
                <a href="/confidentialite" className="underline ml-1">Voir notre politique</a>
              </p>
            </div>
            <div className="flex gap-2 flex-shrink-0">
              <button
                onClick={handleRejectAll}
                className="px-4 py-2 text-sm bg-gray-700 hover:bg-gray-600 rounded"
              >
                Refuser tout
              </button>
              <button
                onClick={() => setShowDetails(true)}
                className="px-4 py-2 text-sm bg-gray-700 hover:bg-gray-600 rounded"
              >
                Personnaliser
              </button>
              <button
                onClick={handleAcceptAll}
                className="px-4 py-2 text-sm bg-blue-600 hover:bg-blue-700 rounded font-medium"
              >
                Accepter tout
              </button>
            </div>
          </div>
        ) : (
          <div>
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-semibold">Paramètres des cookies</h3>
              <button onClick={() => setShowDetails(false)} className="text-gray-400">
                <X size={20} />
              </button>
            </div>

            <div className="space-y-3 mb-4">
              <label className="flex items-center gap-2">
                <input type="checkbox" checked={true} disabled className="w-4 h-4" />
                <span className="text-sm"><strong>Nécessaires</strong> - Authentification, sécurité (toujours actif)</span>
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={consent.analytics}
                  onChange={(e) => setConsent({ ...consent, analytics: e.target.checked })}
                  className="w-4 h-4"
                />
                <span className="text-sm"><strong>Analytiques</strong> - Plausible Analytics (anonymisé)</span>
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={consent.marketing}
                  onChange={(e) => setConsent({ ...consent, marketing: e.target.checked })}
                  className="w-4 h-4"
                />
                <span className="text-sm"><strong>Marketing</strong> - Pixel Facebook, Google</span>
              </label>
            </div>

            <div className="flex gap-2">
              <button
                onClick={handleRejectAll}
                className="px-4 py-2 text-sm bg-gray-700 hover:bg-gray-600 rounded"
              >
                Refuser tout
              </button>
              <button
                onClick={handleSavePreferences}
                className="px-4 py-2 text-sm bg-blue-600 hover:bg-blue-700 rounded font-medium"
              >
                Enregistrer les préférences
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
```

### 3.2 Suppression de Compte

**Créer** `src/pages/Settings/DeleteAccount.tsx`:
```typescript
import { useState } from 'react'
import { supabase } from '../../lib/supabase'
import { AlertCircle, Mail } from 'lucide-react'

export function DeleteAccountSection() {
  const [step, setStep] = useState<'initial' | 'confirm' | 'sent'>('initial')
  const [typed, setTyped] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleInitiate = async () => {
    setLoading(true)
    setError('')

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Non authentifié')

      // Appeler edge function pour envoyer email de confirmation
      const response = await fetch('/api/delete-account-init', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: user.email })
      })

      if (!response.ok) throw new Error('Erreur lors de l\'envoi')

      setStep('sent')
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setLoading(false)
    }
  }

  const handleConfirm = async () => {
    if (typed !== 'SUPPRIMER') {
      setError('Veuillez taper "SUPPRIMER" exactement')
      return
    }

    setLoading(true)
    setError('')

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Non authentifié')

      // Appeler edge function pour supprimer le compte (avec délai de 30j)
      const response = await fetch('/api/delete-account-confirm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: user.email,
          token: new URLSearchParams(window.location.search).get('delete_token')
        })
      })

      if (!response.ok) throw new Error('Erreur lors de la suppression')

      // Déconnecter
      await supabase.auth.signOut()
      window.location.href = '/'
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="border border-red-900 bg-red-950/20 rounded-lg p-6">
      <div className="flex gap-4">
        <AlertCircle className="text-red-500 flex-shrink-0 mt-1" size={20} />
        <div className="flex-1">
          <h3 className="font-semibold text-red-400 mb-2">Zone de Danger: Supprimer le Compte</h3>

          {step === 'initial' && (
            <>
              <p className="text-sm text-gray-300 mb-4">
                La suppression du compte supprimera <strong>définitivement</strong> tous vos devis,
                factures, clients et chantiers après 30 jours.
                Vous pouvez récupérer vos données avant.
              </p>
              <button
                onClick={() => setStep('confirm')}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded text-sm font-medium"
              >
                Continuer avec la suppression
              </button>
            </>
          )}

          {step === 'confirm' && (
            <>
              <p className="text-sm text-gray-300 mb-4">
                Pour confirmer, tapez "<strong>SUPPRIMER</strong>" ci-dessous et cliquez sur le lien
                dans l'email que vous recevrez.
              </p>
              <input
                type="text"
                value={typed}
                onChange={(e) => setTyped(e.target.value.toUpperCase())}
                placeholder="Taper SUPPRIMER"
                className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded text-white mb-4"
              />
              {error && <p className="text-red-400 text-sm mb-4">{error}</p>}
              <button
                onClick={handleInitiate}
                disabled={typed !== 'SUPPRIMER' || loading}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white rounded text-sm font-medium"
              >
                {loading ? 'Traitement...' : 'Confirmer et envoyer email'}
              </button>
            </>
          )}

          {step === 'sent' && (
            <>
              <div className="bg-green-900/20 border border-green-900 rounded p-4 text-green-300">
                <div className="flex gap-2">
                  <Mail size={20} className="flex-shrink-0" />
                  <div>
                    <p className="font-medium">Email de confirmation envoyé</p>
                    <p className="text-sm text-green-200">
                      Vérifiez votre email et cliquez sur le lien pour confirmer la suppression.
                      Vous aurez 30 jours avant que le compte soit supprimé définitivement.
                    </p>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
```

**Edge Function Supabase** `supabase/functions/delete-account-init/index.ts`:
```typescript
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
)

serve(async (req: Request) => {
  if (req.method !== 'POST') return new Response('Not found', { status: 404 })

  try {
    const { email } = await req.json()

    // Générer token de suppression
    const deleteToken = crypto.randomUUID()
    const deleteDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)

    // Stocker dans une table
    await supabase
      .from('account_deletion_requests')
      .insert({
        email,
        delete_token: deleteToken,
        scheduled_deletion_at: deleteDate,
        created_at: new Date()
      })

    // Envoyer email avec lien de confirmation
    const deleteLink = `https://chantierpro.fr/settings/delete-account?delete_token=${deleteToken}`

    // Utiliser Resend ou autre service d'email
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${Deno.env.get('RESEND_API_KEY')}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        from: 'support@chantierpro.fr',
        to: email,
        subject: 'Confirmation de suppression de compte ChantierPro',
        html: `
          <h2>Suppression de compte</h2>
          <p>Vous avez demandé la suppression de votre compte.</p>
          <p><a href="${deleteLink}">Confirmer la suppression</a></p>
          <p>Ce lien expire dans 7 jours. Votre compte sera supprimé définitivement après 30 jours.</p>
        `
      })
    })

    return new Response(JSON.stringify({ success: true }), {
      headers: { 'Content-Type': 'application/json' }
    })
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    })
  }
})
```

### 3.3 Export Données RGPD

**Créer** `src/pages/Settings/ExportData.tsx`:
```typescript
import { useState } from 'react'
import { supabase } from '../../lib/supabase'
import { Download } from 'lucide-react'

export function ExportDataSection() {
  const [loading, setLoading] = useState(false)
  const [status, setStatus] = useState<'idle' | 'loading' | 'done'>('idle')

  const handleExport = async () => {
    setLoading(true)
    setStatus('loading')

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Non authentifié')

      // Récupérer toutes les données
      const [
        { data: clients },
        { data: devis },
        { data: factures },
        { data: chantiers },
        { data: settings }
      ] = await Promise.all([
        supabase.from('clients').select('*').eq('user_id', user.id),
        supabase.from('devis').select('*').eq('user_id', user.id),
        supabase.from('factures').select('*').eq('user_id', user.id),
        supabase.from('chantiers').select('*').eq('user_id', user.id),
        supabase.from('user_settings').select('*').eq('user_id', user.id)
      ])

      // Créer le fichier JSON
      const data = {
        export_date: new Date().toISOString(),
        user_id: user.id,
        email: user.email,
        clients: clients || [],
        devis: devis || [],
        factures: factures || [],
        chantiers: chantiers || [],
        settings: settings || []
      }

      const json = JSON.stringify(data, null, 2)
      const blob = new Blob([json], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `chantierpro-export-${new Date().toISOString().split('T')[0]}.json`
      link.click()

      setStatus('done')
      setTimeout(() => setStatus('idle'), 3000)
    } catch (error) {
      alert('Erreur lors de l\'export: ' + (error as Error).message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="border border-gray-700 rounded-lg p-6">
      <h3 className="font-semibold mb-2">Exporter mes données (RGPD)</h3>
      <p className="text-sm text-gray-400 mb-4">
        Téléchargez une copie de toutes vos données en format JSON: clients, devis, factures, chantiers.
      </p>
      <button
        onClick={handleExport}
        disabled={loading}
        className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded"
      >
        <Download size={18} />
        {status === 'done' ? 'Téléchargé ✓' : loading ? 'Traitement...' : 'Exporter mes données'}
      </button>
    </div>
  )
}
```

### 3.4 Sécurité — Headers et RLS

**Headers de sécurité** `vercel.json`:
```json
{
  "headers": [
    {
      "source": "/(.*)",
      "headers": [
        {
          "key": "Strict-Transport-Security",
          "value": "max-age=63072000; includeSubDomains; preload"
        },
        {
          "key": "X-Content-Type-Options",
          "value": "nosniff"
        },
        {
          "key": "X-Frame-Options",
          "value": "DENY"
        },
        {
          "key": "X-XSS-Protection",
          "value": "1; mode=block"
        },
        {
          "key": "Referrer-Policy",
          "value": "strict-origin-when-cross-origin"
        },
        {
          "key": "Permissions-Policy",
          "value": "camera=(), microphone=(), geolocation=()"
        },
        {
          "key": "Content-Security-Policy",
          "value": "default-src 'self'; script-src 'self' 'unsafe-inline' plausible.io; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self'; connect-src 'self' https://api.chantierpro.fr https://api.stripe.com"
        }
      ]
    }
  ]
}
```

**RLS Supabase** — Pour chaque table:
```sql
-- Clients: utilisateur ne voit que ses clients
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own clients" ON clients
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own clients" ON clients
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own clients" ON clients
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own clients" ON clients
  FOR DELETE USING (auth.uid() = user_id);

-- Appliquer identique pour devis, factures, chantiers, etc.
```

---

## 4. ANALYTICS ET MONITORING

### 4.1 Analytics Plausible

**Installation** `index.html`:
```html
<script defer data-domain="chantierpro.fr" src="https://plausible.io/js/script.js"></script>
```

**Tracking Events** `src/lib/analytics.ts`:
```typescript
export const analytics = {
  signup: () => {
    if (window.plausible) window.plausible('Signup')
  },

  trialStarted: () => {
    if (window.plausible) window.plausible('Trial Started')
  },

  firstDevis: () => {
    if (window.plausible) window.plausible('First Devis')
  },

  firstDevisSent: () => {
    if (window.plausible) window.plausible('First Devis Sent')
  },

  firstFacture: () => {
    if (window.plausible) window.plausible('First Facture')
  },

  planUpgrade: (plan: string) => {
    if (window.plausible) window.plausible('Plan Upgraded', { props: { plan } })
  },

  featureUsed: (feature: string) => {
    if (window.plausible) window.plausible('Feature Used', { props: { feature } })
  },

  subscriptionCanceled: () => {
    if (window.plausible) window.plausible('Subscription Canceled')
  }
}
```

### 4.2 Sentry Error Monitoring

**Installation**:
```bash
npm install @sentry/react @sentry/tracing
```

**Configuration** `src/main.tsx`:
```typescript
import * as Sentry from "@sentry/react"

Sentry.init({
  dsn: "https://YOUR_SENTRY_DSN@sentry.io/PROJECT_ID",
  environment: import.meta.env.MODE,
  integrations: [
    new Sentry.Replay({
      maskAllText: true,
      blockAllMedia: true,
    }),
  ],
  tracesSampleRate: 0.1,
  replaysSessionSampleRate: 0.1,
  replaysOnErrorSampleRate: 1.0,
})

const App = () => <YourApp />
export default Sentry.withProfiler(App)
```

### 4.3 Uptime Monitoring

**Health Check Endpoint** `api/health.ts`:
```typescript
export default function handler(req: VercelRequest, res: VercelResponse) {
  res.status(200).json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    version: '1.0.0'
  })
}
```

**Configurer BetterUptime ou UptimeRobot** pour checker `/api/health` toutes les 5 minutes.

---

## 5. TESTS ET QUALITÉ

### 5.1 Tests E2E Critiques (Playwright)

**Installation**:
```bash
npm install -D @playwright/test
npx playwright install
```

**Tests** `tests/critical-paths.spec.ts`:
```typescript
import { test, expect } from '@playwright/test'

test.describe('Parcours Critiques', () => {
  test('Inscription → Onboarding → Premier devis', async ({ page }) => {
    // Aller à la page d'inscription
    await page.goto('http://localhost:5173/signup')

    // Remplir formulaire
    await page.fill('input[name="email"]', 'test@example.com')
    await page.fill('input[name="password"]', 'SecurePassword123!')
    await page.click('button:has-text("S\'inscrire")')

    // Attendre redirection
    await page.waitForURL('**/onboarding/**')

    // Remplir nom entreprise
    await page.fill('input[name="company_name"]', 'Mon Entreprise')
    await page.click('button:has-text("Continuer")')

    // Créer devis
    await page.goto('http://localhost:5173/devis/new')
    await page.fill('input[name="client_name"]', 'Client Test')
    await page.fill('input[name="amount"]', '1000')
    await page.click('button:has-text("Créer devis")')

    // Vérifier création
    await expect(page).toHaveURL('**/devis/**')
  })

  test('Créer devis → Envoyer → Signer → Facturer', async ({ page }) => {
    // Login
    await page.goto('http://localhost:5173/login')
    await page.fill('input[name="email"]', 'test@example.com')
    await page.fill('input[name="password"]', 'SecurePassword123!')
    await page.click('button:has-text("Connexion")')

    // Aller sur devis
    await page.goto('http://localhost:5173/devis')
    await page.click('[data-testid="devis-123"]')

    // Envoyer
    await page.click('button:has-text("Envoyer")')
    await page.fill('input[name="email"]', 'client@example.com')
    await page.click('button:has-text("Confirmer")')

    // Vérifier envoi
    await expect(page.locator('text=Devis envoyé')).toBeVisible()
  })

  test('Upgrade plan → Checkout → Activation', async ({ page }) => {
    await page.goto('http://localhost:5173/pricing')
    await page.click('[data-testid="upgrade-pro"]')

    // Stripe checkout
    await expect(page).toHaveURL(/stripe.com/)
  })
})
```

### 5.2 Tests Unitaires (Vitest)

**Installation**:
```bash
npm install -D vitest @testing-library/react @testing-library/jest-dom
```

**Tests** `src/__tests__/calculations.test.ts`:
```typescript
import { describe, it, expect } from 'vitest'
import { calculateTVA, calculateMarge, formatMoney } from '../lib/calculations'

describe('Calculs TVA', () => {
  it('calcule TVA 20%', () => {
    const result = calculateTVA(100, 20)
    expect(result).toBe(120)
  })

  it('calcule TVA 10%', () => {
    const result = calculateTVA(100, 10)
    expect(result).toBe(110)
  })

  it('calcule TVA 5.5%', () => {
    const result = calculateTVA(100, 5.5)
    expect(result).toBe(105.5)
  })
})

describe('Calculs Marges', () => {
  it('calcule marge ouvrages', () => {
    const result = calculateMarge(1000, 200) // HT, marge
    expect(result).toBe(1200)
  })
})

describe('Formatage Monétaire', () => {
  it('formate en EUR', () => {
    expect(formatMoney(1234.56)).toBe('1 234,56 €')
  })
})
```

---

## 6. DOCUMENTATION

### 6.1 Centre d'Aide

**Créer** `src/pages/Aide.tsx`:
```typescript
import { useState } from 'react'
import { ChevronDown, Search, Mail } from 'lucide-react'
import { useSEO } from '../components/SEO'

const FAQ = [
  {
    category: 'Démarrage',
    items: [
      {
        q: 'Comment créer mon premier devis?',
        a: 'Allez dans "Devis" > "Nouveau devis", remplissez les détails du client et des ouvrages, puis cliquez sur "Créer".'
      },
      // ... 10+ questions
    ]
  },
  {
    category: 'Facturation',
    items: [
      {
        q: 'Quelle est la différence entre devis et facture?',
        a: 'Un devis est une proposition commerciale non-engagement. La facture formalise la vente après acceptation.'
      },
      // ... autres
    ]
  }
]

export default function AidePage() {
  useSEO({
    title: 'Centre d\'Aide - ChantierPro',
    description: 'FAQ, guides, support ChantierPro'
  })

  const [expanded, setExpanded] = useState<string | null>(null)
  const [search, setSearch] = useState('')

  const filtered = FAQ.map(cat => ({
    ...cat,
    items: cat.items.filter(
      item =>
        item.q.toLowerCase().includes(search.toLowerCase()) ||
        item.a.toLowerCase().includes(search.toLowerCase())
    )
  })).filter(cat => cat.items.length > 0)

  return (
    <div className="max-w-4xl mx-auto px-4 py-12">
      <h1 className="text-4xl font-bold mb-8">Centre d'Aide</h1>

      <div className="relative mb-8">
        <Search className="absolute left-3 top-3 text-gray-400" size={20} />
        <input
          type="text"
          placeholder="Rechercher..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-10 pr-4 py-2 bg-gray-800 border border-gray-700 rounded"
        />
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-400 mb-4">Aucun résultat trouvé</p>
          <a href="mailto:support@chantierpro.fr" className="text-blue-400 hover:underline flex items-center justify-center gap-2">
            <Mail size={16} /> Contacter le support
          </a>
        </div>
      ) : (
        filtered.map((category) => (
          <div key={category.category} className="mb-8">
            <h2 className="text-2xl font-semibold mb-4">{category.category}</h2>
            <div className="space-y-2">
              {category.items.map((item, idx) => (
                <button
                  key={idx}
                  onClick={() => setExpanded(expanded === `${category.category}-${idx}` ? null : `${category.category}-${idx}`)}
                  className="w-full text-left p-4 bg-gray-800 hover:bg-gray-700 rounded flex justify-between items-center"
                >
                  <span>{item.q}</span>
                  <ChevronDown
                    size={20}
                    className={`transition-transform ${expanded === `${category.category}-${idx}` ? 'rotate-180' : ''}`}
                  />
                </button>
              ))}
            </div>
            {expanded && category.items.map((item, idx) => (
              expanded === `${category.category}-${idx}` && (
                <div key={`answer-${idx}`} className="p-4 bg-gray-900 border-l-4 border-blue-600 text-gray-300">
                  {item.a}
                </div>
              )
            ))}
          </div>
        ))
      )}

      <div className="mt-12 p-6 bg-gray-800 rounded">
        <h3 className="font-semibold mb-2">Vous n'avez pas trouvé?</h3>
        <p className="text-gray-400 mb-4">Contactez notre équipe support</p>
        <a href="mailto:support@chantierpro.fr" className="text-blue-400 hover:underline">
          support@chantierpro.fr
        </a>
      </div>
    </div>
  )
}
```

### 6.2 Changelog

**Créer** `src/pages/Changelog.tsx`:
```typescript
import { useSEO } from '../components/SEO'

const CHANGELOG = [
  {
    version: '1.2.0',
    date: '2024-02-07',
    changes: [
      { type: 'feature', text: 'Signature électronique de devis' },
      { type: 'fix', text: 'Correction bug TVA à 5.5%' },
      { type: 'improvement', text: 'Performance: -40% temps de chargement' }
    ]
  },
  // ...
]

export default function ChangelogPage() {
  useSEO({
    title: 'Changelog - ChantierPro',
    description: 'Nouvelles features et mises à jour ChantierPro'
  })

  return (
    <div className="max-w-4xl mx-auto px-4 py-12">
      <h1 className="text-4xl font-bold mb-8">Changelog</h1>

      {CHANGELOG.map((release) => (
        <div key={release.version} className="mb-8">
          <div className="flex items-center gap-4 mb-4">
            <h2 className="text-2xl font-bold">v{release.version}</h2>
            <span className="text-gray-400">{release.date}</span>
            {release.version === CHANGELOG[0].version && (
              <span className="px-2 py-1 bg-blue-600 text-white text-xs rounded">Nouveau</span>
            )}
          </div>

          <div className="space-y-2">
            {release.changes.map((change, idx) => (
              <div key={idx} className="flex gap-3">
                <span className={`text-sm font-semibold ${
                  change.type === 'feature' ? 'text-green-400' :
                  change.type === 'fix' ? 'text-orange-400' :
                  'text-blue-400'
                }`}>
                  {change.type.toUpperCase()}
                </span>
                <span>{change.text}</span>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}
```

---

## 7. CHECKLIST FINALE DE LANCEMENT

Créer un composant **admin-only** (caché):

**Créer** `src/components/LaunchChecklist.tsx`:
```typescript
import { useState, useEffect } from 'react'
import { Check, X } from 'lucide-react'

const CHECKS = [
  { id: 'fr-text', label: 'Tous les textes en français' },
  { id: 'no-errors', label: 'Aucune erreur console' },
  { id: 'rls-enabled', label: 'RLS activé sur toutes tables' },
  { id: 'stripe-webhooks', label: 'Stripe webhooks testés' },
  { id: 'emails', label: 'Emails transactionnels OK' },
  { id: 'pwa', label: 'PWA installable' },
  { id: 'lighthouse-90', label: 'Lighthouse > 90 (toutes catégories)' },
  { id: 'legal-pages', label: 'CGV, CGU, Mentions, Confidentialité publiées' },
  { id: 'cookies', label: 'Bannière cookies fonctionnelle' },
  { id: 'delete-account', label: 'Suppression compte fonctionnelle' },
  { id: 'export-data', label: 'Export données RGPD fonctionnel' },
  { id: 'sentry', label: 'Sentry configuré' },
  { id: 'analytics', label: 'Analytics configuré' },
  { id: 'backup', label: 'Backup Supabase automatique' },
  { id: 'domain-ssl', label: 'Domaine chantierpro.fr + SSL forcé' },
  { id: 'responsive', label: 'Responsive testé (320px à 1440px)' },
  { id: 'darkmode', label: 'Dark mode fonctionnel' },
  { id: 'pdf', label: 'Impression PDF fonctionnelle' },
  { id: 'demo-mode', label: 'Mode demo accessible' },
  { id: 'e2e-tests', label: 'Tests E2E passent' }
]

export function LaunchChecklist() {
  const [checks, setChecks] = useState<Record<string, boolean>>({})

  const handleToggle = (id: string) => {
    setChecks(prev => ({ ...prev, [id]: !prev[id] }))
  }

  const completed = Object.values(checks).filter(Boolean).length

  // Afficher seulement si admin et en dev
  if (import.meta.env.PROD) return null

  return (
    <div className="fixed bottom-4 right-4 w-96 max-h-96 overflow-y-auto bg-gray-900 border border-gray-700 rounded-lg shadow-lg p-4">
      <h3 className="font-bold mb-2">Checklist Lancement</h3>
      <p className="text-sm text-gray-400 mb-4">{completed}/{CHECKS.length} complété</p>

      <div className="space-y-2">
        {CHECKS.map(check => (
          <button
            key={check.id}
            onClick={() => handleToggle(check.id)}
            className={`flex items-center gap-2 w-full p-2 rounded text-left text-sm ${
              checks[check.id] ? 'bg-green-900/20 text-green-400' : 'bg-gray-800 hover:bg-gray-700'
            }`}
          >
            {checks[check.id] ? <Check size={16} /> : <X size={16} className="opacity-30" />}
            {check.label}
          </button>
        ))}
      </div>

      <div className="mt-4 p-2 bg-gray-800 rounded text-xs text-gray-300">
        <p>✓ {completed}/{CHECKS.length} items complétés</p>
        {completed === CHECKS.length && (
          <p className="text-green-400 font-semibold mt-2">🚀 PRÊT POUR LE LANCEMENT!</p>
        )}
      </div>
    </div>
  )
}
```

---

## 8. COMMANDES NPM FINALES

```bash
# Build et optimisation
npm run build
npm run preview

# Tests
npm run test
npm run test:e2e

# Bundle analysis
npm run build -- --analyze

# Lighthouse CLI
npm install -g lighthouse
lighthouse https://chantierpro.fr --view

# Vercel deployment
npm install -g vercel
vercel --prod
```

---

## RÉSUMÉ DES VARIABLES D'ENVIRONNEMENT (.env.local)

```
# Authentification
VITE_SUPABASE_URL=https://xxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...

# Paiements
VITE_STRIPE_PUBLISHABLE_KEY=pk_live_xxx

# Analytics
VITE_SENTRY_DSN=https://xxx@sentry.io/xxx

# Email
RESEND_API_KEY=re_xxx

# Domaine
VITE_APP_URL=https://chantierpro.fr
VITE_SUPPORT_EMAIL=support@chantierpro.fr
```

---

## CHECKLIST PRÉ-LANCEMENT FINAL

- [ ] Toutes les pages légales (CGV, CGU, Confidentialité, Mentions) publiées
- [ ] SEO: meta tags, sitemap.xml, robots.txt, structured data
- [ ] PWA: manifest.json, service worker, icônes 192x192 et 512x512
- [ ] Lighthouse: 90+ sur Performance, Accessibility, Best Practices, SEO
- [ ] Code splitting + lazy loading routes
- [ ] Images optimisées (WebP, srcset)
- [ ] Bundle < 200KB gzippé (sans decompression)
- [ ] Sentry activé et alertes configurées
- [ ] Analytics (Plausible) installé
- [ ] Health check endpoint /api/health
- [ ] Cookies consent banner RGPD
- [ ] Suppression de compte (30j délai de grâce)
- [ ] Export données RGPD
- [ ] Stripe webhooks testés
- [ ] Emails transactionnels testés
- [ ] RLS Supabase activé sur TOUTES tables
- [ ] CORS configuré correctement
- [ ] Rate limiting API
- [ ] Tests E2E critiques passent
- [ ] Tests unitaires passent
- [ ] Responsive design (320px, 375px, 768px, 1024px, 1440px)
- [ ] Dark mode fonctionnel
- [ ] Impression PDF fonctionnelle
- [ ] Mode demo accessible
- [ ] Domaine personnalisé configuré
- [ ] SSL/HTTPS forcé (vercel.json)
- [ ] Backup Supabase automatique activé
- [ ] Zone de danger: suppression compte OK
- [ ] Changelog avec version 1.0.0
- [ ] Favicon et apple-touch-icon
- [ ] Tous les textes français (no UTF-8 escapes)

✓ PRÊT POUR LE LANCEMENT EN PRODUCTION!
```

---

## Notes Finales

1. **Remplir les `[À REMPLIR]`** avec vos informations légales (SIRET, adresse, contact DPO, etc.)
2. **Télécharger les icônes PWA** 192x192 et 512x512 en `/public`
3. **Configurer Sentry DSN** et **Stripe keys** dans `.env.local`
4. **Tester les webhooks Stripe** en sandbox avant prod
5. **Passer Lighthouse audit** avant déploiement (viser >90 partout)
6. **Tester responsive design** sur tous les breakpoints
7. **Vérifier l'email transactionnel** (confirmation compte, factures, etc.)

---

**Statut**: 🟢 Prêt pour lancement en production

Date: 2024-02-07
