import { describe, it, expect } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import LegalPages from '../../LegalPages';
import { PLANS, PLAN_ORDER } from '../../../stores/subscriptionStore';
import { MENTION_TVA_ABONNEMENT, prixAbonnement } from '../../../stores/prixAbonnement';

/**
 * CGV, article 4 (plans tarifaires) : chaque plan est décrit par sa liste de `PLANS` (décision D-29 : une seule liste
 * par plan, lue partout). Avant (tâche 7 de la refonte du site), la ligne Équipe annonçait « Jusqu'à 10 utilisateurs,
 * pointage, trésorerie, sous-traitants, statistiques avancées » (rien de cela n'est réservé à Équipe, et la limite est
 * « vous + 10 collaborateurs ») et la ligne Gratuit « 2 chantiers actifs » (l'application compte tous les chantiers).
 */
const lu = (html) => html.replace(/<[^>]*>/g, ' ').replace(/&#x27;/g, "'").replace(/&amp;/g, '&').replace(/[\s  ]+/g, ' ');

/** Le texte de la ligne du tableau des plans dont la première case est `nom`. */
function ligneDuPlan(html, nom) {
  const lignes = html.split('<tr').slice(1).map((l) => lu(`<tr${l}`).trim());
  return lignes.find((l) => l.startsWith(`${nom} `)) || '';
}

describe('CGV : plans tarifaires lus dans PLANS', () => {
  const html = renderToStaticMarkup(<LegalPages page="cgv" isDark={false} couleur="#12336F" setPage={() => {}} />);

  it.each(PLAN_ORDER)('la ligne du plan %s reprend sa liste de PLANS, mot pour mot', (id) => {
    const ligne = ligneDuPlan(html, PLANS[id].name);
    expect(ligne, `ligne ${PLANS[id].name} introuvable`).not.toBe('');
    for (const { name } of PLANS[id].featureLabels) expect(ligne).toContain(lu(name).trim());
  });

  it('ni « 10 utilisateurs », ni fonctions réservées à Équipe, ni « chantiers actifs »', () => {
    const texte = lu(html);
    for (const faux of [/10 utilisateurs/, /statistiques avancées/i, /pointage, trésorerie/i, /chantiers actifs/i]) {
      expect(texte, String(faux)).not.toMatch(faux);
    }
  });

  it('les prix des plans payants passent par prixAbonnement, avec la mention de franchise de TVA', () => {
    expect(ligneDuPlan(html, PLANS.artisan.name)).toContain(lu(`${prixAbonnement(PLANS.artisan)} par mois`));
    expect(ligneDuPlan(html, PLANS.equipe.name)).toContain(lu(`${prixAbonnement(PLANS.equipe)} par mois`));
    expect(lu(html)).toContain(MENTION_TVA_ABONNEMENT);
  });
});
