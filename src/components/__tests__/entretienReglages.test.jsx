import { describe, it, expect } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';

/**
 * Paramètres → Entretien (D-38, 5 nov. 2026) : le rappel cite l'obligation des trois appareils, et l'attestation de capacité
 * (fluides frigorigènes) reste un champ facultatif, une simple information, jamais un blocage. Rendu côté serveur, sans
 * contexte : le composant ne lit que ses props.
 */
const { default: EntretienTab } = await import('../settings/EntretienTab');
const { AIDE_OBLIGATION_RAPPEL, AIDE_DEVIS_PREALABLE } = await import('../../lib/entretien');

const texte = (html) => html.replace(/<style[\s\S]*?<\/style>/g, ' ').replace(/<[^>]*>/g, ' ')
  .replace(/&#x27;/g, "'").replace(/&amp;/g, '&').replace(/&nbsp;/g, ' ').replace(/[\s  ]+/g, ' ').trim();
const reglages = (entreprise) => texte(renderToStaticMarkup(<EntretienTab entreprise={entreprise} setEntreprise={() => {}} />));

describe('Paramètres → Entretien', () => {
  it('éteint : seul l’interrupteur est proposé', () => {
    const t = reglages({});
    expect(t).toContain('J’entretiens des chaudières, pompes à chaleur ou poêles');
    expect(t).not.toContain('Rappel du prochain entretien');
  });
  it('activé : le rappel dit l’obligation de la chaudière, de la PAC ou climatisation et du poêle ou insert', () => {
    const t = reglages({ entretienActif: true });
    expect(t).toContain(AIDE_OBLIGATION_RAPPEL);
    expect(t).toContain('chaudière de 4 à 400 kW (une fois par année civile)');
    expect(t).toContain('pompe à chaleur ou climatisation de 4 à 70 kW hors contrat de performance énergétique (au moins tous les deux ans)');
    expect(t).toContain('poêle ou insert à bois ou à granulés (au moins tous les douze mois s’il est utilisé)');
    // Contre-essai : l'ancienne phrase de la v3 ne parlait que de la chaudière
    expect(t).not.toContain('seulement pour une chaudière');
  });
  it('le rappel « Client particulier » : le texte du juriste (avis du 5 nov., point 6), avec la dernière phrase du devis en un geste', () => {
    const t = reglages({ entretienActif: true });
    // Mot pour mot : devis préalable (arrêté du 24 janv. 2017, art. 4), sept jours « ni aucune contrepartie » (L. 221-10),
    // exception du dépannage urgent qui ne dispense pas du devis (L. 221-10, 4° et L. 221-28, 8°), puis le devis en un geste
    expect(t).toContain('Client particulier : une visite d’entretien facturée à l’acte demande un devis détaillé avant l’intervention (arrêté du 24 janvier 2017, article 4) et, si le contrat est conclu chez lui, aucun paiement ni aucune contrepartie ne peut être reçu avant sept jours (code de la consommation, article L. 221-10). Exception, qui ne dispense pas du devis : des travaux d’entretien ou de réparation urgents, qu’il a expressément demandés, peuvent être payés sur place et ne donnent pas droit à la rétractation, dans la limite des pièces de rechange et travaux strictement nécessaires pour répondre à l’urgence (articles L. 221-10, 4° et L. 221-28, 8°). Faites ce devis avant la visite, depuis l’attestation ou depuis « Devis ».');
    expect(t).toContain(AIDE_DEVIS_PREALABLE);
    expect(t).toContain('Faites ce devis avant la visite, depuis l’attestation ou depuis « Devis ».');
    // Contre-essai : ni la phrase de la v3 ni celle de l'avis du 4 nov. (« ne fait pas ce devis », « aucun paiement ne peut »)
    expect(t).not.toContain('ne fait pas ce devis');
    expect(t).not.toContain('Sur une attestation, « Faire le devis de la visite » prépare');
    expect(t).not.toContain('aucun paiement ne peut être reçu avant sept jours (code');
  });
  it('l’attestation de capacité est facultative : une information, jamais un blocage (décision 6)', () => {
    const t = reglages({ entretienActif: true });
    expect(t).toMatch(/Attestation de capacité \(fluides frigorigènes\) : numéro et organisme\s*\(?facultatif/i);
    expect(t).toContain('Pas pour le R290, le R744 ou un HFO.');
  });
});
