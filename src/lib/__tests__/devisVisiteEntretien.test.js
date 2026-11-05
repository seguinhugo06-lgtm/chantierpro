import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { donneesDevis, donneesFacture } from '../../components/entretien/actionsEntretien';
import { ligneDevisVisite, avertissementSeptJours, AVERTISSEMENT_SEPT_JOURS, nouveauBrouillon } from '../entretien';
import { FIELD_MAPPINGS } from '../../hooks/useSupabaseSync';

/**
 * D-38 (Hugo, 5 nov. 2026), décision 2 : « Faire le devis de la visite » depuis l'attestation. Arrêté du 24 janv. 2017,
 * art. 4 (avis juriste-btp du 4 nov. 2026, § 6 et 7.7) : avant une visite d'entretien payée chez un particulier, un devis
 * détaillé est dû ; un prix forfaitaire par visite se fait dans un devis. Le devis est un brouillon prérempli (client,
 * adresse de l'installation, ligne « Entretien de … », TVA proposée), créé par la création de devis habituelle puis ouvert
 * dans l'éditeur ; il n'est jamais envoyé d'ici. Données fictives seulement.
 */
const client = { id: 'c1', nom: 'Exemple', prenom: 'Lucie', adresse: '3 chemin de l’Exemple, 24000 Imaginaire', telephone: '06 00 00 00 01', email: 'lucie@exemple.fr' };

/** Une attestation de chaudière gaz enregistrée, comme la base la rend. */
function attestation(o = {}) {
  const b = nouveauBrouillon({ client, categorieValeur: 'chaudiere', maintenant: new Date('2026-11-04T10:00:00') });
  return {
    ...b, id: 'e1', numero: 'ENT-2026-00001', adresse_installation: '12 rue de la Chaufferie, 24000 Imaginaire', local: 'Cuisine',
    appareils: [{ ...b.appareils[0], energie: 'gaz', marque: 'Exemplair', modele: 'Naneo', evacuation: 'ventouse', points: { 'boucle.pression': true } }],
    puissance_kw: '24', logement_plus_2_ans: true, prix_ht: 120, ...o,
  };
}
const entreprise = { nom: 'Chauffage Exemple', formeJuridique: 'SARL', entretienTarifs: { chaudiere: 150, pac: 180 } };
const jour = { aujourdhui: '2027-10-20' };

describe('devis de la visite d’entretien (D-38, décision 2)', () => {
  it('le devis créé porte le client, l’adresse de l’installation et la ligne « Entretien de … » d’après l’appareil', () => {
    const d = donneesDevis({ entretien: attestation(), entreprise, ...jour });
    expect(d.type).toBe('devis');
    expect(d.client_id).toBe('c1');
    expect(d.lignes).toHaveLength(1);
    const l = d.lignes[0];
    expect(l.description).toContain('Entretien de chaudière');
    expect(l.description).toContain('Chaudière gaz Exemplair Naneo (Cuisine)');
    expect(l.description).toContain('installation : 12 rue de la Chaufferie, 24000 Imaginaire');
    expect(d.sections).toEqual([{ id: '1', titre: '', lignes: d.lignes }]);
  });
  it('contre-essai : un autre client, une autre adresse, un autre appareil donnent un autre devis', () => {
    const d = donneesDevis({ entretien: attestation({ client_id: 'c2', adresse_installation: '8 impasse du Four, 33000 Bordeaux' }), entreprise, ...jour });
    expect(d.client_id).toBe('c2');
    expect(d.lignes[0].description).toContain('installation : 8 impasse du Four, 33000 Bordeaux');
    expect(d.lignes[0].description).not.toContain('12 rue de la Chaufferie');
    const pac = nouveauBrouillon({ client, categorieValeur: 'pac', maintenant: new Date('2026-11-04T10:00:00') });
    const dPac = donneesDevis({ entretien: { ...pac, client_id: 'c1', logement_plus_2_ans: true, appareils: [{ ...pac.appareils[0], type: 'air_eau', marque: 'Aéro', modele: 'Z' }] }, entreprise, ...jour });
    expect(dPac.lignes[0].description).toContain('Entretien de pompe à chaleur ou climatisation');
    expect(dPac.lignes[0].description).not.toContain('chaudière');
  });
  it('au tarif réglé dans Paramètres → Entretien s’il existe, sinon sans prix (jamais le prix d’une autre catégorie)', () => {
    const avec = donneesDevis({ entretien: attestation(), entreprise, ...jour });
    expect(avec.lignes[0].prixUnitaire).toBe(150);
    expect(avec.total_ht).toBe(150);
    expect(avec.total_ttc).toBe(165);
    const sans = donneesDevis({ entretien: attestation(), entreprise: { nom: 'Chauffage Exemple', formeJuridique: 'SARL' }, ...jour });
    expect(sans.lignes[0].prixUnitaire).toBe(0);
    expect(sans.total_ht).toBe(0);
    // Le prix du dernier entretien (120) n'est pas repris : la fiche dit « tarif de Paramètres, sinon sans prix »
    expect(sans.lignes[0].prixUnitaire).not.toBe(120);
    // Un tarif réglé pour un poêle ne vaut pas pour une chaudière
    expect(donneesDevis({ entretien: attestation(), entreprise: { entretienTarifs: { poele: 90 } }, ...jour }).lignes[0].prixUnitaire).toBe(0);
  });
  it('au taux de TVA proposé par les règles de l’entretien : 10 %, 5,5 % si l’artisan l’a déclaré, 20 % sans la case, aucun en franchise', () => {
    expect(donneesDevis({ entretien: attestation(), entreprise, ...jour }).tvaRate).toBe(10);
    expect(donneesDevis({ entretien: attestation(), entreprise, ...jour }).lignes[0].tva).toBe(10);
    expect(donneesDevis({ entretien: attestation({ eligible_55: true }), entreprise, ...jour }).tvaRate).toBe(5.5);
    const sansCase = donneesDevis({ entretien: attestation({ logement_plus_2_ans: false }), entreprise, ...jour });
    expect(sansCase.tvaRate).toBe(20);
    expect(sansCase.total_ttc).toBe(180);
    // En franchise (article 293 B du CGI) : aucune TVA, comme la facture tirée de l'attestation
    const franchise = donneesDevis({ entretien: attestation(), entreprise: { ...entreprise, formeJuridique: 'Micro-entreprise' }, ...jour });
    expect(franchise.tvaRate).toBe(0);
    expect(franchise.tva).toBe(0);
    expect(franchise.total_ttc).toBe(franchise.total_ht);
  });
  it('la mention « immeuble achevé depuis plus de deux ans » suit la case et le taux réduit, comme sur la facture', () => {
    expect(ligneDevisVisite(attestation(), { entreprise }).description).toContain('immeuble achevé depuis plus de deux ans');
    expect(ligneDevisVisite(attestation({ logement_plus_2_ans: false }), { entreprise }).description).not.toContain('immeuble achevé');
  });
  it('un brouillon, daté du jour, valable 30 jours, jamais envoyé ni signé', () => {
    const d = donneesDevis({ entretien: attestation(), entreprise, ...jour });
    expect(d.statut).toBe('brouillon');
    expect(d.date).toBe('2027-10-20');
    expect(d.validite).toBe(30);
    expect(d.numero).toBeUndefined(); // posé par addDevis (DataContext), le chemin habituel
    expect(d.signature_token).toBeUndefined();
    expect(donneesDevis({ entretien: attestation(), entreprise: { ...entreprise, validiteDevis: 45 }, ...jour }).validite).toBe(45);
  });
  it('un devis ne reprend ni le numéro ni la date de la visite passée : la visite est à venir', () => {
    const l = donneesDevis({ entretien: attestation(), entreprise, ...jour }).lignes[0];
    expect(l.description).not.toContain('ENT-2026-00001');
    expect(l.description).not.toContain('attestation n°');
    expect(l.description).not.toContain('04/11/2026');
    // La facture, elle, les porte
    expect(donneesFacture({ entretien: attestation(), entreprise, aujourdhui: '2027-10-20' }).lignes[0].description).toContain('ENT-2026-00001');
  });
  it('un forfait par visite (arrêté du 24 janv. 2017, art. 4, II : « le montant forfaitaire de chaque prestation »)', () => {
    const l = donneesDevis({ entretien: attestation(), entreprise, ...jour }).lignes[0];
    expect(l.quantite).toBe(1);
    expect(l.unite).toBe('forfait');
  });
});

describe('ce que la base reçoit (mode réel : le mode démo cache les pannes du mode réel)', () => {
  it('le devis envoyé à la table devis garde le type, le statut, le client, la validité, le taux, les totaux et la ligne', () => {
    const d = donneesDevis({ entretien: attestation(), entreprise, ...jour });
    const ligne = FIELD_MAPPINGS.devis.toSupabase({ ...d, id: 'd1', numero: 'DEV-2027-00001' });
    expect(ligne).toMatchObject({ id: 'd1', type: 'devis', statut: 'brouillon', client_id: 'c1', numero: 'DEV-2027-00001', date: '2027-10-20', validite_jours: 30, tva_rate: 10, total_ht: 150, total_tva: 15, total_ttc: 165 });
    expect(ligne.objet).toBe('Entretien — Chaudière');
    expect(JSON.parse(ligne.lignes).map((l) => l.description).join(' ')).toContain('Entretien de chaudière');
    expect(JSON.parse(ligne.sections)).toHaveLength(1);
    // En franchise, le taux enregistré est 0 (et non le repli à 10 %)
    const f = donneesDevis({ entretien: attestation(), entreprise: { ...entreprise, formeJuridique: 'Micro-entreprise' }, ...jour });
    expect(FIELD_MAPPINGS.devis.toSupabase({ ...f, id: 'd2', numero: 'DEV-2027-00002' }).tva_rate).toBe(0);
  });
});

describe('sept jours : la facture tirée d’une attestation chez un client particulier le rappelle (D-38, décision 2)', () => {
  it('le texte proposé par juriste-btp (relecture du 4 nov. 2026), mot pour mot', () => {
    expect(AVERTISSEMENT_SEPT_JOURS).toBe('Entretien convenu chez le client : aucun paiement ne peut être reçu avant sept jours après la conclusion du contrat (article L221-10 du code de la consommation).');
  });
  it('affiché pour un client particulier, jamais pour un professionnel ni une copropriété', () => {
    expect(avertissementSeptJours({ categorie: 'Particulier' })).toBe(AVERTISSEMENT_SEPT_JOURS);
    expect(avertissementSeptJours({ nom: 'Martin' })).toBe(AVERTISSEMENT_SEPT_JOURS);
    expect(avertissementSeptJours({ categorie: 'Professionnel' })).toBe('');
    expect(avertissementSeptJours({ categorie: 'Syndic' })).toBe('');
    expect(avertissementSeptJours({ entreprise: 'SARL X' })).toBe('');
    expect(avertissementSeptJours(null)).toBe('');
  });
});

describe('câblage du bouton (les interactions sont jouées par le parcours entretien)', () => {
  const lire = (relatif) => fs.readFileSync(path.resolve(path.dirname(fileURLToPath(import.meta.url)), relatif), 'utf8');
  it('« Faire le devis de la visite » passe par la création de devis existante, derrière le droit de créer, et l’éditeur s’ouvre dessus', () => {
    const fiche = lire('../../components/entretien/FicheEntretien.jsx');
    expect(fiche).toContain('Faire le devis de la visite');
    expect(fiche).toContain('addDevis(donneesDevis(');
    expect(fiche).toContain("canPerform('devis', 'create')");
    expect(fiche).toContain('onOuvrirEditeur(');
    // Jamais d'envoi depuis ce bouton, ni de nouveau chemin d'enregistrement
    expect(fiche).not.toMatch(/sendDocumentEmail|supabase\.from\(/);
    expect(fiche).toContain('avertissementSeptJours(');
  });
});
