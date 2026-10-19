/**
 * FaitsSection — la bande de faits sous le premier écran : quatre cases séparées par un trait, sans compteur animé.
 *
 * D'où viennent les chiffres (règle `.claude/rules/marketing.md`, chiffres vérifiés) :
 *   « 1 000+ »  bibliothèque des métiers (`src/lib/templates/trade-library.js` : 97 lots types, 671 lignes de lots,
 *               244 prestations, relevé du 19 oct. 2026) et référentiel du catalogue (`src/lib/data/articles-btp.js`) ;
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
