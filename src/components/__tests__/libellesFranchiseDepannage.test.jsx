import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';

/**
 * Suite de libellesFranchiseEcrans.test.jsx pour le lot dépannage : en franchise de TVA (art. 293 B du CGI, D-31), aucun
 * écran n'écrit « HT » ni « TTC » à côté d'un montant ; hors franchise, rien ne change. Écrans : Paramètres › Dépannage
 * (grille tarifaire) et « Dépannage express ». Le résumé de l'arrêté du 24 janvier 2017 (« Afficher vos tarifs ») parle
 * de prix TTC : c'est la loi qu'il décrit, pas un libellé de montant, il est hors de ce contrôle.
 * Sans navigateur de test, l'état de départ est imposé : `etatsInitiaux` remplace la valeur initiale des premiers
 * useState du rendu suivant, dans l'ordre (même mécanisme que libellesFranchiseListes.test.jsx).
 */
let etatsInitiaux = [];
vi.mock('react', async (original) => {
  const React = await original();
  const useState = (init) => React.useState(etatsInitiaux.length ? etatsInitiaux.shift() : init);
  return { ...React, default: { ...React, useState }, useState };
});
// Le portail de l'écran express ne se rend pas côté serveur : l'écran est rendu sur place
vi.mock('react-dom', async (original) => ({ ...(await original()), createPortal: (enfants) => enfants }));

const { default: DepannageTab } = await import('../settings/DepannageTab');
const { default: DevisExpress } = await import('../depannage/DevisExpress');

beforeEach(() => { vi.stubGlobal('document', { body: {} }); });
afterEach(() => { etatsInitiaux = []; vi.unstubAllGlobals(); });

const texte = (html) => html.replace(/<style[\s\S]*?<\/style>/g, ' ').replace(/<[^>]*>/g, ' ')
  .replace(/&#x27;/g, "'").replace(/&amp;/g, '&').replace(/&nbsp;/g, ' ').replace(/[\s  ]+/g, ' ').trim();
const HT_OU_TTC = /(?<![A-Za-zÀ-ÿ])(HT|TTC)(?![A-Za-zÀ-ÿ])/;

const MICRO = { nom: 'Plomberie Exemple', formeJuridique: 'Micro-entreprise', siret: '12345678900011' };
const SARL = { ...MICRO, formeJuridique: 'SARL' };
const GRILLE = { tauxHoraire: 60, decompte: 'quart', deplacement: 39, forfaits: [{ libelle: 'Ouverture de porte', prix: 89 }] };
const avecGrille = (entreprise) => ({ ...entreprise, depannageActif: true, depannageGrille: GRILLE });

const reglages = (entreprise) => {
  const t = texte(renderToStaticMarkup(<DepannageTab entreprise={avecGrille(entreprise)} setEntreprise={() => {}} />));
  // Hors du résumé de l'arrêté, qui décrit la loi
  return t.slice(0, t.indexOf('Afficher vos tarifs'));
};
// 9 premiers useState de DevisExpress : client, intervention, lieu, urgence, déplacement, heures, majoration, forfaits, pièces
const express = (entreprise) => {
  etatsInitiaux = ['', '', '', false, true, '1', '', [], [{ libelle: 'Siphon PVC', quantite: '1', prix: '12' }]];
  return texte(renderToStaticMarkup(
    <DevisExpress isOpen onClose={() => {}} onCreer={async () => ({})} clients={[]} addClient={async () => null} entreprise={avecGrille(entreprise)} />,
  ));
};

describe('Paramètres › Dépannage : ni « HT » ni « TTC » en franchise', () => {
  it('micro-entreprise : libellés de la grille sans « HT », mention 293 B annoncée', () => {
    const t = reglages(MICRO);
    expect(t).toContain('Taux horaire (€)');
    expect(t).toContain('Frais de déplacement (€)');
    expect(t).toContain('Vos prix, comme sur vos devis. La grille imprimée porte la mention « TVA non applicable, article 293 B du CGI ».');
    expect(t).not.toMatch(HT_OU_TTC);
  });
  it('contre-essai : SARL, les libellés gardent « HT » et la grille montre les prix TTC', () => {
    const t = reglages(SARL);
    expect(t).toContain('Taux horaire (€ HT)');
    expect(t).toContain('Frais de déplacement (€ HT)');
    expect(t).toContain('Prix hors taxes, comme sur vos devis.');
    expect(t).toMatch(/66\s€ TTC à 10 %/);
  });
});

describe('Dépannage express : ni « HT » ni « TTC » en franchise', () => {
  it('micro-entreprise : déplacement, forfait, prix d’une pièce et total sans « HT » ni « TTC »', () => {
    const t = express(MICRO);
    expect(t).toContain('Frais de déplacement (39 €)');
    expect(t).toContain('Ouverture de porte (89 €)');
    expect(t).toContain('Total 111 €');
    expect(t).not.toMatch(HT_OU_TTC);
  });
  it('contre-essai : SARL, « HT » sur les prix de la grille, « Total TTC » en bas', () => {
    const t = express(SARL);
    expect(t).toContain('Frais de déplacement (39 € HT)');
    expect(t).toContain('Ouverture de porte (89 € HT)');
    expect(t).toContain('Pièce Qté € HT');
    expect(t).toContain('Total TTC 122,10 €');
  });
});
