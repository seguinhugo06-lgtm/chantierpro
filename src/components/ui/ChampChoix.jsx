import { useRef, useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { Volet, ListeChoix } from './Filtres';

/**
 * ChampChoix — un choix dans une liste, à la place d'un <select> natif (retours d'Hugo, 21-23 oct. 2026 : au téléphone,
 * la liste native du « Mode de paiement par défaut » était coupée en bas et défilait mal). Le champ a la taille et
 * l'allure d'un champ de saisie (48 px) ; il ouvre le volet de l'app : une feuille qui monte du bas au téléphone, un
 * panneau ancré au champ ailleurs, avec la même liste à cocher que les filtres (recherche au-delà de 7 entrées).
 *
 * Le libellé est posé par l'appelant : `<label htmlFor={id}>` (un clic dessus ouvre le choix) et `idLibelle` pour que
 * le nom lu par un lecteur d'écran soit « libellé, valeur choisie ».
 *
 * @param {string} id
 * @param {string} [idLibelle] identifiant du libellé
 * @param {string} titre titre du volet
 * @param {Array<{ valeur: any, libelle: string, detail?: string }>} options
 * @param {any} valeur
 * @param {(valeur: any) => void} onChange
 * @param {string} [vide] texte quand aucune option ne correspond à la valeur
 */
export default function ChampChoix({ id, idLibelle, titre, options, valeur, onChange, vide = 'Choisir…', disabled = false, className = '' }) {
  const [ouvert, setOuvert] = useState(false);
  const ancreRef = useRef(null);
  const choisie = options.find((o) => o.valeur === valeur);
  const idValeur = `${id}-valeur`;
  return (
    <>
      <button
        ref={ancreRef}
        id={id}
        type="button"
        data-ui="ChampChoix"
        disabled={disabled}
        onClick={() => setOuvert((o) => !o)}
        aria-haspopup="dialog"
        aria-expanded={ouvert}
        aria-labelledby={idLibelle ? `${idLibelle} ${idValeur}` : undefined}
        className={`w-full h-12 flex items-center justify-between gap-2 px-3.5 rounded-xl border border-bord-fort bg-surface text-left text-base sm:text-sm text-encre transition-shadow focus:outline-none focus-visible:border-accent focus-visible:ring-4 focus-visible:ring-accent/20 disabled:opacity-50 ${className}`}
      >
        <span id={idValeur} className={`truncate ${choisie ? '' : 'text-encre-3'}`}>{choisie ? choisie.libelle : vide}</span>
        <ChevronDown size={18} aria-hidden="true" className={`flex-shrink-0 text-encre-3 transition-transform ${ouvert ? 'rotate-180' : ''}`} />
      </button>
      <Volet ouvert={ouvert} onFermer={() => setOuvert(false)} titre={titre} ancreRef={ancreRef} largeur={360}>
        {/* Sans titre : le volet porte déjà le sien */}
        <ListeChoix
          options={options}
          valeur={valeur}
          onChange={(v) => { setOuvert(false); onChange(v); ancreRef.current?.focus(); }}
        />
      </Volet>
    </>
  );
}
