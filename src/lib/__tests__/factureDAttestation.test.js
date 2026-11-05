import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import * as entretien from '../entretien';
import { AVERTISSEMENT_SEPT_JOURS, DUREE_AVERTISSEMENT_MS, MESSAGE_LIEN_NON_ENREGISTRE, messageApresFacture } from '../factureDAttestation';

/**
 * Relecture juriste-btp du 5 nov. 2026 (avis du lot 4), point 11 : la facture tirée d'une attestation, chez un client
 * particulier, rappelle les sept jours (C. conso. L221-10), après sa création, sur les DEUX fiches : ramonage
 * (src/components/ramonage/FicheAttestation.jsx) et entretien (src/components/entretien/FicheEntretien.jsx). Le texte est
 * copié de l'avis, apostrophes typographiques comprises. Les interactions des fiches sont jouées par les parcours
 * `ramonage` et `entretien` (affichage, durée, contre-essai avec un client professionnel).
 */
const TEXTE_DU_JURISTE = 'Client particulier : si le contrat a été conclu chez lui (devis signé ou accord donné sur place), vous ne pouvez recevoir aucun paiement ni aucune contrepartie avant sept jours à compter de sa conclusion (code de la consommation, article L. 221-10), sauf travaux d’entretien ou de réparation urgents qu’il a expressément demandés, dans la limite des pièces de rechange et travaux strictement nécessaires pour répondre à l’urgence. La facture peut être émise, mais n’en demandez pas le paiement avant cette date.';

const ici = path.dirname(fileURLToPath(import.meta.url));
const lire = (relatif) => fs.readFileSync(path.resolve(ici, relatif), 'utf8');

describe('rappel des sept jours après la facture tirée d’une attestation (point 11 de l’avis du 5 nov.)', () => {
  it('le texte du juriste, mot pour mot', () => {
    expect(AVERTISSEMENT_SEPT_JOURS).toBe(TEXTE_DU_JURISTE);
    expect(AVERTISSEMENT_SEPT_JOURS).toContain('aucun paiement ni aucune contrepartie avant sept jours');
    expect(AVERTISSEMENT_SEPT_JOURS).toContain('code de la consommation, article L. 221-10');
  });
  it('les parcours ramonage et entretien attendent le même texte (scripts/lib/septJours.cjs)', () => {
    const { SEPT_JOURS } = createRequire(import.meta.url)('../../../scripts/lib/septJours.cjs');
    expect(SEPT_JOURS).toBe(AVERTISSEMENT_SEPT_JOURS);
    expect(SEPT_JOURS).toBe(TEXTE_DU_JURISTE);
  });
  it('affiché pour un client particulier : un avertissement (sans bloquer), pendant 10 secondes', () => {
    for (const client of [{ categorie: 'Particulier' }, { categorie: 'particulier', entreprise: '' }, { nom: 'Martin' }]) {
      expect(messageApresFacture({ client, lie: true })).toEqual({ texte: TEXTE_DU_JURISTE, type: 'warning', duree: 10000 });
    }
    expect(DUREE_AVERTISSEMENT_MS).toBe(10000);
  });
  it('contre-essai : jamais pour un professionnel, une copropriété ou une fiche inconnue', () => {
    for (const client of [{ categorie: 'Professionnel' }, { categorie: 'Syndic' }, { categorie: 'Architecte' }, { entreprise: 'SARL X' }, null, undefined]) {
      expect(messageApresFacture({ client, lie: true })).toBeNull();
    }
    expect(messageApresFacture()).toBeNull();
  });
  it('le lien de l’attestation vers la facture non enregistré : l’erreur garde la place, sans l’avertissement (une notification à la fois)', () => {
    for (const client of [{ categorie: 'Particulier' }, { categorie: 'Professionnel' }]) {
      const m = messageApresFacture({ client, lie: false });
      expect(m).toEqual({ texte: 'La facture est créée, mais son lien avec l’attestation n’a pas été enregistré.', type: 'error' });
      expect(m.texte).not.toContain('sept jours');
    }
    expect(MESSAGE_LIEN_NON_ENREGISTRE).toContain('son lien avec l’attestation n’a pas été enregistré');
  });
  it('une écriture réussie, mise en attente hors ligne ou sans retour (autre chose que false) n’est pas une erreur', () => {
    const client = { categorie: 'Particulier' };
    for (const lie of [true, undefined, null, 'ecriture-en-attente']) expect(messageApresFacture({ client, lie }).type).toBe('warning');
  });
  it('un seul texte : l’ancienne phrase de l’entretien n’existe plus', () => {
    expect(entretien.AVERTISSEMENT_SEPT_JOURS).toBeUndefined();
    expect(entretien.avertissementSeptJours).toBeUndefined();
  });
});

describe('les deux fiches (ramonage et entretien) disent la même chose, au même moment', () => {
  const fiches = [
    { nom: 'entretien', chemin: '../../components/entretien/FicheEntretien.jsx', suivre: 'suivreEntretien' },
    { nom: 'ramonage', chemin: '../../components/ramonage/FicheAttestation.jsx', suivre: 'suivreRamonage' },
  ];
  for (const f of fiches) {
    it(`fiche ${f.nom} : après la création de la facture et l’écriture du lien, le message du module commun, pour le client de la fiche`, () => {
      const source = lire(f.chemin);
      expect(source).toContain("import { messageApresFacture } from '../../lib/factureDAttestation';");
      const creation = source.indexOf('await addDevis(donneesFacture(');
      const lien = source.indexOf(`const lie = await ${f.suivre}(`);
      const message = source.indexOf('messageApresFacture({ client, lie })');
      const affichage = source.indexOf('showToast?.(message.texte, message.type, message.duree)');
      const ouverture = source.indexOf('onOuvrirFacture(creee)');
      // Dans l'ordre : facture créée, lien écrit (son retour dit s'il est enregistré), message, affichage, facture ouverte
      expect(creation).toBeGreaterThan(-1);
      expect(lien).toBeGreaterThan(creation);
      expect(message).toBeGreaterThan(lien);
      expect(affichage).toBeGreaterThan(message);
      expect(ouverture).toBeGreaterThan(affichage);
    });
    it(`contre-essai, fiche ${f.nom} : plus de phrase écrite à la main (le lien non enregistré vient du module commun)`, () => {
      const source = lire(f.chemin);
      expect(source).not.toContain('La facture est créée, mais son lien');
      expect(source).not.toContain('Entretien convenu chez le client');
      expect(source).not.toContain('avertissementSeptJours');
    });
  }
});
