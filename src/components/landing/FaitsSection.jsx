/**
 * FaitsSection — la bande de faits sous le premier écran : quatre cases séparées par un trait, sans compteur animé.
 *
 * D'où viennent les chiffres (règle `.claude/rules/marketing.md`, chiffres vérifiés) :
 *   « 1 000+ »  prestations et ouvrages chiffrés (quantité, unité, prix moyen) que l'artisan peut insérer, comptés le
 *               20 oct. 2026 :
 *                 - bibliothèque des métiers (`src/lib/templates/trade-library.js`, `TRADE_LIBRARY`) : 244 prestations
 *                   et 671 lignes réparties dans 97 lots types, soit 835 désignations différentes ;
 *                 - référentiel du catalogue (`src/lib/data/index.js`, `ALL_ARTICLES_BTP` = articles-btp.js +
 *                   -suite.js + -fin.js, bouton « Importer Référentiel BTP ») : 523 articles ;
 *               ensemble 1 354 désignations différentes (doublons retirés après mise en minuscules, sans accents ni
 *               espaces multiples), sans compter les 97 lots eux-mêmes. Recompter si l'une de ces listes rétrécit ;
 *   « 17 »      métiers de `TRADE_LIBRARY` ;
 *   « 2 écrans » l'application web s'adapte au téléphone et à l'ordinateur ;
 *   « 0 € »     le plan Gratuit de `PLANS` (`src/stores/subscriptionStore.js`), sans carte bancaire.
 */

const FAITS = [
  { valeur: '1 000+', libelle: 'prestations et ouvrages déjà chiffrés' },
  { valeur: '17', libelle: 'métiers du bâtiment' },
  { valeur: '2 écrans', libelle: 'téléphone et ordinateur' },
  { valeur: '0 €', libelle: 'pour commencer' },
];

// Deux colonnes au téléphone (trait entre les colonnes et entre les rangées), quatre au bureau ; les cases du bord
// gauche s'alignent sur le texte du premier écran.
const CASES = [
  'pr-4',
  'border-l pl-4 sm:pl-6',
  'border-t pr-4 lg:border-l lg:border-t-0 lg:pl-6',
  'border-l border-t pl-4 sm:pl-6 lg:border-t-0',
];

export default function FaitsSection() {
  return (
    <section aria-label="Mallettico en bref" className="border-y border-marque-acier/60 bg-white">
      <ul className="mx-auto grid max-w-6xl grid-cols-2 px-4 sm:px-6 lg:grid-cols-4">
        {FAITS.map((fait, i) => (
          <li key={fait.valeur} className={`border-marque-acier/60 py-5 sm:py-6 ${CASES[i]}`}>
            <span className="block whitespace-nowrap text-2xl font-extrabold tracking-tight text-marque-nuit">{fait.valeur}</span>
            <span className="mt-1 block text-sm text-slate-600">{fait.libelle}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}
