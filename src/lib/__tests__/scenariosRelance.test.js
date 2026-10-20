import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { DEFAULT_DEVIS_STEPS, DEFAULT_FACTURE_STEPS } from '../scenariosRelance';
import { objetDeRelance } from '../objetRelance';
import { resolveVariables } from '../relanceUtils';

/**
 * Les scénarios de relance proposés par l'app (src/lib/scenariosRelance.js) et l'objet de leurs messages
 * (src/lib/objetRelance.js), lus par le moteur de relances (src/lib/relanceEngine.js), l'écran des réglages et le site
 * public.
 */
const devis = { numero: 'DEV-2026-00012', type: 'devis', statut: 'envoye', total_ttc: 2081.2 };
const facture = { numero: 'FAC-2026-00043', type: 'facture', statut: 'envoye', total_ttc: 4136 };
const client = { prenom: 'M.', nom: 'Martin' };
const entreprise = { nom: 'Élec Exemple' };
const NORMAL = (t) => t.replace(/[\s  ]+/g, ' ');

describe('objetDeRelance : l’objet du message d’une relance', () => {
  it('sans objet propre à l’étape : « Relance : Devis <numéro> » ou « Relance : Facture <numéro> »', () => {
    expect(objetDeRelance(DEFAULT_DEVIS_STEPS[0], devis, client, entreprise)).toBe('Relance : Devis DEV-2026-00012');
    expect(objetDeRelance(DEFAULT_FACTURE_STEPS[0], facture, client, entreprise)).toBe('Relance : Facture FAC-2026-00043');
  });

  it('avec un objet propre à l’étape : ses variables sont remplies', () => {
    expect(objetDeRelance({ objet_email: 'Votre devis {{devis_numero}} — {{entreprise_nom}}' }, devis, client, entreprise))
      .toBe('Votre devis DEV-2026-00012 — Élec Exemple');
  });

  it('la tâche programmée (Deno, qui ne lit pas src/) applique la même règle : si elle change d’un côté, ce test casse', () => {
    const lire = (relatif) => readFileSync(fileURLToPath(new URL(`../../../${relatif}`, import.meta.url)), 'utf8');
    expect(lire('src/lib/objetRelance.js')).toContain("etape?.objet_email || `Relance : ${doc?.type === 'facture' ? 'Facture' : 'Devis'} ${doc?.numero}`");
    expect(lire('supabase/functions/send-scheduled-relances/index.ts'))
      .toContain("step.objet_email || `Relance : ${item.sequenceType === 'facture' ? 'Facture' : 'Devis'} ${doc.numero}`");
  });
});

describe('les modèles de relance de devis', () => {
  it('écrivent « devis n° <numéro> » et un montant en « € », comme les modèles de facture', () => {
    for (const etape of DEFAULT_DEVIS_STEPS) {
      expect(etape.template, etape.name).toContain('devis n° {{devis_numero}}');
      expect(etape.template, etape.name).toContain('{{montant}} €');
      expect(etape.template, etape.name).not.toMatch(/n\{\{devis_numero\}\}|\bEUR\b/);
    }
  });

  it('le message reçu par le client : « devis n° DEV-2026-00012 d’un montant de 2 081,20 € »', () => {
    const message = NORMAL(resolveVariables(DEFAULT_DEVIS_STEPS[0].template, devis, client, entreprise));
    expect(message).toContain("devis n° DEV-2026-00012 d'un montant de 2 081,20 € que je vous ai adressé récemment.");
    expect(NORMAL(resolveVariables(DEFAULT_DEVIS_STEPS[1].template, devis, client, entreprise))).toContain('devis n° DEV-2026-00012 (2 081,20 €).');
  });
});
