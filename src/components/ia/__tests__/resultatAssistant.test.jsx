import { describe, it, expect } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import ResultatAssistant from '../ResultatAssistant';
import { proposerDevis, repondreEncaisse } from '../../../lib/ia/preparer';

/**
 * Cartes de l'assistant (prototype) :
 *   - en franchise de TVA (art. 293 B du CGI), ni « HT » ni « TTC » (règle de la branche franchise ; drapeau calculé par
 *     preparer.js avec la règle unique `estFranchiseTva`) ;
 *   - le bouton des relances ne prétend pas envoyer (C. conso. L121-2, relecture juriste du 3 nov. 2026) ;
 *   - « Masquer les montants » (modeDiscret) masque aussi les montants de l'assistant ;
 *   - l'e-mail d'un client n'est montré qu'avec l'accès aux clients.
 */
const texte = (html) => html.replace(/<[^>]*>/g, ' ').replace(/&#x27;/g, "'").replace(/&amp;/g, '&').replace(/[\s  ]+/g, ' ').trim();
const clients = [{ id: 'c1', prenom: 'Marie', nom: 'Dupont', email: 'marie@ex.fr' }];
const maintenant = new Date(2026, 10, 15, 12);
const rendre = (props) => texte(renderToStaticMarkup(
  <ResultatAssistant questions={[]} onRepondre={() => {}} onValider={() => {}} onAnnuler={() => {}} etat={{ enCours: false, fait: null }}
    voirPrix peutCreer peutRelancer peutPointer voirEmail demo {...props} />,
));

describe('carte devis', () => {
  const param = { client_id: 'c1', lignes: [{ description: 'Tableau', montant: 800 }] };
  it('en franchise : ni « HT » ni « TTC »', () => {
    const p = proposerDevis(param, {}, { clients, entreprise: { formeJuridique: 'Micro-entreprise' } }, maintenant);
    const t = rendre({ proposition: p });
    expect(t).toMatch(/Total 800 €/);
    expect(t).not.toMatch(/\bHT\b|\bTTC\b|hors taxes/i);
  });
  it('hors franchise : HT et TTC restent', () => {
    const p = proposerDevis(param, { base: 'HT', tva: '20' }, { clients, entreprise: { formeJuridique: 'SARL' } }, maintenant);
    const t = rendre({ proposition: p });
    expect(t).toMatch(/800 € HT/);
    expect(t).toMatch(/Total TTC 960 €/);
  });
  it('mode « Masquer les montants » : aucun montant en clair', () => {
    const p = proposerDevis(param, { base: 'HT', tva: '20' }, { clients, entreprise: { formeJuridique: 'SARL' } }, maintenant);
    const t = rendre({ proposition: p, discret: true });
    expect(t).not.toMatch(/800|960/);
    expect(t).toMatch(/•••/);
  });
});

describe('carte relances', () => {
  const p = {
    type: 'relances',
    relances: [{ id: 'f1', facture: { numero: 'FAC-1' }, client: clients[0], clientNom: 'Marie Dupont', solde: { reste: 300, jours: 12 }, canal: 'email', message: 'Il reste 300 € à régler.' }],
  };
  it('en démo : « Simuler l’envoi de 1 relance », jamais « Envoyer »', () => {
    const t = rendre({ proposition: p });
    expect(t).toMatch(/Simuler l’envoi de 1 relance/);
    expect(t).not.toMatch(/Envoyer 1 relance/);
  });
  it('hors démo : pas de bouton, renvoi vers chaque facture', () => {
    const t = rendre({ proposition: p, demo: false });
    expect(t).toMatch(/Pour l’instant, envoyez vos relances depuis chaque facture\./);
    expect(t).not.toMatch(/relance(s)? *$|Simuler|Envoyer 1/);
  });
  it('e-mail du client seulement avec l’accès aux clients ; montants masqués en mode discret', () => {
    expect(rendre({ proposition: p })).toMatch(/marie@ex\.fr/);
    expect(rendre({ proposition: p, voirEmail: false })).not.toMatch(/marie@ex\.fr/);
    expect(rendre({ proposition: p, discret: true })).not.toMatch(/300/);
  });
});

describe('carte encaissé', () => {
  it('mode discret : total masqué, détail caché ; plus de « comme la tuile »', () => {
    const p = repondreEncaisse({ periode: 'mois' }, { devis: [], paiements: [{ id: 'p1', montant: 450, date: '2026-11-05' }] }, maintenant);
    expect(rendre({ proposition: p })).toMatch(/450/);
    expect(rendre({ proposition: p })).not.toMatch(/tuile/);
    expect(rendre({ proposition: p, discret: true })).not.toMatch(/450/);
  });
});
