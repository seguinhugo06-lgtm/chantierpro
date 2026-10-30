// src/context/OrgContext.jsx
// Organization + Role context for multi-user RBAC
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { supabase, isDemo, auth } from '../supabaseClient';
import { choisirOrganisation, organisationPreferee, memoriserOrganisation, invitationEnAttente } from '../lib/organisationActive';

const creationsEnCours = new Map();

/**
 * Crée l'organisation par défaut du compte, une seule fois même si plusieurs résolutions
 * démarrent ensemble (inscription : trois appels simultanés avaient créé trois organisations,
 * 8 oct. 2026). Le verrou de create_default_org (migration 079) reste la vraie garantie.
 * @param {{ rpc: Function }} client
 * @param {string} uid
 */
export function creerOrganisationParDefaut(client, uid) {
  if (!creationsEnCours.has(uid)) {
    const promesse = Promise.resolve()
      .then(() => client.rpc('create_default_org', { p_user_id: uid }))
      .finally(() => creationsEnCours.delete(uid));
    creationsEnCours.set(uid, promesse);
  }
  return creationsEnCours.get(uid);
}

/**
 * @typedef {'owner'|'admin'|'comptable'|'chef_chantier'|'ouvrier'|'readonly'} OrgRole
 *
 * @typedef {Object} OrgMember
 * @property {string} id
 * @property {string} user_id
 * @property {OrgRole} role
 * @property {string} joined_at
 * @property {string} [equipe_member_id]
 *
 * @typedef {Object} OrgContextValue
 * @property {string|null} orgId - Current organization UUID
 * @property {string} orgName - Organization display name
 * @property {OrgRole} role - Current user's role
 * @property {OrgMember[]} members - All org members
 * @property {boolean} loading - Whether org resolution is in progress
 * @property {boolean} droitsNonCharges - L'adhésion n'a pas pu être lue : rôle le plus faible, dit à l'écran
 * @property {boolean} isOwner
 * @property {boolean} isAdmin - owner OR admin
 * @property {Function} refreshOrg - Re-fetch org data
 * @property {Array<{id: string, nom: string, role: OrgRole}>} organisations - Organisations du compte
 * @property {Function} changerOrganisation - Ouvre une autre organisation du compte (recharge l'app)
 */

const OrgContext = createContext(/** @type {OrgContextValue} */ ({
  orgId: null,
  orgName: '',
  role: null,
  droitsNonCharges: false,
  members: [],
  loading: true,
  isOwner: false,
  isAdmin: false,
  refreshOrg: () => {},
  organisations: [],
  changerOrganisation: () => {},
}));

/**
 * Hook to access org context
 * @returns {OrgContextValue}
 */
export function useOrg() {
  return useContext(OrgContext);
}

/**
 * OrgProvider — resolves current user's organization and role
 * Must be placed between AppProvider and DataProvider in the tree
 */
// Rôle donné quand l'adhésion n'a pas pu être lue : aucun montant, aucune action réservée (tous les comptes ont
// une adhésion avec un rôle : relevé en production le 30 oct. 2026, 13 comptes sur 13)
const ROLE_SANS_DROITS = 'ouvrier';

export function OrgProvider({ children }) {
  const [orgId, setOrgId] = useState(null);
  const [orgName, setOrgName] = useState('');
  // Rôle inconnu tant que l'adhésion n'est pas lue : aucun montant ni action réservée ne s'affiche avant
  // (avant : « owner » par défaut, qu'un échec de lecture laissait à un chef de chantier — gardien-securite, 26 oct. 2026)
  const [role, setRole] = useState(/** @type {OrgRole|null} */ (null));
  const [droitsNonCharges, setDroitsNonCharges] = useState(false);
  const [members, setMembers] = useState([]);
  const [organisations, setOrganisations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState(null);

  // Listen for auth state changes
  useEffect(() => {
    if (isDemo) {
      // Demo mode: mock org with owner role
      setOrgId('demo-org-id');
      setOrgName('Entreprise Démo');
      setRole('owner');
      setMembers([]);
      setLoading(false);
      return;
    }

    // Get current user
    const initAuth = async () => {
      const user = await auth.getCurrentUser();
      if (user?.id) {
        setUserId(user.id);
      } else {
        setLoading(false);
      }
    };
    initAuth();

    // Subscribe to auth changes
    const { data: { subscription } } = auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' && session?.user) {
        setUserId(session.user.id);
      } else if (event === 'SIGNED_OUT') {
        setUserId(null);
        setOrgId(null);
        setOrgName('');
        setRole(null);
        setDroitsNonCharges(false);
        setMembers([]);
        setOrganisations([]);
        setLoading(false);
      }
    });

    return () => subscription?.unsubscribe();
  }, []);

  // Resolve organization when userId changes
  const resolveOrg = useCallback(async (uid) => {
    if (!uid || isDemo || !supabase) return;

    setLoading(true);
    let roleLu = null;
    try {
      // 1. Les adhésions du compte (« Membres : voir l'équipe » laisse lire les siennes) : l'organisation
      //    choisie sur cet appareil, sinon l'équipe rejointe, sinon la plus ancienne
      const { data: adhesions, error: adhesionsError } = await supabase
        .from('organization_members')
        .select('organization_id, role, joined_at')
        .eq('user_id', uid);
      const liste = adhesionsError ? [] : (adhesions || []).filter(a => a?.organization_id);
      const preferee = organisationPreferee(uid);
      // Propriétaire d'une organisation ET membre d'une équipe, sans choix sur cet appareil : son entreprise
      // à lui (une fiche) l'emporte ; un espace vide (créé à l'inscription d'un invité) ne compte pas.
      let aSonEntreprise = false;
      const siennes = liste.filter(a => a.role === 'owner').map(a => a.organization_id);
      if (siennes.length && liste.some(a => a.role !== 'owner') && !liste.some(a => a.organization_id === preferee)) {
        const { data: fiches, error: fichesError } = await supabase
          .from('entreprise').select('organization_id').in('organization_id', siennes).limit(1);
        // Lecture impossible : on reste prudent, son organisation à lui
        aSonEntreprise = !!fichesError || (fiches || []).length > 0;
      }
      let resolvedOrgId = choisirOrganisation(liste, preferee, { aSonEntreprise });
      if (liste.length > 1) {
        const { data: orgs, error: orgsError } = await supabase.from('organizations').select('id, name').in('id', liste.map(a => a.organization_id));
        if (orgsError) console.warn('[OrgContext] Noms des organisations illisibles:', orgsError.message);
        const noms = Object.fromEntries((orgs || []).map(o => [o.id, o.name || '']));
        setOrganisations(liste.map(a => ({ id: a.organization_id, nom: noms[a.organization_id] || 'Organisation', role: a.role })));
      } else {
        setOrganisations([]);
      }

      // Liste vide ou illisible : la règle d'avant (la plus ancienne adhésion)
      if (!resolvedOrgId) {
        const { data: orgData, error: orgError } = await supabase.rpc('get_user_org_id', {
          p_user_id: uid
        });
        // Lecture impossible : le rôle le plus faible, signalé (un rechargement relit l'adhésion)
        if (orgError) {
          setRole(ROLE_SANS_DROITS);
          setDroitsNonCharges(true);
          setLoading(false);
          return;
        }
        resolvedOrgId = orgData;
      }

      // 2. Aucune organisation : un invité qui vient de créer son compte rejoint l'équipe qui l'invite
      //    (App le renvoie sur la page de l'invitation) ; on ne lui crée pas d'espace vide qu'il
      //    ouvrirait ensuite à la place de l'équipe (recette du 11 oct. 2026).
      if (!resolvedOrgId && invitationEnAttente()) {
        setLoading(false);
        return;
      }

      // 3. Sinon, l'organisation par défaut du compte
      if (!resolvedOrgId) {
        const { data: createResult, error: createError } = await creerOrganisationParDefaut(supabase, uid);

        if (createError) {
          // Fallback: user is their own "org" (backward compat)
          setRole(ROLE_SANS_DROITS);
          setDroitsNonCharges(true);
          setLoading(false);
          return;
        }

        resolvedOrgId = createResult?.org_id;
      }

      if (!resolvedOrgId) {
        console.warn('[OrgContext] Could not resolve org');
        setRole(ROLE_SANS_DROITS);
        setDroitsNonCharges(true);
        setLoading(false);
        return;
      }

      setOrgId(resolvedOrgId);

      // 4. Fetch org details + user's membership
      const [orgRes, membershipRes, membersRes] = await Promise.all([
        supabase.from('organizations').select('name, slug').eq('id', resolvedOrgId).maybeSingle(),
        supabase.from('organization_members')
          .select('role, equipe_member_id')
          .eq('organization_id', resolvedOrgId)
          .eq('user_id', uid)
          .maybeSingle(),
        supabase.from('organization_members')
          .select('id, user_id, role, joined_at, equipe_member_id')
          .eq('organization_id', resolvedOrgId)
          .order('joined_at', { ascending: true }),
      ]);

      if (orgRes.data) {
        setOrgName(orgRes.data.name || '');
      }

      if (membershipRes.error) console.error('[OrgContext] Lecture du rôle impossible :', membershipRes.error.message);
      roleLu = liste.find(a => a.organization_id === resolvedOrgId)?.role || membershipRes.data?.role || null;
      if (roleLu) {
        setRole(roleLu);
        setDroitsNonCharges(false);
      } else {
        // User exists in org (via get_user_org_id) but no membership row?
        // Cela ne devrait pas arriver : le rôle le plus faible, jamais « owner »
        console.warn('[OrgContext] No membership found for user in org');
        setRole(ROLE_SANS_DROITS);
        setDroitsNonCharges(true);
      }

      if (membersRes.data) {
        // Jointure manuelle membres ↔ équipe : on évite l'embed PostgREST
        // (equipe:equipe_member_id(...)) qui échouait en 400, car la relation FK
        // equipe_member_id → equipe n'est pas déclarée en base.
        let membersData = membersRes.data;
        const equipeIds = [...new Set(membersData.map((m) => m.equipe_member_id).filter(Boolean))];
        if (equipeIds.length > 0) {
          const { data: equipeRows } = await supabase
            .from('equipe')
            .select('id, nom, prenom, email')
            .in('id', equipeIds);
          const equipeById = Object.fromEntries((equipeRows || []).map((e) => [e.id, e]));
          membersData = membersData.map((m) => ({
            ...m,
            equipe: m.equipe_member_id ? equipeById[m.equipe_member_id] || null : null,
          }));
        } else {
          membersData = membersData.map((m) => ({ ...m, equipe: null }));
        }
        setMembers(membersData);
      }
    } catch (err) {
      console.error('[OrgContext] Error resolving org:', err);
      // Échec de lecture : le rôle le plus faible, jamais « owner » — sauf si le rôle a déjà été lu pendant cet appel
      if (!roleLu) {
        setRole(ROLE_SANS_DROITS);
        setDroitsNonCharges(true);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (userId) {
      resolveOrg(userId);
    }
  }, [userId, resolveOrg]);

  const refreshOrg = useCallback(() => {
    if (userId) {
      resolveOrg(userId);
    }
  }, [userId, resolveOrg]);

  // Changer d'organisation recharge l'app : données, entreprise, abonnement et file hors ligne
  // repartent de la nouvelle organisation, sans reste de l'ancienne à l'écran.
  const changerOrganisation = useCallback((id) => {
    if (!userId || !id || id === orgId) return;
    memoriserOrganisation(userId, id);
    window.location.assign('/');
  }, [userId, orgId]);

  const value = {
    orgId,
    orgName,
    role,
    droitsNonCharges,
    members,
    loading,
    isOwner: role === 'owner',
    isAdmin: role === 'owner' || role === 'admin',
    refreshOrg,
    organisations,
    changerOrganisation,
  };

  return (
    <OrgContext.Provider value={value}>
      {children}
    </OrgContext.Provider>
  );
}

export default OrgContext;
