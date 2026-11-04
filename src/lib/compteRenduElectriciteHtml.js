/**
 * Compte rendu d'intervention et d'autocontrôle (électricité) : document HTML complet, imprimé, partagé en PDF depuis
 * le téléphone. Un seul générateur (ce n'est ni un devis ni une facture : la facture tirée du compte rendu passe, elle,
 * par les deux générateurs habituels).
 *
 * Vocabulaire (juriste-btp, 3 nov. 2026) : jamais « attestation de conformité », jamais « conforme », jamais
 * « certifié » ; ni les couleurs, ni les CERFA, ni la mise en page du Consuel. Des mesures relevées et des constats,
 * pas un jugement sur l'installation. Tout texte saisi passe par `h` (echapperHtml).
 */
import { echapperHtml as h, couleurCss } from './echapperHtml';
import { nomImprime, formeImprimee } from './identiteEntreprise';
import { estSociete } from './mentionsFacture';
import { marquerDocumentFictif, estDonneesFictives } from './donneesFictives';
import { dateLue } from './dates';
import { adresseComplete } from './adresseEntreprise';
import { PAGE_CSS } from './devisHtmlBuilder';
import { jourDe } from './ramonage';
import {
  NATURES, MENTION_PORTEE, libelleDe, mesuresImprimees, phraseCompteRendu, titreCompteRendu,
} from './electricite';

const jourFr = (jour) => (jour ? dateLue(String(jour).slice(0, 10)).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' }) : '');
const signatureValide = (s) => typeof s === 'string' && /^data:image\/(png|jpe?g);base64,[A-Za-z0-9+/=]+$/.test(s);

/**
 * @param {object} p
 * @param {object} p.compteRendu ligne `comptes_rendus_electricite` (numéro attribué par la base)
 * @param {object} p.entreprise  fiche entreprise (aperçu, avant que l'émetteur soit figé)
 * @param {object} [p.remplace]  compte rendu que celui-ci annule et remplace
 */
export function buildCompteRenduElectriciteHtml({ compteRendu: r, entreprise, remplace = null, couleur }) {
  const source = r.emetteur && typeof r.emetteur === 'object' && Object.keys(r.emetteur).length ? r.emetteur : (entreprise || {});
  const color = couleurCss(couleur || source.couleur || entreprise?.couleur);
  const nom = nomImprime(source);
  const rcs = source.rcsVille && source.rcsNumero ? `RCS ${source.rcsVille} ${source.rcsType || 'B'} ${source.rcsNumero}` : (source.rcs ? `RCS ${source.rcs}` : '');
  const forme = `${formeImprimee(source)}${source.capital && estSociete(source) ? ` au capital de ${source.capital} €` : ''}`;
  const fictif = estDonneesFictives(source) || estDonneesFictives(entreprise);
  const ligne = (libelle, valeur) => (valeur ? `<tr><th>${libelle}</th><td>${valeur}</td></tr>` : '');
  const mesures = mesuresImprimees(r.mesures).map((m) => ligne(h(m.libelle), h(m.valeur))).join('');
  // Qualification IRVE : la ligne figée dans l'émetteur à l'enregistrement (valide à la date de l'intervention), jamais
  // la fiche du jour (`avecEmetteur`, src/lib/electricite.js)
  const irve = r.nature === 'borne' && typeof source.qualificationIrve === 'string' ? source.qualificationIrve.trim() : '';
  const titre = titreCompteRendu(r);
  const signature = signatureValide(r.signature)
    ? `<img src="${h(r.signature)}" alt="Signature" style="max-height:70px;max-width:220px;display:block;margin-top:6px" />` : '';

  return marquerDocumentFictif({ donneesFictives: fictif }, `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${titre} ${h(r.numero || '')}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Segoe UI', Arial, sans-serif; font-size: 10pt; color: #1e293b; background: #ffffff; padding: 25px; line-height: 1.45; }
    .entete { display: flex; justify-content: space-between; gap: 16px; padding-bottom: 12px; border-bottom: 3px solid ${color}; margin-bottom: 16px; }
    .entete .nom { font-size: 15pt; font-weight: 700; color: ${color}; }
    .entete .info { font-size: 8pt; color: #475569; margin-top: 4px; }
    .titre { text-align: right; }
    .titre h1 { font-size: 15pt; color: ${color}; }
    .titre .numero { font-size: 10pt; font-weight: 700; margin-top: 4px; }
    .titre .texte { font-size: 8pt; color: #475569; }
    h2 { font-size: 9pt; text-transform: uppercase; letter-spacing: .5px; color: #475569; margin: 14px 0 6px; padding-bottom: 3px; border-bottom: 1px solid #e2e8f0; }
    table { width: 100%; border-collapse: collapse; font-size: 9.5pt; }
    th { text-align: left; font-weight: 600; color: #475569; width: 42%; padding: 3px 8px 3px 0; vertical-align: top; }
    td { padding: 3px 0; vertical-align: top; overflow-wrap: anywhere; }
    .bloc { background: #f8fafc; border-left: 3px solid ${color}; padding: 8px 10px; border-radius: 4px; font-size: 9pt; white-space: pre-line; overflow-wrap: anywhere; }
    .declaration { margin-top: 16px; font-size: 10pt; }
    .annulee { border: 2px solid #b91c1c; color: #b91c1c; padding: 8px 10px; border-radius: 4px; font-weight: 700; margin-bottom: 12px; }
    .pied { margin-top: 18px; padding-top: 10px; border-top: 1px solid #e2e8f0; font-size: 8pt; color: #334155; }
    @media print { body { padding: 15px; } }${PAGE_CSS}
  </style>
</head>
<body>
  ${r.annulee_le ? `<div class="annulee">Compte rendu annulé le ${jourFr(jourDe(r.annulee_le))}${r.annulation_motif ? ` : ${h(r.annulation_motif)}` : ''}</div>` : ''}
  <div class="entete">
    <div>
      <div class="nom">${h(nom)}</div>
      <div class="info">
        ${forme ? `${h(forme)}<br>` : ''}${adresseComplete(source) ? `${h(adresseComplete(source).split('\n').join(', '))}<br>` : ''}
        ${[source.tel || source.telephone ? `Tél. ${h(source.tel || source.telephone)}` : '', h(source.email), h(source.siteWeb || source.site_web)].filter(Boolean).join(' · ')}<br>
        ${source.siret ? `SIRET ${h(source.siret)}` : ''}${rcs ? ` · ${h(rcs)}` : ''}
        ${source.rcProAssureur || source.rcProNumero ? `<br>Assurance responsabilité civile professionnelle : ${[h(source.rcProAssureur), source.rcProNumero ? `n° ${h(source.rcProNumero)}` : ''].filter(Boolean).join(', ')}` : ''}
        ${irve ? `<br>${h(irve)}` : ''}
      </div>
    </div>
    <div class="titre">
      <h1>${titre}</h1>
      <div class="numero">N° ${h(r.numero || 'en attente')}</div>
      ${remplace?.numero ? `<div class="texte" style="margin-top:4px">Annule et remplace le compte rendu n° ${h(remplace.numero)}</div>` : ''}
    </div>
  </div>

  <h2>Client et lieu d’intervention</h2>
  <table>
    ${ligne('Client', h(r.client_nom))}
    ${ligne('Adresse de l’intervention', h(r.adresse_intervention))}
  </table>

  <h2>Intervention</h2>
  <table>
    ${ligne('Date', jourFr(jourDe(r.realise_le)))}
    ${ligne('Nature des travaux', h(libelleDe(NATURES, r.nature)))}
    ${ligne('Intervenant', h(r.intervenant_nom))}
  </table>
  <h2>Travaux réalisés</h2>
  <div class="bloc">${h(r.travaux)}</div>

  ${mesures ? `<h2>Autocontrôle réalisé le ${jourFr(jourDe(r.realise_le))} : résultats ci-dessous</h2>
  <table>${mesures}</table>` : ''}

  ${r.reserves ? `<h2>Réserves et points à reprendre</h2><div class="bloc">${h(r.reserves)}</div>` : ''}
  ${r.observations ? `<h2>Observations</h2><div class="bloc">${h(r.observations)}</div>` : ''}

  <div class="declaration">
    <p>${h(phraseCompteRendu(r, nom))}</p>
    <p style="margin-top:8px">Fait le ${jourFr(jourDe(r.created_at || new Date().toISOString()))}</p>
    <p style="margin-top:6px"><strong>Signature : ${h(r.intervenant_nom)}</strong></p>
    ${signature}
  </div>

  <div class="pied">${h(MENTION_PORTEE)}</div>
</body>
</html>`);
}
