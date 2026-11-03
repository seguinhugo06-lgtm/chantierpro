// Changer le statut d'un devis ou d'une facture depuis la liste ou la fiche (retours d'Hugo du 3 nov. 2026 :
// « changer le statut de la facture directement sur envoyé ou payé sans être bloqué ») :
// - un devis envoyé passe « Signé » depuis sa carte ;
// - « Payée » sur une facture enregistre l'encaissement du reste dû (prérempli), puis la facture est payée ;
// - « Envoyée » sur un brouillon de facture demande une confirmation qui dit l'émission (numéro définitif) ;
// - réel simulé : le numéro attribué par la base est repris ; une écriture refusée n'affiche aucune réussite.
const path = require('path');

const ligne = { id: 'l1', description: 'Remplacement tableau électrique', quantite: 1, prixUnitaire: 1000, tva: 10 };
const DEVIS_ENVOYE = {
  id: 'd-statut-envoye', numero: 'DEV-2026-00301', type: 'devis', statut: 'envoye', client_id: 'c1', date: '2026-10-20', date_validite: '2099-12-31',
  date_envoi: '2026-10-20', objet: 'Tableau électrique', lignes: [ligne], sections: [{ id: 's1', titre: '', lignes: [ligne] }], tvaRate: 10, total_ht: 1000, tva: 100, total_ttc: 1100,
};
const FACTURE_ENVOYEE = {
  id: 'f-statut-envoyee', numero: 'FAC-2026-00301', type: 'facture', facture_type: 'totale', statut: 'envoye', client_id: 'c1',
  date: '2026-10-20', date_echeance: '2099-12-31', lignes: [ligne], tvaRate: 10, total_ht: 1000, tva: 100, total_ttc: 1100,
};
const FACTURE_BROUILLON = { ...FACTURE_ENVOYEE, id: 'f-statut-brouillon', numero: 'FAC-2026-00302', statut: 'brouillon' };

async function demoAvec(documents) {
  const { DEMO_DEVIS } = await import(path.resolve(__dirname, '../../src/lib/demo-data.js'));
  return `localStorage.setItem('mallettico_demo_data', ${JSON.stringify(JSON.stringify({ devis: [...DEMO_DEVIS, ...documents], paiements: [] }))});`;
}
const enregistres = (page) => page.evaluate(() => JSON.parse(localStorage.getItem('mallettico_demo_data') || '{}'));
const texte = (page) => page.evaluate(() => (document.body.innerText || '').replace(/[\s  ]+/g, ' '));
const onglet = (page, nom) => page.evaluate((n) => [...document.querySelectorAll('button')].find((b) => b.innerText.trim() === n)?.click(), nom);
// Le bouton « Statut » de la carte d'un document (aria-label « Changer le statut de <numéro> »)
const statutDeLaCarte = (page, numero) => page.evaluate((n) => {
  const b = document.querySelector(`button[aria-label="Changer le statut de ${n}"]`);
  b?.click();
  return !!b;
}, numero);
// Un choix du volet « Changer le statut » (son libellé commence le bouton ; le détail suit)
const choisir = (page, libelle) => page.evaluate((l) => {
  const volet = [...document.querySelectorAll('[role="dialog"]')].find((d) => /Changer le statut/.test(d.innerText));
  const b = volet && [...volet.querySelectorAll('ul button')].find((x) => (x.innerText || '').trim().split('\n')[0] === l);
  b?.click();
  return !!b;
}, libelle);
const dialogue = (page) => page.evaluate(() => [...document.querySelectorAll('[role="dialog"], [role="alertdialog"]')].map((d) => d.innerText.replace(/\s+/g, ' ')).join(' | '));
const confirmerDansDialogue = (page, libelle) => page.evaluate((l) => {
  const b = [...document.querySelectorAll('[role="dialog"] button, [role="alertdialog"] button')].find((x) => (x.innerText || '').trim() === l);
  b?.click();
  return !!b;
}, libelle);
const ouvrirDocument = (page, numero) => page.evaluate((n) => {
  const b = [...document.querySelectorAll('[data-ui="LigneListe"] > button')].find((x) => x.innerText.includes(n));
  b?.click();
  return !!b;
}, numero);

const TEXTE_EMISSION = 'La facture sera émise : son numéro sera définitif et elle ne pourra plus être modifiée ni supprimée, seulement corrigée par un avoir.';

module.exports = [
  {
    nom: 'statut : un devis envoyé passe « Signé » depuis sa carte (375 px)',
    async executer({ ouvrir, attendre, verifier }) {
      const { page } = await ouvrir({ page: 'devis', largeur: 375, avantChargement: await demoAvec([DEVIS_ENVOYE]) });
      await attendre(800);
      verifier(await statutDeLaCarte(page, 'DEV-2026-00301'), 'bouton « Statut » sur la carte du devis');
      await attendre(500);
      verifier(/Statut actuel Envoyé/.test(await dialogue(page)), 'le volet dit le statut actuel');
      verifier(await choisir(page, 'Signé'), 'choix « Signé » proposé');
      await attendre(1200);
      const { devis = [] } = await enregistres(page);
      const d = devis.find((x) => x.id === 'd-statut-envoye');
      verifier(d?.statut === 'accepte', `statut enregistré : ${d?.statut}`);
      verifier(/Statut enregistré : Signé/.test(await texte(page)), 'message « Statut enregistré : Signé »');
      // Un devis signé ne revient pas en arrière : plus de bouton « Statut » sur sa carte
      verifier(!(await page.$('button[aria-label="Changer le statut de DEV-2026-00301"]')), 'plus de changement de statut sur un devis signé');
    },
  },
  {
    nom: 'statut : « Payée » sur une facture envoyée enregistre l’encaissement du reste dû, puis la facture est payée (375 px)',
    async executer({ ouvrir, attendre, verifier }) {
      const { page } = await ouvrir({ page: 'devis', largeur: 375, avantChargement: await demoAvec([FACTURE_ENVOYEE]) });
      await attendre(800);
      await onglet(page, 'Factures');
      await attendre(600);
      verifier(await statutDeLaCarte(page, 'FAC-2026-00301'), 'bouton « Statut » sur la carte de la facture');
      await attendre(500);
      const volet = await dialogue(page);
      verifier(/Payée Enregistre le paiement reçu du reste dû : 1 100,00/.test(volet.replace(/[  ]/g, ' ')), `« Payée » dit ce qu'il fait (${volet.slice(0, 200)})`);
      verifier(await choisir(page, 'Payée'), 'choix « Payée » proposé');
      await attendre(800);
      const prerempli = await page.evaluate(() => !![...document.querySelectorAll('[role="dialog"] input')].find((i) => i.value === '1100.00'));
      verifier(prerempli, 'encaissement prérempli du reste dû (1100.00)');
      const confirme = await page.evaluate(() => {
        const b = [...document.querySelectorAll('[role="dialog"] button')].find((x) => /^Confirmer le paiement/.test(x.innerText.trim()));
        b?.click();
        return !!b;
      });
      verifier(confirme, 'un appui : « Confirmer le paiement »');
      await attendre(1500);
      const { paiements = [], devis = [] } = await enregistres(page);
      const p = paiements.find((x) => x.facture_id === 'f-statut-envoyee');
      verifier(!!p && Number(p.montant || p.amount) === 1100, `encaissement de 1 100 € enregistré (${JSON.stringify(p || null)})`);
      const f = devis.find((x) => x.id === 'f-statut-envoyee');
      verifier(f?.statut === 'payee', `facture payée en dernier (statut ${f?.statut})`);
      verifier(/marquée comme payée/.test(await texte(page)), 'message « marquée comme payée »');
    },
  },
  {
    nom: 'statut : « Envoyée » sur un brouillon de facture demande la confirmation de l’émission (375 px)',
    async executer({ ouvrir, attendre, verifier }) {
      const { page } = await ouvrir({ page: 'devis', largeur: 375, avantChargement: await demoAvec([FACTURE_BROUILLON]) });
      await attendre(800);
      await onglet(page, 'Factures');
      await attendre(600);
      verifier(await ouvrirDocument(page, 'FAC-2026-00302'), 'la facture brouillon est dans la liste');
      await attendre(800);
      // Sur la fiche : la pastille de statut est le bouton
      const pastille = await page.evaluate(() => { const b = document.querySelector('button[aria-label="Changer le statut"]'); b?.click(); return !!b; });
      verifier(pastille, 'la pastille de la fiche ouvre « Changer le statut »');
      await attendre(500);
      verifier(await choisir(page, 'Envoyée'), 'choix « Envoyée » proposé');
      await attendre(600);
      verifier((await dialogue(page)).includes(TEXTE_EMISSION), 'la confirmation dit l’émission (numéro définitif, avoir)');
      let { devis = [] } = await enregistres(page);
      verifier(devis.find((x) => x.id === 'f-statut-brouillon')?.statut === 'brouillon', 'rien n’est enregistré avant la confirmation');
      verifier(await confirmerDansDialogue(page, 'Émettre la facture'), 'bouton « Émettre la facture »');
      await attendre(1200);
      ({ devis = [] } = await enregistres(page));
      verifier(devis.find((x) => x.id === 'f-statut-brouillon')?.statut === 'envoye', 'facture émise (envoyée)');
      verifier(/Facture émise/.test(await texte(page)), 'message « Facture émise »');
    },
  },
  {
    nom: 'statut (réel simulé) : l’émission reprend le numéro de la base ; un encaissement refusé n’affiche aucune réussite',
    reel: true,
    async executer({ ouvrir, attendre, verifier, sessionFactice }) {
      const { creerBase, UID, ORG, json } = require('../lib/fauxSupabase.cjs');
      const CLIENT = { id: 'c0c0c0c0-0000-4000-8000-000000000701', nom: 'Exemple', prenom: 'Lou', telephone: '0600000007', email: 'lou@exemple.fr', adresse: '9 rue Imaginaire, 24000 Exempleville', created_at: '2026-10-01T08:00:00Z' };
      const lignes = [{ id: 'l1', description: 'Pose prise 2P+T', quantite: 1, unite: 'u', prixUnitaire: 100, tva: 0 }];
      const commun = { client_id: CLIENT.id, type: 'facture', facture_type: 'totale', date: '2026-10-20', date_echeance: '2099-12-31', total_ht: 100, total_tva: 0, total_ttc: 100, tva_rate: 0, created_at: '2026-10-20T08:00:00Z', lignes };
      const BROUILLON = { ...commun, id: 'f0f0f0f0-0000-4000-8000-000000000701', statut: 'brouillon', numero: 'FAC-2026-00009' };
      const ENVOYEE = { ...commun, id: 'f0f0f0f0-0000-4000-8000-000000000702', statut: 'envoye', numero: 'FAC-2026-00005', date_envoi: '2026-10-20' };
      const entreprise = { id: 'e0e0e0e0-0000-4000-8000-000000000701', user_id: UID, organization_id: ORG, nom: 'Élec Exemple', forme_juridique: 'Micro-entreprise',
        siret: '00000000000000', telephone: '0500000000', email: 'contact@exemple.fr', adresse: '1 rue Imaginaire', code_postal: '24000', ville: 'Exempleville',
        decennale_assureur: 'AXA', decennale_numero: 'DEC-1', is_active: true, is_default: true, settings_json: { reglages: { nomEntrepreneur: 'Jean Exemple' } }, created_at: '2026-01-01T00:00:00Z' };
      const refusRls = json({ code: '42501', message: 'new row violates row-level security policy for table "paiements"' }, 403);
      let base = null;
      base = creerBase({ clients: [CLIENT], devis: [BROUILLON, ENVOYEE], entreprise: [entreprise] }, {
        refuser: (m, table, { q, corps }) => {
          if (m === 'POST' && table === 'paiements') return refusRls;
          // La base attribue le numéro à l'émission (101-102) : elle ignore la proposition de l'app
          if (m === 'PATCH' && table === 'devis' && q.includes(BROUILLON.id) && corps?.statut === 'envoye') {
            const i = base.tables.devis.findIndex((x) => x.id === BROUILLON.id);
            base.tables.devis[i] = { ...base.tables.devis[i], ...corps, numero: 'FAC-2026-00042' };
            return json(base.tables.devis[i]);
          }
          return null;
        },
      });
      const { page } = await ouvrir({
        reel: true, largeur: 375, page: 'devis', session: sessionFactice(UID), supabase: base.reponse,
        avantChargement: () => { try { localStorage.setItem('pwa-install-dismissed', String(Date.now())); } catch { /* */ } },
      });
      await attendre(2500);
      await onglet(page, 'Factures');
      await attendre(800);

      // 1. Émission : confirmation, puis le numéro de la base
      verifier(await statutDeLaCarte(page, 'FAC-2026-00009'), 'bouton « Statut » sur la carte du brouillon');
      await attendre(500);
      verifier(await choisir(page, 'Envoyée'), 'choix « Envoyée »');
      await attendre(600);
      verifier((await dialogue(page)).includes(TEXTE_EMISSION), 'confirmation de l’émission');
      verifier(await confirmerDansDialogue(page, 'Émettre la facture'), 'bouton « Émettre la facture »');
      await attendre(1800);
      verifier(base.journal.some((j) => j.m === 'PATCH' && j.table === 'devis' && j.corps?.statut === 'envoye'), 'l’émission part en base');
      const apres = await texte(page);
      verifier(/FAC-2026-00042/.test(apres) && !/FAC-2026-00009/.test(apres), 'la liste montre le numéro attribué par la base (FAC-2026-00042)');

      // 2. « Payée » : encaissement refusé par la base → aucune réussite, la facture reste à encaisser
      verifier(await statutDeLaCarte(page, 'FAC-2026-00005'), 'bouton « Statut » sur la carte de la facture envoyée');
      await attendre(500);
      verifier(await choisir(page, 'Payée'), 'choix « Payée »');
      await attendre(1000);
      const confirme = await page.evaluate(() => {
        const b = [...document.querySelectorAll('[role="dialog"] button')].find((x) => /^Confirmer le paiement/.test(x.innerText.trim()));
        b?.click();
        return !!b;
      });
      verifier(confirme, '« Confirmer le paiement »');
      await attendre(2000);
      verifier(base.journal.some((j) => j.m === 'POST' && j.table === 'paiements'), 'l’encaissement part en base');
      const t = await texte(page);
      verifier(/Non enregistré/.test(t), `le refus est dit (${t.slice(0, 160)})`);
      verifier(!/marquée comme payée|Statut enregistré/.test(t), 'aucun message de réussite');
      verifier(!base.journal.some((j) => j.m === 'PATCH' && j.table === 'devis' && j.corps?.statut === 'payee'), 'le statut « payée » n’est pas demandé à la base');
      verifier(base.tables.devis.find((x) => x.id === ENVOYEE.id).statut === 'envoye', 'en base : facture toujours envoyée');
      verifier(!/Payée le|Soldée/.test(t), 'l’écran ne dit pas la facture payée');
    },
  },
];
