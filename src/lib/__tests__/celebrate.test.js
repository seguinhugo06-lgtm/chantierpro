import { describe, it, expect } from 'vitest';
import { jalonACelebrer } from '../celebrate';
import { ECRITURE_EN_ATTENTE } from '../erreursEcriture';

const devis = { type: 'devis', statut: 'envoye' };
const facture = { type: 'facture', statut: 'envoye' };

describe('jalonACelebrer : on ne fête que ce que la base a accepté', () => {
  it('devis signé ou facture payée, écriture acceptée : célébré', () => {
    expect(jalonACelebrer(true, devis, { statut: 'signe' })).toBe('devis_signe');
    expect(jalonACelebrer(true, devis, { statut: 'accepte' })).toBe('devis_signe');
    expect(jalonACelebrer(true, facture, { statut: 'payee' })).toBe('facture_payee');
  });

  it('écriture mise en file hors ligne (ECRITURE_EN_ATTENTE, valeur vraie) : rien', () => {
    expect(ECRITURE_EN_ATTENTE).toBeTruthy();
    expect(jalonACelebrer(ECRITURE_EN_ATTENTE, devis, { statut: 'signe' })).toBeNull();
    expect(jalonACelebrer(ECRITURE_EN_ATTENTE, facture, { statut: 'payee' })).toBeNull();
  });

  it('écriture refusée, statut inchangé ou déjà atteint : rien', () => {
    expect(jalonACelebrer(false, devis, { statut: 'signe' })).toBeNull();
    expect(jalonACelebrer(true, devis, { statut: 'envoye' })).toBeNull();
    expect(jalonACelebrer(true, { ...devis, statut: 'accepte' }, { statut: 'signe' })).toBeNull();
    expect(jalonACelebrer(true, { ...facture, statut: 'payee' }, { statut: 'payee' })).toBeNull();
    expect(jalonACelebrer(true, facture, { statut: 'signe' })).toBeNull();
    expect(jalonACelebrer(true, devis, { statut: 'payee' })).toBeNull();
    expect(jalonACelebrer(true, undefined, { statut: 'signe' })).toBeNull();
  });
});
