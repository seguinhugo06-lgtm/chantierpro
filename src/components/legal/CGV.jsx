import React from 'react';
import LegalPageLayout from './LegalPageLayout';

export default function CGV() {
  return (
    <LegalPageLayout title="Conditions Générales de Vente" lastUpdated="15 mars 2026">
      <h2>1. Objet</h2>
      <p>
        Les présentes Conditions Générales de Vente (CGV) régissent les abonnements payants
        de l'application BatiGesti, éditée par BatiGesti SAS.
      </p>

      <h2>2. Plans et tarifs</h2>
      <table>
        <thead>
          <tr><th>Plan</th><th>Prix mensuel HT</th><th>Prix annuel HT</th></tr>
        </thead>
        <tbody>
          <tr><td>Gratuit</td><td>0 €</td><td>0 €</td></tr>
          <tr><td>Artisan</td><td>14,90 €</td><td>149 €</td></tr>
          <tr><td>Équipe</td><td>29,90 €</td><td>299 €</td></tr>
        </tbody>
      </table>
      <p>
        Les prix s'entendent hors taxes. La TVA applicable est de 20%.
        BatiGesti se réserve le droit de modifier ses tarifs avec un préavis de 30 jours.
      </p>

      <h2>3. Paiement</h2>
      <p>
        Les paiements sont traités de manière sécurisée par Stripe. Les moyens de paiement
        acceptés sont : carte bancaire (Visa, Mastercard, American Express) et prélèvement
        SEPA. L'abonnement est payable d'avance, mensuellement ou annuellement selon le
        choix de l'Utilisateur.
      </p>

      <h2>4. Période d'essai</h2>
      <p>
        Les plans payants bénéficient d'une période d'essai gratuite de 14 jours.
        Aucun paiement n'est prélevé pendant la période d'essai. À l'issue de la période
        d'essai, l'abonnement est automatiquement activé sauf résiliation par l'Utilisateur.
      </p>

      <h2>5. Renouvellement</h2>
      <p>
        L'abonnement est reconduit tacitement à chaque échéance (mensuelle ou annuelle).
        L'Utilisateur peut désactiver le renouvellement automatique à tout moment depuis
        son espace de gestion d'abonnement.
      </p>

      <h2>6. Résiliation</h2>
      <p>
        L'Utilisateur peut résilier son abonnement à tout moment. La résiliation prend
        effet à la fin de la période de facturation en cours. Aucun remboursement au
        prorata n'est effectué pour la période restante. Après résiliation, le compte
        passe automatiquement au plan Gratuit.
      </p>

      <h2>7. Droit de rétractation</h2>
      <p>
        Conformément à l'article L221-28 du Code de la consommation, le droit de
        rétractation ne s'applique pas aux services numériques dont l'exécution commence
        avant la fin du délai de rétractation avec l'accord exprès du consommateur.
        En acceptant les présentes CGV et en utilisant le service, l'Utilisateur reconnaît
        renoncer expressément à son droit de rétractation.
      </p>

      <h2>8. Facturation</h2>
      <p>
        Une facture est émise automatiquement pour chaque paiement et est accessible
        depuis l'espace de gestion d'abonnement Stripe. Les factures sont conformes
        aux exigences de la réglementation française.
      </p>

      <h2>9. Litige</h2>
      <p>
        En cas de litige, l'Utilisateur peut contacter le service client à
        l'adresse <a href="mailto:contact@batigesti.fr">contact@batigesti.fr</a>.
        Conformément au Code de la consommation, l'Utilisateur peut recourir gratuitement
        au service de médiation auquel BatiGesti est adhérent.
      </p>

      <h2>10. Droit applicable</h2>
      <p>
        Les présentes CGV sont soumises au droit français. Les tribunaux de Lyon
        sont compétents en cas de litige.
      </p>
    </LegalPageLayout>
  );
}
