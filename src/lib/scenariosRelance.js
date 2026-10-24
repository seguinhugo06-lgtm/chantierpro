/**
 * Les scénarios de relance proposés par l'app (réglages « Relances » : « Relance Devis » et « Relance Factures
 * impayées ») : étapes, délais, noms et modèles de message. L'objet du message est dans src/lib/objetRelance.js.
 *
 * Sortis de src/components/settings/RelanceConfigTab.jsx (qui les réexporte) pour être lus sans charger l'écran des
 * réglages : le site public montre le scénario de devis (« Les fonctionnalités en action », exemple « Relances »), le
 * jeu de démonstration (scripts/demo/generer-sql.mjs) et ses tests s'en servent aussi.
 * Modèles de devis (20 oct. 2026) : « devis n° {{devis_numero}} » et « {{montant}} € », comme ceux des factures ; avant,
 * le client lisait « devis nDEV-2026-00012 » et « 2 081,20 EUR » (le serveur remplit `montant` sans symbole).
 */

export const DEFAULT_DEVIS_STEPS = [
  {
    id: 'devis_step_1',
    enabled: true,
    delay: 7,
    delayLabel: 'J+7 après envoi',
    name: 'Rappel de consultation',
    channel: 'email',
    template: `Bonjour {{client_nom}},

Je reviens vers vous concernant le devis n° {{devis_numero}} d'un montant de {{montant}} € que je vous ai adressé récemment.

Avez-vous pu en prendre connaissance ? Je reste à votre disposition pour toute question ou pour organiser un rendez-vous.

Cordialement,
{{entreprise_nom}}`,
  },
  {
    id: 'devis_step_2',
    enabled: true,
    delay: 15,
    delayLabel: 'J+15 après envoi',
    name: 'Relance douce',
    channel: 'email',
    template: `Bonjour {{client_nom}},

Je me permets de revenir vers vous une nouvelle fois au sujet du devis n° {{devis_numero}} ({{montant}} €).

Si vous avez des questions ou souhaitez discuter de certains points, je suis disponible pour en échanger.

N'hésitez pas à me contacter.

Cordialement,
{{entreprise_nom}}`,
  },
  {
    id: 'devis_step_3',
    enabled: true,
    delay: 30,
    delayLabel: 'J+30 après envoi',
    name: 'Dernière relance',
    channel: 'email',
    template: `Bonjour {{client_nom}},

Je vous contacte une dernière fois concernant le devis n° {{devis_numero}} d'un montant de {{montant}} €.

Si ce projet ne correspond plus à vos attentes, je comprendrai tout à fait. Dans le cas contraire, je reste disponible pour finaliser les détails.

Bien cordialement,
{{entreprise_nom}}`,
  },
];

export const DEFAULT_FACTURE_STEPS = [
  {
    id: 'facture_step_1',
    enabled: true,
    delay: 3,
    delayLabel: 'J+3 après échéance',
    name: 'Rappel de paiement',
    channel: 'email',
    template: `Bonjour {{client_nom}},

Sauf erreur de ma part, la facture n° {{facture_numero}}, arrivée à échéance le {{date_échéance}}, n'est pas encore réglée : il reste {{reste_du}} € à payer.

Si votre règlement est déjà parti, merci de ne pas tenir compte de ce message.

{{lien_paiement}}

Cordialement,
{{entreprise_nom}}`,
  },
  {
    id: 'facture_step_2',
    enabled: true,
    delay: 15,
    delayLabel: 'J+15 après échéance',
    name: '2ème relance',
    channel: 'email',
    template: `Bonjour {{client_nom}},

Sauf erreur de ma part, la facture n° {{facture_numero}}, échue depuis {{jours_retard}} jours, n'est toujours pas réglée : il reste {{reste_du}} € à payer.

Je vous remercie de procéder au règlement sous 8 jours.

En cas de difficulté, n'hésitez pas à me contacter.

{{lien_paiement}}

Cordialement,
{{entreprise_nom}}`,
  },
  {
    id: 'facture_step_3',
    enabled: true,
    delay: 30,
    delayLabel: 'J+30 après échéance',
    name: 'Mise en demeure',
    channel: 'email',
    template: `{{client_nom}},

Par la présente, je vous mets en demeure de régler sous 8 jours la somme de {{reste_du}} €, restant due sur la facture n° {{facture_numero}}, échue depuis {{jours_retard}} jours.

À défaut, je me réserve le droit d'engager une procédure de recouvrement.

{{mention_retard}}

{{entreprise_nom}}`,
  },
  {
    id: 'facture_step_4',
    enabled: true,
    delay: 45,
    delayLabel: 'J+45 après échéance',
    name: 'Pré-contentieux',
    channel: 'email',
    template: `{{client_nom}},

Dernier rappel avant procédure de recouvrement.

La facture n° {{facture_numero}} reste impayée malgré mes relances ({{jours_retard}} jours de retard) : il reste {{reste_du}} € à payer.

Sans règlement sous 8 jours, je me réserve le droit d'engager une procédure de recouvrement.

{{mention_retard}}

{{entreprise_nom}}`,
  },
];
