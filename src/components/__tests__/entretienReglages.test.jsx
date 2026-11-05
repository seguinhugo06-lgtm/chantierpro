import { describe, it, expect } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';

/**
 * Paramètres → Entretien (D-38, 5 nov. 2026) : le rappel cite l'obligation des trois appareils, et l'attestation de capacité
 * (fluides frigorigènes) reste un champ facultatif, une simple information, jamais un blocage. Rendu côté serveur, sans
 * contexte : le composant ne lit que ses props.
 */
const { default: EntretienTab } = await import('../settings/EntretienTab');
const { AIDE_OBLIGATION_RAPPEL } = await import('../../lib/entretien');

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
  it('l’attestation de capacité est facultative : une information, jamais un blocage (décision 6)', () => {
    const t = reglages({ entretienActif: true });
    expect(t).toMatch(/Attestation de capacité \(fluides frigorigènes\) : numéro et organisme\s*\(?facultatif/i);
    expect(t).toContain('Pas pour le R290, le R744 ou un HFO.');
  });
});
