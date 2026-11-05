import { describe, it, expect, vi, afterEach } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';

/**
 * Écrans de l'électricien (lot 4) et prix sans `canViewPrices`, décisions d'Hugo du 5 nov. 2026 (D-39) :
 *  - la case « la ligne ne comprend que la pose » reste la condition du bouton 5,5 % d'une borne (décision 2) ;
 *  - « Prix (€) » en franchise en base, « Prix (€ HT) » sinon (D-31) ;
 *  - sans le droit de voir les prix : ni champ de prix ni prix repris (relecture du 4 nov., point 3), pour le compte rendu
 *    comme pour l'attestation de ramonage.
 * Sans navigateur de test, l'état de départ est imposé : `etatsInitiaux` remplace la valeur initiale des premiers
 * useState du rendu suivant, et `etatsVus` garde ce que chaque useState a reçu (le formulaire d'une saisie).
 */
vi.stubGlobal('document', { body: {} });
vi.stubGlobal('window', { location: { search: '' } });

let etatsInitiaux = [];
let etatsVus = [];
vi.mock('react', async (original) => {
  const React = await original();
  const useState = (init) => {
    const valeur = etatsInitiaux.length ? etatsInitiaux.shift() : init;
    etatsVus.push(typeof valeur === 'function' ? valeur() : valeur);
    return React.useState(valeur);
  };
  // useLayoutEffect ne fait rien côté serveur et le dit sur la sortie d'erreur : useEffect (non exécuté non plus) le tait
  const useLayoutEffect = React.useEffect;
  return { ...React, default: { ...React, useState, useLayoutEffect }, useState, useLayoutEffect };
});
// Le portail ne se rend pas côté serveur : rendu sur place
vi.mock('react-dom', async (original) => ({ ...(await original()), createPortal: (el) => el }));
vi.mock('react-signature-canvas', () => ({ default: () => null }));
vi.mock('../../context/AppContext', () => ({
  useToast: () => ({ showToast: () => {} }),
  useConfirm: () => ({ confirm: async () => true }),
}));

const { default: TvaBorne } = await import('../devis/TvaBorne');
const { default: SaisieCompteRendu } = await import('../electricite/SaisieCompteRendu');
const { default: SaisieRamonage } = await import('../ramonage/SaisieRamonage');
const { default: RamonageTab } = await import('../settings/RamonageTab');
const { default: ElectriciteTab } = await import('../settings/ElectriciteTab');

afterEach(() => { etatsInitiaux = []; etatsVus = []; });

const texte = (html) => html.replace(/<style[\s\S]*?<\/style>/g, ' ').replace(/<[^>]*>/g, ' ')
  .replace(/&#x27;/g, "'").replace(/&amp;/g, '&').replace(/&nbsp;/g, ' ').replace(/&quot;/g, '"').replace(/[\s  ]+/g, ' ').trim();
const rendre = (element, etats = []) => { etatsInitiaux = [...etats]; etatsVus = []; return texte(renderToStaticMarkup(element)); };

describe('borne de recharge : la case « la ligne ne comprend que la pose » reste exigée pour proposer 5,5 % (décision 2)', () => {
  const REPONSES = { local: 'habitation', residents: true, pointDeCharge: 'type2', installateurQualifie: true };
  // 1er useState de TvaBorne : le volet ouvert
  const volet = (borne, ligne = {}) => rendre(<TvaBorne ligne={{ description: 'Pose d’une borne de recharge 7 kW', tva: 10, borne, ...ligne }} onUpdate={() => {}} />, [true]);

  it('toutes les autres réponses sont bonnes mais la case n’est pas cochée : 5,5 % suggéré, aucun bouton pour l’appliquer', () => {
    for (const borne of [REPONSES, { ...REPONSES, poseSeule: false }]) {
      const t = volet(borne);
      expect(t).toMatch(/Taux suggéré pour la pose : 5,5 %/);
      expect(t).toMatch(/Pour appliquer 5,5 %, la ligne ne doit comprendre que la pose/);
      expect(t).not.toMatch(/Appliquer 5,5 % à cette ligne/);
    }
  });

  it('contre-essai : la case cochée, le bouton « Appliquer 5,5 % à cette ligne (pose) » est proposé', () => {
    const t = volet({ ...REPONSES, poseSeule: true });
    expect(t).toMatch(/Appliquer 5,5 % à cette ligne \(pose\)/);
    expect(t).not.toMatch(/Pour appliquer 5,5 %, la ligne ne doit comprendre/);
  });

  it('la case ne remplace pas les autres réponses : hors habitation (ou sans qualification), même cochée, aucun bouton', () => {
    expect(volet({ ...REPONSES, local: 'autre', poseSeule: true })).not.toMatch(/Appliquer 5,5 %/);
    expect(volet({ ...REPONSES, installateurQualifie: false, poseSeule: true })).not.toMatch(/Appliquer 5,5 %/);
    expect(volet({ poseSeule: true })).not.toMatch(/Appliquer 5,5 %/);
  });
});

describe('saisie du compte rendu', () => {
  const MICRO = { nom: 'Élec Seguin', formeJuridique: 'Micro-entreprise', siret: '12345678900011' };
  const SARL = { ...MICRO, formeJuridique: 'SARL' };
  const chantier = { id: 'ch1', nom: 'Tableau', adresse: '3 chemin de l’Exemple', codePostal: '33000', ville: 'Imaginaire' };
  const client = { id: 'c1', prenom: 'Lucie', nom: 'Exemple' };
  const saisie = (entreprise, voitPrix = true, remplace = null) => rendre(
    <SaisieCompteRendu chantier={chantier} client={client} entreprise={entreprise} voitPrix={voitPrix} remplace={remplace} onEnregistrer={() => {}} onFermer={() => {}} />,
  );

  it('en franchise en base de TVA (art. 293 B du CGI) : « Prix (€) », sans « HT » ; sinon « Prix (€ HT) »', () => {
    expect(saisie(MICRO)).toMatch(/Prix \(€\)/);
    expect(saisie(MICRO)).not.toMatch(/(?<![A-Za-zÀ-ÿ])(HT|TTC)(?![A-Za-zÀ-ÿ])/);
    expect(saisie(SARL)).toMatch(/Prix \(€ HT\)/);
  });

  it('sans le droit de voir les prix : pas de champ de prix, et « Refaire » ne recopie pas l’ancien prix', () => {
    const ancien = { id: 'cr0', numero: 'CRI-2026-00001', nature: 'depannage', travaux: 'Disjoncteur', client_nom: 'Lucie Exemple', adresse_intervention: '3 chemin', intervenant_nom: 'Paul', realise_le: '2026-11-01T09:00:00Z', prix_ht: 380 };
    const t = saisie(SARL, false, ancien);
    expect(t).not.toMatch(/Prix \(€/);
    expect(etatsVus[0].prix_ht).toBeNull();
    // contre-essai : avec le droit, le champ est là et le prix repris
    const avec = saisie(SARL, true, ancien);
    expect(avec).toMatch(/Prix \(€ HT\)/);
    expect(etatsVus[0].prix_ht).toBe(380);
  });
});

describe('saisie de l’attestation de ramonage : prix et droit de les voir', () => {
  const entreprise = { nom: 'Ramonage Exemple', formeJuridique: 'SARL', siret: '12345678900011', ramonageTarifs: { chaudiere_bois: 70 } };
  const client = { id: 'cl1', nom: 'Rousseau', prenom: 'Claire' };
  const precedent = { appareil_ref: 'a1', appareil_type: 'chaudiere_bois', prix_ht: 85, adresse_intervention: '5 rue Imaginaire' };
  const saisie = (o) => rendre(<SaisieRamonage client={client} entreprise={entreprise} onEnregistrer={() => {}} onFermer={() => {}} {...o} />);

  it('sans le droit de voir les prix : ni champ, ni titre « et prix », ni prix du dernier passage ou des tarifs repris', () => {
    const t = saisie({ precedent, voitPrix: false });
    expect(t).not.toMatch(/Prix \(€ HT\)/);
    expect(t).toMatch(/Prochain ramonage/);
    expect(t).not.toMatch(/Prochain ramonage et prix/);
    expect(etatsVus[0].prix_ht).toBeNull();
    saisie({ precedent: null, voitPrix: false }); // nouvel appareil : le tarif de l'entreprise n'est pas repris non plus
    expect(etatsVus[0].prix_ht).toBeNull();
    saisie({ remplace: { ...precedent, id: 'r0', numero: 'RAM-2026-001', prix_ht: 95, realise_le: '2026-10-01T09:00:00Z' }, voitPrix: false });
    expect(etatsVus[0].prix_ht).toBeNull();
  });

  it('contre-essai : avec le droit (par défaut), le champ est là et le prix du dernier passage repris', () => {
    const t = saisie({ precedent });
    expect(t).toMatch(/Prix \(€ HT\)/);
    expect(t).toMatch(/Prochain ramonage et prix/);
    expect(etatsVus[0].prix_ht).toBe(85);
    saisie({ precedent: { ...precedent, prix_ht: undefined } });
    expect(etatsVus[0].prix_ht).toBe(70); // le tarif de l'entreprise pour ce type d'appareil
  });
});

describe('rappels de Paramètres : la même exception du dépannage urgent pour l’électricité et le ramonage (point 10 du juriste)', () => {
  // Clause du rappel de Paramètres › Électricité (relu par juriste-btp le 4 nov. 2026, sur pièces), recopiée dans Ramonage
  // le 5 nov. 2026 (D-39) : À RELIRE PAR LE JURISTE
  const CLAUSE = 'sauf dépannage urgent qu’il a expressément demandé, dans la limite des pièces et travaux strictement nécessaires (code de la consommation, article L. 221-10)';
  const ent = { nom: 'Élec Seguin', formeJuridique: 'SARL', ramonageActif: true };

  it('les deux écrans portent la clause, mot pour mot, et renvoient au devis', () => {
    const ramonage = rendre(<RamonageTab entreprise={ent} setEntreprise={() => {}} />);
    const electricite = rendre(<ElectriciteTab entreprise={ent} setEntreprise={() => {}} />);
    expect(ramonage).toContain(CLAUSE);
    expect(electricite).toContain(CLAUSE);
    expect(ramonage).toContain('aucun paiement ne peut être reçu avant sept jours, sauf dépannage urgent');
    expect(ramonage).toMatch(/Le parcours ramonage ne fait pas ce devis : faites-le depuis « Devis »\./);
    expect(electricite).toMatch(/Le compte rendu ne fait pas ce devis : faites-le depuis « Devis »\./);
  });

  it('le texte de Paramètres › Électricité dit aussi que le compte rendu part par e-mail', () => {
    expect(rendre(<ElectriciteTab entreprise={ent} setEntreprise={() => {}} />)).toMatch(/à envoyer au client par e-mail/);
  });
});
