import { useEffect, useRef } from 'react';
import { ChampParam, DebouncedInput, DebouncedTextarea, CLASSE_ZONE } from './champsParametres';
import { champsAdresse, adresseComposee } from '../../lib/adresseEntreprise';

// Longueurs maximales : une adresse réelle tient largement dedans, et l'analyse d'une adresse collée reste rapide
// (relecture sécurité du 26 oct. 2026).
const MAX_RUE = 200;
const MAX_CODE_POSTAL = 10;
const MAX_VILLE = 100;

const cleStockee = (e) => `${e?.adresse ?? ''}|${e?.codePostal ?? e?.code_postal ?? ''}|${e?.ville ?? ''}`;

/**
 * L'adresse du siège en trois champs : adresse (numéro et rue, une ou deux lignes), code postal, ville
 * (retours d'Hugo, 21-23 oct. 2026). Les trois écrivent l'adresse complète lue par les documents et les deux colonnes
 * code postal et ville (src/lib/adresseEntreprise.js). La rue garde ses retours à la ligne : un champ d'une ligne les
 * effaçait, et collait la rue au code postal (« 127 cours du Médoc33300Bordeaux »).
 *
 * L'adresse complète se compose depuis les trois valeurs de ce composant, jamais depuis la fiche en mémoire : un champ
 * enregistré ne réécrit pas l'ancienne valeur d'un champ voisin pas encore revenu de la base (relecture du 26 oct.).
 * La fiche n'est relue que si elle change d'ailleurs (répertoire SIRENE, autre appareil).
 *
 * @param {string} id identifiant du champ de la rue (« settings-field-adresse » dans Paramètres : la jauge du profil et
 *   « Compléter » y amènent le curseur) ; le code postal et la ville prennent `${id}-code-postal` et `${id}-ville`
 */
export default function ChampsAdresse({ id, entreprise, updateEntreprise }) {
  const a = champsAdresse(entreprise);
  const valeurs = useRef(a);
  // Les dernières adresses écrites par ce composant : quand l'une revient de la base, rien à relire
  const ecrites = useRef([cleStockee(entreprise)]);
  const stockee = cleStockee(entreprise);
  const entrepriseRef = useRef(entreprise);
  entrepriseRef.current = entreprise;

  useEffect(() => {
    // Un changement venu d'ailleurs (SIRENE, autre appareil) : on repart de la fiche
    if (!ecrites.current.includes(stockee)) {
      valeurs.current = champsAdresse(entrepriseRef.current);
      ecrites.current = [stockee];
    }
  }, [stockee]);

  const maj = (champ, cle) => (valeur) => {
    valeurs.current = { ...valeurs.current, [champ]: valeur };
    const ecrit = {
      adresse: adresseComposee(valeurs.current),
      codePostal: String(valeurs.current.codePostal ?? '').trim(),
      ville: String(valeurs.current.ville ?? '').trim(),
    };
    ecrites.current = [...ecrites.current.slice(-4), cleStockee(ecrit)];
    updateEntreprise((p) => ({ ...p, ...ecrit }), cle);
  };

  return (
    <fieldset className="space-y-4">
      <legend className="sr-only">Adresse du siège</legend>
      <ChampParam id={id} cle="adresse" libelle="Adresse du siège" aide="Numéro et rue, sur une ou deux lignes.">
        <DebouncedTextarea id={id} rows={2} autoComplete="street-address" maxLength={MAX_RUE} value={a.rue} onChange={maj('rue', 'adresse')}
          placeholder="12 rue des Artisans" className={CLASSE_ZONE.replace('min-h-[96px]', 'min-h-[76px]')} />
      </ChampParam>
      <div className="grid grid-cols-[minmax(0,7rem)_minmax(0,1fr)] gap-3">
        <ChampParam id={`${id}-code-postal`} cle="codePostal" libelle="Code postal">
          <DebouncedInput id={`${id}-code-postal`} type="text" inputMode="numeric" autoComplete="postal-code" maxLength={MAX_CODE_POSTAL}
            value={a.codePostal} onChange={maj('codePostal', 'codePostal')} placeholder="33300" />
        </ChampParam>
        <ChampParam id={`${id}-ville`} cle="ville" libelle="Ville">
          <DebouncedInput id={`${id}-ville`} type="text" autoComplete="address-level2" maxLength={MAX_VILLE} value={a.ville} onChange={maj('ville', 'ville')} placeholder="Bordeaux" />
        </ChampParam>
      </div>
    </fieldset>
  );
}
