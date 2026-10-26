import { describe, it, expect } from 'vitest';
import { evenementsDesTaches, evenementsDesDocuments } from '../evenementsPlanning';

const MAINTENANT = new Date(2026, 9, 26, 10, 0); // 26 oct. 2026

describe('tâches datées du planning : le filtre « Moi » doit les retrouver', () => {
  const memos = [
    { id: 'm1', text: 'Appeler le client', due_date: '2026-10-27', assigned_to: null },
    { id: 'm2', text: 'Commander le câble', due_date: '2026-10-28', assigned_to: 'emp-1' },
    { id: 'm3', text: 'Déjà faite', due_date: '2026-10-27', is_done: true },
    { id: 'm4', text: 'Sans date' },
  ];

  it('ne garde que les tâches datées et non faites', () => {
    expect(evenementsDesTaches(memos).map((e) => e.id)).toEqual(['memo_m1', 'memo_m2']);
  });

  it('porte la personne assignée dans employeId, vide quand personne n’est assigné', () => {
    const [sans, avec] = evenementsDesTaches(memos);
    expect(sans.employeId).toBe('');
    expect(avec.employeId).toBe('emp-1');
  });

  it('le filtre « Moi » (événements sans personne) écarte la tâche d’un collègue et garde la sienne', () => {
    const moi = evenementsDesTaches(memos).filter((e) => !e.employeId);
    expect(moi.map((e) => e.id)).toEqual(['memo_m1']);
  });
});

describe('échéances de documents du planning', () => {
  const facture = (extra = {}) => ({
    id: 'f1', type: 'facture', numero: 'F-2026-0012', client_id: 'c1', statut: 'envoye', total_ttc: 1200, date: '2026-10-01', date_echeance: '2026-10-20', ...extra,
  });
  const devis = (extra = {}) => ({ id: 'd1', type: 'devis', numero: 'D-2026-0007', client_id: 'c1', statut: 'envoye', total_ttc: 800, date_validite: '2026-11-05', ...extra });

  it('le titre porte le type et le numéro, le client est à part', () => {
    const [ev] = evenementsDesDocuments([facture()], { maintenant: MAINTENANT });
    expect(ev).toMatchObject({ title: 'Facture F-2026-0012', clientId: 'c1', isDeadline: true, date: '2026-10-20' });
  });

  it('une facture en retard est rouge (règle de ventes.js), une facture à venir ne l’est pas', () => {
    expect(evenementsDesDocuments([facture()], { maintenant: MAINTENANT })[0].ton).toBe('danger');
    expect(evenementsDesDocuments([facture({ date_echeance: '2026-10-30' })], { maintenant: MAINTENANT })[0].ton).toBe('neutre');
    // le jour même n’est pas un retard
    expect(evenementsDesDocuments([facture({ date_echeance: '2026-10-26' })], { maintenant: MAINTENANT })[0].ton).toBe('neutre');
  });

  it('le montant affiché est le reste dû, pas le total', () => {
    const paiements = [{ id: 'p1', facture_id: 'f1', montant: 500 }];
    const [ev] = evenementsDesDocuments([facture()], { paiements, maintenant: MAINTENANT });
    expect(ev.description).toContain('700');
    expect(ev.description).not.toContain('1 200');
  });

  it('une facture payée n’a plus d’échéance', () => {
    const paiements = [{ id: 'p1', facture_id: 'f1', montant: 1200 }];
    expect(evenementsDesDocuments([facture()], { paiements, maintenant: MAINTENANT })).toHaveLength(0);
    expect(evenementsDesDocuments([facture({ statut: 'payee' })], { maintenant: MAINTENANT })).toHaveLength(0);
    expect(evenementsDesDocuments([facture({ statut: 'brouillon' })], { maintenant: MAINTENANT })).toHaveLength(0);
  });

  it('sans le droit de voir les prix, aucun montant n’est écrit', () => {
    const evenements = evenementsDesDocuments([facture(), devis()], { maintenant: MAINTENANT, voitMontants: false });
    expect(evenements).toHaveLength(2);
    for (const ev of evenements) expect(ev.description).not.toMatch(/\d/);
  });

  it('un devis envoyé a son échéance de validité ; un devis signé ou refusé non', () => {
    expect(evenementsDesDocuments([devis()], { maintenant: MAINTENANT })[0]).toMatchObject({ title: 'Devis D-2026-0007', date: '2026-11-05' });
    expect(evenementsDesDocuments([devis({ statut: 'accepte' })], { maintenant: MAINTENANT })).toHaveLength(0);
    expect(evenementsDesDocuments([devis({ statut: 'refuse' })], { maintenant: MAINTENANT })).toHaveLength(0);
  });

  it('une liste vide (aucun accès aux devis) ne donne rien', () => {
    expect(evenementsDesDocuments([], { maintenant: MAINTENANT })).toEqual([]);
    expect(evenementsDesDocuments(undefined)).toEqual([]);
  });
});
