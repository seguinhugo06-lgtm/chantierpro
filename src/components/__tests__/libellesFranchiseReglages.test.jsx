import { describe, it, expect, vi, afterEach } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';

/**
 * Paramètres › Rentabilité, tâche 28 `franchise-restes` (4 nov. 2026) : la formule de la marge réelle dit « Chiffre
 * d’affaires » en franchise en base de TVA (art. 293 B du CGI, estFranchiseTva), « CA HT » sinon (D-31).
 * 1er useState de Settings = onglet ouvert.
 */
let etatsInitiaux = [];
vi.mock('react', async (original) => {
  const React = await original();
  const useState = (init) => React.useState(etatsInitiaux.length ? etatsInitiaux.shift() : init);
  return { ...React, default: { ...React, useState }, useState };
});
vi.stubGlobal('document', { body: {} });
vi.mock('../../context/AppContext', () => ({
  useToast: () => ({ showToast: () => {} }),
  useConfirm: () => ({ confirm: async () => true }),
}));
vi.mock('../../hooks/usePermissions', () => ({ usePermissions: () => ({ canManageTeam: true, canViewPrices: true, canPerform: () => true }) }));
vi.mock('../../hooks/useRelances', () => ({ useRelances: () => ({}) }));
vi.mock('../../context/OrgContext', () => ({ useOrg: () => ({ orgId: null }) }));

const { default: Settings } = await import('../Settings');
afterEach(() => { etatsInitiaux = []; });

const texte = (html) => html.replace(/<style[\s\S]*?<\/style>/g, ' ').replace(/<[^>]*>/g, ' ').replace(/&#x27;/g, "'").replace(/[\s  ]+/g, ' ');
const rentabilite = (formeJuridique) => {
  etatsInitiaux = ['rentabilite'];
  return texte(renderToStaticMarkup(<Settings entreprise={{ nom: 'Élec Seguin', formeJuridique }} setEntreprise={() => {}} user={{ id: 'u1' }} />));
};

describe('Paramètres › Rentabilité', () => {
  it('« Chiffre d’affaires » en franchise, « CA HT » sinon', () => {
    const micro = rentabilite('Micro-entreprise');
    expect(micro).toMatch(/Marge réelle = Chiffre d’affaires \+/);
    expect(micro).not.toMatch(/CA HT/);
    expect(rentabilite('SARL')).toMatch(/Marge réelle = CA HT \+/);
  });
});
