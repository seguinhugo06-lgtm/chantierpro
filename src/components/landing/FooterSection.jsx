/**
 * FooterSection — le pied de page du site public (accueil et sous-pages), spec de la refonte, section 11 : bande
 * bleu-noir (`marque-encre-sombre`, #0B1324), le logo `LogoMallettico`, les liens actuels.
 *
 * Le contact est une pilule blanche à texte nuit (charte : sur une bande sombre, l'action est blanche ; l'ancien lien
 * orange est retiré, l'orange du logo est décoratif). Chaque lien fait 44 px de haut au moins (cibles tactiles).
 * Retirés, faute de preuve : le lien « Blog — Bientôt » (une promesse), le lien vers une page LinkedIn dont l'existence
 * n'est vérifiée nulle part, « Fait avec soin en France » (l'adresse de l'éditeur n'est pas publiée : LegalPages.jsx),
 * « l'outil de gestion tout-en-un ». Aucun lien ne mène à une fonction éteinte (src/lib/fonctions.js : paiement en
 * ligne, portail).
 * Attributs `data-*` lus par le parcours `scripts/parcours/site.cjs`.
 */
import { Mail } from 'lucide-react';
import LogoMallettico from '../ui/LogoMallettico';
import { allerALaSection } from '../../lib/sectionsAccueil';
import { pageLegaleDe } from '../legal/pageLegale';
import BoutonSite from './site/BoutonSite';
import { FOCUS_SUR_SOMBRE as FOCUS } from './site/focus';

const COLONNES = [
  {
    titre: 'Produit',
    liens: [
      { libelle: 'Fonctionnalités', href: '/fonctionnalites', page: true },
      { libelle: 'Tarifs', href: '#pricing' },
      { libelle: 'Signature électronique', href: '/fonctionnalites/signature-electronique', page: true },
      { libelle: 'Relances automatiques', href: '/fonctionnalites/relances', page: true },
      { libelle: 'Facture électronique', href: '#faq' },
    ],
  },
  {
    titre: 'Ressources',
    liens: [
      { libelle: 'Ressources', href: '/ressources', page: true },
      { libelle: 'Pourquoi Mallettico', href: '#early-adopters' },
      { libelle: 'FAQ', href: '#faq' },
    ],
  },
  {
    titre: 'Légal',
    liens: [
      { libelle: 'Mentions légales', href: '/mentions-legales', page: true },
      { libelle: 'CGU', href: '/cgu', page: true },
      { libelle: 'CGV', href: '/cgv', page: true },
      { libelle: 'Confidentialité', href: '/confidentialite', page: true },
    ],
  },
];

const PAGES_DU_SITE = ['/fonctionnalites', '/ressources'];

export default function FooterSection({ onNavigate }) {
  const annee = new Date().getFullYear();

  const suivre = (e, lien) => {
    e.preventDefault();
    if (lien.page) {
      // Pages du site et pages légales : leur vraie adresse, partageable (avant : affichées à l'adresse « / »)
      if (PAGES_DU_SITE.some((r) => lien.href.startsWith(r)) || pageLegaleDe(lien.href)) window.location.assign(lien.href);
      else if (onNavigate) onNavigate(lien.href.replace('/', ''));
      else window.location.assign(lien.href);
    } else if (lien.href.startsWith('#')) {
      allerALaSection(lien.href);
    }
  };

  return (
    <footer className="bg-marque-encre-sombre text-marque-acier">
      <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6 sm:py-16">
        <div className="grid grid-cols-2 gap-x-6 gap-y-10 md:grid-cols-[1.4fr_1fr_1fr_1fr] md:gap-10">
          <div className="col-span-2 md:col-span-1">
            <div className="flex items-center gap-3">
              <LogoMallettico taille={40} fond="blanc" />
              <span className="text-xl font-extrabold tracking-tight text-white">Mallettico</span>
            </div>
            <p data-accroche="" className="mt-4 max-w-xs text-base leading-relaxed text-marque-acier">
              Devis, factures et relances pour les artisans du bâtiment.
            </p>
            <BoutonSite variante="clair" href="mailto:contact@mallettico.fr" data-contact="" className="mt-6">
              <Mail size={16} aria-hidden="true" />
              contact@mallettico.fr
            </BoutonSite>
          </div>

          {COLONNES.map((colonne) => (
            <nav key={colonne.titre} aria-label={colonne.titre}>
              <p data-titre-colonne="" className="text-xs font-bold uppercase tracking-[0.12em] text-slate-400">
                {colonne.titre}
              </p>
              <ul className="mt-3">
                {colonne.liens.map((lien) => (
                  <li key={lien.libelle}>
                    <a
                      href={lien.href}
                      onClick={(e) => suivre(e, lien)}
                      className={`-mx-1 inline-flex min-h-[44px] items-center rounded px-1 text-sm text-marque-acier transition-colors hover:text-white motion-reduce:transition-none ${FOCUS}`}
                    >
                      {lien.libelle}
                    </a>
                  </li>
                ))}
              </ul>
            </nav>
          ))}
        </div>

        <div className="mt-12 border-t border-white/10 pt-6">
          <p data-copyright="" className="text-sm text-slate-400">
            © {annee} Mallettico. Tous droits réservés.
          </p>
        </div>
      </div>
    </footer>
  );
}
