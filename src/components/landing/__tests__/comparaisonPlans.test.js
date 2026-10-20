import { describe, it, expect } from 'vitest';
import { PLANS, PLAN_ORDER } from '../../../stores/subscriptionStore.js';
import { LIMITES_AFFICHEES, contenuDeCarte, ditUneLimite, fonctionsCommunes, libelleAffiche, lignesDeComparaison, valeurDeLimite } from '../comparaisonPlans.js';

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

  it('libelleAffiche : typographie fine du site — un nombre à espace (1 000) ne se coupe pas, « : » non plus', () => {
    expect(libelleAffiche('Catalogue complet et bibliothèque : plus de 1 000 prestations chiffrées')).toBe('Catalogue complet et bibliothèque\u202f: plus de 1\u202f000 prestations chiffrées');
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

describe('cartes de tarifs : le même bloc de limites, puis les fonctions (relecture DA-1)', () => {
  const tableau = lignesDeComparaison(PLANS, PLAN_ORDER);

  it('chaque carte a les cinq limites, dans l\'ordre du tableau, avec la valeur de son plan', () => {
    PLAN_ORDER.forEach((id, rang) => {
      const carte = contenuDeCarte(PLANS, PLAN_ORDER, id);
      expect(carte.limites.map((l) => l.libelle), id).toEqual(tableau.limites.map((l) => l.libelle));
      expect(carte.limites.map((l) => l.valeur), id).toEqual(tableau.limites.map((l) => l.valeurs[rang]));
    });
    expect(contenuDeCarte(PLANS, PLAN_ORDER, 'artisan').limites.find((l) => l.cle === 'devis').valeur).toBe('Illimité');
  });

  it('la carte ne montre que les libellés qui ne disent pas une limite : pas de doublon « 5 devis par mois »', () => {
    expect(contenuDeCarte(PLANS, PLAN_ORDER, 'gratuit').fonctions).toEqual([
      'Factures sans limite', 'Signature en ligne des devis', 'Relances automatiques',
      'Catalogue complet et bibliothèque : plus de 1 000 prestations chiffrées',
    ]);
    expect(contenuDeCarte(PLANS, PLAN_ORDER, 'artisan').fonctions).toEqual(['Tout le plan Gratuit, sans limite']);
    expect(contenuDeCarte(PLANS, PLAN_ORDER, 'equipe').fonctions).toEqual(['Tout le plan Artisan']);
  });

  it('aucun libellé de PLANS n\'est perdu : une fonction de sa carte, ou une limite dite par une ligne du bloc à la valeur de `limits`', () => {
    for (const id of PLAN_ORDER) {
      const carte = contenuDeCarte(PLANS, PLAN_ORDER, id);
      for (const { name } of PLANS[id].featureLabels.filter((f) => f.included)) {
        if (!ditUneLimite(name)) {
          expect(carte.fonctions, `${id} : ${name}`).toContain(name);
          continue;
        }
        // Les lignes du bloc dont la ressource est nommée par le libellé ; l'une d'elles dit son chiffre, ou toutes « Illimité »
        const lignes = LIMITES_AFFICHEES.filter((l) => l.mot.test(name)).map((l) => carte.limites.find((x) => x.cle === l.cle));
        expect(lignes.length, `${id} : ${name}`).toBeGreaterThan(0);
        if (/illimit/i.test(name)) {
          expect(lignes.every((l) => l.valeur === 'Illimité'), `${id} : ${name}`).toBe(true);
        } else {
          const chiffres = name.match(/\d+/g) || [];
          expect(lignes.some((l) => chiffres.every((c) => (l.valeur.match(/\d+/g) || []).includes(c))), `${id} : ${name}`).toBe(true);
        }
      }
    }
  });

  it('fonctionsCommunes : les fonctions présentes dans tous les plans (le tableau les dit en une phrase)', () => {
    expect(fonctionsCommunes(tableau)).toEqual(tableau.fonctions.map((f) => f.libelle));
    const plans = {
      a: { id: 'a', name: 'A', limits: {}, featureLabels: [{ name: 'Signature', included: true }] },
      b: { id: 'b', name: 'B', limits: {}, featureLabels: [{ name: 'Pointage', included: true }, { name: 'Signature', included: true }] },
    };
    expect(fonctionsCommunes(lignesDeComparaison(plans, ['a', 'b']))).toEqual(['Signature']);
  });
});
