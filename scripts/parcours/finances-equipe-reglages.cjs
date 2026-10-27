// Finances, Équipe, Paramètres, Mon plan (Task 8 du plan « ancien code », audit UX du 20 oct. 2026 et retours d'Hugo
// sur son compte « Au Bon Volt », 21-23 oct. 2026) : chaque correction de comportement a son parcours ici.
const { creerBase, UID } = require('../lib/fauxSupabase.cjs');

const json = (corps, status = 200) => ({ status, body: JSON.stringify(corps) });
const ORG = '0e0e0e0e-0e0e-4e0e-8e0e-0e0e0e0e0e0e';

// Une entreprise réelle (faux Supabase) : SARL complète, sauf ce que le parcours enlève
const ENTREPRISE = {
  id: 'e0e0e0e0-0000-4000-8000-000000000801', user_id: UID, organization_id: ORG, nom: 'Élec Exemple', forme_juridique: 'SARL',
  adresse: '12 rue de l’Exemple\n33000 Bordeaux', code_postal: '33000', ville: 'Bordeaux', telephone: '05 00 00 00 00', email: 'contact@exemple.fr',
  siret: '00000000000000', is_active: true, is_default: true, settings_json: { reglages: {} }, created_at: '2026-01-01T00:00:00Z',
};
// Au Bon Volt, tel qu'Hugo l'a décrit : micro-entreprise, adresse collée d'un seul tenant, TVA par défaut 10 %
const MICRO = {
  ...ENTREPRISE, id: 'e0e0e0e0-0000-4000-8000-000000000802', nom: 'Au Bon Volt', forme_juridique: 'Micro-entreprise',
  adresse: '127 cours du Médoc33300Bordeaux', code_postal: null, ville: null, siret: '', tva_defaut: 10,
  settings_json: { reglages: { nomEntrepreneur: 'Jean Exemple' } },
};

// Paramètres au téléphone : la liste des rubriques, puis la rubrique avec un retour « Paramètres »
async function rubrique(page, { cliquer }, nom) {
  const dansUneRubrique = await page.evaluate(() => innerWidth < 768 && !document.querySelector('[data-parametres="liste"]'));
  if (dansUneRubrique) await cliquer(page, 'Paramètres');
  if (await page.evaluate(() => innerWidth >= 768)) await cliquer(page, nom, { dans: 'nav[aria-label="Rubriques des paramètres"]' });
  else await cliquer(page, nom, { dans: '[data-parametres="liste"]' });
}
// L'état d'enregistrement affiché près du libellé d'un champ (settings/champsParametres)
const etatDuChamp = (page, id) => page.evaluate((i) => {
  const champ = document.getElementById(i);
  let n = document.querySelector(`label[for="${i}"]`);
  while (n && !n.contains(champ)) n = n.parentElement;
  const etat = n?.querySelector('[data-etat-champ]');
  return etat ? `${etat.dataset.etatChamp} : ${etat.innerText.trim()}` : '';
}, id);
const texteDuCorps = (page) => page.evaluate(() => document.body.innerText);
const fenetreCgu = (page) => page.evaluate(() => [...document.querySelectorAll('[role="dialog"]')].some((d) => /Conditions générales d'utilisation/.test(d.innerText)));

// Frappe au clavier dans un champ, comme au doigt : le champ est vidé, puis le texte tapé touche par touche
async function viderEtTaper(page, selecteur, texte) {
  await page.focus(selecteur);
  // Tout sélectionner (un champ numérique n'a pas de setSelectionRange : select())
  await page.evaluate((s) => { const el = document.querySelector(s); try { el.setSelectionRange(0, el.value.length); } catch { el.select(); } }, selecteur);
  await page.keyboard.press('Backspace');
  if (texte) await page.keyboard.type(texte, { delay: 20 });
}
const ecrituresEntreprise = (base) => base.journal.filter((j) => j.m !== 'GET' && j.table === 'entreprise').map((j) => (Array.isArray(j.corps) ? j.corps[0] : j.corps) || {});

module.exports = [
  {
    // Relecture du 26 oct. 2026 (I1) : « 127 », une espace, une pause ; la base renvoyait « 127 », qui remplaçait la
    // saisie : « 127cours ». Même chose après un retour à la ligne dans la rue et sur la ville (« Saint » + espace).
    nom: 'adresse : une pause après une espace ou un retour à la ligne ne colle pas les mots (réel, 375 px)',
    reel: true,
    async executer({ ouvrir, sessionFactice, cliquer, attendre, verifier }) {
      const base = creerBase({ entreprise: [{ ...MICRO }] });
      const { page } = await ouvrir({ reel: true, largeur: 375, page: 'settings', session: sessionFactice(UID), supabase: (req, u) => base.reponse(req, u) });
      await attendre(1500);
      await rubrique(page, { cliquer }, 'Identité');
      const rue = '#settings-field-adresse';
      await viderEtTaper(page, rue, '12 ');
      await attendre(1400);
      await page.keyboard.type('rue des Lilas', { delay: 20 });
      await page.keyboard.press('Enter');
      await attendre(1400);
      await page.keyboard.type('Bât B', { delay: 20 });
      await attendre(1600);
      const ville = '#settings-field-adresse-ville';
      await viderEtTaper(page, ville, 'Saint ');
      await attendre(1400);
      await page.keyboard.type('Médard', { delay: 20 });
      await attendre(1600);
      const champs = await page.evaluate((r, v) => [document.querySelector(r).value, document.querySelector(v).value], rue, ville);
      verifier(champs[0] === '12 rue des Lilas\nBât B', `la rue tapée reste entière (${JSON.stringify(champs[0])})`);
      verifier(champs[1] === 'Saint Médard', `la ville tapée reste entière (${JSON.stringify(champs[1])})`);
      const derniere = ecrituresEntreprise(base).pop() || {};
      verifier(derniere.adresse === '12 rue des Lilas\nBât B\n33300 Saint Médard' && derniere.ville === 'Saint Médard' && derniere.code_postal === '33300',
        `adresse complète enregistrée (${JSON.stringify(derniere.adresse)}, ${derniere.code_postal}, ${derniere.ville})`);
    },
  },
  {
    // Relecture du 26 oct. 2026 (M « état périmé ») : la rue enregistrée, la ville tapée avant le retour de la base
    // recomposait l'adresse depuis la fiche en mémoire, avec l'ANCIENNE rue. Base lente : 2,5 s par écriture.
    nom: 'adresse : la ville tapée pendant l’enregistrement de la rue ne remet pas l’ancienne rue (réel, base lente, 375 px)',
    reel: true,
    async executer({ ouvrir, sessionFactice, cliquer, attendre, verifier }) {
      const base = creerBase({ entreprise: [{ ...MICRO }] });
      const lente = (req, u) => (req.method() !== 'GET' && u.pathname.endsWith('/entreprise')
        ? new Promise((r) => setTimeout(() => r(base.reponse(req, u)), 2500))
        : base.reponse(req, u));
      const { page } = await ouvrir({ reel: true, largeur: 375, page: 'settings', session: sessionFactice(UID), supabase: lente });
      await attendre(1500);
      await rubrique(page, { cliquer }, 'Identité');
      await viderEtTaper(page, '#settings-field-adresse', '12 rue des Lilas');
      await attendre(1000);
      await viderEtTaper(page, '#settings-field-adresse-ville', 'Pessac');
      await attendre(1000);
      await page.evaluate(() => document.activeElement?.blur());
      await attendre(6000);
      const ecrites = ecrituresEntreprise(base).map((c) => c.adresse).filter(Boolean);
      verifier(ecrites.length >= 2, `deux écritures (${ecrites.length})`);
      verifier(ecrites[ecrites.length - 1] === '12 rue des Lilas\n33300 Pessac', `la dernière garde la nouvelle rue (${JSON.stringify(ecrites)})`);
    },
  },
  {
    // Relecture du 26 oct. 2026 (I2) : chaque frappe enregistrait le seuil ; « 5000 » valait le seuil par défaut (« non
    // réglé ») et le champ se vidait sous les doigts : 50 000 € était impossible à saisir.
    nom: 'trésorerie : le seuil d’alerte se tape en entier, 5 000 puis 50 000 €, et s’enregistre à la sortie du champ (390 px)',
    async executer({ ouvrir, cliquer, attendre, verifier }) {
      const { page } = await ouvrir({ page: 'finances', largeur: 390 });
      await page.evaluate(() => localStorage.setItem('cp_tresorerie_settings', JSON.stringify({ seuilAlerte: 5000, soldeInitial: 20000, soldeDate: '2026-01-01' })));
      await page.reload({ waitUntil: 'networkidle0' }).catch(() => {});
      await attendre(1500);
      await cliquer(page, 'Paramètres de trésorerie');
      const lireReglage = () => page.evaluate(() => JSON.parse(localStorage.getItem('cp_tresorerie_settings') || '{}').seuilAlerte);
      await viderEtTaper(page, '#treso-seuil', '5000');
      verifier(await page.$eval('#treso-seuil', (e) => e.value) === '5000', 'pendant la frappe, le champ garde « 5000 »');
      await page.keyboard.press('Tab');
      await attendre(600);
      verifier(await lireReglage() === 5000, `5 000 € enregistré à la sortie du champ (${await lireReglage()})`);
      verifier(await page.evaluate(() => /5 000 € est aussi la valeur enregistrée par défaut/.test(document.body.innerText.replace(/\s+/g, ' '))), '5 000 € : l’écran dit qu’il ne déclenche pas d’alerte');
      await viderEtTaper(page, '#treso-seuil', '50000');
      verifier(await page.$eval('#treso-seuil', (e) => e.value) === '50000', 'pendant la frappe, le champ garde « 50000 »');
      await page.keyboard.press('Enter');
      await attendre(600);
      verifier(await lireReglage() === 50000, `50 000 € enregistré à Entrée (${await lireReglage()})`);
      verifier(await page.$eval('#treso-seuil', (e) => e.value) === '50000', 'le champ affiche 50000 après l’enregistrement');
    },
  },
  {
    // Avis juriste du 26 oct. 2026 (P2, R13) : le taux de pénalités acceptait 1 %, imprimé tel quel sous le minimum légal.
    nom: 'paramètres : un taux de pénalités sous le minimum légal est refusé, dit, et la saisie gardée (réel, 1440 px)',
    reel: true,
    async executer({ ouvrir, sessionFactice, cliquer, attendre, verifier }) {
      const base = creerBase({ entreprise: [{ ...ENTREPRISE }] });
      const { page } = await ouvrir({ reel: true, largeur: 1440, page: 'settings', session: sessionFactice(UID), supabase: (req, u) => base.reponse(req, u) });
      await attendre(1500);
      await rubrique(page, { cliquer }, 'Documents');
      const taux = () => ecrituresEntreprise(base).map((c) => c.settings_json?.reglages?.tauxPenalites).filter((t) => t !== undefined && t !== '' && t !== null);
      const aide = await page.evaluate(() => document.querySelector('main').innerText.replace(/\s+/g, ' '));
      verifier(/Un taux choisi ne peut pas être inférieur à 3 fois le taux d’intérêt légal, soit \d+,\d{2} % au (1er|2e) semestre \d{4} \(art\. L441-10 II du Code de commerce\)\./.test(aide), 'l’aide dit le minimum du semestre (R13)');
      await viderEtTaper(page, '#settings-field-tauxPenalites', '1');
      await page.keyboard.press('Tab');
      await attendre(1200);
      const refus = await page.evaluate(() => ({
        erreur: document.getElementById('settings-field-tauxPenalites-erreur')?.innerText.replace(/\s+/g, ' ') || '',
        valeur: document.getElementById('settings-field-tauxPenalites').value,
      }));
      verifier(/^Ce taux est inférieur au minimum légal : \d+,\d{2} % au (1er|2e) semestre \d{4} \(3 fois le taux d’intérêt légal, art\. L441-10 II du Code de commerce\)\.$/.test(refus.erreur), `1 % : l’erreur R13 est dite (« ${refus.erreur} »)`);
      verifier(refus.valeur === '1', 'la saisie est gardée');
      verifier(taux().length === 0, `1 % n’est pas enregistré (${JSON.stringify(taux())})`);
      await viderEtTaper(page, '#settings-field-tauxPenalites', '12.4');
      await page.keyboard.press('Tab');
      await attendre(1500);
      verifier(taux().includes(12.4), `12,4 % est enregistré (${JSON.stringify(taux())})`);
      verifier(await page.evaluate(() => !document.getElementById('settings-field-tauxPenalites-erreur')), 'plus d’erreur');
    },
  },
  {
    // Relecture du 26 oct. 2026 : le menu de l'acompte affichait « Choisir… » pour un acompte de 25 % choisi au curseur de
    // l'assistant ; le n° de TVA intracommunautaire redevient proposé dans Légal pour une micro-entreprise (avis juriste).
    nom: 'paramètres : un acompte de 25 % s’affiche dans son menu ; Légal propose le n° de TVA intracom à une micro-entreprise (réel, 375 px)',
    reel: true,
    async executer({ ouvrir, sessionFactice, cliquer, attendre, verifier }) {
      const base = creerBase({ entreprise: [{ ...MICRO, settings_json: { reglages: { ...MICRO.settings_json.reglages, acompteDefaut: 25 } } }] });
      const { page } = await ouvrir({ reel: true, largeur: 375, page: 'settings', session: sessionFactice(UID), supabase: (req, u) => base.reponse(req, u) });
      await attendre(1500);
      await rubrique(page, { cliquer }, 'Documents');
      const acompte = await page.evaluate(() => document.getElementById('settings-field-acompteDefaut')?.innerText.trim());
      verifier(acompte === '25 %', `l’acompte enregistré s’affiche (« ${acompte} »)`);
      await rubrique(page, { cliquer }, 'Légal');
      verifier(await page.evaluate(() => !!document.getElementById('settings-field-tvaIntra')), 'Légal propose le n° de TVA intracommunautaire à une micro-entreprise');
    },
  },
  {
    // Relecture sécurité du 26 oct. 2026 : seul le titulaire du compte gère l'abonnement ; un ouvrier lisait les offres,
    // le code testeur et « Gérer ou résilier ». Et l'écran « Facturation », inatteignable, mène à Mon plan.
    nom: 'mon plan : un ouvrier lit le plan sans pouvoir le changer ; « billing » mène à Mon plan (réel, 375 px)',
    reel: true,
    async executer({ ouvrir, sessionFactice, attendre, verifier }) {
      const base = creerBase({ entreprise: [{ ...ENTREPRISE }] }, { role: 'ouvrier' });
      const { page, browser } = await ouvrir({ reel: true, largeur: 375, page: 'plan', session: sessionFactice(UID), supabase: (req, u) => base.reponse(req, u) });
      await attendre(1800);
      const etat = await page.evaluate(() => {
        const texte = document.querySelector('main')?.innerText || '';
        const boutons = [...document.querySelectorAll('main button')].map((b) => b.innerText.trim());
        return {
          titre: /Mon plan/.test(texte),
          titulaire: texte.includes('Seul le titulaire du compte gère l\'abonnement.'),
          passer: boutons.filter((b) => /^Passer au plan/.test(b)),
          code: boutons.includes("J'ai un code"),
          gerer: boutons.some((b) => /Gérer ou résilier/.test(b)),
        };
      });
      verifier(etat.titre && etat.titulaire, 'Mon plan dit : « Seul le titulaire du compte gère l’abonnement. »');
      verifier(etat.passer.length === 0 && !etat.code && !etat.gerer, `ni offre à souscrire, ni code testeur, ni « Gérer ou résilier » (${JSON.stringify(etat)})`);
      await browser.close();

      const demo = await ouvrir({ page: 'billing', largeur: 375 });
      await attendre(1200);
      const page2 = await demo.page.evaluate(() => ({ courante: localStorage.getItem('cp_current_page'), titre: document.querySelector('main h1')?.innerText }));
      verifier(page2.courante === 'plan' && page2.titre === 'Mon plan', `« billing » mène à Mon plan (${JSON.stringify(page2)})`);
      await demo.browser.close();
    },
  },
  {
    // Relecture sécurité du 26 oct. 2026 : l'export comptable (FEC, écritures) s'affichait au rôle « consultation »,
    // qui n'a pas le droit d'exporter (permissions.js : export: false).
    nom: 'finances : pas d’export comptable pour le rôle consultation (réel, 1440 px)',
    reel: true,
    async executer({ ouvrir, sessionFactice, attendre, verifier }) {
      const base = creerBase({ entreprise: [{ ...ENTREPRISE }] }, { role: 'readonly' });
      const { page } = await ouvrir({ reel: true, largeur: 1440, page: 'finances', session: sessionFactice(UID), supabase: (req, u) => base.reponse(req, u) });
      await attendre(1800);
      const onglets = await page.evaluate(() => [...document.querySelectorAll('main [role="tab"]')].map((t) => t.innerText.replace(/\s+/g, ' ').trim()));
      verifier(onglets.includes('Trésorerie'), `Finances s’ouvre (${JSON.stringify(onglets)})`);
      verifier(!onglets.some((t) => /Export/.test(t)), `pas d’onglet « Export comptable » (${JSON.stringify(onglets)})`);
      verifier(await page.evaluate(() => !/Télécharger l’export/.test(document.body.innerText)), 'aucun bouton d’export dans la page');
    },
  },
  {
    // Avis juriste du 26 oct. 2026 (E2, R19) : 25 jours de congés payés et 10 de RTT inventés pour chacun ; R17.
    nom: 'équipe : congés sans solde inventé, « jours de congés payés posés » et ce qu’ils ne remplacent pas (375 px)',
    async executer({ ouvrir, attendre, verifier }) {
      const { page } = await ouvrir({ page: 'equipe', largeur: 375 });
      await attendre(800);
      await page.evaluate(() => [...document.querySelectorAll('main [role="tab"]')].find((t) => t.innerText.trim().startsWith('Congés'))?.click());
      await attendre(800);
      const etat = await page.evaluate(() => ({
        texte: document.querySelector('main')?.innerText.replace(/\s+/g, ' ') || '',
        cartes: [...document.querySelectorAll('[data-equipe="conges-poses"]')].map((c) => c.innerText.replace(/\s+/g, ' ').trim()),
      }));
      verifier(etat.cartes.length > 0 && etat.cartes.every((c) => /^\d+j de congés payés posés/.test(c)), `cartes : jours posés seulement (${JSON.stringify(etat.cartes.slice(0, 2))})`);
      verifier(!/restants|Solde restant|NaN/.test(etat.texte), 'aucun « jours restants » ni solde');
      verifier(etat.texte.includes('Gardés sur cet appareil seulement : ils ne remplacent ni vos bulletins de paie ni le calcul de votre caisse de congés payés.'), 'ce que la liste ne remplace pas (R17)');
    },
  },
  {
    // Retour d'Hugo (3) : « l'onglet Finances défile tout seul au milieu de la page ». Cause : la rangée d'onglets de la
    // trésorerie ramenait son onglet actif sous les yeux avec scrollIntoView, qui fait aussi défiler la page.
    nom: 'finances : la page s’ouvre en haut, elle ne défile pas toute seule (375 et 1440 px)',
    async executer({ ouvrir, attendre, verifier }) {
      for (const largeur of [375, 1440]) {
        const { page, browser } = await ouvrir({ page: 'finances', largeur });
        await attendre(1500);
        const y = await page.evaluate(() => scrollY);
        verifier(y === 0, `Finances reste en haut de la page à ${largeur} px (défilement : ${y} px)`);
        await browser.close();
      }
    },
  },
  {
    // Audit P1 et décision du contrôleur : pas de seuil d'alerte tant que l'artisan ne l'a pas réglé (5 000 €, valeur
    // par défaut enregistrée, compte comme « non réglé ») ; un seul bandeau au plus.
    nom: 'trésorerie : pas de seuil d’alerte tant qu’il n’est pas réglé, un bandeau au plus (390 px)',
    async executer({ ouvrir, attendre, verifier }) {
      const { page } = await ouvrir({ page: 'finances', largeur: 390 });
      const regler = async (soldeInitial, seuilAlerte) => {
        await page.evaluate((s, a) => {
          localStorage.setItem('cp_tresorerie_settings', JSON.stringify({ seuilAlerte: a, soldeInitial: s, soldeDate: '2026-01-01' }));
          localStorage.removeItem('cp_treso_alert_dismissed');
        }, soldeInitial, seuilAlerte);
        await page.reload({ waitUntil: 'networkidle0' }).catch(() => {});
        await attendre(1500);
        return page.evaluate(() => ({
          solde: (/Solde estimé\s*\n\s*([^\n]+)/.exec(document.body.innerText) || [])[1] || '',
          bandeaux: [...document.querySelectorAll('[data-bandeau-tresorerie]')].map((b) => b.dataset.bandeauTresorerie),
        }));
      };
      const enEuros = (t) => Number(String(t).replace(/−/g, '-').replace(/[^\d,-]/g, '').replace(',', '.'));
      // Sans solde de départ, la démo est sous zéro : un bandeau (le solde négatif prévu), pas deux
      const zero = await regler(0, 5000);
      verifier(zero.bandeaux.length <= 1, `un bandeau au plus (${JSON.stringify(zero.bandeaux)})`);
      // Solde de départ choisi pour un solde estimé de 3 000 € : positif, sous 5 000 €
      const depart = 3000 - enEuros(zero.solde);
      const parDefaut = await regler(depart, 5000);
      verifier(enEuros(parDefaut.solde) === 3000, `solde estimé de 3 000 € (« ${parDefaut.solde} »)`);
      verifier(parDefaut.bandeaux.length === 0, `seuil de 5 000 € par défaut : aucun bandeau (${JSON.stringify(parDefaut.bandeaux)})`);
      const regle = await regler(depart, 8000);
      verifier(JSON.stringify(regle.bandeaux) === '["seuil"]', `seuil réglé à 8 000 € : le bandeau du seuil (${JSON.stringify(regle.bandeaux)})`);
    },
  },
  {
    // Retour d'Hugo (5) : « modification enregistrée » s'affichait à chaque champ. Maintenant l'état se lit près du
    // champ, sans notification ; un refus de la base reste dit (« Non enregistré ») et la saisie est gardée.
    nom: 'paramètres : « Enregistré » près du champ sans notification ; un refus reste « Non enregistré », la saisie gardée (réel, 1440 px)',
    reel: true,
    async executer({ ouvrir, sessionFactice, cliquer, saisir, attendre, verifier }) {
      let refuser = false;
      const base = creerBase({ entreprise: [{ ...ENTREPRISE }] }, {
        refuser: (m, table) => (refuser && table === 'entreprise' ? json({ code: '42501', message: 'new row violates row-level security policy' }, 403) : null),
      });
      const { page } = await ouvrir({ reel: true, largeur: 1440, page: 'settings', session: sessionFactice(UID), supabase: (req, u) => base.reponse(req, u) });
      await attendre(1500);
      await rubrique(page, { cliquer }, 'Identité');
      await page.evaluate(() => {
        window.__notifications = [];
        new MutationObserver(() => {
          const t = document.body.innerText;
          if (/Modifications? enregistrée/i.test(t)) window.__notifications.push('Modification enregistrée');
        }).observe(document.body, { childList: true, subtree: true, characterData: true });
      });
      const ecrituresAvant = base.journal.filter((j) => j.m !== 'GET' && j.table === 'entreprise').length;
      await saisir(page, '#settings-field-slogan', 'Votre électricien de quartier');
      await attendre(1600);
      const ecrit = base.journal.filter((j) => j.m !== 'GET' && j.table === 'entreprise').length - ecrituresAvant;
      verifier(ecrit >= 1, `la saisie est écrite dans la base (${ecrit} écriture)`);
      verifier((await etatDuChamp(page, 'settings-field-slogan')) === 'enregistre : Enregistré', `« Enregistré » près du champ (« ${await etatDuChamp(page, 'settings-field-slogan')} »)`);
      verifier((await page.evaluate(() => window.__notifications)).length === 0, 'aucune notification « modification enregistrée »');

      refuser = true;
      await saisir(page, '#settings-field-siteWeb', 'www.exemple.fr');
      await attendre(1600);
      verifier((await etatDuChamp(page, 'settings-field-siteWeb')) === 'erreur : Non enregistré', `refus de la base : « Non enregistré » (« ${await etatDuChamp(page, 'settings-field-siteWeb')} »)`);
      await attendre(4000);
      verifier((await etatDuChamp(page, 'settings-field-siteWeb')) === 'erreur : Non enregistré', 'le refus reste affiché (il ne s’efface pas comme « Enregistré »)');
      verifier(await page.$eval('#settings-field-siteWeb', (e) => e.value) === 'www.exemple.fr', 'la saisie est gardée dans le champ');
      verifier(!/Enregistré(?!\w)/.test((await etatDuChamp(page, 'settings-field-siteWeb')).replace('Non enregistré', '')), 'pas de « Enregistré » pour le champ refusé');
    },
  },
  {
    // Retour d'Hugo (4) : l'assistant affichait « 127 cours du Médoc33300Bordeaux ». L'adresse se saisit en trois champs ;
    // l'adresse complète (lue par les deux générateurs de documents) et les colonnes code postal et ville sont écrites.
    nom: 'paramètres : l’adresse en trois champs, relue depuis une adresse collée, enregistrée en entier (réel, 375 px)',
    reel: true,
    async executer({ ouvrir, sessionFactice, cliquer, saisir, attendre, verifier }) {
      const base = creerBase({ entreprise: [{ ...MICRO }] });
      const { page } = await ouvrir({ reel: true, largeur: 375, page: 'settings', session: sessionFactice(UID), supabase: (req, u) => base.reponse(req, u) });
      await attendre(1500);
      await rubrique(page, { cliquer }, 'Identité');
      // Une micro-entreprise n'a pas de capital social : le champ n'est pas proposé (avis juriste, R10)
      verifier(await page.evaluate(() => !document.getElementById('settings-field-capital')), 'pas de champ « Capital social » pour une micro-entreprise');
      const lus = await page.evaluate(() => ['settings-field-adresse', 'settings-field-adresse-code-postal', 'settings-field-adresse-ville'].map((i) => document.getElementById(i)?.value));
      verifier(JSON.stringify(lus) === JSON.stringify(['127 cours du Médoc', '33300', 'Bordeaux']), `adresse collée relue en trois champs (${JSON.stringify(lus)})`);
      await saisir(page, '#settings-field-adresse-ville', 'Le Bouscat');
      await attendre(1600);
      const ecriture = base.journal.filter((j) => j.m !== 'GET' && j.table === 'entreprise').pop()?.corps || {};
      const ligne = Array.isArray(ecriture) ? ecriture[0] : ecriture;
      verifier(ligne.adresse === '127 cours du Médoc\n33300 Le Bouscat', `adresse complète enregistrée pour les documents (${JSON.stringify(ligne.adresse)})`);
      verifier(ligne.code_postal === '33300' && ligne.ville === 'Le Bouscat', `code postal et ville enregistrés (${ligne.code_postal}, ${ligne.ville})`);
      const debordement = await page.evaluate(() => document.documentElement.scrollWidth - innerWidth);
      verifier(debordement <= 0, `rien ne déborde à 375 px (${debordement} px)`);
    },
  },
  {
    // Retours d'Hugo (10) et (9) : l'assistant proposait 10 % de TVA à une micro-entreprise ; et le fond d'une fenêtre de
    // formulaire laissait un « petit jour » en haut. Ici : franchise en base, 0 %, mention 293 B ; le fond couvre l'écran.
    nom: 'assistant : une micro-entreprise est présumée en franchise (pas de TVA, art. 293 B), avec la sortie dite ; n° de TVA intracom proposé ; fond plein écran (réel, 375 et 1440 px)',
    reel: true,
    async executer({ ouvrir, sessionFactice, cliquer, attendre, verifier }) {
      for (const largeur of [375, 1440]) {
        const base = creerBase({ entreprise: [{ ...MICRO }] });
        const { page, browser } = await ouvrir({ reel: true, largeur, page: 'settings', session: sessionFactice(UID), supabase: (req, u) => base.reponse(req, u) });
        await attendre(1500);
        await cliquer(page, 'Compléter avec l’assistant');
        const fond = await page.evaluate(() => {
          const d = [...document.querySelectorAll('[role="dialog"]')].find((x) => /Étape 1 sur 5/.test(x.innerText));
          let f = d;
          while (f && getComputedStyle(f).position !== 'fixed') f = f.parentElement;
          const r = f?.getBoundingClientRect();
          // Le « petit jour » se mesure en haut. En largeur, `html { scrollbar-gutter: stable }` (src/index.css) réserve la
          // place d'une barre de défilement classique au bureau (6 px) : le fond s'arrête avant, d'où la tolérance.
          return r ? { t: Math.round(r.top), h: Math.round(r.height), w: Math.round(r.width), H: innerHeight, W: innerWidth } : null;
        });
        verifier(!!fond && fond.t === 0 && fond.h === fond.H && fond.w >= fond.W - 20, `le fond de l’assistant couvre l’écran depuis le haut à ${largeur} px (${JSON.stringify(fond)})`);
        await cliquer(page, 'Suivant', { dans: '[role="dialog"]' });
        // Étape 2 : le n° de TVA intracommunautaire, pour toutes les formes (avis juriste du 26 oct. 2026)
        verifier(await page.evaluate(() => !!document.getElementById('assistant-tvaIntra')), `le n° de TVA intracommunautaire est proposé à une micro-entreprise à ${largeur} px`);
        await cliquer(page, 'Suivant', { dans: '[role="dialog"]' });
        const tva = await page.evaluate(() => {
          const d = [...document.querySelectorAll('[role="dialog"]')].find((x) => /Étape \d sur 5/.test(x.innerText));
          const franchise = d?.querySelector('[data-tva-franchise]');
          return {
            etape: /Étape 3 sur 5/.test(d?.innerText || ''),
            franchise: franchise?.innerText.replace(/\s+/g, ' ') || '',
            choisi: [...(d?.querySelectorAll('[aria-pressed="true"]') || [])].map((b) => b.innerText.trim()),
          };
        });
        verifier(tva.etape, 'étape « Documents » de l’assistant');
        verifier(/Pas de TVA : franchise en base/.test(tva.franchise) && /TVA non applicable, art\. 293 B du CGI/.test(tva.franchise)
          && /Mallettico suppose que vous êtes en franchise en base de TVA/.test(tva.franchise) && /choisissez le statut « Entreprise individuelle \(EI\) »/.test(tva.franchise),
          `franchise présumée, mention 293 B et sortie par le statut EI (R1, R2) à ${largeur} px (« ${tva.franchise.slice(0, 160)} »)`);
        verifier(!tva.choisi.some((t) => /10 %/.test(t)), `10 % n’est pas proposé ni choisi (${JSON.stringify(tva.choisi)})`);
        await browser.close();
      }
    },
  },
  {
    // Retour d'Hugo (7) : menus natifs coupés en bas au téléphone, « recommandé BTP » invérifiable. Retour (6) : lexique.
    nom: 'paramètres : menus de l’interface sans « recommandé », et l’aide d’un mot difficile s’ouvre au doigt et au clavier (375 px)',
    async executer({ ouvrir, cliquer, attendre, verifier }) {
      const { page } = await ouvrir({ page: 'settings', largeur: 375 });
      for (const r of ['Identité', 'Légal', 'Banque', 'Documents']) {
        await rubrique(page, { cliquer }, r);
        const etat = await page.evaluate(() => ({
          natifs: [...document.querySelectorAll('main select')].filter((s) => s.getBoundingClientRect().width > 0).length,
          recommande: /recommand/i.test(document.querySelector('main')?.innerText || ''),
        }));
        verifier(etat.natifs === 0 && !etat.recommande, `${r} : aucune liste native, aucun « recommandé » (${JSON.stringify(etat)})`);
      }
      await rubrique(page, { cliquer }, 'Banque');
      await page.evaluate(() => document.getElementById('settings-field-modePaiementDefaut')?.click());
      await attendre(500);
      const volet = await page.evaluate(() => {
        const options = [...document.querySelectorAll('[role="radio"]')].filter((o) => o.getBoundingClientRect().width > 0);
        const bas = Math.max(...options.map((o) => o.getBoundingClientRect().bottom));
        return { n: options.length, textes: options.map((o) => o.innerText.replace(/\s+/g, ' ').trim()), dansEcran: bas <= innerHeight };
      });
      verifier(volet.n >= 3 && volet.dansEcran, `le mode de paiement s’ouvre dans le volet de l’app, entier à l’écran (${volet.n} choix)`);
      verifier(!volet.textes.some((t) => /recommand/i.test(t)), `aucun choix « recommandé » (${JSON.stringify(volet.textes)})`);
      await page.keyboard.press('Escape');
      await attendre(300);

      await rubrique(page, { cliquer }, 'Légal');
      const aide = '[aria-label="Qu\'est-ce que le SIRET ?"]';
      const lire = () => page.evaluate((s) => {
        const b = document.querySelector(s);
        const t = document.getElementById(b?.getAttribute('aria-controls'));
        return { ouvert: b?.getAttribute('aria-expanded'), visible: !!t && !t.hidden && t.getBoundingClientRect().height > 0, texte: t?.innerText || '' };
      }, aide);
      await page.click(aide);
      await attendre(300);
      const auDoigt = await lire();
      verifier(auDoigt.ouvert === 'true' && auDoigt.visible && /14 chiffres|SIREN/.test(auDoigt.texte), `l’aide du SIRET s’ouvre (« ${auDoigt.texte.slice(0, 80)} »)`);
      await page.focus(aide);
      await page.keyboard.press('Enter');
      await attendre(300);
      const auClavier = await lire();
      verifier(auClavier.ouvert === 'false' && !auClavier.visible, 'au clavier (Entrée), elle se referme');
      const cible = await page.evaluate((s) => { const r = document.querySelector(s).getBoundingClientRect(); return Math.round(Math.min(r.width, r.height)); }, aide);
      verifier(cible >= 44, `cible de 44 px au moins (${cible} px)`);
    },
  },
  {
    // Relecture juriste H3 : la case « Pénalités de retard » ne faisait rien (aucun générateur ne la lisait).
    nom: 'paramètres : pénalités de retard sans case inutile, avec l’article qui les impose (1440 px)',
    async executer({ ouvrir, cliquer, verifier }) {
      const { page } = await ouvrir({ page: 'settings', largeur: 1440 });
      await rubrique(page, { cliquer }, 'Documents');
      const etat = await page.evaluate(() => ({
        sousTitre: document.querySelector('main')?.innerText.includes('Art. L441-10 du Code de commerce — imprimé sur les documents de vos clients professionnels'),
        caseInutile: !!document.getElementById('settings-field-mentionPenalites') || [...document.querySelectorAll('main input[type="checkbox"], main [role="switch"]')]
          .some((c) => /Pénalités de retard/.test(c.closest('label, div')?.innerText || '')),
      }));
      verifier(etat.sousTitre, 'le sous-titre dit l’article L441-10, mot pour mot');
      verifier(!etat.caseInutile, 'plus de case « Pénalités de retard »');
    },
  },
  {
    // Retour d'Hugo (2) : « l'acceptation des CGU surgit au clic sur la couleur du profil ». Seule l'activation d'un envoi
    // automatique les demande ; couleur, champs, choix et interrupteurs des documents, non.
    nom: 'paramètres : couleur, champ, choix et interrupteur s’enregistrent sans demander les CGU (réel, compte sans acceptation, 375 px)',
    reel: true,
    async executer({ ouvrir, sessionFactice, cliquer, saisir, attendre, verifier }) {
      const base = creerBase({ entreprise: [{ ...ENTREPRISE }] });
      const { page } = await ouvrir({ reel: true, largeur: 375, page: 'settings', session: sessionFactice(UID), supabase: (req, u) => base.reponse(req, u),
        avantChargement: () => { try { localStorage.setItem('pwa-install-dismissed', String(Date.now())); } catch { /* */ } } });
      await attendre(1500);
      const ecritures = () => base.journal.filter((j) => j.m !== 'GET' && j.table === 'entreprise').length;
      let avant = ecritures();
      const ecrit = (geste) => { const n = ecritures() - avant; avant = ecritures(); verifier(n >= 1, `${geste} : enregistré (${n} écriture)`); };
      await rubrique(page, { cliquer }, 'Identité');
      const couleur = await page.evaluate(() => {
        const b = [...document.querySelectorAll('button[aria-label]')].find((x) => x.getAttribute('aria-label').startsWith('Bleu nuit'));
        b?.scrollIntoView({ block: 'center', behavior: 'instant' });
        b?.click();
        return !!b;
      });
      verifier(couleur, 'la pastille « Bleu nuit » est proposée');
      await attendre(1200);
      verifier(!(await fenetreCgu(page)), 'la couleur ne demande pas les CGU');
      ecrit('la couleur');
      await saisir(page, '#settings-field-slogan', 'Votre électricien');
      await attendre(1600);
      verifier(!(await fenetreCgu(page)), 'un champ ne demande pas les CGU');
      ecrit('le champ');
      await rubrique(page, { cliquer }, 'Documents');
      await page.evaluate(() => document.getElementById('settings-field-validiteDevis')?.click());
      await attendre(400);
      await page.evaluate(() => [...document.querySelectorAll('[role="radio"]')].find((o) => o.innerText.trim().startsWith('2 mois'))?.click());
      await attendre(1200);
      verifier(!(await fenetreCgu(page)), 'un choix ne demande pas les CGU');
      ecrit('le choix');
      await page.evaluate(() => { const s = document.getElementById('settings-field-mentionGaranties'); s?.scrollIntoView({ block: 'center', behavior: 'instant' }); s?.click(); });
      await attendre(1200);
      verifier(!(await fenetreCgu(page)), 'un interrupteur des documents ne demande pas les CGU');
      ecrit('l’interrupteur');
    },
  },
  {
    // Règle du projet : un chef de chantier ou un ouvrier ne voit aucun montant (usePermissions().canViewPrices).
    nom: 'équipe : un chef de chantier ne voit ni taux horaire, ni coût, ni « € » (réel, 375 et 1440 px)',
    reel: true,
    async executer({ ouvrir, sessionFactice, attendre, verifier }) {
      const auj = new Date().toISOString().slice(0, 10);
      const donnees = {
        entreprise: [{ ...ENTREPRISE }],
        equipe: [
          { id: 'a0000000-0000-4000-8000-000000000001', nom: 'Moreau', prenom: 'Pierre', role: 'Chef de chantier', taux_horaire: 45, cout_horaire_charge: 28, actif: true, type: 'employe', created_at: '2026-01-01T00:00:00Z' },
          { id: 'a0000000-0000-4000-8000-000000000002', nom: 'Petit', prenom: 'Lucas', role: 'Ouvrier', taux_horaire: 32, cout_horaire_charge: 21, actif: true, type: 'employe', created_at: '2026-01-01T00:00:00Z' },
        ],
        pointages: [
          { id: 'b0000000-0000-4000-8000-000000000001', employe_id: 'a0000000-0000-4000-8000-000000000001', date: auj, heures: 8, approuve: true, created_at: `${auj}T08:00:00Z` },
          { id: 'b0000000-0000-4000-8000-000000000002', employe_id: 'a0000000-0000-4000-8000-000000000002', date: auj, heures: 7, approuve: false, created_at: `${auj}T08:00:00Z` },
        ],
      };
      for (const largeur of [375, 1440]) {
        const base = creerBase(JSON.parse(JSON.stringify(donnees)), { role: 'chef_chantier' });
        const { page, browser } = await ouvrir({ reel: true, largeur, page: 'equipe', session: sessionFactice(UID), supabase: (req, u) => base.reponse(req, u) });
        await attendre(1800);
        const vue = await page.evaluate(() => document.querySelector('main')?.innerText || '');
        verifier(/Moreau|Pierre/.test(vue), `l’équipe est listée à ${largeur} px`);
        verifier(!/€|Coût|Taux horaire/.test(vue), `aucun montant dans la vue d’ensemble à ${largeur} px (« ${(vue.match(/.{0,30}(€|Coût|Taux horaire).{0,30}/) || [''])[0]} »)`);
        const fiche = await page.evaluate(() => { const b = document.querySelector('[aria-label^="Fiche de "]'); b?.click(); return !!b; });
        verifier(fiche, 'la fiche d’un salarié s’ouvre');
        await attendre(800);
        const texteFiche = await page.evaluate(() => [...document.querySelectorAll('.fixed')].map((e) => e.innerText).join('\n'));
        verifier(!/€|Coût chargé|Taux horaire/.test(texteFiche), `aucun montant dans la fiche à ${largeur} px (« ${(texteFiche.match(/.{0,30}(€|Coût chargé|Taux horaire).{0,30}/) || [''])[0]} »)`);
        await browser.close();
      }
    },
  },
  {
    // Audit P2 : deux rangées d'onglets ; « 0 h ce mois » alors que des pointages attendaient.
    nom: 'équipe : une seule rangée d’onglets, et les heures à valider dites sur la carte de chacun (375 px)',
    async executer({ ouvrir, verifier }) {
      const { page } = await ouvrir({ page: 'equipe', largeur: 375 });
      const etat = await page.evaluate(() => ({
        rangees: [...document.querySelectorAll('main [role="tablist"]')].filter((t) => t.getBoundingClientRect().height > 0).length,
        heures: [...document.querySelectorAll('[data-equipe="heures-mois"]')].map((e) => e.innerText.replace(/\s+/g, ' ').trim()),
        debordement: document.documentElement.scrollWidth - innerWidth,
      }));
      verifier(etat.rangees === 1, `une seule rangée d’onglets (${etat.rangees})`);
      verifier(etat.heures.length > 0 && etat.heures.every((t) => /validées ce mois/.test(t)), `chaque carte dit les heures validées (${JSON.stringify(etat.heures.slice(0, 3))})`);
      verifier(etat.heures.some((t) => /à valider/.test(t)), `les heures en attente sont dites « à valider » (${JSON.stringify(etat.heures.slice(0, 3))})`);
      verifier(etat.debordement <= 0, `rien ne déborde (${etat.debordement} px)`);
    },
  },
  {
    // Audit P2/P3 « Mon plan » : pas de bandeau sur la page, « Gratuit » (plus « Découverte »), l'offre en cours en
    // premier au téléphone, le code testeur replié ; « Gérer ou résilier » discret sous les offres ; sur l'Accueil, une
    // limite dépassée dite « Limite atteinte », et « Passer au plan Artisan » en bouton secondaire (plus « Upgrade »).
    nom: 'mon plan : ni bandeau ni « Découverte », offre en cours en premier, code replié, « Gérer ou résilier » discret ; Accueil : « Limite atteinte » (375 px)',
    async executer({ ouvrir, verifier }) {
      const gratuit = await ouvrir({ page: 'plan', largeur: 375, plan: 'gratuit' });
      const g = await gratuit.page.evaluate(() => {
        const cartes = [...document.querySelectorAll('[data-plan]')].map((c) => ({ id: c.dataset.plan, haut: c.getBoundingClientRect().top }));
        return {
          bandeau: !!document.querySelector('[data-bandeau="plan"]'),
          texte: document.body.innerText,
          premiere: cartes.sort((a, b) => a.haut - b.haut)[0]?.id,
          code: !!document.getElementById('code-testeur'),
          debordement: document.documentElement.scrollWidth - innerWidth,
        };
      });
      verifier(!g.bandeau, 'pas de bandeau « Plan Gratuit actif » sur Mon plan');
      verifier(!/Découverte/.test(g.texte), 'plus l’ancien nom « Découverte »');
      verifier(g.premiere === 'gratuit', `l’offre en cours d’abord (${g.premiere})`);
      verifier(!g.code && /J'ai un code/.test(g.texte), 'le code testeur est replié sous « J’ai un code »');
      verifier(g.debordement <= 0, `rien ne déborde (${g.debordement} px)`);
      await gratuit.browser.close();

      const abonne = await ouvrir({ page: 'plan', largeur: 375, plan: 'artisan' });
      const a = await abonne.page.evaluate(() => {
        const cartes = [...document.querySelectorAll('[data-plan]')].map((c) => ({ id: c.dataset.plan, haut: c.getBoundingClientRect().top }));
        const boutons = [...document.querySelectorAll('button')].map((b) => b.innerText.trim());
        return { premiere: cartes.sort((x, y) => x.haut - y.haut)[0]?.id, gerer: boutons.includes('Gérer ou résilier mon abonnement'), annuler: boutons.some((t) => /Annuler l.abonnement/.test(t)) };
      });
      verifier(a.premiere === 'artisan', `abonné Artisan : son offre d’abord (${a.premiere})`);
      verifier(a.gerer && !a.annuler, '« Gérer ou résilier mon abonnement » à la place d’« Annuler l’abonnement » en rouge');
      await abonne.browser.close();

      const accueil = await ouvrir({ page: 'dashboard', largeur: 375, plan: 'gratuit' });
      const d = await accueil.page.evaluate(() => {
        const carte = document.querySelector('[data-carte="usage-plan"]');
        const bouton = carte && [...carte.querySelectorAll('button')].find((b) => /Passer au plan/.test(b.innerText));
        return {
          carte: !!carte,
          texte: carte?.innerText.replace(/\s+/g, ' ') || '',
          plein: bouton ? /\bbg-accent\b/.test(bouton.className) : null,
          upgrade: /Upgrade/.test(document.body.innerText),
          atteintes: [...document.querySelectorAll('[data-jauge][data-etat="atteinte"]')].map((j) => j.innerText.replace(/\s+/g, ' ').trim()),
        };
      });
      verifier(d.carte && /Passer au plan Artisan/.test(d.texte) && d.plein === false && !d.upgrade, `« Passer au plan Artisan » en bouton secondaire, plus « Upgrade » (« ${d.texte.slice(0, 80)} »)`);
      // Le stockage n'est ni compté ni appliqué : pas de jauge « 0 Mo sur 100 Mo » (avis juriste du 26 oct., Q7)
      verifier(!/Stockage/.test(d.texte), 'pas de jauge de stockage jamais comptée');
      verifier(d.atteintes.length > 0 && d.atteintes.every((t) => /Limite atteinte : \d+ \S+/.test(t)) && !/\d+ \/ \d+/.test(d.texte),
        `une limite dépassée se dit « Limite atteinte », jamais « 10 / 2 » (${JSON.stringify(d.atteintes)})`);
      await accueil.browser.close();
    },
  },
];
