import React from 'react';
import LegalPageLayout from './LegalPageLayout';

export default function CGU() {
  return (
    <LegalPageLayout title="Conditions Générales d'Utilisation" lastUpdated="15 mars 2026">
      <h2>1. Objet</h2>
      <p>
        Les présentes Conditions Générales d'Utilisation (CGU) régissent l'utilisation de
        l'application BatiGesti, accessible à l'adresse <strong>batigesti.fr</strong>,
        éditée par BatiGesti SAS. En créant un compte, l'Utilisateur accepte sans réserve
        les présentes CGU.
      </p>

      <h2>2. Description du service</h2>
      <p>
        BatiGesti est une application SaaS de gestion pour artisans et entreprises du BTP
        permettant la création de devis et factures, la gestion de chantiers, le suivi de
        trésorerie, la gestion d'équipe et la conformité à la réglementation française
        en matière de facturation électronique.
      </p>

      <h2>3. Inscription et compte</h2>
      <p>
        L'accès à BatiGesti nécessite la création d'un compte avec une adresse email valide.
        L'Utilisateur est responsable de la confidentialité de ses identifiants et de toute
        activité réalisée sous son compte.
      </p>

      <h2>4. Plans et abonnements</h2>
      <p>
        BatiGesti propose trois plans : Gratuit, Artisan et Équipe. Les tarifs et limites
        de chaque plan sont détaillés sur la page de tarification du site. Les conditions
        de paiement sont régies par les <a href="/cgv">Conditions Générales de Vente</a>.
      </p>

      <h2>5. Données utilisateur</h2>
      <p>
        L'Utilisateur reste propriétaire de toutes les données qu'il saisit dans BatiGesti
        (clients, devis, factures, photos, etc.). BatiGesti s'engage à ne pas utiliser ces
        données à des fins commerciales. L'Utilisateur peut à tout moment exporter ou
        supprimer ses données depuis les paramètres de l'application.
      </p>

      <h2>6. Disponibilité</h2>
      <p>
        BatiGesti s'efforce d'assurer une disponibilité de 99,9% du service. Des interruptions
        planifiées pour maintenance peuvent survenir, avec un préavis de 48 heures minimum
        lorsque possible. BatiGesti ne peut être tenu responsable des interruptions liées
        à ses prestataires d'hébergement.
      </p>

      <h2>7. Propriété intellectuelle</h2>
      <p>
        L'application BatiGesti, son code source, son design et sa documentation sont la
        propriété exclusive de BatiGesti SAS. L'Utilisateur bénéficie d'un droit d'utilisation
        non exclusif, non cessible et non transférable, limité à la durée de son abonnement.
      </p>

      <h2>8. Responsabilité</h2>
      <p>
        BatiGesti fournit un outil de gestion et ne se substitue pas à un expert-comptable
        ou un juriste. L'Utilisateur est responsable de la conformité de ses documents
        (devis, factures) avec la réglementation applicable. BatiGesti met à disposition
        des outils facilitant cette conformité mais ne garantit pas l'exhaustivité
        de ces contrôles.
      </p>

      <h2>9. Résiliation</h2>
      <p>
        L'Utilisateur peut résilier son compte à tout moment depuis les paramètres de
        l'application. En cas de violation des CGU, BatiGesti se réserve le droit de
        suspendre ou résilier le compte de l'Utilisateur, avec un préavis de 15 jours.
      </p>

      <h2>10. Modification des CGU</h2>
      <p>
        BatiGesti se réserve le droit de modifier les présentes CGU. L'Utilisateur sera
        informé par email de toute modification substantielle au moins 30 jours avant
        son entrée en vigueur.
      </p>

      <h2>11. Droit applicable</h2>
      <p>
        Les présentes CGU sont soumises au droit français. Tout litige sera porté devant
        les tribunaux compétents de Lyon.
      </p>
    </LegalPageLayout>
  );
}
