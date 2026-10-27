import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { AlertCircle, Check, Loader2 } from 'lucide-react';
import AideMot from '../ui/AideMot';

/**
 * Les champs des Paramètres et de l'assistant de démarrage.
 *
 * Enregistrement automatique, dit près du champ (retours d'Hugo, 21-23 oct. 2026 : la notification « Modifications
 * enregistrées » s'affichait à chaque champ) : « Enregistré » apparaît dans la ligne du libellé quand la base a
 * accepté, puis s'efface ; « Non enregistré » reste affiché tant que le champ n'a pas été enregistré (la notification
 * d'erreur s'affiche aussi). Rien n'est annoncé avant la réponse de la base.
 */

/** Classe d'un champ de saisie : 48 px, texte de 16 px au téléphone (pas de zoom de Safari), jetons du thème. */
export const CLASSE_CHAMP = 'w-full h-12 px-3.5 rounded-xl border border-bord-fort bg-surface text-base sm:text-sm text-encre placeholder:text-encre-3 transition-shadow focus:outline-none focus:border-accent focus:ring-4 focus:ring-accent/20';
export const CLASSE_ZONE = 'w-full min-h-[96px] px-3.5 py-3 rounded-xl border border-bord-fort bg-surface text-base sm:text-sm text-encre placeholder:text-encre-3 transition-shadow focus:outline-none focus:border-accent focus:ring-4 focus:ring-accent/20';

/** { enCours: cle|null, fait: cle|null, erreurs: { [cle]: true } } — fourni par Paramètres. */
export const EnregistrementContext = createContext({ enCours: null, fait: null, erreurs: {} });

/** L'état d'enregistrement de l'appel `updateEntreprise(…, cle)`. */
export function useEtatsEnregistrement() {
  const [etat, setEtat] = useState({ enCours: null, fait: null, erreurs: {} });
  const minuterie = useRef(null);
  useEffect(() => () => clearTimeout(minuterie.current), []);
  const debut = useCallback((cle) => setEtat((e) => ({ ...e, enCours: cle, fait: e.fait === cle ? null : e.fait })), []);
  const reussite = useCallback((cle) => {
    setEtat((e) => {
      const erreurs = { ...e.erreurs };
      delete erreurs[cle];
      return { enCours: e.enCours === cle ? null : e.enCours, fait: cle, erreurs };
    });
    clearTimeout(minuterie.current);
    minuterie.current = setTimeout(() => setEtat((e) => ({ ...e, fait: null })), 2500);
  }, []);
  const echec = useCallback((cle) => setEtat((e) => ({ enCours: e.enCours === cle ? null : e.enCours, fait: e.fait === cle ? null : e.fait, erreurs: { ...e.erreurs, [cle]: true } })), []);
  const abandon = useCallback((cle) => setEtat((e) => ({ ...e, enCours: e.enCours === cle ? null : e.enCours })), []);
  return { etat, debut, reussite, echec, abandon };
}

/** « Enregistrement… », « Enregistré » ou « Non enregistré » pour le champ `cle`. */
export function EtatEnregistrement({ cle }) {
  const { enCours, fait, erreurs } = useContext(EnregistrementContext);
  if (!cle) return null;
  if (erreurs[cle]) {
    return <span data-etat-champ="erreur" className="inline-flex items-center gap-1 text-xs font-semibold text-danger-texte whitespace-nowrap"><AlertCircle size={13} aria-hidden="true" />Non enregistré</span>;
  }
  if (enCours === cle) {
    return <span data-etat-champ="en-cours" className="inline-flex items-center gap-1 text-xs text-encre-3 whitespace-nowrap"><Loader2 size={13} className="animate-spin" aria-hidden="true" />Enregistrement…</span>;
  }
  if (fait === cle) {
    return <span data-etat-champ="enregistre" className="inline-flex items-center gap-1 text-xs font-medium text-succes-texte whitespace-nowrap animate-fade-in"><Check size={13} aria-hidden="true" />Enregistré</span>;
  }
  return null;
}

/**
 * Un champ des Paramètres : libellé (14 px, « (facultatif) » plutôt qu'un astérisque), aide d'un mot difficile,
 * état de l'enregistrement à droite du libellé, le contrôle, puis une aide sous le champ.
 */
export function ChampParam({ id, idLibelle, cle, libelle, facultatif = false, lexique, aide, className = '', children }) {
  const libelleNoeud = (
    <label id={idLibelle} htmlFor={id} className="block text-sm font-medium text-encre-2">
      {libelle}
      {facultatif ? <span className="font-normal text-encre-3"> (facultatif)</span> : null}
    </label>
  );
  return (
    <div className={className}>
      {lexique ? (
        <AideMot mot={lexique.mot} texte={lexique.texte} fin={<EtatEnregistrement cle={cle} />} className="mb-1.5">{libelleNoeud}</AideMot>
      ) : (
        <div className="flex items-end justify-between gap-2 mb-1.5 min-h-[20px]">
          {libelleNoeud}
          <span className="flex-shrink-0"><EtatEnregistrement cle={cle} /></span>
        </div>
      )}
      {children}
      {aide ? <p className="mt-1.5 text-sm text-encre-3">{aide}</p> : null}
    </div>
  );
}

// Saisie différée (moins de rendus à chaque frappe, au téléphone), mais jamais perdue : la valeur en attente est
// écrite à la sortie du champ et quand le champ disparaît (changement d'onglet ou de page). Avant (recette du
// 9 oct. 2026), le minuteur était annulé au démontage : un code APE tapé puis « Accueil » touché dans la
// seconde n'était jamais enregistré, sans message.
// Même texte aux espaces et retours à la ligne de bout près : ce que l'enregistrement retire (adresse composée ligne
// par ligne). La valeur revenue de la base ne remplace la frappe que si elle en diffère vraiment. Avant (relecture du
// 26 oct. 2026) : « 127 » + espace + pause, la base renvoyait « 127 », qui remplaçait la saisie : « 127cours ».
const memeSaisie = (a, b) => {
  const net = (v) => String(v ?? '').replace(/\r/g, '').split('\n').map((l) => l.trim()).filter(Boolean).join('\n');
  return net(a) === net(b);
};

function useSaisieDifferee(value, onChange, delay) {
  const [localValue, setLocalValue] = useState(value ?? '');
  const timerRef = useRef(null);
  const attenteRef = useRef(null); // valeur tapée pas encore transmise
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  useEffect(() => {
    if (attenteRef.current !== null) return;
    setLocalValue((local) => (memeSaisie(local, value ?? '') ? local : (value ?? '')));
  }, [value]);

  const vider = useCallback(() => {
    if (timerRef.current) { clearTimeout(timerRef.current); timerRef.current = null; }
    if (attenteRef.current !== null) {
      const v = attenteRef.current;
      attenteRef.current = null;
      onChangeRef.current(v);
    }
  }, []);

  const handleChange = (e) => {
    const newVal = e.target.value;
    setLocalValue(newVal);
    attenteRef.current = newVal;
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(vider, delay);
  };

  useEffect(() => vider, [vider]);

  return { localValue, handleChange, vider };
}

export function DebouncedInput({ value, onChange, delay = 800, onBlur, className = CLASSE_CHAMP, ...props }) {
  const { localValue, handleChange, vider } = useSaisieDifferee(value, onChange, delay);
  return <input {...props} className={className} value={localValue} onChange={handleChange} onBlur={(e) => { vider(); onBlur?.(e); }} />;
}

export function DebouncedTextarea({ value, onChange, delay = 800, onBlur, className = CLASSE_ZONE, ...props }) {
  const { localValue, handleChange, vider } = useSaisieDifferee(value, onChange, delay);
  return <textarea {...props} className={className} value={localValue} onChange={handleChange} onBlur={(e) => { vider(); onBlur?.(e); }} />;
}
