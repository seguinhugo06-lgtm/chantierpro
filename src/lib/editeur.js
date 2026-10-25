/**
 * Identité de l'éditeur de Mallettico, affichée par les pages légales (LegalPages.jsx) et par le texte des CGU
 * (components/legal/TexteCgu.jsx, partagé avec la fenêtre d'acceptation). Sortie de LegalPages.jsx le 25 oct. 2026
 * (relecture, tour 3 : un seul texte de CGU). Un champ inconnu reste null (non affiché), jamais une valeur fictive.
 */
// ─── Mallettico SaaS Company Info (editor) ────────────────────────────────────
// Update these values with the actual company details before launch
// Identité de l'éditeur. À COMPLÉTER par Hugo dès l'immatriculation (structure, SIRET, adresse).
// Les anciennes valeurs (« Mallettico SAS », SIRET 123 456 789 00012, 12 rue de la Tech,
// 01 23 45 67 89, médiateur CM2C) étaient fictives : mieux vaut « en cours » que du faux.
// Un champ à null n'est pas affiché.
export const COMPANY = {
  // Fournie par Hugo dans le Pilote (20 oct. 2026) ; SIREN contrôlé sur l'annuaire des entreprises (EI active depuis
  // 2016). Adresse publiée : son domicile (D-18) ; le transfert du siège au registre est en cours.
  nom: 'Hugo Seguin EI — Mallettico',
  forme: 'Entreprise individuelle (EI)',
  capital: null,
  adresse: '127 cours du Médoc, 33300 Bordeaux',
  siren: '820 207 405',
  rcs: null,
  tva: null,
  email: 'contact@mallettico.fr',
  tel: null,
  dpo: 'contact@mallettico.fr',
  directeur: 'Hugo Seguin',
  qualite: 'Éditeur et directeur de la publication',
  hebergeur: 'Vercel Inc., 440 N Barranca Ave #4133, Covina, CA 91723, États-Unis — https://vercel.com',
  mediateur: null,
};
export const ADRESSE = COMPANY.adresse || 'communiquée sur demande à contact@mallettico.fr (immatriculation en cours)';
