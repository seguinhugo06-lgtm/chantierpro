// Administratif (démo, SARL) : l'accueil et le calendrier montrent des échéances futures tirées de la fiche
// entreprise, et ne promettent plus d'e-mail. Avant (constat du 31 oct. 2026) : « Prochaines échéances » vide,
// calendrier en dur arrêté en septembre 2026, réglage « Alertes email » que rien n'envoyait.
const jour = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};
const echeances = (page) => page.evaluate(() => [...document.querySelectorAll('[data-echeance]')].map((x) => ({ id: x.dataset.echeance, texte: x.innerText })));

module.exports = [
  {
    nom: 'administratif (démo) : des échéances futures à l’accueil et au calendrier, questions posées une fois, pas d’e-mail promis (390 px)',
    async executer({ ouvrir, cliquer, attendre, verifier }) {
      const { page } = await ouvrir({ page: 'settings', largeur: 390 });
      const ouvrirAdministratif = async () => {
        await attendre(800);
        await page.evaluate(() => [...document.querySelectorAll('button, a')].find((b) => /^Administratif/.test((b.innerText || '').trim()))?.click());
        await attendre(800);
      };
      await page.evaluate(() => localStorage.removeItem('cp_admin_profil'));
      await page.reload({ waitUntil: 'networkidle0' }).catch(() => {});
      await ouvrirAdministratif();
      const texte = await page.evaluate(() => document.body.innerText);
      verifier(texte.includes('Prochaines échéances'), 'la carte « Prochaines échéances » est affichée');
      verifier(!/Alertes? e-?mail/i.test(texte) && !texte.includes('Rappels envoyés'), 'plus de réglage « Alertes email » ni de rappel envoyé promis');
      verifier(texte.includes('Rappels dans l’application seulement'), 'l’écran dit que les rappels restent dans l’application');

      const accueil = await echeances(page);
      verifier(accueil.length >= 1, `au moins une échéance à l’accueil (${accueil.length})`);
      // L'échéance la plus proche n'est jamais passée (sauf une assurance expirée, à régulariser)
      const passees = accueil.filter((x) => !x.id.startsWith('assurance-') && /Dépassée/.test(x.texte));
      verifier(passees.length === 0, `aucune échéance fiscale ou sociale dépassée (${passees.map((x) => x.id).join(', ')})`);

      // La SARL de démo : trois questions (TVA, impôt, salariés), posées une seule fois
      verifier(await page.evaluate(() => !!document.querySelector('[data-questions-profil]')), 'les questions de profil sont posées');
      await cliquer(page, 'Chaque trimestre (CA3)');
      await cliquer(page, 'L’impôt sur les sociétés');
      await cliquer(page, 'Oui');
      await attendre(300);
      verifier(await page.evaluate(() => !document.querySelector('[data-questions-profil]')), 'plus de question une fois répondu');
      await page.reload({ waitUntil: 'networkidle0' }).catch(() => {});
      await ouvrirAdministratif();
      verifier(await echeances(page).then((l) => l.length >= 1), 'l’Administratif est rouvert');
      verifier(await page.evaluate(() => !document.querySelector('[data-questions-profil]')), 'les réponses sont gardées au rechargement');

      await page.evaluate(() => [...document.querySelectorAll('button[aria-pressed]')].find((b) => b.getAttribute('aria-label') === 'Calendrier')?.click());
      await attendre(500);
      const cal = await echeances(page);
      const ids = cal.map((x) => x.id);
      verifier(cal.length >= 2, `le calendrier liste des échéances à venir (${cal.length})`);
      verifier(ids.some((i) => i.startsWith('dsn-')), `avec salariés : une DSN dans les 90 jours (${ids.join(', ')})`);
      verifier(cal.every((x) => !/Dépassée/.test(x.texte) || x.id.startsWith('assurance-')), 'aucune échéance passée au calendrier');
      const lien = await page.evaluate(() => [...document.querySelectorAll('[data-echeance] a')].map((a) => a.href).find(Boolean));
      verifier(/^https:\/\/www\.(impots\.gouv\.fr|urssaf\.fr|autoentrepreneur\.urssaf\.fr)\//.test(lien || ''), `chaque échéance cite sa source officielle (${lien})`);
      verifier(jour() <= '2027-12-31', 'le calendrier de l’application couvre la date du jour (jusqu’au 31 déc. 2027)');
    },
  },
];
