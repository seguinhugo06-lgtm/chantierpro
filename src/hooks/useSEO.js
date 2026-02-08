/**
 * useSEO — Dynamic meta tags hook for ChantierPro
 * Updates document title, meta description, Open Graph, and canonical URL.
 */
import { useEffect } from 'react';

const DEFAULTS = {
  title: 'ChantierPro \u2014 Logiciel de gestion de chantier pour artisans BTP',
  description: 'Cr\u00e9ez vos devis et factures BTP en 2 minutes. Gestion de chantier, tr\u00e9sorerie, conformit\u00e9. Gratuit pour d\u00e9marrer.',
  image: 'https://chantierpro.vercel.app/og-image.png',
  url: 'https://chantierpro.vercel.app',
  type: 'website',
};

export default function useSEO({
  title = DEFAULTS.title,
  description = DEFAULTS.description,
  image = DEFAULTS.image,
  url = DEFAULTS.url,
  type = DEFAULTS.type,
} = {}) {
  useEffect(() => {
    document.title = title;

    const setMeta = (attr, key, content) => {
      let el = document.querySelector(`meta[${attr}="${key}"]`);
      if (!el) {
        el = document.createElement('meta');
        el.setAttribute(attr, key);
        document.head.appendChild(el);
      }
      el.setAttribute('content', content);
    };

    // Standard
    setMeta('name', 'description', description);

    // Open Graph
    setMeta('property', 'og:title', title);
    setMeta('property', 'og:description', description);
    setMeta('property', 'og:image', image);
    setMeta('property', 'og:url', url);
    setMeta('property', 'og:type', type);
    setMeta('property', 'og:site_name', 'ChantierPro');

    // Twitter
    setMeta('name', 'twitter:card', 'summary_large_image');
    setMeta('name', 'twitter:title', title);
    setMeta('name', 'twitter:description', description);
    setMeta('name', 'twitter:image', image);

    // Canonical
    let canonical = document.querySelector('link[rel="canonical"]');
    if (!canonical) {
      canonical = document.createElement('link');
      canonical.rel = 'canonical';
      document.head.appendChild(canonical);
    }
    canonical.href = url;
  }, [title, description, image, url, type]);
}
