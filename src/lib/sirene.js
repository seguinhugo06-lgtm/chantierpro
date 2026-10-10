/**
 * Auto-remplissage du profil depuis le répertoire SIRENE, par l'API publique de l'État, sans clé :
 * https://recherche-entreprises.api.gouv.fr/search?q=<SIRET> (CORS ouvert ; à autoriser dans la CSP).
 *
 * Avant (recette du 10 oct. 2026) : api.insee.fr (clé exigée) puis entreprise.data.gouv.fr (fermée), toutes deux
 * hors de la CSP : « Auto-remplir » échouait toujours.
 */

export const URL_SIRENE = 'https://recherche-entreprises.api.gouv.fr/search';

// Catégorie juridique INSEE → forme proposée. 1000 = entrepreneur individuel : on ne choisit pas entre EI et
// micro-entreprise (régime fiscal que SIRENE ne donne pas, et dont dépend la TVA).
const FORME_PAR_CATEGORIE = { '5498': 'EURL', '5499': 'SARL', '5710': 'SAS', '5720': 'SASU', '5202': 'SNC' };

const enCasse = (t) => String(t || '').toLowerCase().replace(/(^|[\s'-])(\p{L})/gu, (m, a, b) => a + b.toUpperCase());

/**
 * Champs du profil tirés de la réponse de recherche, pour ce SIRET.
 * @returns {null | { nom: string, adresse: string, codeApe: string, formeJuridique: string, nomEntrepreneur: string }}
 */
export function profilDepuisSirene(reponse, siret) {
  const unite = reponse?.results?.[0];
  if (!unite || String(unite.siren) !== String(siret).slice(0, 9)) return null;
  const etab = (unite.matching_etablissements || []).find((e) => e.siret === siret) || unite.siege || {};
  const individuel = unite.nature_juridique === '1000' || !!unite.complements?.est_entrepreneur_individuel;
  const personne = individuel ? (unite.dirigeants || []).find((d) => d.type_dirigeant === 'personne physique') : null;
  const nomEntrepreneur = personne ? enCasse(`${String(personne.prenoms || '').split(' ')[0]} ${personne.nom || ''}`).trim() : '';
  return {
    nom: individuel ? (nomEntrepreneur || enCasse(unite.nom_complet)) : (unite.nom_raison_sociale || unite.nom_complet || ''),
    adresse: etab.adresse || '',
    codeApe: String(etab.activite_principale || unite.activite_principale || '').replace('.', ''),
    formeJuridique: FORME_PAR_CATEGORIE[unite.nature_juridique] || '',
    nomEntrepreneur,
  };
}
