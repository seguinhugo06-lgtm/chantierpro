/**
 * CGU - Conditions Générales d'Utilisation (template)
 * @module CGU
 */

import React from 'react';
import { Building2, ArrowLeft } from 'lucide-react';

export default function CGU() {
  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          <a href="/" className="flex items-center gap-2 text-slate-900 hover:text-orange-500 transition-colors">
            <Building2 size={24} className="text-orange-500" />
            <span className="text-lg font-bold">ChantierPro</span>
          </a>
          <a href="/" className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-900 transition-colors">
            <ArrowLeft size={16} />
            Retour
          </a>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-12">
        <h1 className="text-3xl font-bold text-slate-900 mb-8">Conditions Générales d'Utilisation</h1>

        <div className="prose prose-slate max-w-none space-y-8">
          <section>
            <h2 className="text-xl font-semibold text-slate-800 mb-3">1. Objet</h2>
            <p className="text-slate-600 leading-relaxed">
              Les présentes Conditions Générales d'Utilisation (CGU) régissent l'accès et l'utilisation du service ChantierPro, accessible à l'adresse chantierpro.vercel.app. En créant un compte ou en utilisant le service, l'utilisateur accepte sans réserve les présentes CGU.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-slate-800 mb-3">2. Description du service</h2>
            <p className="text-slate-600 leading-relaxed">
              ChantierPro est un logiciel en ligne (SaaS) de gestion de chantier destiné aux artisans et entreprises du BTP. Il permet notamment :
            </p>
            <ul className="list-disc pl-6 text-slate-600 space-y-1 mt-2">
              <li>La création et gestion de devis et factures</li>
              <li>Le suivi de chantier et de rentabilité</li>
              <li>La gestion d'équipe et le pointage</li>
              <li>Le suivi de trésorerie</li>
              <li>La gestion d'un catalogue de prestations</li>
              <li>La planification et le suivi météo</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-slate-800 mb-3">3. Inscription et compte</h2>
            <p className="text-slate-600 leading-relaxed">
              L'accès au service nécessite la création d'un compte avec une adresse email valide et un mot de passe. L'utilisateur est responsable de la confidentialité de ses identifiants. Toute utilisation du compte est réputée faite par l'utilisateur. En cas de suspicion d'utilisation non autorisée, l'utilisateur doit immédiatement en informer ChantierPro.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-slate-800 mb-3">4. Offres et tarification</h2>
            <p className="text-slate-600 leading-relaxed">
              ChantierPro propose plusieurs formules d'abonnement, dont une offre gratuite avec des fonctionnalités limitées. Les tarifs des offres payantes sont indiqués sur la page Tarifs du site et peuvent être modifiés à tout moment. Les utilisateurs abonnés seront informés de tout changement de tarif au moins 30 jours avant son application.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-slate-800 mb-3">5. Données de l'utilisateur</h2>
            <p className="text-slate-600 leading-relaxed">
              L'utilisateur reste propriétaire de l'ensemble des données qu'il saisit dans le service (clients, devis, factures, etc.). ChantierPro s'engage à ne pas utiliser ces données à des fins commerciales ou de prospection. L'utilisateur peut à tout moment exporter ou supprimer ses données. En cas de résiliation, les données seront conservées pendant 30 jours puis supprimées définitivement.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-slate-800 mb-3">6. Responsabilité</h2>
            <p className="text-slate-600 leading-relaxed">
              ChantierPro fournit le service "en l'état". L'éditeur ne garantit pas l'absence d'erreurs ou d'interruptions. L'utilisateur est seul responsable de la vérification des montants, calculs et informations générées par le service, notamment en matière de devis, factures et obligations légales.
            </p>
            <p className="text-slate-600 leading-relaxed mt-2">
              ChantierPro ne se substitue pas à un expert-comptable et ne fournit pas de conseil fiscal ou juridique.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-slate-800 mb-3">7. Disponibilité</h2>
            <p className="text-slate-600 leading-relaxed">
              ChantierPro s'efforce de maintenir le service accessible 24h/24, 7j/7, mais ne peut garantir une disponibilité permanente. Des interruptions pour maintenance pourront avoir lieu, si possible en dehors des heures ouvrées.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-slate-800 mb-3">8. Résiliation</h2>
            <p className="text-slate-600 leading-relaxed">
              L'utilisateur peut résilier son compte à tout moment depuis les paramètres du service. ChantierPro se réserve le droit de suspendre ou résilier un compte en cas de violation des présentes CGU, après notification préalable.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-slate-800 mb-3">9. Droit applicable</h2>
            <p className="text-slate-600 leading-relaxed">
              Les présentes CGU sont régies par le droit français. En cas de litige, les parties s'engagent à rechercher une solution amiable. À défaut, les tribunaux compétents seront ceux du siège social de l'éditeur.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-slate-800 mb-3">10. Contact</h2>
            <p className="text-slate-600 leading-relaxed">
              Pour toute question relative aux présentes CGU, vous pouvez nous contacter à : <a href="mailto:contact@chantierpro.fr" className="text-orange-500 hover:underline">contact@chantierpro.fr</a>
            </p>
          </section>
        </div>

        <p className="text-sm text-slate-400 mt-12">Dernière mise à jour : février 2025</p>
      </main>
    </div>
  );
}
