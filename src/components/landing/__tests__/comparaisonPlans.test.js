import { describe, it, expect } from 'vitest';
import { PLANS, PLAN_ORDER } from '../../../stores/subscriptionStore.js';
import { LIMITES_AFFICHEES, ditUneLimite, libelleAffiche, lignesDeComparaison, valeurDeLimite } from '../comparaisonPlans.js';

describe('tableau de comparaison des plans : lignes construites depuis PLANS', () => {
  const tableau = lignesDeComparaison(PLANS, PLAN_ORDER);

  it('une colonne par plan de PLAN_ORDER, avec le nom de PLANS', () => {
    expect(tableau.plans).toEqual(PLAN_ORDER.map((id) => ({ id, nom: PLANS[id].name })));
  });

  it('les limites sont celles de `limits` : la limite de devis est par mois, l\'équipe ne compte pas le titulaire', () => {
    const valeurs = Object.fromEntries(tableau.limites.map((l) => [l.cle, l.valeurs]));
    expect(valeurs).toEqual({
      devis: ['5 par mois', 'Illimité', 'Illimité'],
      clients: ['10', 'Illimité', 'Illimité'],
      chantiers: ['2', 'Illimité', 'Illimité'],
      photos: ['50', 'Illimité', 'Illimité'],
      equipe: ['Vous + 1', 'Vous + 1', 'Vous + 10'],
    });
    expect(tableau.limites.map((l) => l.libelle)).toEqual(['Devis', 'Clients', 'Chantiers', 'Photos de chantier', 'Collaborateurs']);
  });

  it('chaque valeur de limite suit PLANS : changer `limits` change le tableau', () => {
    const modifies = {
      ...PLANS,
      gratuit: { ...PLANS.gratuit, limits: { ...PLANS.gratuit.limits, devis: 8, clients: -1 } },
    };
    const lignes = lignesDeComparaison(modifies, PLAN_ORDER).limites;
    expect(lignes.find((l) => l.cle === 'devis').valeurs[0]).toBe('8 par mois');
    expect(lignes.find((l) => l.cle === 'clients').valeurs[0]).toBe('Illimité');
  });

  it('une clé absente de `limits` vaut « Illimité », comme dans autoriserCreation, jamais « 0 »', () => {
    const plans = { a: { id: 'a', name: 'A', limits: { devis: 5 }, featureLabels: [] }, b: { id: 'b', name: 'B', featureLabels: [] } };
    const valeurs = Object.fromEntries(lignesDeComparaison(plans, ['a', 'b']).limites.map((l) => [l.cle, l.valeurs]));
    expect(valeurs.devis).toEqual(['5 par mois', 'Illimité']);
    expect(valeurs.clients).toEqual(['Illimité', 'Illimité']);
  });

  it('les fonctions sont les libellés de featureLabels qui ne disent pas une limite, incluses à partir du plan qui les annonce', () => {
    expect(tableau.fonctions).toEqual([
      { libelle: 'Factures sans limite', inclus: [true, true, true] },
      { libelle: 'Signature en ligne des devis', inclus: [true, true, true] },
      { libelle: 'Relances automatiques', inclus: [true, true, true] },
      { libelle: 'Catalogue complet et bibliothèque : plus de 1 000 prestations chiffrées', inclus: [true, true, true] },
    ]);
  });

  it('aucune fonction n\'est réservée à un plan : la ligne d\'équipe est une limite (Vous + 1, Vous + 1, Vous + 10)', () => {
    // Ni les rôles ni le pointage ne sont verrouillés par un plan (D-29) : aucune ligne ne les réserve à Équipe
    expect(tableau.fonctions.every((f) => f.inclus.every(Boolean))).toBe(true);
    expect(tableau.fonctions.map((f) => f.libelle).join(' ')).not.toMatch(/pointage|rôles/i);
    expect(tableau.limites.find((l) => l.cle === 'equipe').valeurs).toEqual(['Vous + 1', 'Vous + 1', 'Vous + 10']);
  });

  it('aucun libellé de PLANS n\'est perdu : il est une fonction, une limite ou « Tout le plan … »', () => {
    const fonctions = new Set(tableau.fonctions.map((f) => f.libelle));
    const orphelins = PLAN_ORDER.flatMap((id) => PLANS[id].featureLabels.map((f) => f.name))
      .filter((nom) => !fonctions.has(nom) && !ditUneLimite(nom) && !/^Tout le plan\b/i.test(nom));
    expect(orphelins).toEqual([]);
  });

  it('chaque libellé qui dit une limite correspond à une ligne de limites', () => {
    const dites = PLAN_ORDER.flatMap((id) => PLANS[id].featureLabels.map((f) => f.name)).filter(ditUneLimite);
    expect(dites.length).toBeGreaterThan(0);
    // Les cinq ressources du tableau sont exactement celles que les libellés de limite nomment
    const nommees = LIMITES_AFFICHEES.filter((l) => dites.some((nom) => l.mot.test(nom))).map((l) => l.cle);
    expect(nommees).toEqual(LIMITES_AFFICHEES.map((l) => l.cle));
  });

  it('un plan sans « Tout le plan … » n\'hérite de rien ; un libellé « non inclus » est ignoré', () => {
    const plans = {
      a: { id: 'a', name: 'A', limits: {}, featureLabels: [{ name: 'Signature', included: true }, { name: 'Export', included: false }] },
      b: { id: 'b', name: 'B', limits: {}, featureLabels: [{ name: 'Pointage', included: true }] },
    };
    expect(lignesDeComparaison(plans, ['a', 'b']).fonctions).toEqual([
      { libelle: 'Signature', inclus: [true, false] },
      { libelle: 'Pointage', inclus: [false, true] },
    ]);
  });

  it('ditUneLimite sépare « 5 devis par mois » de « Signature en ligne des devis »', () => {
    expect(ditUneLimite('5 devis par mois')).toBe(true);
    expect(ditUneLimite('Vous + 10 collaborateurs')).toBe(true);
    expect(ditUneLimite('Vous + 10 collaborateurs, chacun avec son rôle')).toBe(true);
    expect(ditUneLimite('Devis, clients, chantiers et photos illimités')).toBe(true);
    expect(ditUneLimite('Signature en ligne des devis')).toBe(false);
    expect(ditUneLimite('Catalogue complet et bibliothèque : plus de 1 000 prestations chiffrées')).toBe(false);
    expect(ditUneLimite('Factures sans limite')).toBe(false);
  });

  it('libelleAffiche : un nombre à espace (« 1 000 ») ne se coupe pas, le reste est intact', () => {
    expect(libelleAffiche('Catalogue complet et bibliothèque : plus de 1 000 prestations chiffrées')).toBe('Catalogue complet et bibliothèque : plus de 1\u00a0000 prestations chiffrées');
    expect(libelleAffiche('Vous + 10 collaborateurs, chacun avec son rôle')).toBe('Vous + 10 collaborateurs, chacun avec son rôle');
    expect(libelleAffiche('5 devis par mois')).toBe('5 devis par mois');
    // Après normalisation des espaces, le texte est celui de PLANS
    expect(libelleAffiche('plus de 1 000 prestations').replace(/\s/g, ' ')).toBe('plus de 1 000 prestations');
  });

  it('valeurDeLimite : -1 est « Illimité »', () => {
    expect(valeurDeLimite('devis', -1)).toBe('Illimité');
    expect(valeurDeLimite('equipe', -1)).toBe('Illimité');
    expect(valeurDeLimite('equipe', 3)).toBe('Vous + 3');
    expect(valeurDeLimite('chantiers', 2)).toBe('2');
  });
});
