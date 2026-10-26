/**
 * Avancement d'un chantier : la moyenne pondérée de ce que l'on sait (tâches faites 40 %, heures 30 %, achats 30 %).
 * Une seule définition pour la liste, la fiche et la carte (avant : une copie dans Chantiers.jsx lue par les deux).
 *
 * @param {object} chantier      statut, avancement saisi, heures_estimees, budget_materiaux
 * @param {object} [bilan]       résultat de getChantierBilan : heuresTotal, coutMateriaux
 * @param {number} tasksDone     tâches cochées
 * @param {number} tasksTotal    tâches du chantier
 * @returns {number} pourcentage entier, 0 à 100
 */
export function avancementChantier(chantier, bilan, tasksDone, tasksTotal) {
  if (chantier?.statut === 'termine') return 100; // un chantier terminé est à 100 %, quoi que disent les signaux
  const signaux = [];

  // 1. Tâches faites (40 %)
  if (tasksTotal > 0) signaux.push({ valeur: (tasksDone / tasksTotal) * 100, poids: 0.4 });

  // 2. Heures pointées sur les heures prévues (30 %)
  if (chantier?.heures_estimees > 0 && bilan?.heuresTotal > 0) {
    signaux.push({ valeur: Math.min(100, (bilan.heuresTotal / chantier.heures_estimees) * 100), poids: 0.3 });
  }

  // 3. Matériaux achetés sur le budget matériaux (30 %)
  if (chantier?.budget_materiaux > 0 && bilan?.coutMateriaux > 0) {
    signaux.push({ valeur: Math.min(100, (bilan.coutMateriaux / chantier.budget_materiaux) * 100), poids: 0.3 });
  }

  // Aucun signal : l'avancement saisi, avec un minimum pour un chantier commencé
  if (signaux.length === 0) {
    if (tasksTotal > 0) return Math.round((tasksDone / tasksTotal) * 100) || 2; // des tâches listées : un début de préparation
    if (chantier?.statut === 'en_cours') return Math.max(chantier.avancement || 0, 5);
    return chantier?.avancement || 0;
  }

  // Les poids sont ramenés à 1 quand tous les signaux ne sont pas là
  const poidsTotal = signaux.reduce((somme, s) => somme + s.poids, 0);
  return Math.round(signaux.reduce((somme, s) => somme + (s.valeur * s.poids) / poidsTotal, 0));
}

/**
 * L'avancement d'un chantier tel qu'il s'affiche partout (liste, fiche, Accueil, frise, carte) : les tâches du chantier sont
 * comptées ici, l'appelant ne donne que le chantier et son bilan.
 * @param {object} chantier
 * @param {object} [bilan]  résultat de getChantierBilan
 */
export function avancementDuChantier(chantier, bilan) {
  const taches = chantier?.taches || [];
  return avancementChantier(chantier, bilan, taches.filter((t) => t.done).length, taches.length);
}

export default avancementChantier;
