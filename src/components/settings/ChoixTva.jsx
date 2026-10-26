import { useId } from 'react';
import { Check, Info } from 'lucide-react';
import { EtatEnregistrement } from './champsParametres';
import { estFranchiseTva, tauxTvaParDefaut } from '../../lib/franchiseTva';

/**
 * Taux de TVA par défaut des nouveaux devis, d'après le régime de TVA (retours d'Hugo, 21-23 oct. 2026 : l'assistant
 * proposait 10 % à une micro-entreprise). Une seule règle : `tauxTvaParDefaut` (src/lib/franchiseTva.js), la même que
 * l'éditeur de devis. En franchise en base (micro-entreprise), le taux est 0 % et la mention de l'art. 293 B du CGI
 * s'imprime, déjà produite par les générateurs : rien à choisir ici.
 */
const TAUX = [
  { valeur: 20, libelle: '20 %', detail: 'taux normal' },
  { valeur: 10, libelle: '10 %', detail: 'rénovation, logement de plus de 2 ans' },
  { valeur: 5.5, libelle: '5,5 %', detail: 'rénovation énergétique' },
];

export default function ChoixTva({ entreprise, updateEntreprise }) {
  const id = useId();
  const franchise = estFranchiseTva(entreprise);
  const taux = tauxTvaParDefaut(entreprise);
  // Un 0 % déjà enregistré hors franchise reste visible (ancien choix « 0 % (franchise TVA) » de la liste)
  const options = taux === 0 && !franchise ? [...TAUX, { valeur: 0, libelle: '0 %', detail: 'sans TVA' }] : TAUX;
  return (
    <div role="group" aria-labelledby={id}>
      <div className="flex items-end justify-between gap-2 mb-1.5">
        <p id={id} className="text-sm font-medium text-encre-2">TVA par défaut des devis</p>
        <EtatEnregistrement cle="tvaDefaut" />
      </div>
      {franchise ? (
        <div data-tva-franchise className="flex items-start gap-3 p-3.5 rounded-2xl bg-info-fond text-info-texte">
          <Info size={18} aria-hidden="true" className="flex-shrink-0 mt-0.5" />
          <div className="text-sm">
            <p className="font-semibold">0 % : franchise en base de TVA</p>
            <p className="mt-0.5">Micro-entreprise : Mallettico applique la franchise en base de TVA. Vos devis et factures sont à 0 % de TVA et portent la mention « TVA non applicable, art. 293 B du CGI ».</p>
          </div>
        </div>
      ) : (
        <>
          <div className="flex flex-wrap gap-2">
            {options.map((t) => {
              const choisi = taux === t.valeur;
              return (
                <button
                  key={t.valeur}
                  type="button"
                  aria-pressed={choisi}
                  onClick={() => updateEntreprise((p) => ({ ...p, tvaDefaut: t.valeur }), 'tvaDefaut')}
                  className={`h-11 inline-flex items-center gap-1.5 px-4 rounded-full border text-sm font-semibold tabular-nums transition-colors ${choisi ? 'bg-encre text-surface border-encre' : 'bg-surface text-encre border-bord-fort hover:bg-surface-2'}`}
                >
                  {choisi ? <Check size={15} strokeWidth={2.75} aria-hidden="true" /> : null}
                  {t.libelle}
                </button>
              );
            })}
          </div>
          <p className="mt-1.5 text-sm text-encre-3">
            {options.find((t) => t.valeur === taux)?.detail ? `${String(taux).replace('.', ',')} % : ${options.find((t) => t.valeur === taux).detail}. ` : ''}
            Modifiable ligne par ligne sur chaque devis.
          </p>
        </>
      )}
    </div>
  );
}
