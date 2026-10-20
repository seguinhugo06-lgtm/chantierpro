import React, { useEffect, useState, Suspense, lazy } from 'react';

import { PAGES_LEGALES, pageLegaleDe } from './pageLegale';

const LegalPages = lazy(() => import('../LegalPages'));

/**
 * Pages légales à leur propre adresse (/cgu, /cgv, /mentions-legales, /confidentialite, /accessibilite),
 * sans charger l'app. Avant (recette du 9 oct. 2026), ces adresses — déclarées dans le sitemap et collées par
 * les artisans dans leurs échanges — affichaient la vitrine : les pages légales n'existaient que dans l'état
 * de l'app, à l'adresse « / ».
 */
export default function PageLegalePublique({ pageInitiale }) {
  const [page, setPage] = useState(pageInitiale);

  useEffect(() => {
    document.title = `${PAGES_LEGALES[page]} — Mallettico`;
    let canonique = document.querySelector('link[rel="canonical"]');
    if (!canonique) { canonique = document.createElement('link'); canonique.rel = 'canonical'; document.head.appendChild(canonique); }
    canonique.href = `https://mallettico.fr/${page}`;
  }, [page]);

  useEffect(() => {
    const auRetour = () => { const p = pageLegaleDe(window.location.pathname); if (p) setPage(p); };
    window.addEventListener('popstate', auRetour);
    return () => window.removeEventListener('popstate', auRetour);
  }, []);

  // Un lien vers une autre page légale reste ici (adresse mise à jour) ; tout autre lien revient à l'accueil
  const aller = (cible) => {
    if (PAGES_LEGALES[cible]) {
      window.history.pushState({}, '', `/${cible}`);
      setPage(cible);
      window.scrollTo(0, 0);
    } else {
      window.location.assign('/');
    }
  };

  return (
    <div data-theme="clair" className="min-h-screen bg-[#f5f5f5] p-4 sm:p-6">
      <Suspense fallback={<div className="min-h-screen" />}>
        {/* Liens et icônes au bleu nuit du logo (charte « Glacier vif ») : l'ancien orange tombait à 2,8:1 sur blanc */}
        <LegalPages page={page} isDark={false} couleur="#12336F" setPage={aller} />
      </Suspense>
    </div>
  );
}
