// Essai à blanc du SQL du compte démo sur PostgreSQL embarqué, avec le schéma relevé en production
// le 11 oct. 2026 (colonnes, types et précisions des montants, défauts, clés étrangères et contraintes utiles).
//   npm run demo:banc
import { PGlite } from '@electric-sql/pglite';
import { genererSql, COMPTE_DEMO } from './generer-sql.mjs';

const T = {
  chantiers: "user_id uuid NOT NULL, client_id uuid, nom text, description text, adresse text, ville text, code_postal text, statut text DEFAULT 'prospect', date_debut date, date_fin date, budget_prevu numeric(12,2), notes text, created_at timestamptz DEFAULT now(), updated_at timestamptz DEFAULT now(), weather_forecast jsonb, last_photo_at timestamptz, progression integer DEFAULT 0, equipe_id uuid, heures_estimees integer DEFAULT 8, avancement integer DEFAULT 0, type text, taches jsonb DEFAULT '[]', photos jsonb DEFAULT '[]', documents jsonb DEFAULT '[]', messages jsonb DEFAULT '[]', budget_materiaux numeric DEFAULT 0, latitude numeric, longitude numeric, organization_id uuid, entreprise_id uuid, mode_facturation text, situations_data jsonb",
  clients: "user_id uuid NOT NULL, nom text NOT NULL, prenom text, entreprise text, email text, telephone text, adresse text, created_at timestamp DEFAULT now(), portal_access_token uuid DEFAULT gen_random_uuid(), categorie text DEFAULT '', notes text, organization_id uuid, portal_enabled boolean DEFAULT false, source text, siret text, type_logement text, updated_at timestamptz DEFAULT now(), tva_intra text",
  depenses: "user_id uuid NOT NULL, chantier_id uuid, description text NOT NULL, montant numeric(12,2) NOT NULL, date date, categorie text, fournisseur text, numero_facture text, notes text, created_at timestamptz DEFAULT now(), updated_at timestamptz DEFAULT now(), montant_ht numeric, taux_tva numeric DEFAULT 20, montant_tva numeric, sous_traitant_id uuid, organization_id uuid",
  devis: "user_id uuid NOT NULL, client_id uuid, numero text, date date, validite_jours integer DEFAULT 30, type text DEFAULT 'devis', statut text DEFAULT 'brouillon', lignes jsonb DEFAULT '[]', total_ht numeric(10,2) DEFAULT 0, tva numeric(10,2) DEFAULT 20, total_ttc numeric(10,2) DEFAULT 0, pdf_url text, date_paiement date, created_at timestamp DEFAULT now(), last_reminder_sent_at timestamptz, notification_sent boolean DEFAULT false, notification_sent_at timestamptz, remise_globale numeric DEFAULT 0, sections jsonb DEFAULT '[]', total_tva numeric(12,2) DEFAULT 0, tva_rate numeric(5,2) DEFAULT 20, date_validite date, conditions text, notes text, objet text, acompte_percent numeric, acompte_montant numeric, mode_paiement text, chantier_id uuid, date_echeance date, tva_details jsonb, signature text, signature_date timestamptz, signataire text, facture_type text, devis_source_id uuid, acompte_facture_id uuid, acompte_pct numeric, montant_paye numeric(12,2) DEFAULT 0, client_nom text, updated_at timestamptz DEFAULT now(), signature_token uuid, signature_expires_at timestamptz, signature_data text, signature_ip text, signature_user_agent text, signataire_nom text, signature_cgv_accepted boolean DEFAULT false, situation_id uuid, situation_numero integer, payment_status text DEFAULT 'pending', stripe_session_id text, stripe_payment_intent_id text, payment_method text, paid_at timestamptz, payment_token text, payment_token_expires_at timestamptz, organization_id uuid, entreprise_id uuid, echeancier_id uuid, mode_facturation text, facture_solde_id uuid, montant_facture numeric, payment_completed_at timestamptz, payment_metadata jsonb, avoir_source_id uuid, avoir_type text, avoir_motif text, avoir_motif_detail text, date_envoi timestamptz",
  echanges: "user_id uuid NOT NULL, client_id uuid, chantier_id uuid, devis_id uuid, type text DEFAULT 'note', contenu text DEFAULT '', date timestamptz, created_at timestamptz DEFAULT now(), updated_at timestamptz DEFAULT now(), organization_id uuid",
  entreprise: "user_id uuid NOT NULL, nom text, siret text, tva_intra text, adresse text, ville text, code_postal text, telephone text, email text, site_web text, logo_url text, iban text, bic text, conditions_paiement text, mentions_legales text, couleur_principale text DEFAULT '#f97316', created_at timestamptz DEFAULT now(), updated_at timestamptz DEFAULT now(), dashboard_layout jsonb, settings_json jsonb, organization_id uuid, cgu_accepted_at timestamptz, cgu_version text, archived_at timestamptz, ordre integer DEFAULT 0, nom_court text, slug text, initiales text, logo_storage_path text, couleur text, pays text DEFAULT 'France', slogan text, forme_juridique text, capital text, code_ape text, rcs text, rcs_ville text, assurance_decennale_numero text, assurance_decennale_compagnie text, assurance_decennale_validite timestamptz, assurance_rc_pro_numero text, assurance_rc_pro_compagnie text, assurance_rc_pro_validite timestamptz, banque_nom text, tva_defaut numeric DEFAULT 20, validite_devis integer DEFAULT 30, delai_paiement integer DEFAULT 30, acompte_defaut numeric DEFAULT 30, taux_frais_structure numeric DEFAULT 0, cgv text, mention_devis text, mention_facture text, prefixe_devis text DEFAULT 'DEV', prefixe_facture text DEFAULT 'FAC', prefixe_avoir text DEFAULT 'AV', format_numero text DEFAULT 'YYYY-NNNNN', is_active boolean DEFAULT true, is_default boolean DEFAULT false, rc_pro_assureur text, rc_pro_numero text, rc_pro_validite date, decennale_assureur text, decennale_numero text, decennale_validite date, rc_pro_montant_garantie numeric, rc_pro_zone text, decennale_activites text, relance_config jsonb",
  memos: "user_id uuid NOT NULL, text text DEFAULT '', notes text, priority text, due_date date, due_time time, category text, chantier_id uuid, client_id uuid, is_done boolean DEFAULT false, done_at timestamptz, position integer DEFAULT 0, created_at timestamptz DEFAULT now(), updated_at timestamptz DEFAULT now(), subtasks text DEFAULT '[]', recurrence text, sort_order integer DEFAULT 0, organization_id uuid, status text DEFAULT 'a_faire', assigned_to uuid, due_date_end text",
  organization_members: "organization_id uuid NOT NULL, user_id uuid NOT NULL, role text, invited_by uuid, joined_at timestamptz DEFAULT now(), equipe_member_id uuid",
  paiements: "user_id uuid NOT NULL, devis_id uuid, document_numero text, montant numeric(12,2) DEFAULT 0, date date, mode text DEFAULT 'virement', reference text, notes text, created_at timestamptz DEFAULT now(), updated_at timestamptz DEFAULT now(), organization_id uuid",
  planning_events: "user_id uuid NOT NULL, title text NOT NULL, date date, time time, type text DEFAULT 'rdv', employe_id text, client_id text, description text DEFAULT '', created_at timestamptz DEFAULT now(), organization_id uuid, start_date timestamptz, end_date timestamptz, all_day boolean DEFAULT false, color text, duration_minutes integer, location text, rappel integer, recurrence text, recurrence_days text, recurrence_end_date timestamptz, status text DEFAULT 'planned', chantier_id uuid, updated_at timestamptz DEFAULT now()",
  pointages: "user_id uuid NOT NULL, employe_id uuid, chantier_id uuid, date date, heures numeric NOT NULL, description text, created_at timestamptz DEFAULT now(), updated_at timestamptz DEFAULT now(), organization_id uuid, approuve boolean DEFAULT false, verrouille boolean DEFAULT false, manuel boolean DEFAULT false, signe_le timestamptz",
  relance_executions: "user_id uuid, organization_id uuid, document_id uuid, document_type text, document_numero text, client_id uuid, step_id text, step_name text, step_delay integer, sequence_type text, channel text DEFAULT 'email', status text DEFAULT 'sent', subject text, body text, sms_body text, tracking_token uuid, triggered_by text DEFAULT 'manual', error_message text, metadata jsonb DEFAULT '{}', opened_at timestamptz, clicked_at timestamptz, created_at timestamptz DEFAULT now()",
};

const { userId: UID, organizationId: ORG, entrepriseId: ENT } = COMPTE_DEMO;
const AUTRE_ORG = '99999999-9999-4999-8999-999999999999';
const AUTRE_UID = '88888888-8888-4888-8888-888888888888';
let ok = true;
const verifier = (cond, msg) => { console.log(`${cond ? '✓' : '✗'} ${msg}`); if (!cond) ok = false; };

async function base() {
  const db = new PGlite();
  await db.exec('CREATE SCHEMA auth; CREATE TABLE auth.users (id uuid PRIMARY KEY, email text);');
  for (const [t, cols] of Object.entries(T)) await db.exec(`CREATE TABLE public.${t} (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), ${cols});`);
  await db.exec(`
    -- Contraintes de contrôle relevées en production le 11 oct. 2026
    ALTER TABLE public.devis ADD CONSTRAINT devis_statut_check CHECK (statut = ANY (ARRAY['brouillon','envoye','vu','en_attente','accepte','signe','refuse','annule','acompte_facture','facture','payee']));
    ALTER TABLE public.devis ADD CONSTRAINT valid_devis_statut CHECK (statut = ANY (ARRAY['brouillon','envoye','accepte','refuse','annule','acompte_facture','facture','payee','en_attente','signe']));
    ALTER TABLE public.devis ADD CONSTRAINT devis_type_check CHECK (type = ANY (ARRAY['devis','facture']));
    ALTER TABLE public.chantiers ADD CONSTRAINT valid_statut CHECK (statut = ANY (ARRAY['prospect','planifie','en_cours','termine','annule','abandonne','archive']));
    ALTER TABLE public.chantiers ADD CONSTRAINT chantiers_progression_check CHECK (progression >= 0 AND progression <= 100);
    ALTER TABLE public.memos ADD CONSTRAINT memos_category_check CHECK (category = ANY (ARRAY['rappel','achat','rdv','admin','idee','urgent']));
    ALTER TABLE public.memos ADD CONSTRAINT memos_priority_check CHECK (priority = ANY (ARRAY['haute','moyenne','basse']));
    ALTER TABLE public.devis ADD FOREIGN KEY (client_id) REFERENCES public.clients(id) ON DELETE CASCADE;
    ALTER TABLE public.devis ADD FOREIGN KEY (avoir_source_id) REFERENCES public.devis(id) ON DELETE SET NULL;
    ALTER TABLE public.chantiers ADD FOREIGN KEY (client_id) REFERENCES public.clients(id) ON DELETE SET NULL;
    ALTER TABLE public.depenses ADD FOREIGN KEY (chantier_id) REFERENCES public.chantiers(id) ON DELETE SET NULL;
    ALTER TABLE public.pointages ADD FOREIGN KEY (chantier_id) REFERENCES public.chantiers(id) ON DELETE SET NULL;
    INSERT INTO auth.users VALUES ('${UID}', 'contact@mallettico.fr'), ('${AUTRE_UID}', 'autre@exemple.fr');
    INSERT INTO public.organization_members (organization_id, user_id, role) VALUES ('${ORG}', '${UID}', 'owner'), ('${AUTRE_ORG}', '${AUTRE_UID}', 'owner');
    INSERT INTO public.entreprise (id, user_id, nom, organization_id, forme_juridique, iban, siret, decennale_assureur, logo_url, settings_json)
      VALUES ('${ENT}', '${UID}', 'Hugo Elec', '${ORG}', 'Micro-entreprise', 'FR76 GARDE', '44912874500023', 'SMABTP', 'data:image/jpeg;base64,xx',
              '{"reglages": {"nomEntrepreneur": "Mallettico contact", "acompteDefaut": 40, "mentionPenalites": true}, "autre": "garde"}');
    -- État actuel du compte démo : 2 clients, 1 chantier, 1 devis, 1 échange
    INSERT INTO public.clients (id, user_id, nom, organization_id) VALUES ('aaaaaaaa-0000-4000-8000-000000000001', '${UID}', 'Ancien 1', '${ORG}'), ('aaaaaaaa-0000-4000-8000-000000000002', '${UID}', 'Ancien 2', '${ORG}');
    INSERT INTO public.chantiers (id, user_id, nom, client_id, organization_id) VALUES ('aaaaaaaa-0000-4000-8000-000000000003', '${UID}', 'Ancien chantier', 'aaaaaaaa-0000-4000-8000-000000000001', '${ORG}');
    INSERT INTO public.devis (id, user_id, client_id, numero, organization_id) VALUES ('aaaaaaaa-0000-4000-8000-000000000004', '${UID}', 'aaaaaaaa-0000-4000-8000-000000000001', 'DEV-2026-00001', '${ORG}');
    INSERT INTO public.echanges (user_id, contenu, organization_id) VALUES ('${UID}', 'ancien', '${ORG}');
    -- Une autre organisation, qui ne doit pas bouger
    INSERT INTO public.clients (id, user_id, nom, organization_id) VALUES ('bbbbbbbb-0000-4000-8000-000000000001', '${AUTRE_UID}', 'Client d''un autre', '${AUTRE_ORG}');
    INSERT INTO public.devis (user_id, client_id, numero, organization_id) VALUES ('${AUTRE_UID}', 'bbbbbbbb-0000-4000-8000-000000000001', 'DEV-2026-00001', '${AUTRE_ORG}');
  `);
  return db;
}

const compter = async (db, t, org = ORG) => (await db.query(`SELECT count(*)::int AS n FROM public.${t} WHERE organization_id = $1`, [org])).rows[0].n;
const sql = genererSql({ aujourdhui: new Date() });

// 1. Cas nominal
{
  const db = await base();
  await db.exec(sql);
  const n = {};
  for (const t of ['clients', 'chantiers', 'devis', 'paiements', 'echanges', 'planning_events', 'memos', 'depenses', 'relance_executions']) n[t] = await compter(db, t);
  console.log('Compte démo après écriture :', n);
  verifier(n.clients === 14 && n.chantiers === 7 && n.devis === 27, 'clients, chantiers et pièces du jeu écrits (14, 7, 27)');
  verifier((await db.query("SELECT count(*)::int AS n FROM public.clients WHERE nom LIKE 'Ancien%'")).rows[0].n === 0, 'anciennes données du compte démo effacées');
  verifier(await compter(db, 'clients', AUTRE_ORG) === 1 && await compter(db, 'devis', AUTRE_ORG) === 1, 'autre organisation intacte');
  const e = (await db.query('SELECT relance_config FROM public.entreprise WHERE id = $1', [ENT])).rows[0];
  verifier(e.relance_config.enabled === true && e.relance_config.autoSend === false, 'scénario de relances posé, envoi automatique coupé');
  const f = (await db.query("SELECT nom, siret, code_ape, iban, logo_url, decennale_assureur, settings_json FROM public.entreprise WHERE id = $1", [ENT])).rows[0];
  verifier(f.nom === 'Élec Exemple' && f.siret === '00000000000000' && f.code_ape === '4321A' && f.decennale_assureur === 'Assureur décennal (exemple)',
    `identité fictive posée (${f.nom}, ${f.siret}, ${f.decennale_assureur})`);
  verifier(f.iban === '' && f.logo_url === '', 'ni IBAN ni logo de l’ancienne fiche');
  const reg = f.settings_json.reglages;
  verifier(reg.donneesFictives === true && reg.nomEntrepreneur === 'Julien Exemple', 'marqueur « données fictives » et nom fictif de l’entrepreneur');
  verifier(reg.acompteDefaut === 40 && reg.mentionPenalites === true && f.settings_json.autre === 'garde', 'les autres réglages de la fiche sont conservés');
  const d = (await db.query("SELECT jsonb_typeof(lignes) t, lignes #>> '{}' AS texte FROM public.devis WHERE organization_id = $1 LIMIT 1", [ORG])).rows[0];
  verifier(d.t === 'string' && JSON.parse(d.texte).length > 0, 'lignes en texte JSON, comme l’app les écrit');
  const sig = (await db.query("SELECT count(*)::int AS n FROM public.devis WHERE organization_id = $1 AND (signature LIKE 'data:image/png;base64,%' OR signature_data LIKE 'data:image/png;base64,%')", [ORG])).rows[0].n;
  verifier(sig === 7, `signatures en image PNG (${sig})`);
  // Rejouable
  await db.exec(sql);
  verifier(await compter(db, 'devis') === 27 && await compter(db, 'clients') === 14, 'rejouer le script redonne le même compte');
}

// 2. Une autre organisation pointe vers un client du compte démo : refus, rien n'est écrit
{
  const db = await base();
  await db.exec(`INSERT INTO public.devis (user_id, client_id, numero, organization_id) VALUES ('${AUTRE_UID}', 'aaaaaaaa-0000-4000-8000-000000000001', 'DEV-X', '${AUTRE_ORG}');`);
  let erreur = '';
  try { await db.exec(sql); } catch (err) { erreur = err.message; }
  verifier(/pointe vers/.test(erreur), `lien croisé : refus (${erreur.slice(0, 90)})`);
  verifier(await compter(db, 'clients') === 2 && await compter(db, 'devis') === 1, 'rien n’a été effacé ni écrit');
}

// 3. Mauvais compte : refus
{
  const db = await base();
  await db.exec("UPDATE auth.users SET email = 'quelquun@exemple.fr' WHERE email = 'contact@mallettico.fr'");
  let erreur = '';
  try { await db.exec(sql); } catch (err) { erreur = err.message; }
  verifier(/Compte démo introuvable/.test(erreur), 'adresse inattendue : refus');
  verifier(await compter(db, 'clients') === 2, 'rien n’a été effacé');
}

// 4. Une seule lettre altérée pendant la transmission : refus, rien n'est écrit
{
  const db = await base();
  const altere = sql.replace('Rénovation électrique complète', 'Rénovation électrique complèté');
  verifier(altere !== sql, 'script altéré d’une lettre');
  let erreur = '';
  try { await db.exec(altere); } catch (err) { erreur = err.message; }
  verifier(/intégrité/.test(erreur), `altération détectée (${erreur.slice(0, 80)})`);
  verifier(await compter(db, 'clients') === 2 && await compter(db, 'devis') === 1, 'rien n’a été effacé ni écrit');
}

console.log(ok ? '\nEssai à blanc : tout est conforme.' : '\nEssai à blanc : ÉCHEC.');
process.exit(ok ? 0 : 1);
