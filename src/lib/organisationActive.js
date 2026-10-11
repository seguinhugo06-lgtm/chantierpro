// src/lib/organisationActive.js
// Quelle organisation ouvrir, et l'invitation en cours d'inscription.
//
// Recette du 11 oct. 2026 (invitation d'une ouvrière sur iPhone) : le lien d'invitation renvoyait
// sur la vitrine, l'inscription créait un espace vide avant l'acceptation, puis l'app ouvrait cet
// espace vide (la plus ancienne adhésion) au lieu de l'équipe rejointe.

const CLE_INVITATION = 'cp_pending_invitation';
const cleOrganisation = (uid) => `cp_organisation_active_${uid}`;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
// Une invitation vaut 7 jours : au-delà de sa date d'expiration (à défaut, 7 jours après avoir été gardé),
// un jeton gardé ne doit plus détourner la connexion.
const DUREE_INVITATION_MS = 7 * 24 * 3600 * 1000;

export const estJeton = (v) => typeof v === 'string' && UUID.test(v);

const lire = (cle) => { try { return localStorage.getItem(cle); } catch { return null; } };
const ecrire = (cle, valeur) => { try { localStorage.setItem(cle, valeur); } catch { /* stockage refusé : on fait sans */ } };
const effacer = (cle) => { try { localStorage.removeItem(cle); } catch { /* idem */ } };

/**
 * Garde l'invitation pendant que l'invité crée son compte ou se connecte (effacée à la déconnexion).
 * @param {{ token: string, organisation?: string, role?: string, expire?: string }} invitation
 */
export function memoriserInvitation({ token, organisation = '', role = '', expire = '' }, maintenant = Date.now()) {
  if (!estJeton(token)) return;
  const fin = Date.parse(expire || '');
  ecrire(CLE_INVITATION, JSON.stringify({
    token, organisation, role,
    fin: Number.isFinite(fin) ? Math.min(fin, maintenant + DUREE_INVITATION_MS) : maintenant + DUREE_INVITATION_MS,
  }));
}

/** @returns {{ token: string, organisation: string, role: string } | null} */
export function invitationEnAttente(maintenant = Date.now()) {
  const brut = lire(CLE_INVITATION);
  if (!brut) return null;
  // Ancien format : le jeton seul
  if (estJeton(brut)) return { token: brut, organisation: '', role: '' };
  try {
    const inv = JSON.parse(brut);
    if (!estJeton(inv?.token) || !(maintenant < Number(inv.fin))) {
      effacer(CLE_INVITATION);
      return null;
    }
    return { token: inv.token, organisation: String(inv.organisation || ''), role: String(inv.role || '') };
  } catch {
    effacer(CLE_INVITATION);
    return null;
  }
}

export function oublierInvitation() {
  effacer(CLE_INVITATION);
}

/** Organisation choisie sur cet appareil par ce compte. */
export function organisationPreferee(uid) {
  if (!uid) return null;
  const v = lire(cleOrganisation(uid));
  return estJeton(v) ? v : null;
}

export function memoriserOrganisation(uid, orgId) {
  if (uid && estJeton(orgId)) ecrire(cleOrganisation(uid), orgId);
}

/**
 * Choisit l'organisation à ouvrir parmi les adhésions du compte :
 *   1. celle choisie sur cet appareil, si le compte en est toujours membre ;
 *   2. sinon, pour un compte sans entreprise à lui, l'équipe rejointe le plus récemment (rôle autre
 *      que propriétaire) : un invité arrive dans l'équipe qui l'a invité, pas dans un espace vide ;
 *      un artisan qui a sa propre entreprise et a rejoint celle d'un confrère retrouve la sienne
 *      (relecture gardien-securite : sinon ses clients et devis partaient chez le confrère) ;
 *   3. sinon la plus ancienne (la règle de get_user_org_id).
 * @param {Array<{ organization_id: string, role: string, joined_at?: string }>} adhesions
 * @param {string|null} preferee
 * @param {{ aSonEntreprise?: boolean }} [options] une organisation dont il est propriétaire a une fiche entreprise
 * @returns {string|null}
 */
export function choisirOrganisation(adhesions, preferee, { aSonEntreprise = false } = {}) {
  const liste = (adhesions || []).filter(a => a && a.organization_id);
  if (liste.length === 0) return null;
  if (preferee && liste.some(a => a.organization_id === preferee)) return preferee;
  const date = (a) => Date.parse(a.joined_at || '') || 0;
  const equipes = liste.filter(a => a.role && a.role !== 'owner').sort((a, b) => date(b) - date(a));
  if (equipes.length && !aSonEntreprise) return equipes[0].organization_id;
  return [...liste].sort((a, b) => date(a) - date(b))[0].organization_id;
}
