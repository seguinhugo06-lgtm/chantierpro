import { describe, it, expect } from 'vitest';
import {
  rappelsAEnvoyerEntretien, emailRappelEntretien, phraseObligationServeur, obligationConnueServeur,
} from '../../../supabase/functions/send-scheduled-relances/entretien.ts';
import { phraseObligation, obligationConnue } from '../entretien';

// Données fictives seulement
const client = { id: 'c1', nom: 'Exemple', prenom: 'Lucie', email: 'lucie@exemple.fr' };
const entreprise = { nom: 'Chauffage Exemple EI', adresse: '1 rue Fictive, 24000 Imaginaire', telephone: '05 00 00 00 00', email: 'contact@exemple.fr' };
const e = (o = {}) => ({
  id: 'e1', client_id: 'c1', appareil_ref: 'a1', categorie: 'chaudiere', realise_le: '2026-11-04T09:00:00Z', prochain_avant: '2027-11-04',
  puissance_kw: 24, appareils: [{ marque: 'Exemplair', modele: 'Naneo' }], local: 'Cuisine', jeton_rappel: 'j1', ...o,
});

describe('rappels d’entretien côté serveur', () => {
  it('envoie dans la fenêtre « date conseillée − délai » → date conseillée, jamais après (pas d’e-mail en retard)', () => {
    expect(rappelsAEnvoyerEntretien([e()], [client], { aujourdhui: '2027-10-04' })).toHaveLength(0);
    expect(rappelsAEnvoyerEntretien([e()], [client], { aujourdhui: '2027-10-05' })).toHaveLength(1);
    expect(rappelsAEnvoyerEntretien([e()], [client], { aujourdhui: '2027-11-04' })).toHaveLength(1);
    expect(rappelsAEnvoyerEntretien([e()], [client], { aujourdhui: '2027-11-05' })).toHaveLength(0);
  });
  it('jamais à un client qui a refusé, sans e-mail valide, ni pour un rappel déjà fait ou une attestation annulée', () => {
    const jour = { aujourdhui: '2027-10-20' };
    expect(rappelsAEnvoyerEntretien([e()], [{ ...client, rappels_refuses_le: '2027-01-01' }], jour)).toHaveLength(0);
    expect(rappelsAEnvoyerEntretien([e()], [{ ...client, email: 'pas-une-adresse' }], jour)).toHaveLength(0);
    expect(rappelsAEnvoyerEntretien([e({ rappel_fait_le: '2027-10-10' })], [client], jour)).toHaveLength(0);
    expect(rappelsAEnvoyerEntretien([e({ annulee_le: '2026-11-05' })], [client], jour)).toHaveLength(0);
  });
  it('même règle d’obligation et même phrase que l’app', () => {
    const cas = [e(), e({ puissance_kw: null }), e({ puissance_kw: 500 }), e({ categorie: 'pac', puissance_kw: 8 }),
      e({ categorie: 'pac', puissance_kw: 8, contrat_performance: true }), e({ categorie: 'pac', puissance_kw: 3 }), e({ categorie: 'poele', puissance_kw: null })];
    for (const x of cas) {
      const app = { ...x, puissance_kw: x.puissance_kw ?? '' };
      expect(obligationConnueServeur(x)).toBe(obligationConnue(app));
      expect(phraseObligationServeur(x)).toBe(phraseObligation(app));
    }
  });
  it('l’e-mail : objet avec l’entreprise et sans « obligatoire », obligation dans le corps avec son article, désinscription', () => {
    const { objet, texte, html } = emailRappelEntretien({ entreprise, client, entretien: e(), lien: 'https://mallettico.fr/rappel-entretien/j1' });
    expect(objet).toBe('Entretien de votre chaudière à prévoir avant le 04/11/2027 — Chauffage Exemple EI');
    expect(objet).not.toMatch(/obligatoire|R\. 224/i);
    expect(texte).toContain('au plus tard le 31 décembre 2027');
    expect(texte).toContain('Vous restez libre de confier cet entretien');
    expect(texte).toContain('https://mallettico.fr/rappel-entretien/j1');
    expect(texte).toContain('répondez STOP');
    expect(texte).toContain('a entretenu votre chaudière le 04/11/2026');
    expect(html).not.toMatch(/obligatoire/i);
    // Contre-essai : puissance inconnue, ni article ni phrase de libre choix
    const sans = emailRappelEntretien({ entreprise, client, entretien: e({ puissance_kw: null }), lien: 'x' }).texte;
    expect(sans).not.toContain('R. 224-41-7');
    expect(sans).not.toContain('Vous restez libre');
  });
  it('échappe le texte saisi dans le HTML', () => {
    const { html } = emailRappelEntretien({ entreprise, client: { ...client, prenom: '<b>x</b>' }, entretien: e({ local: '<img>' }), lien: 'x' });
    expect(html).not.toContain('<img>');
    expect(html).not.toContain('<b>x</b>');
  });
});
