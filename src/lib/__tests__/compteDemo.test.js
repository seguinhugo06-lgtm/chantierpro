import { describe, it, expect, vi } from 'vitest';
import { construireJeu } from '../../../scripts/demo/jeuDemo.js';
import { genererSql, lignesDuJeu, COMPTE_DEMO, IDENTITE_DEMO } from '../../../scripts/demo/generer-sql.mjs';
import { FIELD_MAPPINGS } from '../../hooks/useSupabaseSync';
import { statutFacture } from '../paiementsFacture';
import { estOuverte, encaisse, resteAFacturer } from '../ventes';
import { detectPendingRelances } from '../relanceEngine';
import { DEFAULT_DEVIS_STEPS, DEFAULT_FACTURE_STEPS } from '../../components/settings/RelanceConfigTab';

// Compte démo (contact@mallettico.fr, décision d'Hugo du 11 oct. 2026) : un jeu fictif mais crédible, envoyé
// en production. Ces tests gardent ce qui ne doit jamais arriver : un e-mail chez un inconnu, de la TVA facturée
// par une micro-entreprise, des numéros en double, une écriture hors de l'organisation démo.

const AUJOURDHUI = new Date(2026, 9, 11, 10, 0); // 11 oct. 2026, heure locale
const jeu = construireJeu({ aujourdhui: AUJOURDHUI });
const factures = jeu.devis.filter((d) => d.type === 'facture');
const devis = jeu.devis.filter((d) => d.type === 'devis');
const paiementsApp = jeu.paiements.map((p) => ({ ...p, devis_id: p.devisId, facture_id: p.devisId }));
const parNumero = (n) => jeu.devis.find((d) => d.numero === n);
const parObjet = (texte) => jeu.devis.find((d) => d.objet.includes(texte));

describe('compte démo : personne d’autre ne reçoit d’e-mail', () => {
  it('toute adresse e-mail du jeu est une adresse « + » de la boîte d’Hugo', () => {
    const adresses = JSON.stringify(jeu).match(/[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[a-z]{2,}/g) || [];
    expect(adresses.length).toBeGreaterThanOrEqual(jeu.clients.length);
    for (const a of adresses) expect(a).toMatch(/^seguin\.hugo06\+[a-z-]+@gmail\.com$/);
  });

  it('téléphones dans la plage réservée à la fiction (06 39 98)', () => {
    for (const c of jeu.clients) expect(c.telephone).toMatch(/^06 39 98 \d\d \d\d$/);
  });
});

describe('compte démo : des pièces justes', () => {
  it('micro-entreprise : aucune TVA, TTC = HT = somme des lignes', () => {
    for (const d of jeu.devis) {
      const somme = Math.round(d.lignes.reduce((s, l) => s + l.montant, 0) * 100) / 100;
      expect(d.tva).toBe(0);
      expect(d.tvaRate).toBe(0);
      expect(d.total_ht).toBe(somme);
      expect(d.total_ttc).toBe(d.total_ht);
      for (const l of d.lignes) expect(l.tva).toBe(0);
    }
  });

  it('numérotation chronologique, sans doublon ni trou', () => {
    for (const [prefixe, docs] of [['DEV', devis], ['FAC', factures]]) {
      const tries = [...docs].sort((a, b) => a.numero.localeCompare(b.numero));
      tries.forEach((d, i) => expect(d.numero).toBe(`${prefixe}-2026-${String(i + 1).padStart(5, '0')}`));
      for (let i = 1; i < tries.length; i++) expect(tries[i].date >= tries[i - 1].date).toBe(true);
    }
  });

  it('les factures d’un devis n’en dépassent pas le total', () => {
    for (const d of devis) {
      const facture = factures.filter((f) => f.devis_source_id === d.id).reduce((s, f) => s + f.total_ttc, 0);
      expect(facture).toBeLessThanOrEqual(d.total_ttc + 0.005);
    }
  });

  it('chaque statut passe tel quel en base (aucun repli silencieux sur « brouillon »)', () => {
    const erreur = vi.spyOn(console, 'error').mockImplementation(() => {});
    for (const d of jeu.devis) expect(FIELD_MAPPINGS.devis.toSupabase(d).statut).toBe(d.statut);
    expect(erreur).not.toHaveBeenCalled();
    erreur.mockRestore();
  });
});

describe('compte démo : de quoi tout montrer', () => {
  it('des factures payées, à l’heure, en retard, et une payée en partie', () => {
    const statuts = factures.map((f) => statutFacture(f, paiementsApp, AUJOURDHUI));
    expect(statuts.filter((s) => s === 'payee').length).toBeGreaterThanOrEqual(6);
    expect(statuts.filter((s) => s === 'en_retard').length).toBeGreaterThanOrEqual(3);
    expect(factures.filter((f) => estOuverte(f, paiementsApp, AUJOURDHUI)).length).toBeGreaterThanOrEqual(5);
    const partielle = parObjet('Acompte de 40 %');
    expect(encaisse(partielle, paiementsApp, AUJOURDHUI)).toBe(1000);
  });

  it('des devis à tous les états, signés en ligne ou sur place, et du reste à facturer', () => {
    const etats = new Set(devis.map((d) => d.statut));
    for (const s of ['brouillon', 'envoye', 'refuse', 'acompte_facture', 'facture']) expect(etats).toContain(s);
    expect(devis.filter((d) => d.signature_data).length).toBe(3);
    expect(devis.filter((d) => d.signature).length).toBe(4);
    expect(devis.reduce((s, d) => s + resteAFacturer(d, jeu.devis), 0)).toBeGreaterThan(0);
  });

  it('des relances à faire aujourd’hui avec le scénario standard', () => {
    const config = { enabled: true, autoSend: false, devisSteps: DEFAULT_DEVIS_STEPS, factureSteps: DEFAULT_FACTURE_STEPS };
    vi.useFakeTimers();
    vi.setSystemTime(AUJOURDHUI);
    const dues = detectPendingRelances(jeu.devis, jeu.clients, config, [], []).filter((r) => r.isDue);
    vi.useRealTimers();
    expect(dues.some((r) => r.doc.type === 'facture')).toBe(true);
    expect(dues.some((r) => r.doc.type === 'devis')).toBe(true);
  });

  it('un planning et des mémos autour d’aujourd’hui', () => {
    expect(jeu.planning.some((e) => e.date === '2026-10-11')).toBe(true);
    expect(jeu.memos.some((m) => !m.is_done)).toBe(true);
    expect(parNumero('DEV-2026-00001')).toBeTruthy();
  });
});

describe('compte démo : le SQL ne touche qu’à l’organisation démo', () => {
  const sql = genererSql({ aujourdhui: AUJOURDHUI });
  // Instructions entières (une valeur longue s'étend sur plusieurs lignes)
  const instructions = sql.split(/;\s*\n/).map((l) => l.trim()).filter((l) => /^(DELETE|UPDATE|INSERT)/.test(l)).map((l) => `${l};`);

  it('un seul bloc (tout ou rien), qui vérifie le compte et l’organisation avant d’écrire', () => {
    const utiles = sql.split('\n').filter((l) => l.trim() && !l.startsWith('--'));
    expect(utiles[0]).toBe('DO $demo$');
    expect(utiles[utiles.length - 1]).toBe('END $demo$;');
    expect(sql.indexOf('RAISE EXCEPTION')).toBeLessThan(sql.indexOf('DELETE'));
    expect(sql).toContain(`lower(u.email) = '${COMPTE_DEMO.email}'`);
    expect(sql).toContain(`v_org uuid := '${COMPTE_DEMO.organizationId}'`);
  });

  it('refuse d’écrire si une autre organisation pointe vers les données démo (cascades)', () => {
    expect(sql).toMatch(/FROM pg_constraint c[\s\S]*'public\.clients'::regclass, 'public\.chantiers'::regclass, 'public\.devis'::regclass/);
    expect(sql.indexOf('v_croise THEN RAISE EXCEPTION')).toBeLessThan(sql.indexOf('DELETE'));
    expect(instructions).toContain('DELETE FROM public.pointages WHERE organization_id = v_org;');
  });

  it('aucun texte ne s’étend sur deux lignes (l’indentation du bloc y entrerait)', () => {
    const lignesImpaires = sql.split('\n').filter((l) => (l.match(/'/g) || []).length % 2 === 1);
    expect(lignesImpaires).toEqual([]);
    expect(sql).toContain("adresse = ('1 rue de l’Exemple' || chr(10) || '33000 Bordeaux')");
  });

  it('vérifie l’empreinte de ce qu’il écrit avant de valider (une erreur de transmission n’écrit rien)', () => {
    expect(sql).toMatch(/IF v_empreinte IS DISTINCT FROM '[0-9a-f]{32}' THEN/);
    expect(sql.lastIndexOf('INSERT INTO')).toBeLessThan(sql.indexOf('v_empreinte IS DISTINCT'));
  });

  it('chaque effacement et chaque mise à jour visent l’organisation démo', () => {
    for (const l of instructions.filter((x) => /^(DELETE|UPDATE)/.test(x) && !x.startsWith('UPDATE public.organizations '))) {
      expect(l).toContain('organization_id = v_org');
    }
    // Seul le nom de l'organisation démo change, et seulement si le compte démo en est le propriétaire
    expect(instructions.filter((x) => x.startsWith('UPDATE public.organizations '))).toEqual([
      `UPDATE public.organizations SET name = 'Élec Exemple', updated_at = now() WHERE id = v_org AND owner_id = '${COMPTE_DEMO.userId}';`,
    ]);
    expect(instructions.some((l) => /^DELETE FROM public\.(catalogue|entreprise|subscriptions|organization_members)/.test(l))).toBe(false);
  });

  it('chaque ligne écrite appartient au compte démo', () => {
    const lignes = lignesDuJeu(jeu);
    for (const [table, rangs] of Object.entries(lignes)) {
      for (const r of rangs) {
        expect(r.organization_id, table).toBe(COMPTE_DEMO.organizationId);
        expect(r.user_id, table).toBe(COMPTE_DEMO.userId);
      }
    }
  });

  it('lignes et sections des pièces en texte JSON, comme l’app les écrit', () => {
    const ligneDevis = instructions.find((l) => l.startsWith('INSERT INTO public.devis'));
    expect(ligneDevis).toMatch(/to_jsonb\('\[\{/);
  });
});

describe('compte démo : une identité clairement fictive (Q-identite-demo)', () => {
  const { colonnes, reglages } = IDENTITE_DEMO;
  it('aucune marque ni numéro qui puisse appartenir à quelqu’un', () => {
    const texte = JSON.stringify(IDENTITE_DEMO);
    for (const marque of ['SMABTP', 'MAAF', 'AXA', 'MMA', 'Allianz', 'Generali', 'MACIF', 'Mallettico']) expect(texte).not.toContain(marque);
    expect(colonnes.siret).toBe('00000000000000');
    expect(colonnes.email).toMatch(/@example\.com$/);
    expect(colonnes.telephone).toMatch(/^06 39 98 /);
    expect(colonnes.code_ape).toBe('4321A');
    expect(colonnes.decennale_assureur).toContain('(exemple)');
    expect(colonnes.iban).toBe('');
  });
  it('marquée « données fictives », avec un entrepreneur fictif', () => {
    expect(reglages.donneesFictives).toBe(true);
    expect(reglages.nomEntrepreneur).toBe('Julien Exemple');
  });
  it('le script pose l’identité sur la fiche du compte démo seulement, en gardant ses autres réglages', () => {
    const sql = genererSql({ aujourdhui: AUJOURDHUI });
    expect(sql).toMatch(/UPDATE public\.entreprise SET nom = 'Élec Exemple'[\s\S]*?COALESCE\(settings_json -> 'reglages', '\{\}'::jsonb\) \|\| '\{[^']*"donneesFictives":true[\s\S]*?WHERE id = '[0-9a-f-]+' AND organization_id = v_org;/);
  });
});

