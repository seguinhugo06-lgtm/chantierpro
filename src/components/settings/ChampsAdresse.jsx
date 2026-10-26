import { ChampParam, DebouncedInput, DebouncedTextarea, CLASSE_ZONE } from './champsParametres';
import { champsAdresse, majAdresse } from '../../lib/adresseEntreprise';

/**
 * L'adresse du siège en trois champs : adresse (numéro et rue, une ou deux lignes), code postal, ville
 * (retours d'Hugo, 21-23 oct. 2026). Les trois écrivent l'adresse complète lue par les documents et les deux colonnes
 * code postal et ville (src/lib/adresseEntreprise.js). La rue garde ses retours à la ligne : un champ d'une ligne les
 * effaçait, et collait la rue au code postal (« 127 cours du Médoc33300Bordeaux »).
 *
 * @param {string} id identifiant du champ de la rue (« settings-field-adresse » dans Paramètres : la jauge du profil et
 *   « Compléter » y amènent le curseur) ; le code postal et la ville prennent `${id}-code-postal` et `${id}-ville`
 */
export default function ChampsAdresse({ id, entreprise, updateEntreprise }) {
  const a = champsAdresse(entreprise);
  const maj = (champ, cle) => (valeur) => updateEntreprise((p) => ({ ...p, ...majAdresse(p, champ, valeur) }), cle);
  return (
    <fieldset className="space-y-4">
      <legend className="sr-only">Adresse du siège</legend>
      <ChampParam id={id} cle="adresse" libelle="Adresse du siège" aide="Numéro et rue, sur une ou deux lignes.">
        <DebouncedTextarea id={id} rows={2} autoComplete="street-address" value={a.rue} onChange={maj('rue', 'adresse')}
          placeholder="12 rue des Artisans" className={CLASSE_ZONE.replace('min-h-[96px]', 'min-h-[76px]')} />
      </ChampParam>
      <div className="grid grid-cols-[minmax(0,7rem)_minmax(0,1fr)] gap-3">
        <ChampParam id={`${id}-code-postal`} cle="codePostal" libelle="Code postal">
          <DebouncedInput id={`${id}-code-postal`} type="text" inputMode="numeric" autoComplete="postal-code" maxLength={5}
            value={a.codePostal} onChange={maj('codePostal', 'codePostal')} placeholder="33300" />
        </ChampParam>
        <ChampParam id={`${id}-ville`} cle="ville" libelle="Ville">
          <DebouncedInput id={`${id}-ville`} type="text" autoComplete="address-level2" value={a.ville} onChange={maj('ville', 'ville')} placeholder="Bordeaux" />
        </ChampParam>
      </div>
    </fieldset>
  );
}
