import React from 'react';
import LegalPageLayout from './LegalPageLayout';

export default function MentionsLegales() {
  return (
    <LegalPageLayout title="Mentions légales" lastUpdated="15 mars 2026">
      <h2>1. Éditeur du site</h2>
      <p>
        Le site <strong>batigesti.fr</strong> est édité par la société BatiGesti SAS,
        au capital de 10 000 euros, immatriculée au Registre du Commerce et des Sociétés
        de Lyon sous le numéro RCS Lyon B 000 000 000.
      </p>
      <p>Siège social : [Adresse à compléter], France</p>
      <p>Directeur de la publication : [Nom à compléter]</p>
      <p>Contact : <a href="mailto:contact@batigesti.fr">contact@batigesti.fr</a></p>

      <h2>2. Hébergement</h2>
      <p>
        Le site est hébergé par :
      </p>
      <ul>
        <li><strong>Application web</strong> : Vercel Inc., 340 S Lemon Ave #4133, Walnut, CA 91789, États-Unis</li>
        <li><strong>Base de données et authentification</strong> : Supabase Inc., hébergement AWS eu-west (Irlande)</li>
        <li><strong>Paiements</strong> : Stripe, Inc., 354 Oyster Point Blvd, South San Francisco, CA 94080, États-Unis</li>
      </ul>

      <h2>3. Propriété intellectuelle</h2>
      <p>
        L'ensemble du contenu du site (textes, images, logos, logiciels, interface graphique)
        est la propriété exclusive de BatiGesti SAS ou de ses partenaires, et est protégé par
        les lois françaises et internationales relatives à la propriété intellectuelle.
      </p>

      <h2>4. Données personnelles</h2>
      <p>
        Le traitement des données personnelles est décrit dans notre{' '}
        <a href="/confidentialite">Politique de confidentialité</a>.
      </p>

      <h2>5. Cookies</h2>
      <p>
        BatiGesti utilise uniquement des cookies fonctionnels essentiels au fonctionnement
        de l'application (authentification, préférences utilisateur). Aucun cookie publicitaire
        ou de suivi tiers n'est utilisé.
      </p>

      <h2>6. Loi applicable</h2>
      <p>
        Les présentes mentions légales sont régies par le droit français.
        En cas de litige, les tribunaux de Lyon seront seuls compétents.
      </p>
    </LegalPageLayout>
  );
}
