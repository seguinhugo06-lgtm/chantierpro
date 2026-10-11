import { describe, it, expect, vi } from 'vitest';
import { construireJeu } from '../../../scripts/demo/jeuDemo.js';
import { genererSql, lignesDuJeu, COMPTE_DEMO } from '../../../scripts/demo/generer-sql.mjs';
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

  it('des devis à tous les états, dont deux signés en ligne et du reste à facturer', () => {
    const etats = new Set(devis.map((d) => d.statut));
    for (const s of ['brouillon', 'envoye', 'vu', 'refuse', 'acompte_facture', 'facture']) expect(etats).toContain(s);
    expect(devis.filter((d) => d.signature_data).length).toBe(2);
    expect(devis.filter((d) => d.signature).length).toBe(2);
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
  const instructions = sql.split('\n').filter((l) => /^(DELETE|UPDATE|INSERT)/.test(l));

  it('commence par vérifier le compte et l’organisation, sinon n’écrit rien', () => {
    expect(sql.indexOf('RAISE EXCEPTION')).toBeLessThan(sql.indexOf('DELETE'));
    expect(sql).toContain(`lower(u.email) = '${COMPTE_DEMO.email}'`);
  });

  it('chaque effacement et chaque mise à jour visent l’organisation démo', () => {
    for (const l of instructions.filter((x) => /^(DELETE|UPDATE)/.test(x))) {
      expect(l).toContain(`organization_id = '${COMPTE_DEMO.organizationId}'`);
    }
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
