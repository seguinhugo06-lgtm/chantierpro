// Facturation (recette du 9 oct. 2026), en démo avec des documents posés avant le chargement :
// - deux appuis rapides sur « Facturer » ne créent qu'une facture d'acompte ;
// - un devis déjà entièrement facturé ne se refacture pas ;
// - une facture émise ne propose ni « Modifier » ni « Supprimer » ;
// - « Encaisser » enregistre le paiement reçu et met à jour le reste dû ;
// - une facture entièrement créditée par un avoir n'est plus « à encaisser ».
const path = require('path');

const ligne = { id: 'l1', description: 'Remplacement tableau électrique', quantite: 1, prixUnitaire: 1000, tva: 10 };
const DEVIS_SIGNE = {
  id: 'd-parcours-signe', numero: 'DEV-2026-00095', type: 'devis', statut: 'signe', client_id: 'c1', date: '2026-10-01',
  objet: 'Tableau électrique', lignes: [ligne], sections: [{ id: 's1', titre: '', lignes: [ligne] }],
  tvaRate: 10, total_ht: 1000, tva: 100, total_ttc: 1100,
};
const DEVIS_FACTURE = { ...DEVIS_SIGNE, id: 'd-parcours-facture', numero: 'DEV-2026-00096', statut: 'signe' };
const FACTURE_EMISE = {
  id: 'f-parcours-emise', numero: 'FAC-2026-00096', type: 'facture', facture_type: 'totale', statut: 'envoye',
  devis_source_id: 'd-parcours-facture', client_id: 'c1', date: '2026-10-02', date_echeance: '2026-11-01',
  lignes: [ligne], tvaRate: 10, total_ht: 1000, tva: 100, total_ttc: 1100,
};

async function demoAvec(documents, paiements = []) {
  const { DEMO_DEVIS } = await import(path.resolve(__dirname, '../../src/lib/demo-data.js'));
  return `localStorage.setItem('mallettico_demo_data', ${JSON.stringify(JSON.stringify({ devis: [...DEMO_DEVIS, ...documents], paiements }))});`;
}
const ouvrirDocument = (page, numero) => page.evaluate((n) => {
  const b = [...document.querySelectorAll('[data-ui="LigneListe"] > button')].find((x) => x.innerText.includes(n));
  b?.click();
  return !!b;
}, numero);
const documentsEnregistres = (page) => page.evaluate(() => JSON.parse(localStorage.getItem('mallettico_demo_data') || '{}'));
const texte = (page) => page.evaluate(() => document.body.innerText);

module.exports = [
  {
    nom: 'acompte : deux appuis rapides sur « Facturer » ne créent qu’une facture (375 px)',
    async executer({ ouvrir, cliquer, attendre, verifier }) {
      const { page } = await ouvrir({ page: 'devis', largeur: 375, avantChargement: await demoAvec([DEVIS_SIGNE]) });
      await attendre(800);
      verifier(await ouvrirDocument(page, 'DEV-2026-00095'), 'le devis signé est dans la liste');
      await attendre(800);
      await cliquer(page, 'Facturer');
      await attendre(600);
      const deuxAppuis = await page.evaluate(() => {
        const b = [...document.querySelectorAll('button')].find((x) => /^Facturer\s.*€/.test(x.innerText.trim()));
        if (!b) return false;
        b.click(); b.click();
        return true;
      });
      verifier(deuxAppuis, 'bouton « Facturer … € » de la fenêtre d’acompte');
      await attendre(1500);
      const { devis = [] } = await documentsEnregistres(page);
      const acomptes = devis.filter((d) => d.devis_source_id === 'd-parcours-signe' && d.type === 'facture');
      verifier(acomptes.length === 1, `une seule facture d’acompte (${acomptes.length})`);
    },
  },
  {
    nom: 'devis déjà facturé : pas de seconde facture, facture émise ni modifiable ni supprimable (375 px)',
    async executer({ ouvrir, cliquer, attendre, verifier }) {
      const { page } = await ouvrir({ page: 'devis', largeur: 375, avantChargement: await demoAvec([DEVIS_FACTURE, FACTURE_EMISE]) });
      await attendre(800);
      verifier(await ouvrirDocument(page, 'DEV-2026-00096'), 'le devis est dans la liste');
      await attendre(800);
      const boutons = await page.evaluate(() => [...document.querySelectorAll('main button')].filter((b) => b.offsetParent).map((b) => b.innerText.trim()));
      if (boutons.includes('Facturer')) {
        await cliquer(page, 'Facturer');
        await attendre(800);
        const t = await texte(page);
        verifier(/déjà entièrement facturé/.test(t) || !/Facture d'acompte/.test(t), 'refacturer est refusé');
      }
      const { devis = [] } = await documentsEnregistres(page);
      verifier(devis.filter((d) => d.devis_source_id === 'd-parcours-facture' && d.type === 'facture').length <= 1, 'aucune seconde facture');

      await cliquer(page, 'Retour à la liste');
      await attendre(600);
      await page.evaluate(() => [...document.querySelectorAll('button')].find((b) => b.innerText.trim() === 'Factures')?.click());
      await attendre(600);
      verifier(await ouvrirDocument(page, 'FAC-2026-00096'), 'la facture émise est dans la liste');
      await attendre(800);
      await cliquer(page, "Plus d'actions");
      await attendre(500);
      const menu = await page.evaluate(() => [...document.querySelectorAll('[role="dialog"] button, [role="menu"] button')].map((b) => b.innerText.trim()));
      verifier(menu.length > 0, `menu ouvert (${menu.length} actions)`);
      verifier(!menu.includes('Modifier') && !menu.includes('Supprimer'), `ni « Modifier » ni « Supprimer » (${JSON.stringify(menu)})`);
      verifier(menu.includes('Créer un avoir'), '« Créer un avoir » proposé');
    },
  },
  {
    nom: '« Encaisser » enregistre le paiement reçu et met à jour le reste dû (375 px)',
    async executer({ ouvrir, cliquer, attendre, verifier }) {
      const { page } = await ouvrir({ page: 'devis', largeur: 375, avantChargement: await demoAvec([DEVIS_FACTURE, FACTURE_EMISE]) });
      await attendre(800);
      await page.evaluate(() => [...document.querySelectorAll('button')].find((b) => b.innerText.trim() === 'Factures')?.click());
      await attendre(600);
      verifier(await ouvrirDocument(page, 'FAC-2026-00096'), 'la facture est dans la liste');
      await attendre(800);
      await cliquer(page, 'Encaisser');
      await attendre(600);
      const horsLigne = await page.evaluate(() => {
        const b = [...document.querySelectorAll('button')].find((x) => /Paiement reçu/.test(x.innerText));
        b?.click();
        return !!b;
      });
      verifier(horsLigne, 'option « Paiement reçu (hors ligne) »');
      await attendre(500);
      await page.evaluate(() => {
        const champ = [...document.querySelectorAll('input')].find((i) => i.value === '1100.00');
        if (champ) {
          Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(champ, '400');
          champ.dispatchEvent(new Event('input', { bubbles: true }));
        }
      });
      await attendre(300);
      const confirme = await page.evaluate(() => {
        const b = [...document.querySelectorAll('button')].find((x) => /^Confirmer le paiement/.test(x.innerText.trim()));
        b?.click();
        return !!b;
      });
      verifier(confirme, 'bouton « Confirmer le paiement »');
      await attendre(1500);
      const { paiements = [], devis = [] } = await documentsEnregistres(page);
      const p = paiements.find((x) => x.facture_id === 'f-parcours-emise' || x.devisId === 'f-parcours-emise');
      verifier(!!p && Number(p.montant || p.amount) === 400, `paiement de 400 € enregistré (${JSON.stringify(p || null)})`);
      const f = devis.find((d) => d.id === 'f-parcours-emise');
      verifier(f && Number(f.montant_paye) === 400, `montant reçu sur la facture : ${f?.montant_paye}`);
      verifier(/reste 700/.test((await texte(page)).replace(/ | /g, ' ')), 'la fiche affiche le reste dû (700 €)');
    },
  },
  {
    // Tâche encaissement-corriger (migration 098) : un encaissement ne s'efface pas, il se corrige par une écriture
    // négative motivée qui cite le paiement corrigé
    nom: '« Corriger » un encaissement : écriture négative motivée, reste dû mis à jour (375 px)',
    async executer({ ouvrir, attendre, verifier }) {
      const PAIEMENT = { id: 'p-parcours-1', devis_id: 'f-parcours-emise', facture_id: 'f-parcours-emise', devisId: 'f-parcours-emise',
        montant: 400, amount: 400, date: '2026-10-05', mode: 'virement' };
      const facture = { ...FACTURE_EMISE, montant_paye: 400 };
      const { page } = await ouvrir({ page: 'devis', largeur: 375, avantChargement: await demoAvec([DEVIS_FACTURE, facture], [PAIEMENT]) });
      await attendre(800);
      await page.evaluate(() => [...document.querySelectorAll('button')].find((b) => b.innerText.trim() === 'Factures')?.click());
      await attendre(600);
      verifier(await ouvrirDocument(page, 'FAC-2026-00096'), 'la facture est dans la liste');
      await attendre(800);
      const ouvert = await page.evaluate(() => {
        const b = [...document.querySelectorAll('button')].find((x) => /^Corriger l'encaissement du/.test(x.getAttribute('aria-label') || ''));
        b?.click();
        return !!b;
      });
      verifier(ouvert, 'bouton « Corriger » sur l’encaissement de 400 €');
      await attendre(500);
      const saisir = (index, valeur) => page.evaluate((i, v) => {
        const champs = [...document.querySelectorAll('[role="dialog"] input')];
        Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(champs[i], v);
        champs[i].dispatchEvent(new Event('input', { bubbles: true }));
      }, index, valeur);
      await saisir(0, '100');
      await saisir(1, 'Virement saisi en double');
      await attendre(300);
      const enregistre = await page.evaluate(() => {
        const b = [...document.querySelectorAll('[role="dialog"] button')].find((x) => x.innerText.trim() === 'Enregistrer la correction');
        b?.click();
        return !!b && !b.disabled;
      });
      verifier(enregistre, 'bouton « Enregistrer la correction » actif');
      await attendre(1500);
      const { paiements = [], devis = [] } = await documentsEnregistres(page);
      const c = paiements.find((x) => Number(x.montant ?? x.amount) < 0);
      verifier(!!c && Number(c.montant ?? c.amount) === -100 && c.reference === 'p-parcours-1' && /^Correction : Virement saisi en double$/.test(c.notes || ''),
        `correction enregistrée : -100 €, motif, paiement cité (${JSON.stringify(c || null)})`);
      verifier(paiements.some((x) => x.id === 'p-parcours-1' && Number(x.montant) === 400), 'l’encaissement d’origine reste dans l’historique');
      const f = devis.find((d) => d.id === 'f-parcours-emise');
      verifier(f && Number(f.montant_paye) === 300, `montant reçu sur la facture : ${f?.montant_paye}`);
      verifier(/Correction de l'encaissement du 05\/10\/2026 : Virement saisi en double/.test(await texte(page)),
        'la correction, l’encaissement corrigé et le motif sont affichés');
    },
  },
  {
    nom: 'facture entièrement créditée par un avoir : plus « à encaisser » (375 px)',
    async executer({ ouvrir, attendre, verifier }) {
      const AVOIR = {
        id: 'a-parcours', numero: 'AV-2026-00096', type: 'facture', facture_type: 'avoir', statut: 'envoye', avoir_source_id: 'f-parcours-emise',
        avoir_type: 'total', devis_source_id: 'd-parcours-facture', client_id: 'c1', date: '2026-10-03',
        lignes: [{ ...ligne, prixUnitaire: -1000, montant: -1000 }], total_ht: -1000, tva: -100, total_ttc: -1100,
      };
      const { page } = await ouvrir({ page: 'devis', largeur: 375, avantChargement: await demoAvec([DEVIS_FACTURE, FACTURE_EMISE, AVOIR]) });
      await attendre(800);
      await page.evaluate(() => [...document.querySelectorAll('button')].find((b) => b.innerText.trim() === 'Factures')?.click());
      await attendre(600);
      verifier(await ouvrirDocument(page, 'FAC-2026-00096'), 'la facture est dans la liste');
      await attendre(800);
      const boutons = await page.evaluate(() => [...document.querySelectorAll('main button')].filter((b) => b.offsetParent).map((b) => b.innerText.trim()));
      verifier(!boutons.includes('Encaisser') && !boutons.includes('Relancer'), `ni « Encaisser » ni « Relancer » (${JSON.stringify(boutons.slice(0, 6))})`);
      verifier(/Annulée/.test(await texte(page)), 'la facture est « Annulée »');
    },
  },
  {
    // Tâche confirmation-client : signature sur place chez un particulier (c1, avec adresse e-mail) ; la demande
    // expresse est recueillie avec la signature, et l'exemplaire part par e-mail avec l'accord du client (démo : simulé)
    nom: 'signature sur place : demande expresse enregistrée, exemplaire signé envoyé par e-mail avec l’accord du client (375 px)',
    async executer({ ouvrir, cliquer, attendre, verifier }) {
      const envoye = { ...DEVIS_SIGNE, id: 'd-sur-place', numero: 'DEV-2026-00099', statut: 'envoye' };
      const { page } = await ouvrir({ page: 'devis', largeur: 375, avantChargement: await demoAvec([envoye]) });
      await attendre(800);
      verifier(await ouvrirDocument(page, 'DEV-2026-00099'), 'le devis envoyé est dans la liste');
      await attendre(800);
      await cliquer(page, 'Faire signer');
      await attendre(600);
      const cases = await page.evaluate(() => ({
        demande: !!document.querySelector('[data-ui="DemandeExpresseSurPlace"] input'),
        exemplaire: document.querySelector('[data-ui="ExemplaireParEmail"]')?.innerText || '',
      }));
      verifier(cases.demande && /marie\.dupont@email\.fr/.test(cases.exemplaire), `cases proposées au particulier : demande expresse, exemplaire par e-mail (${cases.exemplaire.slice(0, 70)})`);
      await page.evaluate(() => [...document.querySelectorAll('[role="dialog"] input[type=checkbox], .fixed input[type=checkbox]')].forEach((c) => c.click()));
      await attendre(300);
      await cliquer(page, 'Passer a la signature');
      await attendre(600);
      const canevas = await page.$('canvas');
      const boite = canevas && await canevas.boundingBox();
      if (boite) {
        await page.mouse.move(boite.x + 30, boite.y + 40);
        await page.mouse.down();
        await page.mouse.move(boite.x + 120, boite.y + 80, { steps: 8 });
        await page.mouse.move(boite.x + 200, boite.y + 50, { steps: 8 });
        await page.mouse.up();
      }
      await attendre(300);
      await cliquer(page, 'Valider');
      await attendre(2000);
      const { devis = [] } = await documentsEnregistres(page);
      const d = devis.find((x) => x.id === 'd-sur-place');
      verifier(d && d.signature && d.statut === 'accepte', `devis signé sur place (${d?.statut})`);
      verifier(d && d.execution_anticipee_le && d.execution_anticipee_le === d.signatureDate, `demande expresse enregistrée avec la signature (${d?.execution_anticipee_le})`);
      verifier(d && d.exemplaire_client_le, `exemplaire signé envoyé (démo : simulé) le ${d?.exemplaire_client_le}`);
      verifier(d && d.exemplaire_email_accepte_le === d.signatureDate, `accord du client pour l’e-mail conservé avec la signature (${d?.exemplaire_email_accepte_le})`);
      const fiche = await page.evaluate(() => document.querySelector('[data-ui="ExemplaireEnvoye"]')?.innerText || '');
      verifier(/Exemplaire signé envoyé au client par e-mail le/.test(fiche), `la fiche le dit (${fiche})`);
    },
  },
  {
    // Relecture juriste-btp du 17 oct. 2026 : signé sur place sans accord pour l'e-mail → rappel persistant de
    // l'exemplaire papier signé par les deux (L221-9, nullité L242-1), et rien ne part
    nom: 'signature sur place sans e-mail : la fiche rappelle l’exemplaire papier, rien ne part (375 px)',
    async executer({ ouvrir, cliquer, attendre, verifier }) {
      const envoye = { ...DEVIS_SIGNE, id: 'd-sur-place-papier', numero: 'DEV-2026-00100', statut: 'envoye' };
      const { page } = await ouvrir({ page: 'devis', largeur: 375, avantChargement: await demoAvec([envoye]) });
      await attendre(800);
      verifier(await ouvrirDocument(page, 'DEV-2026-00100'), 'le devis envoyé est dans la liste');
      await attendre(800);
      await cliquer(page, 'Faire signer');
      await attendre(600);
      // Seulement l'acceptation du devis : ni demande expresse, ni e-mail
      await page.evaluate(() => {
        const accepte = [...document.querySelectorAll('input[type=checkbox]')].find((c) => /J'accepte ce devis/.test(c.closest('label')?.innerText || ''));
        accepte?.click();
      });
      await attendre(300);
      await cliquer(page, 'Passer a la signature');
      await attendre(600);
      const canevas = await page.$('canvas');
      const boite = canevas && await canevas.boundingBox();
      if (boite) {
        await page.mouse.move(boite.x + 30, boite.y + 40);
        await page.mouse.down();
        await page.mouse.move(boite.x + 150, boite.y + 70, { steps: 8 });
        await page.mouse.up();
      }
      await attendre(300);
      await cliquer(page, 'Valider');
      await attendre(1500);
      const { devis = [] } = await documentsEnregistres(page);
      const d = devis.find((x) => x.id === 'd-sur-place-papier');
      verifier(d && d.signature && !d.exemplaire_client_le && !d.exemplaire_email_accepte_le, 'signé, aucun exemplaire envoyé ni accord enregistré');
      const rappel = await page.evaluate(() => {
        const el = document.querySelector('[data-ui="ExemplaireAEnvoyer"]');
        return { texte: el?.innerText || '', role: el?.getAttribute('role') };
      });
      verifier(rappel.role === 'alert' && /papier signé par vous deux/.test(rappel.texte) && /contrat est nul/.test(rappel.texte) && /L221-9/.test(rappel.texte),
        `rappel persistant sur la fiche (${rappel.texte.slice(0, 90)})`);
    },
  },
  {
    // Tâche sept-jours : devis signé sur place (pavé de l'app) aujourd'hui chez un particulier (c1, sans catégorie
    // ni entreprise) : aucun acompte ni paiement enregistré avant le 8e jour (C. conso. L221-10).
    nom: 'signé sur place chez un particulier aujourd’hui : ni acompte ni paiement avant le 8e jour (375 px)',
    async executer({ ouvrir, cliquer, attendre, verifier }) {
      const signeLe = new Date().toISOString();
      // Date annoncée : le 8e jour, ou 1 à 3 jours plus tard si le 7e tombe un samedi, un dimanche ou un jour férié
      const dateAnnonceeValide = (texte) => {
        const m = texte.match(/avant le (\d{2})\/(\d{2})\/(\d{4})/);
        if (!m) return false;
        const ecart = Math.round((Date.UTC(+m[3], +m[2] - 1, +m[1]) - Date.UTC(...new Date().toLocaleDateString('en-CA', { timeZone: 'Europe/Paris' }).split('-').map((x, i) => (i === 1 ? +x - 1 : +x)))) / 864e5);
        return ecart >= 8 && ecart <= 11;
      };
      // Payable « à réception » : sans la règle, la facture complète réclamerait le paiement le jour même
      const surPlace = { ...DEVIS_SIGNE, id: 'd-sept-jours', numero: 'DEV-2026-00097', signature: 'data:image/png;base64,AA==', signataire: 'Marie Dupont', signatureDate: signeLe, conditionsPaiement: 'reception' };
      // Second devis signé sur place, déjà facturé : sa facture ne s'encaisse pas non plus pendant les sept jours
      const surPlaceFacture = { ...surPlace, id: 'd-sept-jours-2', numero: 'DEV-2026-00098' };
      const facture = { ...FACTURE_EMISE, id: 'f-sept-jours', numero: 'FAC-2026-00097', devis_source_id: 'd-sept-jours-2' };
      const { page } = await ouvrir({ page: 'devis', largeur: 375, avantChargement: await demoAvec([surPlace, surPlaceFacture, facture]) });
      await attendre(800);
      verifier(await ouvrirDocument(page, 'DEV-2026-00097'), 'le devis signé sur place est dans la liste');
      await attendre(800);
      await cliquer(page, 'Facturer');
      await attendre(600);
      const fenetre = await page.evaluate(() => ({
        raison: document.querySelector('[data-ui="AcompteSeptJours"]')?.innerText || '',
        bouton: [...document.querySelectorAll('button')].find((x) => /^Facturer\s.*€/.test(x.innerText.trim()))?.disabled ?? null,
      }));
      verifier(/n'acceptez aucun paiement avant le/.test(fenetre.raison) && dateAnnonceeValide(fenetre.raison) && /L221-10/.test(fenetre.raison),
        `la fenêtre d’acompte dit pourquoi et jusqu’à quand (${fenetre.raison.slice(0, 120)})`);
      verifier(fenetre.bouton === true, '« Facturer » est désactivé');
      const { devis = [] } = await documentsEnregistres(page);
      verifier(!devis.some((d) => d.devis_source_id === 'd-sept-jours' && d.facture_type === 'acompte'), 'aucune facture d’acompte créée');

      // Facture complète pendant le délai (tâche sept-jours-factures) : émise, mais aucun paiement réclamé avant la fin
      await page.keyboard.press('Escape');
      await attendre(300);
      await page.evaluate(() => [...document.querySelectorAll('button')].find((b) => /^Annuler/.test((b.innerText || '').trim()))?.click());
      await attendre(400);
      const cent = await page.evaluate(() => { const b = [...document.querySelectorAll('button')].find((x) => /^100 %/.test((x.innerText || '').trim())); b?.click(); return !!b; });
      verifier(cent, 'option « 100 % » de la facturation');
      await attendre(500);
      const dialogue = await page.evaluate(() => document.querySelector('[role="dialog"]')?.innerText || '');
      verifier(/n'acceptez aucun paiement avant le/.test(dialogue), `la confirmation rappelle la règle (${dialogue.slice(0, 60)}…)`);
      await page.evaluate(() => { const d = document.querySelector('[role="dialog"]'); [...(d?.querySelectorAll('button') || [])].find((x) => /^Confirmer/.test((x.innerText || '').trim()))?.click(); });
      await attendre(1500);
      const apresFacture = await documentsEnregistres(page);
      const complete = (apresFacture.devis || []).find((d) => d.devis_source_id === 'd-sept-jours' && d.type === 'facture');
      const aujourdhui = new Date().toLocaleDateString('en-CA', { timeZone: 'Europe/Paris' });
      verifier(complete && /^Paiement au plus tôt le \d{2}\/\d{2}\/\d{4} \(article L221-10 du Code de la consommation\)$/.test(complete.conditions || '') && complete.date_echeance > aujourdhui,
        `facture complète émise, échéance au plus tôt (${complete?.date_echeance}, « ${complete?.conditions} »)`);

      await page.keyboard.press('Escape');
      await attendre(300);
      await page.evaluate(() => [...document.querySelectorAll('button')].find((b) => /Annuler/.test(b.innerText))?.click());
      await attendre(300);
      await cliquer(page, 'Retour à la liste');
      await attendre(600);
      await page.evaluate(() => [...document.querySelectorAll('button')].find((b) => b.innerText.trim() === 'Factures')?.click());
      await attendre(600);
      verifier(await ouvrirDocument(page, 'FAC-2026-00097'), 'la facture tirée de ce devis est dans la liste');
      await attendre(800);
      await cliquer(page, 'Encaisser');
      await attendre(600);
      const encaisser = await page.evaluate(() => ({
        raison: document.querySelector('[data-ui="PaiementSeptJours"]')?.innerText || '',
        bouton: [...document.querySelectorAll('button')].find((x) => /^Confirmer le paiement/.test(x.innerText.trim()))?.disabled ?? null,
      }));
      verifier(/n'acceptez aucun paiement avant le/.test(encaisser.raison) && encaisser.bouton === true,
        `« Encaisser » explique et n’enregistre rien (${encaisser.raison.slice(0, 80)} ; bouton désactivé : ${encaisser.bouton})`);
      const apres = await documentsEnregistres(page);
      verifier(!(apres.paiements || []).some((x) => x.facture_id === 'f-sept-jours' || x.devisId === 'f-sept-jours'), 'aucun paiement enregistré');
    },
  },
];
