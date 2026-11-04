import { describe, it, expect } from 'vitest';
import { choixDeStatut } from '../changementStatut';

const tous = { peutModifier: true, peutEnvoyer: true };
const cles = (choix) => choix.map((c) => `${c.cle}:${c.geste}`);
const facture = (o = {}) => ({ id: 'f1', type: 'facture', facture_type: 'totale', statut: 'envoye', total_ttc: 1100, date: '2026-10-02', date_echeance: '2099-01-01', ...o });

describe('choixDeStatut — devis', () => {
  it('brouillon : envoyé ou refusé', () => {
    expect(cles(choixDeStatut({ type: 'devis', statut: 'brouillon' }, [], tous))).toEqual(['envoye:statut', 'refuse:statut']);
  });
  it('envoyé (ou « vu ») : signé ou refusé, jamais « vu »', () => {
    const c = choixDeStatut({ type: 'devis', statut: 'vu' }, [], tous);
    expect(cles(c)).toEqual(['accepte:statut', 'refuse:statut']);
    expect(c[0].libelle).toBe('Signé');
  });
  it('un devis signé ou facturé ne revient pas en arrière', () => {
    for (const s of ['accepte', 'signe', 'acompte_facture', 'facture']) expect(choixDeStatut({ type: 'devis', statut: s }, [], tous)).toEqual([]);
  });
  it('refusé : revient en brouillon', () => {
    expect(cles(choixDeStatut({ type: 'devis', statut: 'refuse' }, [], tous))).toEqual(['brouillon:statut']);
  });
  it('sans le droit d’envoyer, « Envoyé » n’est pas proposé ; sans le droit de modifier, rien', () => {
    expect(cles(choixDeStatut({ type: 'devis', statut: 'brouillon' }, [], { peutModifier: true }))).toEqual(['refuse:statut']);
    expect(choixDeStatut({ type: 'devis', statut: 'brouillon' }, [], { peutEnvoyer: true })).toEqual([]);
  });
});

describe('choixDeStatut — factures', () => {
  it('brouillon : « Envoyée » émet la facture (droit d’envoyer exigé)', () => {
    const c = choixDeStatut(facture({ statut: 'brouillon' }), [], tous);
    expect(cles(c)).toEqual(['envoye:emettre']);
    expect(c[0].libelle).toBe('Envoyée');
    expect(choixDeStatut(facture({ statut: 'brouillon' }), [], { peutModifier: true })).toEqual([]);
  });
  it('envoyée : « Payée » encaisse le reste dû', () => {
    const c = choixDeStatut(facture(), [], tous);
    expect(cles(c)).toEqual(['payee:encaisser']);
    expect(c[0].reste).toBe(1100);
  });
  it('payée en partie ou en retard : « Payée » encaisse ce qui reste', () => {
    const paiements = [{ facture_id: 'f1', amount: 400 }];
    expect(choixDeStatut(facture(), paiements, tous)[0].reste).toBe(700);
    expect(cles(choixDeStatut(facture({ date_echeance: '2020-01-01' }), [], tous))).toEqual(['payee:encaisser']);
  });
  it('soldée par ses paiements, payée ou annulée : rien à proposer', () => {
    expect(choixDeStatut(facture(), [{ facture_id: 'f1', amount: 1100 }], tous)).toEqual([]);
    expect(choixDeStatut(facture({ statut: 'payee' }), [], tous)).toEqual([]);
    expect(choixDeStatut(facture({ statut: 'annulee' }), [], tous)).toEqual([]);
  });
  it('un avoir garde ses propres gestes', () => {
    expect(choixDeStatut(facture({ facture_type: 'avoir', statut: 'brouillon' }), [], tous)).toEqual([]);
  });
});
