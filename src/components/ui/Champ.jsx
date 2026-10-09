import { useId } from 'react';

/**
 * Champ — libellé relié, saisie de 48 px en 16 px (pas de zoom de Safari), aide et erreur reliées
 * (aria-describedby). Refonte du 9 oct. 2026 : 503 champs faits main, 17 fonds différents.
 * Pas d'astérisque : les champs facultatifs le disent (« facultatif »).
 *
 * @param {string} libelle
 * @param {'input'|'select'|'textarea'} [as]
 * @param {string} [aide]
 * @param {string} [erreur]
 * @param {boolean} [facultatif]
 */
export default function Champ({ libelle, as: Element = 'input', aide, erreur, facultatif = false, id, className = '', children, ...reste }) {
  const auto = useId();
  const idChamp = id || `champ-${auto}`;
  const idAide = aide ? `${idChamp}-aide` : undefined;
  const idErreur = erreur ? `${idChamp}-erreur` : undefined;
  return (
    <div data-ui="Champ" className={className}>
      <label htmlFor={idChamp} className="block mb-1.5 text-sm font-medium text-encre-2">
        {libelle}
        {facultatif ? <span className="font-normal text-encre-3"> (facultatif)</span> : null}
      </label>
      <Element
        id={idChamp}
        aria-invalid={erreur ? true : undefined}
        aria-describedby={[idAide, idErreur].filter(Boolean).join(' ') || undefined}
        className={`w-full rounded-xl border bg-surface text-base text-encre placeholder:text-encre-3 px-3.5 transition-shadow focus:outline-none focus:ring-4 ${
          Element === 'textarea' ? 'min-h-[96px] py-3' : 'h-12'
        } ${erreur ? 'border-red-500 focus:ring-red-500/15' : 'border-bord-fort focus:border-accent focus:ring-accent/20'}`}
        {...reste}
      >
        {children}
      </Element>
      {erreur ? (
        <p id={idErreur} className="mt-1.5 text-sm font-medium text-danger-texte">{erreur}</p>
      ) : aide ? (
        <p id={idAide} className="mt-1.5 text-sm text-encre-3">{aide}</p>
      ) : null}
    </div>
  );
}
