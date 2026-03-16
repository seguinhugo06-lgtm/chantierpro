/**
 * subcontractorService.js — CRUD + search + stats for subcontractors
 *
 * Pattern: entrepriseService.js — demo mode via localStorage, prod via Supabase.
 */

import { isDemo } from '../supabaseClient';
import { scopeToOrg, withOrgScope } from '../lib/queryHelper';

const DEMO_KEY = 'batigesti_subcontractors_v2';
const OLD_DEMO_KEY = 'cp_sous_traitants';

// ── Field mappings ──────────────────────────────────────────────────────────────

export function fromSupabase(row) {
  if (!row) return null;
  return {
    id: row.id,
    organizationId: row.organization_id,
    userId: row.user_id,
    nom: row.nom,
    prenom: row.prenom,
    entreprise: row.entreprise,
    rolePoste: row.role_poste,
    typeContrat: row.type_contrat,
    telephone: row.telephone,
    email: row.email,
    siret: row.siret,
    adresse: row.adresse,
    codePostal: row.code_postal,
    ville: row.ville,
    siteWeb: row.site_web,
    photoUrl: row.photo_url,
    competences: row.competences || [],
    certifications: row.certifications || [],
    notes: row.notes,
    modeTarification: row.mode_tarification,
    tauxHoraire: row.taux_horaire,
    coutHoraireCharge: row.cout_horaire_charge,
    tarifForfait: row.tarif_forfait,
    assureurDecennale: row.assureur_decennale,
    numeroPoliceDecennale: row.numero_police_decennale,
    expirationDecennale: row.expiration_decennale,
    assureurRcPro: row.assureur_rc_pro,
    numeroPoliceRcPro: row.numero_police_rc_pro,
    expirationRcPro: row.expiration_rc_pro,
    montantGarantieRcPro: row.montant_garantie_rc_pro,
    derniereVerificationUrssaf: row.derniere_verification_urssaf,
    numeroAttestationUrssaf: row.numero_attestation_urssaf,
    noteMoyenne: parseFloat(row.note_moyenne) || 0,
    nombreEvaluations: row.nombre_evaluations || 0,
    statut: row.statut,
    datePremiereCollaboration: row.date_premiere_collaboration,
    isArchived: row.is_archived,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function toSupabase(data) {
  const row = {};
  if (data.nom !== undefined) row.nom = data.nom;
  if (data.prenom !== undefined) row.prenom = data.prenom;
  if (data.entreprise !== undefined) row.entreprise = data.entreprise;
  if (data.rolePoste !== undefined) row.role_poste = data.rolePoste;
  if (data.typeContrat !== undefined) row.type_contrat = data.typeContrat;
  if (data.telephone !== undefined) row.telephone = data.telephone;
  if (data.email !== undefined) row.email = data.email;
  if (data.siret !== undefined) row.siret = data.siret;
  if (data.adresse !== undefined) row.adresse = data.adresse;
  if (data.codePostal !== undefined) row.code_postal = data.codePostal;
  if (data.ville !== undefined) row.ville = data.ville;
  if (data.siteWeb !== undefined) row.site_web = data.siteWeb;
  if (data.photoUrl !== undefined) row.photo_url = data.photoUrl;
  if (data.competences !== undefined) row.competences = data.competences;
  if (data.certifications !== undefined) row.certifications = data.certifications;
  if (data.notes !== undefined) row.notes = data.notes;
  if (data.modeTarification !== undefined) row.mode_tarification = data.modeTarification;
  if (data.tauxHoraire !== undefined) row.taux_horaire = data.tauxHoraire || null;
  if (data.coutHoraireCharge !== undefined) row.cout_horaire_charge = data.coutHoraireCharge || null;
  if (data.tarifForfait !== undefined) row.tarif_forfait = data.tarifForfait || null;
  if (data.assureurDecennale !== undefined) row.assureur_decennale = data.assureurDecennale;
  if (data.numeroPoliceDecennale !== undefined) row.numero_police_decennale = data.numeroPoliceDecennale;
  if (data.expirationDecennale !== undefined) row.expiration_decennale = data.expirationDecennale || null;
  if (data.assureurRcPro !== undefined) row.assureur_rc_pro = data.assureurRcPro;
  if (data.numeroPoliceRcPro !== undefined) row.numero_police_rc_pro = data.numeroPoliceRcPro;
  if (data.expirationRcPro !== undefined) row.expiration_rc_pro = data.expirationRcPro || null;
  if (data.montantGarantieRcPro !== undefined) row.montant_garantie_rc_pro = data.montantGarantieRcPro || null;
  if (data.derniereVerificationUrssaf !== undefined) row.derniere_verification_urssaf = data.derniereVerificationUrssaf || null;
  if (data.numeroAttestationUrssaf !== undefined) row.numero_attestation_urssaf = data.numeroAttestationUrssaf;
  if (data.statut !== undefined) row.statut = data.statut;
  if (data.datePremiereCollaboration !== undefined) row.date_premiere_collaboration = data.datePremiereCollaboration || null;
  if (data.isArchived !== undefined) row.is_archived = data.isArchived;
  return row;
}

// ── Demo data ───────────────────────────────────────────────────────────────────

function getDemoData() {
  try {
    const raw = localStorage.getItem(DEMO_KEY);
    if (raw) return JSON.parse(raw);
  } catch { /* ignore */ }
  return migrateOrInitDemo();
}

function saveDemoData(data) {
  localStorage.setItem(DEMO_KEY, JSON.stringify(data));
}

function migrateOrInitDemo() {
  // Try migrating from old SousTraitantsModule localStorage
  try {
    const old = localStorage.getItem(OLD_DEMO_KEY);
    if (old) {
      const oldData = JSON.parse(old);
      if (Array.isArray(oldData) && oldData.length > 0) {
        const migrated = oldData.map(migrateOldSubcontractor);
        const data = { subcontractors: migrated, reviews: [], assignments: [], documents: [] };
        saveDemoData(data);
        console.log(`📥 Migrated ${migrated.length} subcontractors from old format`);
        return data;
      }
    }
  } catch { /* ignore */ }

  return initDemoData();
}

function migrateOldSubcontractor(old) {
  return {
    id: old.id || `st-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    nom: old.nom || '',
    prenom: old.prenom || old.contact || '',
    entreprise: old.nom || '',
    rolePoste: old.corpsMetier || old.role || old.role_poste || '',
    typeContrat: old.type_contrat || old.contrat || 'Auto-entrepreneur',
    telephone: old.telephone || '',
    email: old.email || '',
    siret: old.siret || '',
    adresse: old.adresse || '',
    competences: Array.isArray(old.competences)
      ? old.competences
      : (typeof old.competences === 'string' ? old.competences.split(',').map(s => s.trim()).filter(Boolean) : []),
    certifications: Array.isArray(old.certifications)
      ? old.certifications
      : (typeof old.certifications === 'string' ? old.certifications.split(',').map(s => ({ nom: s.trim() })).filter(c => c.nom) : []),
    notes: old.notes || '',
    modeTarification: old.tarif_type || 'horaire',
    tauxHoraire: parseFloat(old.tauxHoraire) || null,
    coutHoraireCharge: parseFloat(old.coutHoraireCharge) || null,
    assureurDecennale: old.decennale_assureur || old.assureurDecennale || '',
    numeroPoliceDecennale: old.decennale_numero || old.numeroPoliceDecennale || '',
    expirationDecennale: old.decennale_expiration || old.dateExpirationAssurance || null,
    assureurRcPro: '',
    numeroPoliceRcPro: old.assuranceRcPro || '',
    expirationRcPro: null,
    derniereVerificationUrssaf: old.urssaf_date || old.dateAttestationUrssaf || null,
    noteMoyenne: parseFloat(old.noteQualite) || 0,
    nombreEvaluations: old.noteQualite > 0 ? 1 : 0,
    statut: old.actif === false ? 'inactif' : 'actif',
    isArchived: false,
    createdAt: old.createdAt || new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

function initDemoData() {
  const now = new Date().toISOString();
  const data = {
    subcontractors: [
      {
        id: 'demo-st-1',
        nom: 'Dupont',
        prenom: 'Jean',
        entreprise: 'Dupont Électricité',
        rolePoste: 'Électricien',
        typeContrat: 'Auto-entrepreneur',
        telephone: '06 12 34 56 78',
        email: 'contact@dupont-elec.fr',
        siret: '123 456 789 00012',
        adresse: '15 rue Voltaire',
        codePostal: '75011',
        ville: 'Paris',
        siteWeb: 'www.dupont-elec.fr',
        competences: ['Électricité', 'Domotique', 'Câblage', 'Tableau électrique'],
        certifications: [
          { nom: 'Habilitation B2V', dateObtention: '2024-03-15', dateExpiration: '2027-03-15', organisme: 'APAVE', numero: 'HAB-2024-001' },
          { nom: 'Qualibat RGE', dateObtention: '2023-06-01', dateExpiration: '2027-06-01', organisme: 'Qualibat', numero: 'QRG-456' },
        ],
        notes: 'Très fiable, travail soigné. Disponible en général sous 2 semaines.',
        modeTarification: 'horaire',
        tauxHoraire: 45,
        coutHoraireCharge: 28,
        assureurDecennale: 'AXA',
        numeroPoliceDecennale: 'POL-2024-DEC-001',
        expirationDecennale: '2027-03-15',
        assureurRcPro: 'AXA',
        numeroPoliceRcPro: 'POL-2024-RC-001',
        expirationRcPro: '2026-06-20',
        derniereVerificationUrssaf: '2026-01-15',
        numeroAttestationUrssaf: 'ATT-URSSAF-2026-001',
        noteMoyenne: 4.2,
        nombreEvaluations: 8,
        statut: 'favori',
        datePremiereCollaboration: '2023-06-15',
        isArchived: false,
        createdAt: '2023-06-15T10:00:00Z',
        updatedAt: now,
      },
      {
        id: 'demo-st-2',
        nom: 'Martin',
        prenom: 'Sophie',
        entreprise: 'Martin Plomberie',
        rolePoste: 'Plombier',
        typeContrat: 'Auto-entrepreneur',
        telephone: '06 98 76 54 32',
        email: 'sophie@martin-plomberie.fr',
        siret: '987 654 321 00034',
        adresse: '42 avenue des Lilas',
        codePostal: '92100',
        ville: 'Boulogne-Billancourt',
        competences: ['Plomberie', 'Chauffage', 'Sanitaire', 'VMC'],
        certifications: [
          { nom: 'Qualibat RGE', dateObtention: '2024-01-01', dateExpiration: '2028-01-01', organisme: 'Qualibat', numero: 'QRG-789' },
        ],
        notes: 'Bonne qualité mais parfois en retard.',
        modeTarification: 'horaire',
        tauxHoraire: 50,
        coutHoraireCharge: 32,
        assureurDecennale: 'MAAF',
        numeroPoliceDecennale: 'POL-DEC-MAAF-002',
        expirationDecennale: '2026-12-31',
        assureurRcPro: 'MAAF',
        numeroPoliceRcPro: 'POL-RC-MAAF-002',
        expirationRcPro: '2026-04-20',
        montantGarantieRcPro: 500000,
        derniereVerificationUrssaf: '2025-08-15',
        noteMoyenne: 3.8,
        nombreEvaluations: 5,
        statut: 'actif',
        datePremiereCollaboration: '2024-02-01',
        isArchived: false,
        createdAt: '2024-02-01T10:00:00Z',
        updatedAt: now,
      },
      {
        id: 'demo-st-3',
        nom: 'Lefebvre',
        prenom: 'Marc',
        entreprise: 'Lefebvre Carrelage',
        rolePoste: 'Carreleur',
        typeContrat: 'Auto-entrepreneur',
        telephone: '07 11 22 33 44',
        email: 'marc.lefebvre@gmail.com',
        siret: '456 789 012 00056',
        competences: ['Carrelage', 'Faïence', 'Mosaïque', 'Pose de sol'],
        certifications: [],
        modeTarification: 'forfait',
        tarifForfait: 35,
        tauxHoraire: 35,
        assureurDecennale: 'GMF',
        numeroPoliceDecennale: 'GMF-DEC-003',
        expirationDecennale: '2025-12-01', // Expired!
        derniereVerificationUrssaf: '2025-03-01', // > 6 months old
        noteMoyenne: 4.5,
        nombreEvaluations: 12,
        statut: 'bloque', // Blocked due to expired insurance
        isArchived: false,
        createdAt: '2022-09-01T10:00:00Z',
        updatedAt: now,
      },
    ],
    reviews: [
      {
        id: 'demo-rev-1',
        subcontractorId: 'demo-st-1',
        chantierId: null,
        reviewerId: 'demo-user-id',
        noteQualite: 5, noteDelais: 4, notePrix: 4, noteCommunication: 4, noteProprete: 4,
        noteGlobale: 4.2,
        commentaire: 'Travail soigné, très professionnel. Léger dépassement sur le délai initial.',
        recommande: true,
        dateEvaluation: '2025-11-15',
        chantierName: 'Rénovation Dupont',
      },
      {
        id: 'demo-rev-2',
        subcontractorId: 'demo-st-2',
        chantierId: null,
        reviewerId: 'demo-user-id',
        noteQualite: 4, noteDelais: 3, notePrix: 4, noteCommunication: 4, noteProprete: 4,
        noteGlobale: 3.8,
        commentaire: 'Bon travail mais retard de 3 jours sur le planning prévu.',
        recommande: true,
        dateEvaluation: '2025-10-20',
        chantierName: 'Salle de bain Martin',
      },
      {
        id: 'demo-rev-3',
        subcontractorId: 'demo-st-3',
        chantierId: null,
        reviewerId: 'demo-user-id',
        noteQualite: 5, noteDelais: 5, notePrix: 4, noteCommunication: 4, noteProprete: 5,
        noteGlobale: 4.6,
        commentaire: 'Excellent travail, très minutieux. Résultat impeccable.',
        recommande: true,
        dateEvaluation: '2025-09-01',
        chantierName: 'Extension Leclerc',
      },
    ],
    assignments: [
      {
        id: 'demo-assign-1',
        chantierId: null,
        subcontractorId: 'demo-st-1',
        roleSurChantier: 'Électricité complète',
        dateDebut: '2025-10-01',
        dateFin: '2025-10-15',
        montantPrevu: 2500,
        montantFacture: 2500,
        statut: 'termine',
        chantierName: 'Rénovation Dupont',
      },
      {
        id: 'demo-assign-2',
        chantierId: null,
        subcontractorId: 'demo-st-1',
        roleSurChantier: 'Mise aux normes',
        dateDebut: '2026-02-01',
        dateFin: null,
        montantPrevu: 3800,
        montantFacture: 0,
        statut: 'en_cours',
        chantierName: 'Extension Martin',
      },
      {
        id: 'demo-assign-3',
        chantierId: null,
        subcontractorId: 'demo-st-3',
        roleSurChantier: 'Carrelage SDB + cuisine',
        dateDebut: '2025-08-01',
        dateFin: '2025-08-22',
        montantPrevu: 4200,
        montantFacture: 4200,
        statut: 'termine',
        chantierName: 'Extension Leclerc',
      },
    ],
    documents: [
      {
        id: 'demo-doc-1',
        subcontractorId: 'demo-st-1',
        type: 'attestation_decennale',
        nom: 'Attestation décennale AXA 2027',
        fileUrl: '#',
        fileSize: 1200000,
        mimeType: 'application/pdf',
        dateExpiration: '2027-03-15',
        createdAt: '2024-03-15T10:00:00Z',
      },
      {
        id: 'demo-doc-2',
        subcontractorId: 'demo-st-1',
        type: 'attestation_urssaf',
        nom: 'Attestation vigilance URSSAF',
        fileUrl: '#',
        fileSize: 450000,
        mimeType: 'application/pdf',
        dateExpiration: '2026-07-15',
        createdAt: '2026-01-15T10:00:00Z',
      },
    ],
  };

  saveDemoData(data);
  return data;
}

// ── Compliance helpers ──────────────────────────────────────────────────────────

export function getComplianceScore(st) {
  const today = new Date().toISOString().split('T')[0];
  const sixMonthsAgo = new Date(Date.now() - 180 * 86400000).toISOString().split('T')[0];

  let total = 0;
  let valid = 0;

  // Décennale
  if (st.expirationDecennale) {
    total++;
    if (st.expirationDecennale > today) valid++;
  } else {
    total++;
  }

  // RC Pro
  if (st.expirationRcPro) {
    total++;
    if (st.expirationRcPro > today) valid++;
  } else {
    total++;
  }

  // URSSAF
  if (st.derniereVerificationUrssaf) {
    total++;
    if (st.derniereVerificationUrssaf > sixMonthsAgo) valid++;
  } else {
    total++;
  }

  return total > 0 ? Math.round((valid / total) * 100) : 0;
}

export function getComplianceStatus(st) {
  const today = new Date().toISOString().split('T')[0];
  const thirtyDaysFromNow = new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0];
  const sixMonthsAgo = new Date(Date.now() - 180 * 86400000).toISOString().split('T')[0];

  const items = [];

  // Décennale
  if (!st.expirationDecennale) {
    items.push({ key: 'decennale', status: 'missing', label: 'Décennale', message: 'Non renseignée' });
  } else if (st.expirationDecennale < today) {
    items.push({ key: 'decennale', status: 'expired', label: 'Décennale', message: `Expirée le ${formatDate(st.expirationDecennale)}` });
  } else if (st.expirationDecennale <= thirtyDaysFromNow) {
    items.push({ key: 'decennale', status: 'expiring', label: 'Décennale', message: `Expire le ${formatDate(st.expirationDecennale)}` });
  } else {
    items.push({ key: 'decennale', status: 'valid', label: 'Décennale', message: `Valide jusqu'au ${formatDate(st.expirationDecennale)}` });
  }

  // RC Pro
  if (!st.expirationRcPro) {
    items.push({ key: 'rcPro', status: 'missing', label: 'RC Pro', message: 'Non renseignée' });
  } else if (st.expirationRcPro < today) {
    items.push({ key: 'rcPro', status: 'expired', label: 'RC Pro', message: `Expirée le ${formatDate(st.expirationRcPro)}` });
  } else if (st.expirationRcPro <= thirtyDaysFromNow) {
    items.push({ key: 'rcPro', status: 'expiring', label: 'RC Pro', message: `Expire le ${formatDate(st.expirationRcPro)}` });
  } else {
    items.push({ key: 'rcPro', status: 'valid', label: 'RC Pro', message: `Valide jusqu'au ${formatDate(st.expirationRcPro)}` });
  }

  // URSSAF
  if (!st.derniereVerificationUrssaf) {
    items.push({ key: 'urssaf', status: 'missing', label: 'URSSAF', message: 'Non vérifiée' });
  } else if (st.derniereVerificationUrssaf < sixMonthsAgo) {
    items.push({ key: 'urssaf', status: 'expired', label: 'URSSAF', message: `Dernière vérification : ${formatDate(st.derniereVerificationUrssaf)} (> 6 mois)` });
  } else {
    items.push({ key: 'urssaf', status: 'valid', label: 'URSSAF', message: `Vérifiée le ${formatDate(st.derniereVerificationUrssaf)}` });
  }

  return items;
}

function formatDate(dateStr) {
  if (!dateStr) return '';
  return new Date(dateStr).toLocaleDateString('fr-FR');
}

// ── CRUD ────────────────────────────────────────────────────────────────────────

export async function loadSubcontractors(supabase, { userId, orgId, filters = {} }) {
  if (isDemo) {
    let data = getDemoData().subcontractors.filter(st => !st.isArchived);
    if (filters.statut) data = data.filter(st => st.statut === filters.statut);
    if (filters.noteMin) data = data.filter(st => st.noteMoyenne >= filters.noteMin);
    if (filters.competence) data = data.filter(st => st.competences?.some(c => c.toLowerCase().includes(filters.competence.toLowerCase())));
    if (filters.search) {
      const q = filters.search.toLowerCase();
      data = data.filter(st =>
        st.nom?.toLowerCase().includes(q) || st.entreprise?.toLowerCase().includes(q) ||
        st.prenom?.toLowerCase().includes(q) || st.email?.toLowerCase().includes(q) ||
        st.competences?.some(c => c.toLowerCase().includes(q))
      );
    }
    if (filters.expiringDays) {
      const limit = new Date(Date.now() + filters.expiringDays * 86400000).toISOString().split('T')[0];
      const today = new Date().toISOString().split('T')[0];
      data = data.filter(st =>
        (st.expirationDecennale && st.expirationDecennale >= today && st.expirationDecennale <= limit) ||
        (st.expirationRcPro && st.expirationRcPro >= today && st.expirationRcPro <= limit)
      );
    }

    // Sort
    const sortBy = filters.sortBy || 'nom';
    data.sort((a, b) => {
      if (sortBy === 'note') return (b.noteMoyenne || 0) - (a.noteMoyenne || 0);
      if (sortBy === 'recent') return new Date(b.updatedAt) - new Date(a.updatedAt);
      return (a.nom || '').localeCompare(b.nom || '');
    });

    return data;
  }

  let query = supabase
    .from('subcontractors')
    .select('*')
    .eq('is_archived', false);

  query = scopeToOrg(query, orgId, userId);

  if (filters.statut) query = query.eq('statut', filters.statut);
  if (filters.noteMin) query = query.gte('note_moyenne', filters.noteMin);
  if (filters.competence) query = query.contains('competences', [filters.competence]);
  if (filters.search) query = query.or(`nom.ilike.%${filters.search}%,entreprise.ilike.%${filters.search}%,email.ilike.%${filters.search}%`);

  const orderCol = filters.sortBy === 'note' ? 'note_moyenne' : filters.sortBy === 'recent' ? 'updated_at' : 'nom';
  const ascending = filters.sortBy !== 'note' && filters.sortBy !== 'recent';
  query = query.order(orderCol, { ascending });

  const { data, error } = await query;
  if (error) throw error;
  return (data || []).map(fromSupabase);
}

export async function getSubcontractor(supabase, { id }) {
  if (isDemo) {
    const data = getDemoData();
    const st = data.subcontractors.find(s => s.id === id);
    if (!st) return null;
    return {
      ...st,
      reviews: data.reviews.filter(r => r.subcontractorId === id),
      assignments: data.assignments.filter(a => a.subcontractorId === id),
      documents: data.documents.filter(d => d.subcontractorId === id),
      complianceScore: getComplianceScore(st),
      complianceItems: getComplianceStatus(st),
    };
  }

  const { data, error } = await supabase
    .from('subcontractors')
    .select('*')
    .eq('id', id)
    .single();

  if (error) throw error;
  const st = fromSupabase(data);

  // Fetch related data
  const [reviews, assignments, documents] = await Promise.all([
    supabase.from('subcontractor_reviews').select('*').eq('subcontractor_id', id).order('created_at', { ascending: false }),
    supabase.from('chantier_subcontractors').select('*, chantiers(nom)').eq('subcontractor_id', id).order('created_at', { ascending: false }),
    supabase.from('subcontractor_documents').select('*').eq('subcontractor_id', id).order('created_at', { ascending: false }),
  ]);

  return {
    ...st,
    reviews: (reviews.data || []).map(reviewFromSupabase),
    assignments: (assignments.data || []).map(assignmentFromSupabase),
    documents: (documents.data || []).map(documentFromSupabase),
    complianceScore: getComplianceScore(st),
    complianceItems: getComplianceStatus(st),
  };
}

export async function createSubcontractor(supabase, { data: stData, userId, orgId }) {
  if (isDemo) {
    const data = getDemoData();
    const now = new Date().toISOString();
    const st = {
      id: `st-${Date.now()}`,
      ...stData,
      noteMoyenne: 0,
      nombreEvaluations: 0,
      statut: stData.statut || 'actif',
      isArchived: false,
      createdAt: now,
      updatedAt: now,
    };
    data.subcontractors.push(st);
    saveDemoData(data);
    return st;
  }

  const row = withOrgScope(toSupabase(stData), userId, orgId);
  const { data: created, error } = await supabase
    .from('subcontractors')
    .insert(row)
    .select()
    .single();

  if (error) throw error;
  return fromSupabase(created);
}

export async function updateSubcontractor(supabase, { id, data: stData, userId }) {
  if (isDemo) {
    const data = getDemoData();
    const idx = data.subcontractors.findIndex(s => s.id === id);
    if (idx >= 0) {
      data.subcontractors[idx] = {
        ...data.subcontractors[idx],
        ...stData,
        updatedAt: new Date().toISOString(),
      };
      saveDemoData(data);
      return data.subcontractors[idx];
    }
    throw new Error('Sous-traitant non trouvé');
  }

  const { data: updated, error } = await supabase
    .from('subcontractors')
    .update(toSupabase(stData))
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return fromSupabase(updated);
}

export async function archiveSubcontractor(supabase, { id }) {
  if (isDemo) {
    const data = getDemoData();
    const st = data.subcontractors.find(s => s.id === id);
    if (st) {
      st.isArchived = true;
      st.updatedAt = new Date().toISOString();
      saveDemoData(data);
    }
    return;
  }

  await supabase
    .from('subcontractors')
    .update({ is_archived: true })
    .eq('id', id);
}

export async function toggleFavori(supabase, { id }) {
  if (isDemo) {
    const data = getDemoData();
    const st = data.subcontractors.find(s => s.id === id);
    if (st) {
      st.statut = st.statut === 'favori' ? 'actif' : 'favori';
      st.updatedAt = new Date().toISOString();
      saveDemoData(data);
      return st.statut;
    }
    return 'actif';
  }

  const { data: current } = await supabase
    .from('subcontractors')
    .select('statut')
    .eq('id', id)
    .single();

  const newStatut = current?.statut === 'favori' ? 'actif' : 'favori';
  await supabase
    .from('subcontractors')
    .update({ statut: newStatut })
    .eq('id', id);

  return newStatut;
}

export async function getStatistics(supabase, { orgId }) {
  if (isDemo) {
    const data = getDemoData();
    const active = data.subcontractors.filter(st => !st.isArchived && (st.statut === 'actif' || st.statut === 'favori'));
    const today = new Date().toISOString().split('T')[0];
    const sixMonthsAgo = new Date(Date.now() - 180 * 86400000).toISOString().split('T')[0];
    const thirtyDays = new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0];

    return {
      totalActifs: active.length,
      coutMoyen: active.length > 0 ? Math.round(active.reduce((s, st) => s + (st.tauxHoraire || 0), 0) / active.filter(st => st.tauxHoraire).length) : 0,
      decennalesValides: active.filter(st => st.expirationDecennale && st.expirationDecennale > today).length,
      decennalesTotal: active.filter(st => st.expirationDecennale).length,
      urssafOk: active.filter(st => st.derniereVerificationUrssaf && st.derniereVerificationUrssaf > sixMonthsAgo).length,
      urssafTotal: active.filter(st => st.derniereVerificationUrssaf).length,
      noteMoyenneGlobale: active.length > 0
        ? parseFloat((active.filter(st => st.nombreEvaluations > 0).reduce((s, st) => s + st.noteMoyenne, 0) / Math.max(active.filter(st => st.nombreEvaluations > 0).length, 1)).toFixed(1))
        : 0,
      totalFacture: data.assignments.reduce((s, a) => s + (a.montantFacture || 0), 0),
      expiring30Days: active.filter(st =>
        (st.expirationDecennale && st.expirationDecennale >= today && st.expirationDecennale <= thirtyDays) ||
        (st.expirationRcPro && st.expirationRcPro >= today && st.expirationRcPro <= thirtyDays)
      ).length,
    };
  }

  const { data, error } = await supabase.rpc('get_subcontractor_stats', { p_org_id: orgId });
  if (error) throw error;
  return {
    totalActifs: data.total_actifs,
    coutMoyen: Math.round(data.cout_moyen || 0),
    decennalesValides: data.decennales_valides,
    decennalesTotal: data.decennales_total,
    urssafOk: data.urssaf_ok,
    urssafTotal: data.urssaf_total,
    noteMoyenneGlobale: parseFloat(data.note_moyenne_globale || 0).toFixed(1),
    totalFacture: data.total_facture,
    expiring30Days: data.expiring_30_days,
  };
}

export async function searchByCompetence(supabase, { orgId, userId, competences, noteMin = 0 }) {
  if (isDemo) {
    const data = getDemoData();
    return data.subcontractors
      .filter(st => !st.isArchived && st.statut !== 'bloque')
      .filter(st => st.noteMoyenne >= noteMin)
      .map(st => {
        const matchingSkills = st.competences?.filter(c =>
          competences.some(req => c.toLowerCase().includes(req.toLowerCase()))
        ) || [];
        const score = competences.length > 0 ? Math.round((matchingSkills.length / competences.length) * 100) : 0;
        return { ...st, matchScore: score, matchingSkills };
      })
      .filter(st => st.matchScore > 0)
      .sort((a, b) => b.matchScore - a.matchScore || b.noteMoyenne - a.noteMoyenne);
  }

  let query = supabase
    .from('subcontractors')
    .select('*')
    .eq('is_archived', false)
    .neq('statut', 'bloque')
    .gte('note_moyenne', noteMin)
    .overlaps('competences', competences);

  query = scopeToOrg(query, orgId, userId);
  query = query.order('note_moyenne', { ascending: false });

  const { data, error } = await query;
  if (error) throw error;
  return (data || []).map(row => {
    const st = fromSupabase(row);
    const matchingSkills = st.competences?.filter(c =>
      competences.some(req => c.toLowerCase().includes(req.toLowerCase()))
    ) || [];
    return {
      ...st,
      matchScore: competences.length > 0 ? Math.round((matchingSkills.length / competences.length) * 100) : 0,
      matchingSkills,
    };
  });
}

// ── Reviews ─────────────────────────────────────────────────────────────────────

function reviewFromSupabase(row) {
  if (!row) return null;
  return {
    id: row.id,
    organizationId: row.organization_id,
    subcontractorId: row.subcontractor_id,
    chantierId: row.chantier_id,
    reviewerId: row.reviewer_id,
    noteQualite: row.note_qualite,
    noteDelais: row.note_delais,
    notePrix: row.note_prix,
    noteCommunication: row.note_communication,
    noteProprete: row.note_proprete,
    noteGlobale: parseFloat(row.note_globale) || 0,
    commentaire: row.commentaire,
    recommande: row.recommande,
    dateEvaluation: row.date_evaluation,
    createdAt: row.created_at,
    chantierName: row.chantiers?.nom || row.chantierName || null,
  };
}

export async function createReview(supabase, { data: reviewData, userId, orgId }) {
  if (isDemo) {
    const data = getDemoData();
    const noteGlobale = (reviewData.noteQualite + reviewData.noteDelais + reviewData.notePrix + reviewData.noteCommunication + reviewData.noteProprete) / 5;
    const review = {
      id: `rev-${Date.now()}`,
      subcontractorId: reviewData.subcontractorId,
      chantierId: reviewData.chantierId || null,
      reviewerId: userId,
      ...reviewData,
      noteGlobale: parseFloat(noteGlobale.toFixed(2)),
      dateEvaluation: new Date().toISOString().split('T')[0],
    };
    data.reviews.push(review);

    // Recalculate average
    const stReviews = data.reviews.filter(r => r.subcontractorId === reviewData.subcontractorId);
    const st = data.subcontractors.find(s => s.id === reviewData.subcontractorId);
    if (st) {
      st.noteMoyenne = parseFloat((stReviews.reduce((s, r) => s + r.noteGlobale, 0) / stReviews.length).toFixed(2));
      st.nombreEvaluations = stReviews.length;
    }
    saveDemoData(data);
    return review;
  }

  const { data: created, error } = await supabase
    .from('subcontractor_reviews')
    .insert(withOrgScope({
      subcontractor_id: reviewData.subcontractorId,
      chantier_id: reviewData.chantierId || null,
      reviewer_id: userId,
      note_qualite: reviewData.noteQualite,
      note_delais: reviewData.noteDelais,
      note_prix: reviewData.notePrix,
      note_communication: reviewData.noteCommunication,
      note_proprete: reviewData.noteProprete,
      commentaire: reviewData.commentaire,
      recommande: reviewData.recommande ?? true,
    }, userId, orgId))
    .select()
    .single();

  if (error) throw error;
  return reviewFromSupabase(created);
}

export async function getReviews(supabase, { subcontractorId }) {
  if (isDemo) {
    return getDemoData().reviews.filter(r => r.subcontractorId === subcontractorId);
  }

  const { data, error } = await supabase
    .from('subcontractor_reviews')
    .select('*, chantiers(nom)')
    .eq('subcontractor_id', subcontractorId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return (data || []).map(reviewFromSupabase);
}

export async function getReviewStats(supabase, { subcontractorId }) {
  if (isDemo) {
    const reviews = getDemoData().reviews.filter(r => r.subcontractorId === subcontractorId);
    if (reviews.length === 0) return null;
    return {
      moyenneQualite: avg(reviews, 'noteQualite'),
      moyenneDelais: avg(reviews, 'noteDelais'),
      moyennePrix: avg(reviews, 'notePrix'),
      moyenneCommunication: avg(reviews, 'noteCommunication'),
      moyenneProprete: avg(reviews, 'noteProprete'),
      recommandationPct: Math.round((reviews.filter(r => r.recommande).length / reviews.length) * 100),
      count: reviews.length,
    };
  }

  const { data } = await supabase
    .from('subcontractor_reviews')
    .select('note_qualite, note_delais, note_prix, note_communication, note_proprete, recommande')
    .eq('subcontractor_id', subcontractorId);

  if (!data || data.length === 0) return null;
  return {
    moyenneQualite: avg(data, 'note_qualite'),
    moyenneDelais: avg(data, 'note_delais'),
    moyennePrix: avg(data, 'note_prix'),
    moyenneCommunication: avg(data, 'note_communication'),
    moyenneProprete: avg(data, 'note_proprete'),
    recommandationPct: Math.round((data.filter(r => r.recommande).length / data.length) * 100),
    count: data.length,
  };
}

function avg(arr, key) {
  if (arr.length === 0) return 0;
  return parseFloat((arr.reduce((s, item) => s + (item[key] || 0), 0) / arr.length).toFixed(1));
}

// ── Assignments ─────────────────────────────────────────────────────────────────

function assignmentFromSupabase(row) {
  if (!row) return null;
  return {
    id: row.id,
    organizationId: row.organization_id,
    chantierId: row.chantier_id,
    subcontractorId: row.subcontractor_id,
    roleSurChantier: row.role_sur_chantier,
    dateDebut: row.date_debut,
    dateFin: row.date_fin,
    montantPrevu: row.montant_prevu,
    montantFacture: row.montant_facture,
    statut: row.statut,
    notes: row.notes,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    chantierName: row.chantiers?.nom || row.chantierName || null,
  };
}

export async function assignToChantier(supabase, { chantierId, subcontractorId, data: assignData, userId, orgId }) {
  if (isDemo) {
    const demoData = getDemoData();
    // Check if blocked
    const st = demoData.subcontractors.find(s => s.id === subcontractorId);
    if (st?.statut === 'bloque') throw new Error('Ce sous-traitant est bloqué (assurance expirée). Mettez à jour ses documents avant de l\'affecter.');

    const assignment = {
      id: `assign-${Date.now()}`,
      chantierId,
      subcontractorId,
      roleSurChantier: assignData.roleSurChantier || '',
      dateDebut: assignData.dateDebut || null,
      dateFin: assignData.dateFin || null,
      montantPrevu: assignData.montantPrevu || 0,
      montantFacture: 0,
      statut: 'affecte',
      createdAt: new Date().toISOString(),
    };
    demoData.assignments.push(assignment);
    saveDemoData(demoData);
    return assignment;
  }

  // Check if blocked
  const { data: st } = await supabase
    .from('subcontractors')
    .select('statut')
    .eq('id', subcontractorId)
    .single();

  if (st?.statut === 'bloque') {
    throw new Error('Ce sous-traitant est bloqué (assurance expirée). Mettez à jour ses documents avant de l\'affecter.');
  }

  const { data: created, error } = await supabase
    .from('chantier_subcontractors')
    .insert(withOrgScope({
      chantier_id: chantierId,
      subcontractor_id: subcontractorId,
      role_sur_chantier: assignData.roleSurChantier || null,
      date_debut: assignData.dateDebut || null,
      date_fin: assignData.dateFin || null,
      montant_prevu: assignData.montantPrevu || null,
    }, userId, orgId))
    .select()
    .single();

  if (error) throw error;
  return assignmentFromSupabase(created);
}

export async function getChantierSubcontractors(supabase, { chantierId }) {
  if (isDemo) {
    const data = getDemoData();
    return data.assignments
      .filter(a => a.chantierId === chantierId)
      .map(a => {
        const st = data.subcontractors.find(s => s.id === a.subcontractorId);
        return { ...a, subcontractor: st };
      });
  }

  const { data, error } = await supabase
    .from('chantier_subcontractors')
    .select('*, subcontractors(id, nom, prenom, entreprise, note_moyenne, statut, competences, telephone, email)')
    .eq('chantier_id', chantierId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return (data || []).map(row => ({
    ...assignmentFromSupabase(row),
    subcontractor: row.subcontractors ? fromSupabase(row.subcontractors) : null,
  }));
}

export async function getCollaborationHistory(supabase, { subcontractorId }) {
  if (isDemo) {
    return getDemoData().assignments.filter(a => a.subcontractorId === subcontractorId);
  }

  const { data, error } = await supabase
    .from('chantier_subcontractors')
    .select('*, chantiers(nom)')
    .eq('subcontractor_id', subcontractorId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return (data || []).map(assignmentFromSupabase);
}

export async function updateAssignment(supabase, { id, data: assignData }) {
  if (isDemo) {
    const data = getDemoData();
    const idx = data.assignments.findIndex(a => a.id === id);
    if (idx >= 0) {
      Object.assign(data.assignments[idx], assignData, { updatedAt: new Date().toISOString() });
      saveDemoData(data);
      return data.assignments[idx];
    }
    throw new Error('Affectation non trouvée');
  }

  const updateRow = {};
  if (assignData.roleSurChantier !== undefined) updateRow.role_sur_chantier = assignData.roleSurChantier;
  if (assignData.dateDebut !== undefined) updateRow.date_debut = assignData.dateDebut;
  if (assignData.dateFin !== undefined) updateRow.date_fin = assignData.dateFin;
  if (assignData.montantPrevu !== undefined) updateRow.montant_prevu = assignData.montantPrevu;
  if (assignData.montantFacture !== undefined) updateRow.montant_facture = assignData.montantFacture;
  if (assignData.statut !== undefined) updateRow.statut = assignData.statut;
  if (assignData.notes !== undefined) updateRow.notes = assignData.notes;

  const { data: updated, error } = await supabase
    .from('chantier_subcontractors')
    .update(updateRow)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return assignmentFromSupabase(updated);
}

export async function removeAssignment(supabase, { id }) {
  if (isDemo) {
    const data = getDemoData();
    data.assignments = data.assignments.filter(a => a.id !== id);
    saveDemoData(data);
    return;
  }

  await supabase.from('chantier_subcontractors').delete().eq('id', id);
}

// ── Documents ───────────────────────────────────────────────────────────────────

function documentFromSupabase(row) {
  if (!row) return null;
  return {
    id: row.id,
    organizationId: row.organization_id,
    subcontractorId: row.subcontractor_id,
    type: row.type,
    nom: row.nom,
    description: row.description,
    fileUrl: row.file_url,
    storagePath: row.storage_path,
    fileSize: row.file_size,
    mimeType: row.mime_type,
    dateEmission: row.date_emission,
    dateExpiration: row.date_expiration,
    createdAt: row.created_at,
  };
}

const DOC_STORAGE_BUCKET = 'subcontractor-docs';

export async function uploadDocument(supabase, { subcontractorId, file, type, metadata = {}, userId, orgId }) {
  if (isDemo) {
    const data = getDemoData();
    const doc = {
      id: `doc-${Date.now()}`,
      subcontractorId,
      type,
      nom: metadata.nom || file.name,
      description: metadata.description || '',
      fileUrl: URL.createObjectURL(file),
      fileSize: file.size,
      mimeType: file.type,
      dateEmission: metadata.dateEmission || null,
      dateExpiration: metadata.dateExpiration || null,
      createdAt: new Date().toISOString(),
    };
    data.documents.push(doc);
    saveDemoData(data);
    return doc;
  }

  const ext = file.name.split('.').pop();
  const storagePath = `${orgId}/${subcontractorId}/${type}/${Date.now()}.${ext}`;

  const { error: uploadError } = await supabase.storage
    .from(DOC_STORAGE_BUCKET)
    .upload(storagePath, file, { upsert: false });

  if (uploadError) throw uploadError;

  const { data: urlData } = supabase.storage
    .from(DOC_STORAGE_BUCKET)
    .getPublicUrl(storagePath);

  const { data: doc, error } = await supabase
    .from('subcontractor_documents')
    .insert(withOrgScope({
      subcontractor_id: subcontractorId,
      type,
      nom: metadata.nom || file.name,
      description: metadata.description || null,
      file_url: urlData.publicUrl,
      storage_path: storagePath,
      file_size: file.size,
      mime_type: file.type,
      date_emission: metadata.dateEmission || null,
      date_expiration: metadata.dateExpiration || null,
    }, userId, orgId))
    .select()
    .single();

  if (error) throw error;
  return documentFromSupabase(doc);
}

export async function deleteDocument(supabase, { id, storagePath }) {
  if (isDemo) {
    const data = getDemoData();
    data.documents = data.documents.filter(d => d.id !== id);
    saveDemoData(data);
    return;
  }

  if (storagePath) {
    await supabase.storage.from(DOC_STORAGE_BUCKET).remove([storagePath]);
  }
  await supabase.from('subcontractor_documents').delete().eq('id', id);
}

export async function getDocuments(supabase, { subcontractorId }) {
  if (isDemo) {
    return getDemoData().documents.filter(d => d.subcontractorId === subcontractorId);
  }

  const { data, error } = await supabase
    .from('subcontractor_documents')
    .select('*')
    .eq('subcontractor_id', subcontractorId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return (data || []).map(documentFromSupabase);
}

// ── Migration helper ────────────────────────────────────────────────────────────

export async function migrateFromLocalStorage(supabase, { userId, orgId }) {
  try {
    const raw = localStorage.getItem(OLD_DEMO_KEY);
    if (!raw) return 0;

    const oldData = JSON.parse(raw);
    if (!Array.isArray(oldData) || oldData.length === 0) return 0;

    const migrated = oldData.map(old => ({
      ...toSupabase(migrateOldSubcontractor(old)),
      user_id: userId,
      organization_id: orgId,
    }));

    const { error } = await supabase
      .from('subcontractors')
      .insert(migrated);

    if (!error) {
      localStorage.removeItem(OLD_DEMO_KEY);
      console.log(`📥 Migrated ${migrated.length} subcontractors to Supabase`);
      return migrated.length;
    }

    console.warn('Migration error:', error);
    return 0;
  } catch (err) {
    console.warn('Migration failed:', err);
    return 0;
  }
}

// ── Document type labels ────────────────────────────────────────────────────────

export const DOCUMENT_TYPE_LABELS = {
  attestation_urssaf: 'Attestation URSSAF',
  attestation_decennale: 'Attestation décennale',
  attestation_rc_pro: 'Attestation RC Pro',
  contrat_sous_traitance: 'Contrat de sous-traitance',
  kbis: 'Kbis',
  rib: 'RIB',
  autre: 'Autre',
};

export const CORPS_METIER = [
  'Électricien', 'Plombier', 'Maçon', 'Carreleur', 'Peintre', 'Menuisier',
  'Couvreur', 'Charpentier', 'Plaquiste', 'Serrurier', 'Terrassier',
  'Chef de chantier', 'Ouvrier qualifié', 'Apprenti', 'Autre',
];
