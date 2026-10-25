import { describe, it, expect } from 'vitest';
import { estEmise, estOuverte, estEnRetard, encaisse, resteAFacturer, creances, chiffreAffairesHT, tvaFacturee, facturesEmises, aTraiter, estUrgent, devisARelancer, joursDepuisEnvoi, premierDevisARelancer } from '../ventes';

// Scénario de la recette du 9 oct. 2026 (Finances, S1) : un devis signé à 12 000 € TTC avec sa facture
// d'acompte de 3 600 €, une facture payée, un brouillon, une facture annulée par un avoir total.
const ligne = (prixUnitaire, tva = 20) => ({ description: 'Travaux', quantite: 1, prixUnitaire, tva });
const FUTUR = '2099-12-31';
const D1 = { id: 'D1', type: 'devis', statut: 'acompte_facture', date: '2026-09-01', total_ht: 10000, tva: 2000, total_ttc: 12000, lignes: [ligne(10000)] };
const A1 = { id: 'A1', type: 'facture', facture_type: 'acompte', devis_source_id: 'D1', statut: 'envoye', date: '2026-09-02', date_echeance: FUTUR, total_ht: 3000, tva: 600, total_ttc: 3600, lignes: [ligne(3000)] };
const D2 = { id: 'D2', type: 'devis', statut: 'facture', date: '2026-08-01', total_ht: 2000, tva: 400, total_ttc: 2400, lignes: [ligne(2000)] };
const F2 = { id: 'F2', type: 'facture', facture_type: 'totale', devis_source_id: 'D2', statut: 'envoye', date: '2026-08-05', date_echeance: '2026-09-05', total_ht: 2000, tva: 400, total_ttc: 2400, lignes: [ligne(2000)] };
const F3 = { id: 'F3', type: 'facture', statut: 'brouillon', date: '2026-09-10', total_ht: 1500, tva: 300, total_ttc: 1800, lignes: [ligne(1500)] };
const D3 = { id: 'D3', type: 'devis', statut: 'envoye', date: '2026-09-15', total_ht: 4166.67, tva: 833.33, total_ttc: 5000, lignes: [ligne(4166.67)] };
// Facture annulée par un avoir total (montant_credite : calculé par DataContext depuis les avoirs émis)
const F4 = { id: 'F4', type: 'facture', facture_type: 'totale', statut: 'envoye', date: '2026-09-20', date_echeance: '2026-09-25', total_ht: 1000, tva: 100, total_ttc: 1100, montant_credite: 1100, lignes: [ligne(1000, 10)] };
const AV4 = { id: 'AV4', type: 'facture', facture_type: 'avoir', avoir_source_id: 'F4', statut: 'envoye', date: '2026-09-21', total_ht: -1000, tva: -100, total_ttc: -1100, lignes: [ligne(-1000, 10)] };

const DOCS = [D1, A1, D2, F2, F3, D3, F4, AV4];
const PAIEMENTS = [{ id: 'p1', devis_id: 'F2', montant: 2400, date: '2026-09-01' }];
const MAINTENANT = new Date('2026-10-10T12:00:00');

describe('ventes : une définition pour toute l’app', () => {
  it('facture émise : ni brouillon ni devis ; un avoir l’est', () => {
    expect(DOCS.filter((d) => estEmise(d)).map((d) => d.id)).toEqual(['A1', 'F2', 'F4', 'AV4']);
  });

  it('facture ouverte : reste dû réel (payée, annulée par avoir, avoir, brouillon : non)', () => {
    expect(DOCS.filter((d) => estOuverte(d, PAIEMENTS, MAINTENANT)).map((d) => d.id)).toEqual(['A1']);
    expect(estEnRetard(A1, PAIEMENTS, MAINTENANT)).toBe(false); // échéance à venir
    expect(estEnRetard({ ...A1, date_echeance: '2026-10-01' }, PAIEMENTS, MAINTENANT)).toBe(true);
  });

  it('encaissé : paiements reçus, acompte partiel compris, plafonné au total', () => {
    expect(encaisse(F2, PAIEMENTS, MAINTENANT)).toBe(2400);
    expect(encaisse(A1, [{ devis_id: 'A1', montant: 1000 }], MAINTENANT)).toBe(1000); // avant : 0 (statut pas « payée »)
    expect(encaisse({ ...F3 }, [], MAINTENANT)).toBe(0); // brouillon
    expect(encaisse({ ...A1, statut: 'payee' }, [], MAINTENANT)).toBe(3600); // « payée » à la main
  });

  it('créances : reste dû des factures + part non facturée des devis signés (S1 : 12 000 €, pas 18 000 €)', () => {
    expect(resteAFacturer(D1, DOCS)).toBe(8400);
    expect(resteAFacturer(D2, DOCS)).toBe(0); // « facturé »
    expect(resteAFacturer(D3, DOCS)).toBe(0); // pas signé
    expect(creances(DOCS, PAIEMENTS, MAINTENANT)).toEqual({ factures: 3600, devis: 8400, total: 12000 });
  });

  it('chiffre d’affaires HT : factures émises, avoirs déduits, sans les devis (avant : devis + factures)', () => {
    expect(chiffreAffairesHT(DOCS)).toBe(5000); // 3 000 + 2 000 + 1 000 − 1 000
    expect(chiffreAffairesHT(DOCS, { du: '2026-09-01', au: '2026-09-30' })).toBe(3000);
    expect(facturesEmises(DOCS, { du: '2026-08-01', au: '2026-08-31' }).map((d) => d.id)).toEqual(['F2']);
  });

  it('TVA facturée : par taux, avoirs déduits, aucune pour une micro-entreprise', () => {
    const t = tvaFacturee(DOCS);
    expect(t.parTaux).toEqual([{ taux: 20, base: 5000, montant: 1000 }]); // la ligne à 10 % s'annule avec son avoir
    expect(t.total).toBe(1000);
    expect(tvaFacturee(DOCS, {}, { isMicro: true })).toEqual({ total: 0, parTaux: [] });
  });

  it('à traiter (puce de la liste, pastille, Accueil, cloche) : brouillon ancien, facture en retard, devis à relancer', () => {
    // MAINTENANT = 10 oct. : D3 envoyé le 15 sept. (25 j), F3 brouillon du 10 sept., A1 non échue, F2 payée
    expect(DOCS.filter((d) => aTraiter(d, PAIEMENTS, MAINTENANT)).map((d) => d.id)).toEqual(['F3', 'D3']);
    expect(aTraiter({ ...D3, date: '2026-10-05' }, PAIEMENTS, MAINTENANT)).toBe(false); // envoyé il y a 5 jours
    expect(aTraiter({ ...F3, date: '2026-10-09' }, PAIEMENTS, MAINTENANT)).toBe(false); // brouillon d'hier
    expect(aTraiter({ ...A1, date_echeance: '2026-10-01' }, PAIEMENTS, MAINTENANT)).toBe(true); // facture en retard
    expect(aTraiter(F2, PAIEMENTS, MAINTENANT)).toBe(false); // payée, même échue
  });

  it('devis à relancer : compté depuis l’envoi, jamais expiré', () => {
    // Créé le 10, envoyé le 24 : le 28, 4 jours depuis l'envoi (et non 18 depuis la création)
    const envoyeLe24 = { ...D3, date: '2026-10-10', date_envoi: '2026-10-24', validite: 60 };
    expect(joursDepuisEnvoi(envoyeLe24, new Date('2026-10-28T12:00:00'))).toBe(4);
    expect(devisARelancer(envoyeLe24, new Date('2026-10-28T12:00:00'))).toBe(false);
    expect(devisARelancer(envoyeLe24, new Date('2026-10-31T12:00:00'))).toBe(true); // 7 jours
    // Sans date d'envoi (ancien devis) : depuis sa date
    expect(devisARelancer({ ...envoyeLe24, date_envoi: undefined }, new Date('2026-10-28T12:00:00'))).toBe(true);
    // Expiré (envoyé le 1er août, valable 30 jours) : ni à relancer, ni à traiter
    const expire = { ...D3, date: '2026-08-01', date_envoi: '2026-08-01', validite: 30 };
    expect(devisARelancer(expire, MAINTENANT)).toBe(false);
    expect(aTraiter(expire, PAIEMENTS, MAINTENANT)).toBe(false);
    // Une facture ou un devis signé ne se relancent pas ainsi
    expect(devisARelancer(A1, MAINTENANT)).toBe(false);
    expect(devisARelancer({ ...D3, statut: 'signe' }, MAINTENANT)).toBe(false);
  });

  it('urgent (pastille rouge) : seulement une facture en retard ; un devis à relancer ou un brouillon reste ambre', () => {
    expect(DOCS.filter((d) => estUrgent(d, PAIEMENTS, MAINTENANT)).map((d) => d.id)).toEqual([]);
    expect(estUrgent({ ...A1, date_echeance: '2026-10-01' }, PAIEMENTS, MAINTENANT)).toBe(true);
    expect(estUrgent(D3, PAIEMENTS, MAINTENANT)).toBe(false); // à relancer, mais pas rouge
    expect(estUrgent(F3, PAIEMENTS, MAINTENANT)).toBe(false);
  });

  it('fiche client : le devis à relancer en premier suit la même règle (depuis l’envoi, jamais expiré)', () => {
    const maintenant = new Date('2026-10-28T12:00:00');
    const recent = { ...D3, id: 'R1', date: '2026-10-10', date_envoi: '2026-10-24', validite: 60 }; // 4 jours : pas encore
    const ancien = { ...D3, id: 'R2', date: '2026-10-01', date_envoi: '2026-10-12', validite: 60 }; // 16 jours
    const expire = { ...D3, id: 'R3', date: '2026-08-01', date_envoi: '2026-08-01', validite: 30 }; // expiré : jamais
    expect(premierDevisARelancer([recent, ancien, expire], maintenant)).toEqual({ devis: ancien, jours: 16 });
    expect(premierDevisARelancer([recent, expire], maintenant)).toBeNull();
    // Un devis créé le 10 et envoyé le 24 : pas « sans réponse depuis 18 jours » le 28
    expect(premierDevisARelancer([recent], maintenant)).toBeNull();
  });
});
