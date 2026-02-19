/**
 * MentionsLegales - Legal mentions page (template)
 * @module MentionsLegales
 */

import React from 'react';
import { Building2, ArrowLeft } from 'lucide-react';

export default function MentionsLegales() {
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
        <h1 className="text-3xl font-bold text-slate-900 mb-8">Mentions légales</h1>

        <div className="prose prose-slate max-w-none space-y-8">
          <section>
            <h2 className="text-xl font-semibold text-slate-800 mb-3">1. Éditeur du site</h2>
            <p className="text-slate-600 leading-relaxed">
              Le site ChantierPro est édité par :<br />
              <strong>[Nom de la société / Nom du dirigeant]</strong><br />
              [Forme juridique] au capital de [montant] €<br />
              Siège social : [Adresse complète]<br />
              SIRET : [numéro SIRET]<br />
              RCS : [ville et numéro]<br />
              N° TVA intracommunautaire : [numéro]<br />
              Directeur de la publication : [Nom]<br />
              Contact : contact@chantierpro.fr
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-slate-800 mb-3">2. Hébergeur</h2>
            <p className="text-slate-600 leading-relaxed">
              Le site est hébergé par :<br />
              <strong>Vercel Inc.</strong><br />
              440 N Barranca Ave #4133, Covina, CA 91723, États-Unis<br />
              Site web : <a href="https://vercel.com" className="text-orange-500 hover:underline" target="_blank" rel="noopener noreferrer">vercel.com</a>
            </p>
            <p className="text-slate-600 leading-relaxed mt-2">
              Base de données hébergée par :<br />
              <strong>Supabase Inc.</strong><br />
              970 Toa Payoh North #07-04, Singapore 318992<br />
              Site web : <a href="https://supabase.com" className="text-orange-500 hover:underline" target="_blank" rel="noopener noreferrer">supabase.com</a>
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-slate-800 mb-3">3. Propriété intellectuelle</h2>
            <p className="text-slate-600 leading-relaxed">
              L'ensemble des contenus présents sur le site ChantierPro (textes, images, logos, icônes, logiciels, base de données) est protégé par les dispositions du Code de la propriété intellectuelle. Toute reproduction, représentation ou diffusion, totale ou partielle, du contenu de ce site, par quelque procédé que ce soit, sans l'autorisation expresse de l'éditeur, est interdite.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-slate-800 mb-3">4. Données personnelles</h2>
            <p className="text-slate-600 leading-relaxed">
              Les données personnelles collectées sur ce site font l'objet d'un traitement informatique. Conformément au Règlement Général sur la Protection des Données (RGPD) et à la loi Informatique et Libertés, vous disposez d'un droit d'accès, de rectification, de suppression et de portabilité de vos données. Pour exercer ces droits, contactez-nous à : contact@chantierpro.fr
            </p>
            <p className="text-slate-600 leading-relaxed mt-2">
              Pour plus d'informations, consultez notre <a href="/politique-de-confidentialite" className="text-orange-500 hover:underline">Politique de confidentialité</a>.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-slate-800 mb-3">5. Cookies</h2>
            <p className="text-slate-600 leading-relaxed">
              Ce site utilise des cookies strictement nécessaires au fonctionnement du service (authentification, préférences utilisateur). Aucun cookie publicitaire ou de tracking tiers n'est utilisé.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-slate-800 mb-3">6. Limitation de responsabilité</h2>
            <p className="text-slate-600 leading-relaxed">
              L'éditeur ne saurait être tenu responsable des dommages directs ou indirects résultant de l'utilisation du site ou de l'impossibilité d'y accéder. L'éditeur s'efforce de maintenir le site accessible 24h/24 mais ne peut garantir une disponibilité permanente.
            </p>
          </section>
        </div>

        <p className="text-sm text-slate-400 mt-12">Dernière mise à jour : février 2025</p>
      </main>
    </div>
  );
}
