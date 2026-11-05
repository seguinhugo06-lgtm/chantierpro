/**
 * Attestation d'entretien (chaudière, pompe à chaleur ou climatisation, poêle ou insert) : document HTML complet,
 * imprimé, envoyé en PDF et partagé depuis le téléphone. Un seul générateur : ce n'est ni un devis ni une facture.
 *
 * Trois documents distincts, chacun avec son titre (« ne doit pas pouvoir être confondu avec un autre document », les
 * trois arrêtés) ; contenu « a minima » de l'annexe de chaque arrêté (avis juriste-btp du 4 nov. 2026, § 1.7, 2.5, 3.5) :
 * commanditaire, installation et local, identification, dates du dernier entretien et du dernier ramonage, intervenant
 * (nom, coordonnées, signature), points contrôlés, appareils de mesure et résultats, puis selon l'appareil :
 *   - chaudière : phrase du CO (a, b ou c), tableaux 9, 10 et 11 (phrase longue), classe énergétique, tableau 13 ;
 *   - PAC : contrôle d'étanchéité, défauts constatés, actions effectuées, conseils ;
 *   - poêle : un bloc par appareil, conseils joints.
 * Tout texte saisi passe par `h` (echapperHtml). Jamais « conforme », « certificat » ni « contrôle obligatoire » (§ 8).
 */
import { echapperHtml as h, couleurCss } from './echapperHtml';
import { nomImprime, formeImprimee } from './identiteEntreprise';
import { estSociete } from './mentionsFacture';
import { marquerDocumentFictif, estDonneesFictives } from './donneesFictives';
import { dateLue } from './dates';
import { adresseComplete } from './adresseEntreprise';
import { PAGE_CSS } from './devisHtmlBuilder';
import {
  categorie, ENERGIES, TYPES_PAC, TYPES_POELE, EVACUATIONS, TECHNOLOGIES_CHAUDIERE, libelleDe, pointsCoches, niveauCO, PHRASES_CO,
  SAUF_IMPOSSIBILITE, referenceRendement, referenceEmissions, POLLUANTS, TABLEAU_13, RUBRIQUES_CHAUDIERE, PHRASE_CONSEILS_CHAUDIERE,
  PHRASES_CONSEILS, SUJETS_CONSEILS, jourDe, estSolide, estGazFioul,
} from './entretien';

const jourFr = (jour) => (jour ? dateLue(String(jour).slice(0, 10)).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' }) : '');
const signatureValide = (s) => typeof s === 'string' && /^data:image\/(png|jpe?g);base64,[A-Za-z0-9+/=]+$/.test(s);

/** Information sur les rappels (prospection d'un client existant, CPCE L. 34-5 ; RGPD art. 21), comme pour le ramonage. */
export function informationRappelsEntretien(nomEntreprise) {
  return `${nomEntreprise || 'Votre professionnel'} pourra vous rappeler par e-mail ou par SMS la date conseillée de votre prochain entretien. Vous pouvez le refuser gratuitement : dès maintenant, en le lui disant, ou à tout moment, en répondant STOP à un rappel ou par le lien présent dans chaque e-mail de rappel. Un refus vaut pour tous les rappels de ce professionnel.`;
}

/**
 * @param {object} p
 * @param {object} p.entretien  ligne `entretiens` (numéro attribué par la base)
 * @param {object} p.entreprise fiche entreprise (aperçu avant enregistrement ; sinon l'émetteur figé)
 * @param {object} [p.remplace] attestation que celle-ci annule et remplace
 * @param {boolean} [p.rappelsRefuses]
 */
export function buildAttestationEntretienHtml({ entretien: e, entreprise, remplace = null, rappelsRefuses = false, couleur }) {
  const cat = categorie(e.categorie);
  const source = e.emetteur && typeof e.emetteur === 'object' && Object.keys(e.emetteur).length ? e.emetteur : (entreprise || {});
  const color = couleurCss(couleur || source.couleur || entreprise?.couleur);
  const nom = nomImprime(source);
  const rcs = source.rcsVille && source.rcsNumero ? `RCS ${source.rcsVille} ${source.rcsType || 'B'} ${source.rcsNumero}` : (source.rcs ? `RCS ${source.rcs}` : '');
  const em = {
    nom: h(nom),
    forme: h(`${formeImprimee(source)}${source.capital && estSociete(source) ? ` au capital de ${source.capital} €` : ''}`),
    adresse: h(adresseComplete(source).split('\n').join(', ')),
    tel: h(source.tel || source.telephone),
    email: h(source.email),
    siret: h(source.siret),
    rcs: h(rcs),
  };
  const fictif = estDonneesFictives(source) || estDonneesFictives(entreprise);
  const ligne = (libelle, valeur) => (valeur ? `<tr><th>${libelle}</th><td>${valeur}</td></tr>` : '');
  const appareils = e.appareils || [];
  const a0 = appareils[0] || {};
  const puissance = String(e.puissance_kw ?? '').trim() ? `${h(String(e.puissance_kw).replace('.', ','))} kW` : '';

  const identification = (a, i) => {
    const type = e.categorie === 'pac' ? libelleDe(TYPES_PAC, a.type) : e.categorie === 'poele' ? libelleDe(TYPES_POELE, a.type) : 'Chaudière';
    const titre = appareils.length > 1 ? `<h2>Appareil ${i + 1}</h2>` : '<h2>Identification de l’appareil</h2>';
    const bruleur = a.bruleur && (a.bruleur.marque || a.bruleur.modele || a.bruleur.date)
      ? [a.bruleur.marque, a.bruleur.modele, a.bruleur.date ? `date : ${jourFr(a.bruleur.date)}` : ''].filter(Boolean).map(h).join(', ') : '';
    return `${titre}
  <table>
    ${ligne('Type', h(type))}
    ${ligne('Marque', h(a.marque))}
    ${ligne('Modèle', h(a.modele))}
    ${ligne('Énergie', h(libelleDe(ENERGIES[e.categorie] || [], a.energie)))}
    ${e.categorie === 'chaudiere' ? ligne('Technologie', h(libelleDe(TECHNOLOGIES_CHAUDIERE, a.technologie))) : ''}
    ${e.categorie !== 'pac' ? ligne('Mode d’évacuation', h(libelleDe(EVACUATIONS, a.evacuation))) : ''}
    ${ligne('Numéro de série', h(a.numero_serie))}
    ${ligne('Date de mise en service', h(jourFr(a.mise_en_service)))}
    ${i === 0 ? ligne(e.categorie === 'pac' ? 'Puissance nominale du système' : 'Puissance', puissance) : ''}
    ${e.categorie === 'chaudiere' ? ligne('Brûleur à air soufflé', bruleur) : ''}
    ${e.categorie === 'pac' ? ligne('Fluide frigorigène', [h(a.fluide), String(a.charge_kg ?? '').trim() ? `${h(String(a.charge_kg).replace('.', ','))} kg` : ''].filter(Boolean).join(', ')) : ''}
    ${e.categorie === 'pac' ? ligne('Autres machines du système', h(a.autres_machines)) : ''}
    ${e.categorie === 'poele' && a.hydraulique ? ligne('Circuit hydraulique', 'Raccordé') : ''}
  </table>
  <h2>Points contrôlés${appareils.length > 1 ? ` (appareil ${i + 1})` : ''}</h2>
  <ul class="points">${pointsCoches(e.categorie, a).map((p) => `<li>${h(p.libelle)}</li>`).join('')}</ul>`;
  };

  // ── Mesures et résultats ──
  const mesures = [];
  mesures.push(ligne('Appareils de mesure utilisés (marque et référence)', h(e.appareils_mesure)));
  if (e.categorie === 'chaudiere') {
    if (estGazFioul(a0.energie)) mesures.push(ligne(`Opérations selon le 3.1 de la norme ${a0.energie === 'fioul' ? 'NF X50-011' : 'NF X50-010'}`, h(e.operations)));
    mesures.push(ligne('Teneur en monoxyde de carbone (CO) dans l’air ambiant', String(e.co_ppm ?? '').trim() ? `${h(String(e.co_ppm).replace('.', ','))} ppm` : ''));
    if (estSolide(a0.energie)) {
      mesures.push(ligne('Température des fumées', h(e.mesures?.temperature_fumees)));
      mesures.push(ligne('Teneur en O2 et en CO2 (chaudière automatique)', h(e.mesures?.o2_co2)));
    }
  }
  if (e.categorie === 'pac') {
    const et = e.etancheite === 'controle'
      ? `Réalisé (vérification du voyant de fluide frigorigène le cas échéant ; relevé des pressions à l’entrée et à la sortie du compresseur le cas échéant)${e.etancheite_detail ? ` : ${h(e.etancheite_detail)}` : ''}`
      : e.etancheite === 'reglement_ue' ? `Équipement soumis au règlement (UE) 2024/573 : contrôle d’étanchéité au titre de ce règlement, avec sa fiche d’intervention${e.etancheite_detail ? ` (${h(e.etancheite_detail)})` : ''}` : '';
    mesures.push(ligne('Contrôle d’étanchéité du circuit de fluide frigorigène', et));
  }
  mesures.push(ligne('Résultats des mesures', h(e.mesures?.resultats)));

  const co = e.categorie === 'chaudiere' ? niveauCO(e.co_ppm) : null;

  // ── Conseils ──
  let conseils = '';
  if (e.categorie === 'chaudiere') {
    conseils = `<h2>Conseils et recommandations (annexe 4 de l’arrêté du 15 septembre 2009)</h2>
  <table class="grille">${RUBRIQUES_CHAUDIERE.map((r) => `<tr><th>${h(r.libelle)}</th><td>${h(e.conseils?.[r.cle] || '—')}</td></tr>`).join('')}</table>
  <p class="mention">${h(PHRASE_CONSEILS_CHAUDIERE)}</p>`;
  } else {
    const choisis = (e.conseils?.choix || []).map((cle) => libelleDe(SUJETS_CONSEILS[e.categorie] || [], cle)).filter(Boolean);
    const texte = String(e.conseils?.texte || '').trim();
    conseils = `<h2>Conseils et recommandations</h2>
  <div class="bloc">${[...choisis.map((c) => `• ${h(c)}`), texte ? h(texte) : ''].filter(Boolean).join('\n')}</div>
  <p class="mention">${h(PHRASES_CONSEILS[e.categorie] || '')}</p>`;
  }

  const signature = signatureValide(e.signature)
    ? `<img src="${h(e.signature)}" alt="Signature" style="max-height:70px;max-width:220px;display:block;margin-top:6px" />` : '';

  return marquerDocumentFictif({ donneesFictives: fictif }, `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${h(cat?.titre || 'Attestation d’entretien')} ${h(e.numero || '')}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Segoe UI', Arial, sans-serif; font-size: 10pt; color: #1e293b; background: #ffffff; padding: 25px; line-height: 1.45; }
    .entete { display: flex; justify-content: space-between; gap: 16px; padding-bottom: 12px; border-bottom: 3px solid ${color}; margin-bottom: 16px; }
    .entete .nom { font-size: 15pt; font-weight: 700; color: ${color}; }
    .entete .info { font-size: 8pt; color: #475569; margin-top: 4px; }
    .titre { text-align: right; max-width: 55%; }
    .titre h1 { font-size: 15pt; color: ${color}; }
    .titre .numero { font-size: 10pt; font-weight: 700; margin-top: 4px; }
    .titre .texte { font-size: 8pt; color: #475569; }
    h2 { font-size: 9pt; text-transform: uppercase; letter-spacing: .5px; color: #475569; margin: 14px 0 6px; padding-bottom: 3px; border-bottom: 1px solid #e2e8f0; }
    table { width: 100%; border-collapse: collapse; font-size: 9.5pt; }
    th { text-align: left; font-weight: 600; color: #475569; width: 42%; padding: 3px 8px 3px 0; vertical-align: top; }
    td { padding: 3px 0; vertical-align: top; overflow-wrap: anywhere; white-space: pre-line; }
    table.grille th, table.grille td { border: 1px solid #cbd5e1; padding: 5px 6px; }
    table.grille thead th { background: #f1f5f9; color: #1e293b; }
    ul.points { padding-left: 18px; font-size: 9pt; }
    ul.points li { margin: 1px 0; }
    .co { margin-top: 8px; padding: 8px 10px; border-radius: 4px; font-weight: 700; border: 2px solid #94a3b8; }
    .co.b { border-color: #b45309; color: #92400e; }
    .co.c { border-color: #b91c1c; color: #991b1b; }
    .bloc { background: #f8fafc; border-left: 3px solid ${color}; padding: 8px 10px; border-radius: 4px; font-size: 9pt; white-space: pre-line; }
    .attestation { margin-top: 16px; font-size: 10pt; }
    .annulee { border: 2px solid #b91c1c; color: #b91c1c; padding: 8px 10px; border-radius: 4px; font-weight: 700; margin-bottom: 12px; }
    .mention { font-size: 8.5pt; color: #334155; margin-top: 8px; }
    .pied { margin-top: 18px; padding-top: 10px; border-top: 1px solid #e2e8f0; font-size: 8pt; color: #334155; }
    @media print { body { padding: 15px; } }${PAGE_CSS}
  </style>
</head>
<body>
  ${e.annulee_le ? `<div class="annulee">Attestation annulée le ${jourFr(jourDe(e.annulee_le))}${e.annulation_motif ? ` : ${h(e.annulation_motif)}` : ''}</div>` : ''}
  <div class="entete">
    <div>
      <div class="nom">${em.nom}</div>
      <div class="info">
        ${em.forme ? `${em.forme}<br>` : ''}${em.adresse ? `${em.adresse}<br>` : ''}
        ${[em.tel ? `Tél. ${em.tel}` : '', em.email].filter(Boolean).join(' · ')}<br>
        ${em.siret ? `SIRET ${em.siret}` : ''}${em.rcs ? ` · ${em.rcs}` : ''}
      </div>
    </div>
    <div class="titre">
      <h1>${h(cat?.titre || 'Attestation d’entretien')}</h1>
      <div class="numero">N° ${h(e.numero || 'en attente')}</div>
      <div class="texte">${h(cat?.texte || '')}</div>
      ${remplace?.numero ? `<div class="texte" style="margin-top:4px">Annule et remplace l’attestation n° ${h(remplace.numero)}</div>` : ''}
    </div>
  </div>

  <h2>Commanditaire et installation</h2>
  <table>
    ${ligne('Commanditaire', h(e.client_nom))}
    ${ligne('Adresse du commanditaire', h(e.client_adresse))}
    ${ligne('Adresse de l’installation', h(e.adresse_installation))}
    ${ligne('Local où se situe l’appareil', h(e.local))}
  </table>

  <h2>Visite d’entretien</h2>
  <table>
    ${ligne('Date de la visite', h(jourFr(jourDe(e.realise_le))))}
    ${ligne('Date de la dernière prestation d’entretien', e.dernier_entretien ? h(jourFr(e.dernier_entretien)) : 'Non disponible')}
    ${e.categorie !== 'pac' ? ligne('Date du dernier ramonage', e.dernier_ramonage ? h(jourFr(e.dernier_ramonage)) : 'Non disponible') : ''}
    ${ligne('Entretien effectué par', [em.nom, em.adresse, em.tel ? `Tél. ${em.tel}` : '', em.email].filter(Boolean).join(', '))}
    ${ligne('Intervenant', h(e.intervenant_nom))}
  </table>

  ${appareils.map(identification).join('')}

  ${mesures.join('') ? `<h2>Mesures</h2>
  <table>${mesures.join('')}</table>` : ''}
  ${co ? `<div class="co ${co}">${h(PHRASES_CO[co])}</div>` : ''}

  ${e.categorie === 'chaudiere' ? `
  <h2>Évaluation du rendement de la chaudière</h2>
  <table class="grille">
    <thead><tr><th>Rendement de la chaudière</th><th>Rendement de référence (le rendement de référence correspond au rendement de la meilleure technologie équivalente de chaudière récente existant en 2009 sur le marché)</th></tr></thead>
    <tr><td>${h(e.rendement?.evalue)}<br><small>Valeur évaluée à l’aide des tableaux de l’annexe 2 de l’arrêté du 15 septembre 2009</small></td>
      <td>${h(e.rendement?.reference)}<br><small>${h(referenceRendement(a0.energie))}, ${h(SAUF_IMPOSSIBILITE)}</small></td></tr>
  </table>
  <h2>Évaluation des émissions de polluants</h2>
  <table class="grille">
    <thead><tr><th>Émission (s) de polluants atmosphériques de la chaudière (${h(POLLUANTS(a0.energie))})</th><th>Émission (s) de référence (la (ou les) valeur (s) de référence correspond (ent) au (x) niveau (x) équivalent (s) d’émissions atteint (s) par l’utilisation des meilleures technologies de chaudières récentes existant en 2009 sur le marché)</th></tr></thead>
    <tr><td>${h(e.emissions?.evalue)}<br><small>Valeur (s) évaluée (s) à l’aide des tableaux de l’annexe 3 de l’arrêté du 15 septembre 2009</small></td>
      <td>${h(referenceEmissions(a0.energie))}<br><small>Valeur (s) de référence du tableau 8 « Tableau relatif aux valeurs de référence » de l’annexe 3 de l’arrêté du 15 septembre 2009, accompagnée (s) de la mention : « ${h(SAUF_IMPOSSIBILITE)} »</small></td></tr>
  </table>
  <h2>Classe énergétique</h2>
  <table>${ligne('Classe énergétique de la chaudière', h(e.classe_energetique))}</table>
  <p class="mention" style="font-weight:600">Classe énergétique des solutions de remplacement (tableau 13)</p>
  <table class="grille"><thead><tr><th>Énergie</th><th>Système (neuf)</th><th>Classe énergétique</th></tr></thead>
    ${TABLEAU_13.map(([en, sys, cl]) => `<tr><td>${h(en)}</td><td>${h(sys)}</td><td>${h(cl)}</td></tr>`).join('')}
  </table>` : ''}

  ${e.categorie === 'pac' ? `
  <h2>Défauts et actions</h2>
  <table>
    ${ligne('Défauts de fonctionnement constatés', h(e.defauts))}
    ${ligne('Actions effectuées pour y remédier', h(e.actions))}
  </table>` : ''}

  ${conseils}
  ${String(e.observations || '').trim() ? `<h2>Observations</h2><div class="bloc">${h(e.observations)}</div>` : ''}

  <h2>Prochain entretien</h2>
  <table>${ligne('Prochain entretien conseillé avant le', `<strong>${h(jourFr(e.prochain_avant))}</strong>`)}</table>

  <div class="attestation">
    <p>Je soussigné(e) ${h(e.intervenant_nom)}, pour ${em.nom}, atteste avoir effectué le ${h(jourFr(jourDe(e.realise_le)))} la visite d’entretien ${appareils.length > 1 ? 'des appareils désignés' : e.categorie === 'pac' ? 'du système désigné' : 'de l’appareil désigné'} ci-dessus.</p>
    <p style="margin-top:8px">Fait le ${h(jourFr(jourDe(e.created_at || new Date().toISOString())))}</p>
    <p style="margin-top:6px"><strong>Signature : ${h(e.intervenant_nom)}</strong></p>
    ${signature}
  </div>

  ${rappelsRefuses ? '' : `<p class="mention">${h(informationRappelsEntretien(nom))}</p>`}
  <div class="pied">${h(cat?.pied || '')}</div>
</body>
</html>`);
}
