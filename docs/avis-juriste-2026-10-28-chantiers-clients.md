# Avis juriste du 28 octobre 2026 : chantiers, planning, tâches, clients, catalogue, article 1 des CGU

Périmètre lu : § 7, 9.5 et 10.3 de `task-6-report.md`, § 8 et « Nouveaux textes pour le juriste » de `task-7-report.md`, retrouvés dans le code de `a832daa1`. Relecture courte : seuls les points qui peuvent être faux en droit ou en chiffres sont vérifiés. Sources : les articles déjà vérifiés au texte dans `docs/metier-btp.md` (§ 4 : CGI art. 271, 293 B, 279-0 bis, 278-0 bis A ; D-28) et dans les avis des 24 et 25 oct. (C. civ. art. 1119, 1190). Je n'ai pas rouvert Légifrance pour cet avis.

## Verdict

| # | Texte | Verdict | Où |
|---|---|---|---|
| 1 | CGU, article 1, 2e paragraphe : « L'utilisation de la plateforme implique l'acceptation pleine et entière des présentes CGU. » | **À CORRIGER** | `TexteCgu.jsx:38-40` |
| 2 | « Prix marché : X - Y / unité » (sélecteur du référentiel) | **À CORRIGER** | `ArticlePicker.jsx:217` |
| 3 | « Chiffre d'affaires encaissé » (tri des clients) | **À CORRIGER** | `Clients.jsx:537` |
| 4 | « Échéance devis » (planning) | **À CORRIGER** (mineur) | `evenementsPlanning.js:98` |
| 5 | « HT » en franchise : catalogue (prix d'achat et de vente) | **À CORRIGER** | cinq fichiers, voir plus bas |
| 6 | « HT » en franchise ou montant sans « HT » : fiche chantier | **À CORRIGER** (mineur) | `OngletApercu.jsx:124,170`, `OngletFinances.jsx:71`, `FenetresChantier.jsx:247` |
| 7 | Fusion de doublons : « Les données du chantier secondaire seront ajoutées au principal » | **À CORRIGER** | `Chantiers.jsx:596` |
| 8 | TVA proposée par défaut à 10 % dans le sélecteur du référentiel | **À DÉCIDER** (Hugo) | `ArticlePicker.jsx:34,46` |
| 9 | CGV, article 2 : « Toute souscription à un abonnement implique l'acceptation sans réserve » | **À DÉCIDER** (lié à R2) | `LegalPages.jsx:79` |
| 10 | Tout le reste des textes listés (statuts de client, imports, « Gardé sur cet appareil uniquement », « Marge non calculée », « Non renseigné », « Vide si inconnu », rapports « sur cet appareil », cloche, tuiles, « Facturer le solde », « Reste dû », abandon, etc.) | **OK** | voir « Conformes » |

## Détail

**1. Article 1 des CGU.** La clause dit que l'usage vaut acceptation. L'article 2 et la case de l'inscription disent que l'acceptation se fait en cochant la case (ou, pour un compte antérieur, avant le premier document). Deux moments d'acceptation dans le même texte : on ne sait plus à partir de quand les articles 4 à 7 lient l'utilisateur, et une clause ambiguë d'un contrat d'adhésion se lit contre son rédacteur (C. civ. 1190 ; opposabilité des conditions générales : 1119). C'est la même clause que j'avais fait retirer le 24 oct. (H2, 2e paragraphe de l'article 2) et le 25 oct. (G2 : « en utilisant le service… accepte sans réserve ») : le 2e paragraphe de l'article 1 de l'ancienne page a survécu à la fusion des deux textes (R-G3 ne remplaçait que l'article 1 de la fenêtre).
Remplacement : **supprimer le paragraphe** (`TexteCgu.jsx:38-40`, le `<p>` entier). L'article 2 porte déjà la règle.
Version : relever `CGU_VERSION` en `'2026-10-28'` et `CGU_VERSION_DATE` en `'28 octobre 2026'` (`src/lib/cgu.js:12,15`), et ajouter « art. 1, 2e paragraphe retiré (avis du 28 oct.) » à l'en-tête de `TexteCgu.jsx`. Raison : la version enregistrée doit désigner un seul texte, sinon « 2026-10-25 » renverrait à deux rédactions et la preuve de ce qui a été accepté s'affaiblit. Aucun droit de l'utilisateur n'est réduit : **pas d'e-mail de préavis de 30 jours** (art. 10). Conséquence à connaître : chaque compte revoit la case au prochain document.

**2. « Prix marché ».** Les fourchettes viennent du fichier interne du référentiel (en-tête « Prix marché France 2025 HT », aucune source). Afficher « Prix marché » est une affirmation invérifiable (règle du projet).
Remplacement, `ArticlePicker.jsx:217` : `Repère indicatif du référentiel : {formatMoney(selectedArticle.prixMin)} - {formatMoney(selectedArticle.prixMax)} / {selectedArticle.unite}`.

**3. « Chiffre d'affaires encaissé ».** La valeur triée est `encaisse()` de `ventes.js`, calculée sur `total_ttc` : c'est ce que le client a payé, TVA comprise. Le chiffre d'affaires d'une entreprise assujettie se compte hors taxe. Le mot est faux pour elle, et c'est le seul endroit des clients qui l'emploie (le tableau et la fiche disent « Encaissé »).
Remplacement, `Clients.jsx:537` : `"Montant encaissé"`.

**4. « Échéance devis ».** C'est la fin de validité de l'offre (`date_validite`), pas une échéance de paiement. Mot trompeur à côté de « Échéance facture ».
Remplacement, `evenementsPlanning.js:98` : `Fin de validité du devis — ${formatMoney(d.total_ttc)}` et `'Fin de validité du devis'`. Aucun test ne lit l'ancien texte.

**5. Catalogue en franchise (art. 293 B CGI).** Le catalogue écrit « HT » partout, sans la règle déjà appliquée dans la fiche chantier. Pour le prix d'achat c'est plus qu'un mot : en franchise rien ne se déduit et le montant d'une dépense est la charge payée (`docs/metier-btp.md` § 4, D-28 ; CGI art. 271). Un artisan en franchise qui saisit un achat « HT » surestime sa marge.
`franchiseTva` = `estFranchiseTva(entreprise)`, déjà importé dans `Catalogue.jsx` : à passer en prop aux composants.
- `FormulaireArticle.jsx:75` : `libelle={franchiseTva ? "Prix d'achat (TVA comprise)" : "Prix d'achat HT"}`
- `FormulaireArticle.jsx:78` : `libelle={form.coefAuto ? \`Prix de vente${franchiseTva ? '' : ' HT'} (× ${coef})\` : \`Prix de vente${franchiseTva ? '' : ' HT'}\`}`
- `ArticlePicker.jsx:225` : `` libelle={`Prix de vente${franchiseTva ? '' : ' HT'} (€ / ${selectedArticle.unite})`} ``
- `ArticlePicker.jsx:242` : `libelle={franchiseTva ? "Prix d'achat (TVA comprise)" : "Prix d'achat HT"}`
- `ArticleDetail.jsx:160` : `libelle={franchiseTva ? "Prix d'achat chez ce fournisseur (€, TVA comprise)" : "Prix d'achat chez ce fournisseur (€ HT)"}`
- `OngletsStock.jsx:249` : `` libelle={`Prix d'achat chez ${lier?.fournisseurNom} (${franchiseTva ? '€, TVA comprise' : '€ HT'})`} ``
Les en-têtes de l'export CSV (`Catalogue.jsx:502`, `FenetresCatalogue.jsx:21-22`) peuvent rester : ce sont des noms de colonnes d'échange.

**6. Fiche chantier.**
- `OngletApercu.jsx:170` : « Facturé : X HT » est écrit en dur alors que la tuile voisine retire « HT » en franchise. Remplacement : `Facturé : {formatMoney(facture.totalFactureHT)}{mention}`.
- `OngletApercu.jsx:124` : le reste à facturer est un montant HT écrit sans mention (la tuile dit « Facturé HT »). Remplacement : `` `Reste ${formatMoney(resteAFacturer)}${mention} à facturer` ``.
- `OngletFinances.jsx:71` : même cause. Remplacement : `Reste à facturer{franchiseTva ? '' : ' HT'} :`.
- `FenetresChantier.jsx:247` (ajustement de revenu ou de dépense) : `libelle={franchiseTva ? 'Montant (€)' : 'Montant HT (€)'}`, avec `franchiseTva` ajouté aux props de `FeuilleAjustement`.

**7. Fusion de doublons.** Le code (`Chantiers.jsx:94-114`) ne déplace aucun devis ni aucune facture : ils gardent `chantier_id` du chantier archivé (`FicheChantier.jsx:151` filtre par `chantier_id`). Le texte laisse croire que tout passe au principal ; après fusion, le « Reste à facturer » et « Facturer le solde » du principal ne voient plus les devis signés du secondaire : un solde peut ne jamais être facturé. Ce n'est pas une règle de droit mais une affirmation fausse au point où elle fait manquer une facture.
Remplacement, `Chantiers.jsx:596` : « Les tâches, photos, fichiers, échanges et notes du chantier secondaire seront ajoutés au principal, puis le secondaire sera archivé. Ses devis et factures restent rattachés au chantier archivé. »
Pour Claude (code) : rattacher les devis et factures au principal est l'autre voie, à chiffrer à part (un devis facturé ne doit pas changer de contenu, seulement de rattachement).

**8. TVA par défaut du sélecteur (10 %).** Le taux normal est 20 % (CGI art. 278) ; 10 % et 5,5 % n'existent que sous conditions (logement achevé depuis plus de 2 ans, certification du preneur : art. 279-0 bis et 278-0 bis A, § 4 de `metier-btp.md`). Un taux réduit pré-sélectionné pousse à sous-facturer la TVA si l'artisan ne regarde pas. Le formulaire d'article propose déjà 20 % (`FormulaireArticle.jsx:41`).
Ma recommandation : proposer le réglage `tvaDefaut` de l'entreprise (Réglages) et 20 % à défaut : `useState(String(entreprise?.tvaDefaut ?? 20))` et `setTva(...)` à la ligne 46. Décision d'Hugo : le réglage `tvaDefaut` vaut lui-même 10 quand il est vide (`devis-utils.js:98,242`), à traiter dans la même décision.

**9. CGV, article 2.** Même clause que le point 1, côté abonnement. Elle ne devient fausse que si le paiement n'enregistre aucune acceptation, ce qui est le cas tant que R2 de l'avis du 24 oct. (case de Stripe Checkout, `consent_collection`) n'est pas livrée (aucune occurrence dans `supabase/functions`). À ne pas toucher avant R2 ; à réécrire avec elle : « Les présentes CGV sont acceptées en cochant la case prévue au paiement de l'abonnement. »

## Conformes (vérifiés dans le code)

- Boutons « Réceptionner » et onglet « Sous-traitants de l'entreprise » : derrière `FONCTIONS.receptionChantier` et `FONCTIONS.sousTraitantsChantier`, éteints, rien n'est affiché. À me renvoyer au rallumage (réception : C. civ. 1792-6 et point de départ des garanties ; sous-traitance : loi du 31 décembre 1975, acceptation et agrément des conditions de paiement).
- « Terminer » et « Abandonner » : « La date de fin sera celle d'aujourd'hui » ne prétend pas à une réception.
- Marge : définie sur le prix de vente, avec le coefficient à côté, cohérente ; l'échelle « correcte / bonne » est un repère, pas une promesse ; « Marge non calculée » et « Non renseigné » corrigent l'ancienne valeur inventée (60 %).
- « Un nom suffit pour commencer » : la validation légale d'envoi (`validateDevisForSend`) bloque un devis incomplet.
- « À renseigner pour un client professionnel » (SIRET) : cohérent avec le SIREN du client exigé par la réforme (`metier-btp.md` § 3).
- Retrait de « CSV depuis Rexel, Sonepar, Cedeo » : bon (pas de partenariat laissé croire) ; « référentiel de plus de 500 articles pré-chiffrés » retiré : bon.
- « Gardé sur cet appareil uniquement », « sur cet appareil » : exact (stockage local), honnête.
- Imports « N sur M » : disent l'arrêt réel, ne promettent rien.

## Remplacements prêts à appliquer

1. `src/components/legal/TexteCgu.jsx:38-40` : supprimer le `<p>` « L'utilisation de la plateforme implique l'acceptation pleine et entière des présentes CGU. » ; `src/lib/cgu.js:12` `'2026-10-28'`, `:15` `'28 octobre 2026'`.
2. `src/components/ArticlePicker.jsx:217` : « Repère indicatif du référentiel : {min} - {max} / {unité} ».
3. `src/components/Clients.jsx:537` : « Montant encaissé ».
4. `src/lib/evenementsPlanning.js:98` : « Fin de validité du devis — X € » / « Fin de validité du devis ».
5. Catalogue en franchise : les six libellés du point 5.
6. Fiche chantier : les quatre libellés du point 6.
7. `src/components/Chantiers.jsx:596` : « Les tâches, photos, fichiers, échanges et notes du chantier secondaire seront ajoutés au principal, puis le secondaire sera archivé. Ses devis et factures restent rattachés au chantier archivé. »

À décider par Hugo : point 8 (TVA par défaut) ; point 9 (attend R2).
