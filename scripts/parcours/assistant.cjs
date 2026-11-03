// Assistant (prototype, docs/ia/ligne-directrice.md) : les quatre demandes du prototype, en démonstration.
// Ce que l'on vérifie : un geste ouvre l'assistant ; chaque demande donne un résultat prêt à valider ; ce que
// l'assistant ne sait pas (client, HT/TTC, TVA, personne) est demandé ; rien n'est enregistré avant la validation ;
// la validation enregistre vraiment (le brouillon et le pointage apparaissent dans les données).
// Visibilité (Q-ia-demo, option « cache ») : seulement sur /?demo=true&apercu=ia ; contre-essai : absent avec
// /?demo=true seul (le lien « Voir la démo » du site) et en mode réel simulé.

const { creerBase, UID } = require('../lib/fauxSupabase.cjs');

const DLG = '[role="dialog"]';
const BOUTON = 'button[aria-label="Demander (démonstration)"]';
const APERCU = '/?demo=true&apercu=ia';
const JOUR = '2026-11-03';

async function ouvrirAssistant(page, attendre) {
  await page.evaluate((b) => document.querySelector(b)?.click(), BOUTON);
  await attendre(1200);
  return page.evaluate((d) => !!document.querySelector(`${d} [data-ui="assistant"]`), DLG);
}

async function demander(page, attendre, texte) {
  await page.evaluate((d, t) => {
    const b = [...document.querySelectorAll(`${d} button`)].find((x) => x.innerText.trim() === t);
    if (!b) throw new Error(`exemple « ${t} » introuvable`);
    b.click();
  }, DLG, texte);
  await attendre(1000);
}

async function cliquerDans(page, attendre, texte, { partiel = false } = {}) {
  const ok = await page.evaluate((d, t, p) => {
    const b = [...document.querySelectorAll(`${d} button`)].find((x) => (p ? x.innerText.includes(t) : x.innerText.trim() === t) && !x.disabled);
    if (b) b.click();
    return !!b;
  }, DLG, texte, partiel);
  if (!ok) throw new Error(`bouton « ${texte} » introuvable ou désactivé dans l'assistant`);
  await attendre(600);
}

const texteDialogue = (page) => page.evaluate((d) => document.querySelector(d)?.innerText || '', DLG);
const boutonActif = (page, debut) => page.evaluate((d, t) => {
  const b = [...document.querySelectorAll(`${d} button`)].find((x) => x.innerText.trim().startsWith(t));
  return b ? !b.disabled : null;
}, DLG, debut);
const boutonPresent = (page) => page.evaluate((b) => !!document.querySelector(b), BOUTON);
const assistantOuvert = (page) => page.evaluate(() => !!document.querySelector('[data-ui="assistant"]'));
async function ctrlJ(page, attendre) {
  await page.keyboard.down('Control'); await page.keyboard.press('j'); await page.keyboard.up('Control');
  await attendre(1200);
}

module.exports = [
  {
    nom: 'assistant : les quatre demandes du prototype, de la demande à la validation (375 px)',
    async executer({ ouvrir, attendre, verifier }) {
      const { page } = await ouvrir({ page: 'dashboard', largeur: 375, chemin: APERCU, jour: JOUR });
      verifier(await ouvrirAssistant(page, attendre), 'sur /?demo=true&apercu=ia, le bouton « Demander » de l’en-tête ouvre l’assistant');
      let t = await texteDialogue(page);
      verifier(/rien n’est envoyé à vos clients sans votre accord/.test(t), 'l’assistant dit qu’il ne fait rien sans validation');
      verifier(/Démonstration d’une fonction en préparation, pas encore disponible dans Mallettico : réponses simulées/.test(t), 'la démonstration dit que la fonction n’existe pas encore et que les réponses sont simulées');

      // 1. Devis : client confirmé, HT/TTC et TVA demandés, brouillon seulement après les réponses
      await demander(page, attendre, 'Devis pour Mme Martin, remplacement du tableau, 1 200 €');
      t = await texteDialogue(page);
      verifier(/Brouillon de devis/.test(t) && /Remplacement du tableau/.test(t), 'un brouillon de devis est proposé avec la ligne dictée');
      verifier(/C’est bien Jean Martin/.test(t), 'le client « Mme Martin » est confirmé, pas deviné');
      verifier((await boutonActif(page, 'Enregistrer le brouillon')) === false, 'impossible d’enregistrer tant que des questions restent ouvertes');
      await cliquerDans(page, attendre, 'Oui, Jean Martin', { partiel: true });
      await cliquerDans(page, attendre, 'TTC');
      t = await texteDialogue(page);
      verifier(/Quel taux de TVA/.test(t), 'le taux de TVA est demandé, jamais choisi par l’assistant');
      await cliquerDans(page, attendre, '10 %', { partiel: true });
      t = await texteDialogue(page);
      verifier(/Total TTC\s*1\s?200(,00)?\s?€/.test(t) && /Total HT\s*1\s?090,91\s?€/.test(t), `les totaux suivent le montant dicté (${JSON.stringify(t.match(/Total HT[^\n]*\n?[^\n]*/)?.[0])})`);
      verifier((await boutonActif(page, 'Enregistrer le brouillon')) === true, 'le brouillon s’enregistre en un geste une fois tout répondu');
      await cliquerDans(page, attendre, 'Enregistrer le brouillon');
      await attendre(800);
      t = await texteDialogue(page);
      const numero = (t.match(/Brouillon (DEV-[\d-]+) enregistré/) || [])[1];
      verifier(!!numero, `le brouillon est enregistré avec son numéro (${numero})`);
      verifier(/n’est pas envoyé/.test(t), 'le brouillon n’est pas envoyé');
      await cliquerDans(page, attendre, 'Autre demande');

      // 2. Encaissé : un chiffre calculé sur les paiements enregistrés
      await demander(page, attendre, 'Combien j’ai encaissé ce mois-ci');
      t = await texteDialogue(page);
      verifier(/Encaissé ce mois-ci/.test(t) && /\d\s?€/.test(t), 'l’encaissé du mois est affiché en euros');
      verifier(/Calculé sur les paiements que vous avez enregistrés/.test(t), 'la source du chiffre est dite');
      await cliquerDans(page, attendre, 'Corriger ma demande');


      // 3. Relances : factures en retard, message visible, aucun envoi avant validation.
      // La page part du 3 nov. 2026 (ouvrir({ jour })), et les données de démo se calent sur ce jour : aucune facture
      // n'y est échue (l'assistant le dit). On avance donc l'horloge de 40 jours APRÈS le chargement, le temps de cette
      // demande, pour qu'une facture partiellement payée soit en retard ; le point de départ, lui, ne dépend plus du
      // jour où le parcours tourne.
      await page.evaluate(() => {
        const D = Date; const decal = 40 * 86400000;
        window.__DateOrigine = D;
        window.Date = class extends D { constructor(...a) { if (a.length) super(...a); else super(D.now() + decal); } static now() { return D.now() + decal; } };
      });
      await demander(page, attendre, 'Relance les factures en retard');
      t = await texteDialogue(page);
      const nb = Number((t.match(/(\d+) factures? en retard/) || [])[1] || 0);
      verifier(nb > 0, `les factures en retard des données de démo sont listées (${nb})`);
      verifier(/jours? de retard/.test(t) && /dus/.test(t), 'chaque relance montre le reste dû et le retard');
      await cliquerDans(page, attendre, 'Voir le message', { partiel: true });
      t = await texteDialogue(page);
      verifier(/sauf erreur de ma part, la facture/.test(t), 'le message de relance (texte relu de l’app) est visible avant l’envoi');
      t = await texteDialogue(page);
      verifier(/Simuler l’envoi de \d+ relances?/.test(t) && !/Envoyer \d+ relance/.test(t), 'le bouton dit « Simuler l’envoi », jamais « Envoyer N relances »');
      await cliquerDans(page, attendre, 'Simuler l’envoi', { partiel: true });
      t = await texteDialogue(page);
      verifier(/validées?\. Démonstration : aucun message n’est parti/.test(t), 'la validation est confirmée, et la démo dit que rien n’est parti');
      await cliquerDans(page, attendre, 'Autre demande');
      await page.evaluate(() => { window.Date = window.__DateOrigine; });

      // 4. Heures : chantier reconnu, personne demandée, ajout puis annulation
      await demander(page, attendre, 'Ajoute 3 h sur le chantier Dupont');
      t = await texteDialogue(page);
      verifier(/Rénovation cuisine Dupont/.test(t), 'le chantier Dupont est reconnu');
      verifier(/Pour qui/.test(t), 'la personne est demandée (plusieurs dans l’équipe)');
      await cliquerDans(page, attendre, 'Pierre Moreau');
      await cliquerDans(page, attendre, 'Ajouter 3 h');
      await attendre(500);
      t = await texteDialogue(page);
      verifier(/3 h ajoutées sur Rénovation cuisine Dupont/.test(t) && /à approuver/.test(t), 'les heures sont ajoutées, à approuver');
      await cliquerDans(page, attendre, 'Annuler l’ajout');
      t = await texteDialogue(page);
      verifier(/Ajouter 3 h/.test(t), 'l’ajout est annulable');

      // Le brouillon créé existe vraiment dans l'app
      await page.keyboard.press('Escape');
      await attendre(600);
      await page.evaluate(() => [...document.querySelectorAll('nav button')].find((b) => b.innerText.trim() === 'Devis')?.click());
      await attendre(1500);
      // Le numéro relevé à l'enregistrement (nouveau : il n'existait pas avant) doit figurer dans la liste ; chercher
      // « Martin » ne prouvait rien (la démo a déjà un devis de Jean Martin et un chantier « Salle de bain Martin »).
      const liste = await page.evaluate(() => document.body.innerText);
      verifier(!!numero && liste.includes(numero), `la liste des devis montre le brouillon ${numero}`);
    },
  },
  {
    nom: 'assistant : au clavier seul, Ctrl+J ouvre, Entrée prépare, Échap ferme (1440 px)',
    async executer({ ouvrir, attendre, verifier }) {
      const { page } = await ouvrir({ page: 'dashboard', largeur: 1440, chemin: APERCU, jour: JOUR });
      await ctrlJ(page, attendre);
      const focus = await page.evaluate(() => document.activeElement?.closest('[role="dialog"]') !== null);
      verifier(focus, 'Ctrl+J ouvre l’assistant et le focus y est');
      await page.focus('#assistant-demande');
      await page.keyboard.type('combien j’ai encaissé le mois dernier');
      await page.keyboard.press('Enter');
      await attendre(1200);
      const t = await texteDialogue(page);
      verifier(/Encaissé (?!ce mois)/.test(t), 'Entrée prépare la réponse pour le mois dernier');
      await page.keyboard.press('Escape');
      await attendre(600);
      verifier(!(await page.evaluate(() => !!document.querySelector('[data-ui="assistant"]'))), 'Échap ferme l’assistant');
    },
  },
  {
    nom: 'assistant : contre-essai, absent avec /?demo=true seul (lien « Voir la démo » du site), ni bouton ni Ctrl+J (375 px)',
    async executer({ ouvrir, attendre, verifier }) {
      const { page } = await ouvrir({ page: 'dashboard', largeur: 375, jour: JOUR });
      const accueil = await page.evaluate(() => document.body.innerText);
      verifier(/Nouveau devis|Bonjour|Accueil/.test(accueil), 'la démo est bien chargée');
      verifier(!(await boutonPresent(page)), 'aucun bouton « Demander » dans l’en-tête');
      verifier(!/Assistant d’intelligence artificielle|\bDemander\b/.test(accueil), 'ni « Demander » ni « Assistant d’intelligence artificielle » à l’écran');
      await ctrlJ(page, attendre);
      verifier(!(await assistantOuvert(page)), 'Ctrl+J n’ouvre rien');
    },
  },
  {
    nom: 'assistant : contre-essai, absent en mode réel simulé, même avec ?apercu=ia (1440 px)',
    reel: true,
    async executer({ ouvrir, attendre, verifier, sessionFactice }) {
      const base = creerBase({});
      const { page } = await ouvrir({ reel: true, largeur: 1440, page: 'dashboard', chemin: '/?apercu=ia', session: sessionFactice(UID), supabase: base.reponse });
      await attendre(2500);
      const ecran = await page.evaluate(() => document.body.innerText);
      verifier(/Nouveau devis|Accueil|Bonjour/.test(ecran), `le compte réel simulé est ouvert (« ${ecran.slice(0, 80).replace(/\s+/g, ' ')} »)`);
      verifier(!(await boutonPresent(page)), 'aucun bouton « Demander » pour un vrai compte');
      await ctrlJ(page, attendre);
      verifier(!(await assistantOuvert(page)), 'Ctrl+J n’ouvre rien pour un vrai compte');
    },
  },
];
