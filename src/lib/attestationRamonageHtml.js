/**
 * Attestation de ramonage (code de la santé publique, R. 1331-75) : document HTML complet, imprimé, envoyé en PDF au
 * client et partagé depuis le téléphone. Un seul générateur (pas de second rendu inline comme pour les devis).
 *
 * Textes relus par juriste-btp le 23 oct. 2026 (docs/cadrage-ramonage.md § 5) :
 *   - « vacuité … assurée / non assurée » : les mots de R. 1331-70 et R. 1331-75, constat du professionnel ;
 *   - un foyer fermé à combustible solide : l'attestation ne vaut pas attestation d'entretien (R. 1331-67 et -68) ;
 *   - pied : conservation deux ans et présentation aux agents de contrôle (R. 1331-75) ; l'assureur « peut » la demander
 *     (aucun texte n'impose de la lui transmettre) ;
 *   - information sur les rappels (prospection d'un client existant, CPCE L. 34-5 ; RGPD art. 21).
 * Tout texte saisi passe par `h` (echapperHtml).
 */
import { echapperHtml as h, couleurCss } from './echapperHtml';
import { nomImprime, formeImprimee } from './identiteEntreprise';
import { marquerDocumentFictif, estDonneesFictives } from './donneesFictives';
import { dateLue } from './dates';
import { adresseComplete } from './adresseEntreprise';
import { PAGE_CSS } from './devisHtmlBuilder';
import {
  TYPES_APPAREIL, COMBUSTIBLES, CONDUITS, METHODES, QUALITES, CONSTATS, CONSEILS, libelleDe, estFoyerFermeSolide, jourDe,
} from './ramonage';

const jourFr = (jour) => (jour ? dateLue(String(jour).slice(0, 10)).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' }) : '');
const heureFr = (horodatage) => {
  const d = new Date(horodatage);
  return Number.isNaN(d.getTime()) ? '' : `${String(d.getHours()).padStart(2, '0')} h ${String(d.getMinutes()).padStart(2, '0')}`;
};

// Une signature n'est imprimée que si c'est bien une image tracée (data URL PNG ou JPEG)
const signatureValide = (s) => typeof s === 'string' && /^data:image\/(png|jpe?g);base64,[A-Za-z0-9+/=]+$/.test(s);

export const PIED_CONSERVATION = 'À conserver au moins deux ans et à présenter aux agents chargés du contrôle qui la demandent (article R. 1331-75 du code de la santé publique). Votre assureur habitation peut aussi vous la demander, notamment après un sinistre.';
export const MENTION_ENTRETIEN = 'Cette attestation porte sur le ramonage. Elle ne vaut pas attestation d’entretien de l’appareil (articles R. 1331-67 et R. 1331-68 du code de la santé publique).';
export const MENTION_CONSEILS = 'Ces conseils sont donnés à titre indicatif : aucun investissement proposé n’est obligatoire.';

/**
 * Information sur les rappels, imprimée en paragraphe séparé (sauf si le client les a déjà refusés). Relecture juriste-btp
 * du 24 oct. 2026 : e-mail ou SMS seulement (un appel de démarchage exige le consentement préalable du consommateur depuis
 * le 11 août 2026, C. conso. L. 223-1) ; refus gratuit, au recueil et dans chaque message (CPCE L. 34-5, al. 4).
 */
export function informationRappels(nomEntreprise) {
  return `${nomEntreprise || 'Votre ramoneur'} pourra vous rappeler par e-mail ou par SMS la date de votre prochain ramonage. Vous pouvez le refuser gratuitement : dès maintenant, en le disant à votre ramoneur, ou à tout moment, en répondant STOP à un rappel ou par le lien présent dans chaque e-mail de rappel.`;
}

/** La phrase d'attestation, selon la vacuité constatée. */
export function phraseAttestation(r, nomEntreprise) {
  const debut = `Je soussigné(e) ${r.intervenant_nom || ''}, pour ${nomEntreprise || ''}, atteste avoir procédé le ${jourFr(jourDe(r.realise_le))} au ramonage, par action mécanique directe, du ou des conduits désignés ci-dessus`;
  return r.vacuite === 'assuree'
    ? `${debut} et avoir assuré la vacuité du conduit sur toute sa longueur.`
    : `${debut}. La vacuité du conduit sur toute sa longueur n’a pas pu être assurée : ${r.vacuite_precision || ''}.`;
}

/**
 * @param {object} p
 * @param {object} p.ramonage   ligne `ramonages` (numéro attribué par la base)
 * @param {object} p.entreprise fiche entreprise (identité, SIRET, RC pro)
 * @param {object} [p.precedent] dernier ramonage connu de cet appareil (bonne pratique : sa date est imprimée)
 * @param {object} [p.remplace]  attestation que celle-ci annule et remplace
 * @param {boolean} [p.rappelsRefuses] le client a refusé les rappels : l'information n'est pas imprimée
 * @param {string} [p.couleur]
 */
export function buildAttestationRamonageHtml({ ramonage: r, entreprise, precedent = null, remplace = null, rappelsRefuses = false, couleur }) {
  // L'émetteur figé dans l'attestation à son enregistrement, sinon (aperçu) la fiche entreprise du moment
  const source = r.emetteur && typeof r.emetteur === 'object' && Object.keys(r.emetteur).length ? r.emetteur : (entreprise || {});
  const color = couleurCss(couleur || source.couleur || entreprise?.couleur);
  const nom = nomImprime(source);
  const rcs = source.rcsVille && source.rcsNumero ? `RCS ${source.rcsVille} ${source.rcsType || 'B'} ${source.rcsNumero}` : (source.rcs ? `RCS ${source.rcs}` : '');
  const e = {
    nom: h(nom),
    forme: h(`${formeImprimee(source)}${source.capital ? ` au capital de ${source.capital} €` : ''}`),
    // L'adresse complète contient déjà « code postal ville » quand Paramètres l'a enregistrée en trois champs
    adresse: h(adresseComplete(source).split('\n').join(', ')),
    tel: h(source.tel || source.telephone),
    email: h(source.email),
    site: h(source.siteWeb || source.site_web),
    siret: h(source.siret),
    rcs: h(rcs),
    rcAssureur: h(source.rcProAssureur || source.rc_pro_assureur),
    rcNumero: h(source.rcProNumero || source.rc_pro_numero),
  };
  const fictif = estDonneesFictives(source) || estDonneesFictives(entreprise);
  const ligne = (libelle, valeur) => (valeur ? `<tr><th>${libelle}</th><td>${valeur}</td></tr>` : '');
  const type = r.appareil_type === 'autre' ? 'Autre' : libelleDe(TYPES_APPAREIL, r.appareil_type);
  const qualite = libelleDe(QUALITES, r.qualite_client) + (r.qualite_client === 'autre' && r.qualite_precision ? ` (${h(r.qualite_precision)})` : '');
  const constats = CONSTATS
    .map((c) => ({ c, v: libelleDe(c.options, r.constats?.[c.cle]) }))
    .filter((x) => x.v)
    .map((x) => ligne(h(x.c.libelle), h(x.v)))
    .join('');
  const conseilsChoisis = (r.conseils?.choix || []).map((cle) => libelleDe(CONSEILS, cle)).filter(Boolean);
  const conseilsTexte = String(r.conseils?.texte || '').trim();
  const aDesConseils = conseilsChoisis.length > 0 || conseilsTexte;
  const signature = signatureValide(r.signature)
    ? `<img src="${h(r.signature)}" alt="Signature" style="max-height:70px;max-width:220px;display:block;margin-top:6px" />`
    : '';

  return marquerDocumentFictif({ donneesFictives: fictif }, `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Attestation de ramonage ${h(r.numero || '')}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Segoe UI', Arial, sans-serif; font-size: 10pt; color: #1e293b; background: #ffffff; padding: 25px; line-height: 1.45; }
    .entete { display: flex; justify-content: space-between; gap: 16px; padding-bottom: 12px; border-bottom: 3px solid ${color}; margin-bottom: 16px; }
    .entete .nom { font-size: 15pt; font-weight: 700; color: ${color}; }
    .entete .info { font-size: 8pt; color: #475569; margin-top: 4px; }
    .titre { text-align: right; }
    .titre h1 { font-size: 17pt; color: ${color}; letter-spacing: .5px; }
    .titre .numero { font-size: 10pt; font-weight: 700; margin-top: 4px; }
    .titre .texte { font-size: 8pt; color: #475569; }
    h2 { font-size: 9pt; text-transform: uppercase; letter-spacing: .5px; color: #475569; margin: 14px 0 6px; padding-bottom: 3px; border-bottom: 1px solid #e2e8f0; }
    table { width: 100%; border-collapse: collapse; font-size: 9.5pt; }
    th { text-align: left; font-weight: 600; color: #475569; width: 42%; padding: 3px 8px 3px 0; vertical-align: top; }
    td { padding: 3px 0; vertical-align: top; overflow-wrap: anywhere; }
    .vacuite td { font-weight: 700; }
    .bloc { background: #f8fafc; border-left: 3px solid ${color}; padding: 8px 10px; border-radius: 4px; font-size: 9pt; white-space: pre-line; }
    .attestation { margin-top: 16px; font-size: 10pt; }
    .annulee { border: 2px solid #b91c1c; color: #b91c1c; padding: 8px 10px; border-radius: 4px; font-weight: 700; margin-bottom: 12px; }
    .mention { font-size: 8.5pt; color: #334155; margin-top: 10px; }
    .pied { margin-top: 18px; padding-top: 10px; border-top: 1px solid #e2e8f0; font-size: 8pt; color: #334155; }
    @media print { body { padding: 15px; } }${PAGE_CSS}
  </style>
</head>
<body>
  ${r.annulee_le ? `<div class="annulee">Attestation annulée le ${jourFr(jourDe(r.annulee_le))}${r.annulation_motif ? ` : ${h(r.annulation_motif)}` : ''}</div>` : ''}
  <div class="entete">
    <div>
      <div class="nom">${e.nom}</div>
      <div class="info">
        ${e.forme ? `${e.forme}<br>` : ''}${e.adresse ? `${e.adresse}<br>` : ''}
        ${[e.tel ? `Tél. ${e.tel}` : '', e.email, e.site].filter(Boolean).join(' · ')}<br>
        ${e.siret ? `SIRET ${e.siret}` : ''}${e.rcs ? ` · ${e.rcs}` : ''}
        ${e.rcAssureur || e.rcNumero ? `<br>Assurance responsabilité civile professionnelle : ${[e.rcAssureur, e.rcNumero ? `n° ${e.rcNumero}` : ''].filter(Boolean).join(', ')}` : ''}
      </div>
    </div>
    <div class="titre">
      <h1>Attestation de ramonage</h1>
      <div class="numero">N° ${h(r.numero || 'en attente')}</div>
      <div class="texte">Article R. 1331-75 du code de la santé publique</div>
      ${remplace?.numero ? `<div class="texte" style="margin-top:4px">Annule et remplace l’attestation n° ${h(remplace.numero)}</div>` : ''}
    </div>
  </div>

  <h2>Client et lieu d’intervention</h2>
  <table>
    ${ligne('Nom', h(r.client_nom))}
    ${ligne('Adresse de l’intervention', h(r.adresse_intervention))}
    ${ligne('Qualité du client', qualite)}
  </table>

  <h2>Intervention</h2>
  <table>
    ${ligne('Date et heure', `${jourFr(jourDe(r.realise_le))}, ${heureFr(r.realise_le)}`)}
    ${ligne('Ramonages de cet appareil dans l’année', String(r.nb_dans_annee || 1))}
    ${ligne('Dernier ramonage connu', precedent ? `${jourFr(jourDe(precedent.realise_le))}${precedent.numero ? ` (attestation n° ${h(precedent.numero)})` : ''}` : '')}
    ${ligne('Intervenant', h(r.intervenant_nom))}
  </table>

  <h2>Appareil et conduit</h2>
  <table>
    ${ligne('Appareil', h(type))}
    ${ligne('Précisions (marque, modèle…)', h(r.precisions))}
    ${ligne('Combustible', h(libelleDe(COMBUSTIBLES, r.combustible)))}
    ${ligne('Conduit', h(libelleDe(CONDUITS, r.conduit)))}
    ${ligne('Localisation (pièce, étage)', h(r.localisation))}
    ${ligne('Conduits ramonés', `conduit de fumée : ramoné ; conduit ou tuyau de raccordement : ${r.raccordement === 'sans_objet' ? 'sans objet' : 'ramoné'}`)}
  </table>
  ${estFoyerFermeSolide(r) ? `<p class="mention">${MENTION_ENTRETIEN}</p>` : ''}

  <h2>Méthode</h2>
  <table>
    ${ligne('Ramonage', h(libelleDe(METHODES, r.methode)))}
    ${r.complement_chimique ? ligne('Complément', 'Produit chimique utilisé en complément du ramonage mécanique') : ''}
  </table>

  <h2>Constatations</h2>
  <table>
    <tr class="vacuite"><th>Vacuité du conduit sur toute sa longueur</th><td>${r.vacuite === 'assuree' ? 'Assurée' : `Non assurée${r.vacuite_precision ? ` : ${h(r.vacuite_precision)}` : ''}`}</td></tr>
    ${constats}
  </table>

  ${r.observations ? `<h2>Observations et recommandations</h2><div class="bloc">${h(r.observations)}</div>` : ''}
  ${aDesConseils ? `<h2>Conseils donnés (article R. 1331-77 du code de la santé publique)</h2>
  <div class="bloc">${[...conseilsChoisis.map((c) => `• ${h(c)}`), conseilsTexte ? h(conseilsTexte) : ''].filter(Boolean).join('\n')}</div>
  <div class="mention">${MENTION_CONSEILS}</div>` : ''}

  <h2>Prochain ramonage</h2>
  <table>${ligne('Prochain ramonage conseillé avant le', `<strong>${jourFr(r.prochain_avant)}</strong>`)}</table>

  <div class="attestation">
    <p>${h(phraseAttestation(r, nom))}</p>
    <p style="margin-top:8px">Fait le ${jourFr(jourDe(r.created_at || new Date().toISOString()))}</p>
    <p style="margin-top:6px"><strong>Signature : ${h(r.intervenant_nom)}</strong></p>
    ${signature}
  </div>

  ${rappelsRefuses ? '' : `<p class="mention">${h(informationRappels(nom))}</p>`}
  <div class="pied">${PIED_CONSERVATION}</div>
</body>
</html>`);
}
