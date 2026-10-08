/* ════════════════════════════════════════════════════════════════════
   PILOTE — le poste de travail d'Hugo avec Claude. Mode d'emploi côté dépôt : docs/pilote.md.
   Le contenu (jalons, étapes, fiches) est dans contenu.js ; l'état d'Hugo part en base, sous
   data/users/<id>/pilote (privé) :
     document principal  — écrit par CETTE page (set) : statuts, notes, engagements, ajouts, vuLe
     boite/<id>          — Hugo écrit ses notes ; Claude répond (statut, reponse, lien, traiteLe)
     questions/<id>      — générées par Claude depuis docs/decisions.md ; Hugo répond (choix…)
     attentes/<id>       — générées depuis docs/etat-production.md ; Hugo coche et colle la preuve
     livraisons/<id>, claude/etat — écrits par Claude seul
   Règle : la page n'écrit jamais un champ qui appartient à Claude, et inversement.
   ════════════════════════════════════════════════════════════════════ */

const STATUTS = [["todo","À faire"],["doing","En cours"],["wait","En attente d’un tiers"],["done","Fait"],["skip","Sans objet"]];
const ECHEANCE_2027 = "2027-09-01";
const POUR = { elec:"Électricien", mall:"Mallettico", deux:"Les deux" };

const CLE = "mallettico-pilote-v1", CLE_F = "mallettico-pilote-frictions-v1", CLE_UI = "mallettico-pilote-ui-v2";
function lireLocal(k, def){ try{ const v = localStorage.getItem(k); return v ? JSON.parse(v) : def; }catch(e){ return def; } }
function ecrireLocal(k, v){ try{ localStorage.setItem(k, JSON.stringify(v)); }catch(e){ /* stockage navigateur indisponible : l’outil continue en mémoire */ } }

function normaliser(d){
  const x = d && typeof d === "object" ? d : {};
  const perso = Array.isArray(x.perso) ? x.perso.filter(p => p && p.id && p.titre) : [];
  // Un engagement vers une étape retirée de la page (refonte du 8 oct. 2026) ne compte plus dans les trois.
  const existe = id => ETAPES.some(e => e.id === id) || perso.some(p => p.id === id);
  return {
    etapes: x.etapes && typeof x.etapes === "object" ? x.etapes : {},
    focus: Array.isArray(x.focus) ? x.focus.filter(existe).slice(0,3) : [],
    perso,
    vuLe: typeof x.vuLe === "string" ? x.vuLe : "",
  };
}
let etat = normaliser(lireLocal(CLE, null));
let ui = Object.assign({ onglet:"aujourdhui", ouvert:null, type:"demande", copie:null, confirmer:null, preuve:null }, lireLocal(CLE_UI, {}));
ui.copie = null; ui.confirmer = null; ui.preuve = null;
if (!["aujourdhui","etapes","claude","reperes"].includes(ui.onglet)) ui.onglet = "aujourdhui";

const STORE = { mode:"local", ref:null, statut:"init", col:{} };
let boite = [], questions = [], attentes = [], livraisons = [], etatClaude = null;
let notesLocales = lireLocal(CLE_F, []); if (!Array.isArray(notesLocales)) notesLocales = [];
let minuteur = null, enCours = false, sale = false;

function serialiser(){ return { v:2, etapes:etat.etapes, focus:etat.focus, perso:etat.perso, vuLe:etat.vuLe }; }
function sauverUi(){ ecrireLocal(CLE_UI, { onglet:ui.onglet, ouvert:ui.ouvert, type:ui.type }); }

function planifier(){
  sale = true;
  ecrireLocal(CLE, etat);
  clearTimeout(minuteur);
  if (STORE.mode === "compte") { afficherStatut("sync"); minuteur = setTimeout(sauver, 700); }
  else { sale = false; afficherStatut("local"); }
}
async function sauver(){
  if (STORE.mode !== "compte") return;
  if (enCours) { minuteur = setTimeout(sauver, 400); return; }
  enCours = true; sale = false; minuteur = null;
  try { await STORE.ref.set(serialiser()); afficherStatut("ok"); }
  catch(e) {
    sale = true;
    if (e && (e.code === "invalid_argument" || e.code === "revoked" || e.code === "not_granted")) { basculerLocal("Enregistrement refusé sur votre compte : l’outil continue dans ce navigateur."); }
    else { afficherStatut("err"); minuteur = setTimeout(sauver, 2500 + Math.random()*1500); }
  } finally {
    enCours = false;
    if (sale && STORE.mode === "compte" && !minuteur) minuteur = setTimeout(sauver, 700);
  }
}
function basculerLocal(msg){ STORE.mode = "local"; sale = false; afficherStatut("local"); if (msg) toast(msg); }

async function brancher(){
  const c = window.claude;
  if (!c || typeof c.use !== "function") { afficherStatut("local"); return; }
  let db = null, user = null, uid = null;
  try { [db, user] = await Promise.all([c.use("db"), c.use("user")]); } catch(e) { /* capacité indisponible : mode navigateur */ }
  try { uid = user ? await user.id() : null; } catch(e) { uid = null; }
  if (!db || !uid) { afficherStatut("local"); return; }
  try { STORE.ref = db.doc("data/users/" + uid + "/pilote"); } catch(e) { afficherStatut("local"); return; }
  STORE.mode = "compte"; afficherStatut("sync");

  STORE.ref.onSnapshot(snap => {
    if (STORE.mode !== "compte") return;
    if (snap.metadata && snap.metadata.hasPendingWrites) return;
    if (enCours || sale) return;
    afficherStatut("ok");
    if (!snap.exists) return;
    const distant = normaliser(JSON.parse(JSON.stringify(snap.data())));
    if (JSON.stringify(distant) === JSON.stringify(etat)) return;
    etat = distant; ecrireLocal(CLE, etat); rendre();
  }, err => { basculerLocal("Synchronisation interrompue : l’outil continue dans ce navigateur."); });

  // Collections sœurs : un document par entrée, jamais réécrites en bloc par la page.
  const ecouter = (nom, requete, fixer) => {
    try {
      STORE.col[nom] = STORE.ref.collection(nom);
      requete(STORE.col[nom]).onSnapshot(qs => { fixer(qs.docs.map(d => Object.assign({ id:d.id }, d.data()))); rendre(); }, err => { /* section vide : rien de bloquant pour le reste */ });
    } catch(e) { /* collection indisponible */ }
  };
  ecouter("boite", c => c.orderBy("ecritLe","desc").limit(200), l => { boite = l; });
  ecouter("questions", c => c, l => { questions = l.sort((a,b) => (a.ordre || 99) - (b.ordre || 99)); });
  ecouter("attentes", c => c, l => { attentes = l.sort((a,b) => (a.ordre || 99) - (b.ordre || 99)); });
  ecouter("livraisons", c => c.orderBy("date","desc").limit(30), l => { livraisons = l; });
  try { STORE.ref.collection("claude").doc("etat").onSnapshot(s => { etatClaude = s.exists ? s.data() : null; rendre(); }, err => { /* idem */ }); } catch(e) { /* idem */ }
}

/* ════════════════════════════════════════════════════════════════════
   OUTILS
   ════════════════════════════════════════════════════════════════════ */

const $ = s => document.querySelector(s);
function esc(s){ return String(s == null ? "" : s).replace(/[&<>"']/g, c => ({ "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;" }[c])); }
function toutes(){ return ETAPES.concat(etat.perso.map(p => ({ id:p.id, jalon:"perso", rang:900, qui:"vous", titre:p.titre, perso:true }))); }
function trouver(id){ return toutes().find(e => e.id === id); }
function st(id){ const x = etat.etapes[id]; return (x && x.s) || "todo"; }
function fini(id){ const s = st(id); return s === "done" || s === "skip"; }
function depsOk(e){ return (e.deps || []).every(d => fini(d) || !trouver(d)); }
function debloque(id){ return ETAPES.filter(e => (e.deps || []).includes(id) && !fini(e.id)); }
function jalon(id){ return JALONS.find(j => j.id === id); }
function aujourdhui(){ const d = new Date(); return d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0")+"-"+String(d.getDate()).padStart(2,"0"); }
function dateFr(iso){ try{ return new Date(iso + (String(iso).length === 10 ? "T12:00:00" : "")).toLocaleDateString("fr-FR", { day:"numeric", month:"short" }); }catch(e){ return iso; } }
function dateHeureFr(iso){ try { return new Date(iso).toLocaleString("fr-FR", { day:"numeric", month:"short", hour:"2-digit", minute:"2-digit" }); } catch(e) { return iso || ""; } }
function joursDepuis(iso){ if (!iso) return null; const d = (Date.now() - new Date(iso).getTime()) / 86400000; return isFinite(d) ? Math.max(0, Math.floor(d)) : null; }
function age(iso, seuil){ const j = joursDepuis(iso); if (j === null) return ""; return '<span class="age' + (j >= (seuil || 7) ? " vieux" : "") + '">' + (j === 0 ? "aujourd’hui" : "depuis " + j + " j") + '</span>'; }
function plus(n, sing, plur){ return n + " " + (n > 1 ? plur : sing); }

let toastMin = null;
function toast(msg){ const t = $("#toast"); t.textContent = msg; t.hidden = false; clearTimeout(toastMin); toastMin = setTimeout(() => { t.hidden = true; }, 4200); }
function afficherStatut(s){
  STORE.statut = s;
  const el = $("#sauvegarde"); if (!el) return;
  const txt = { init:"Chargement…", sync:"Enregistrement…", ok:"Enregistré sur votre compte", local:"Enregistré dans ce navigateur", err:"Enregistrement en échec — nouvel essai" }[s];
  el.className = "badge " + s;
  el.innerHTML = '<span class="point"></span><span>' + esc(txt) + '</span>';
  el.title = s === "local" ? "Ouvrez le Pilote depuis claude.ai, connecté, pour échanger avec Claude et retrouver vos données sur tous vos appareils." : "";
}
async function copier(texte, id){
  let ok = false;
  try { if (navigator.clipboard && navigator.clipboard.writeText) { await navigator.clipboard.writeText(texte); ok = true; } } catch(e) { ok = false; }
  if (ok) { toast("Copié."); ui.copie = null; } else { ui.copie = id; toast("Sélectionnez le texte affiché et copiez-le."); }
  rendre();
  if (!ok) requestAnimationFrame(() => { const t = document.getElementById("copie-" + id); if (t) { t.focus(); t.select(); } });
}
function zoneCopie(id, texte){ return ui.copie === id ? '<textarea class="copie" id="copie-' + esc(id) + '" readonly>' + esc(texte) + '</textarea>' : ""; }
function champSaisi(nom, id){ const el = document.querySelector('[data-champ="' + nom + '"][data-id="' + CSS.escape(id) + '"]'); return el ? el.value.trim().slice(0, 4000) : ""; }

const ICONE = {
  check:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m5 12.5 4.5 4.5L19 7.5"/></svg>',
  clock:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" aria-hidden="true"><circle cx="12" cy="12" r="8"/><path d="M12 8v4.5l3 2"/></svg>',
  tiret:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" aria-hidden="true"><path d="M7 12h10"/></svg>',
  chevron:'<svg class="chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m9 6 6 6-6 6"/></svg>',
  copie:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="8" y="8" width="12" height="12" rx="2"/><path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2"/></svg>',
  cible:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="3"/></svg>',
};

/* ════════════════════════════════════════════════════════════════════
   ACTIONS
   ════════════════════════════════════════════════════════════════════ */

function setStatut(id, v){
  const x = etat.etapes[id] || (etat.etapes[id] = {});
  x.s = v; x.t = Date.now();
  if (v === "done" || v === "skip") etat.focus = etat.focus.filter(f => f !== id);
  planifier();
  if (v === "done") { const e = trouver(id); toast("Fait : " + (e ? e.titre : "")); }
  rendre();
}
function cycle(id){ const s = st(id); setStatut(id, s === "todo" ? "doing" : s === "doing" ? "done" : s === "wait" ? "done" : "todo"); }
function basculerEngagement(id){
  if (etat.focus.includes(id)) etat.focus = etat.focus.filter(f => f !== id);
  else {
    if (etat.focus.length >= 3) { toast("Trois engagements au plus. Terminez ou retirez-en un d’abord."); return; }
    etat.focus.push(id);
    if (st(id) === "todo") { const x = etat.etapes[id] || (etat.etapes[id] = {}); x.s = "doing"; x.t = Date.now(); }
  }
  planifier(); rendre();
}
function ouvrirEtape(id){
  const e = trouver(id); if (!e) return;
  ui.onglet = "etapes"; ui.ouvert = id; sauverUi(); rendre();
  requestAnimationFrame(() => { const el = document.getElementById("e-" + id); if (el) el.scrollIntoView({ block:"start", behavior:"smooth" }); });
}
function marquerVu(){ etat.vuLe = new Date().toISOString(); planifier(); rendre(); }

async function ecrire(nom, id, champs, msg){
  const c = STORE.col[nom]; if (!c) { toast("Ouvrez le Pilote depuis claude.ai, connecté."); return false; }
  try { await c.doc(id).update(champs); if (msg) toast(msg); return true; } catch(e) { toast("Non enregistré — réessayez."); return false; }
}
async function noter(){
  const t = $("#note-txt"); const texte = (t && t.value || "").trim().slice(0, 4000);
  if (!texte) { toast("Écrivez d’abord votre note."); if (t) t.focus(); return; }
  if (!STORE.col.boite) { toast("Pas de compte relié : copiez la note pour une session Claude Code."); ui.copie = "note"; rendre(); return; }
  const bloquant = !!($("#note-bloquant") || {}).checked;
  try {
    await STORE.col.boite.add({ texte, type:ui.type, bloquant, ecritLe:new Date().toISOString(), statut:"nouvelle" });
    t.value = ""; const b = $("#note-bloquant"); if (b) b.checked = false;
    toast("Envoyé. Claude le lit au début de la prochaine session et vous répond ici.");
  } catch(e) { toast("Non envoyé — réessayez."); }
}
async function reprendreNotesLocales(){
  if (!STORE.col.boite) return;
  let n = 0;
  for (const f of notesLocales) {
    try { await STORE.col.boite.add({ texte:String(f.txt || "").slice(0, 4000), type:"friction", bloquant:f.grav === "bloquant", ecritLe:f.date || new Date().toISOString(), statut:"nouvelle" }); n++; }
    catch(e) { break; }
  }
  if (n === notesLocales.length) { notesLocales = []; ecrireLocal(CLE_F, []); }
  toast(plus(n, "note reprise", "notes reprises") + " dans la boîte."); rendre();
}
async function repondre(id, choix){
  const q = questions.find(x => x.id === id); if (!q || q.statut === "traitee") return;
  if (choix === "pas-encore" && !champSaisi("q-com", id)) { toast("Dites ce qu’il vous manque, dans le commentaire."); const el = document.querySelector('[data-champ="q-com"][data-id="' + CSS.escape(id) + '"]'); if (el) el.focus(); return; }
  if (choix && choix !== "pas-encore" && q.irreversible && ui.confirmer !== id + ":" + choix) { ui.confirmer = id + ":" + choix; rendre(); return; }
  ui.confirmer = null;
  const champs = choix ? { choix, commentaire:champSaisi("q-com", id), reponduLe:new Date().toISOString() } : { choix:null, commentaire:"", reponduLe:null };
  Object.assign(q, champs); rendre();
  await ecrire("questions", id, champs, choix ? "Réponse enregistrée : Claude la consigne au début de la prochaine session." : "Réponse retirée.");
}
async function signalerAttente(id){
  const a = attentes.find(x => x.id === id); if (!a) return;
  const preuve = champSaisi("preuve", id);
  if (a.controle && !preuve) { toast("Collez le résultat du contrôle : sans lui, Claude ne peut pas vérifier."); const el = document.querySelector('[data-champ="preuve"][data-id="' + CSS.escape(id) + '"]'); if (el) el.focus(); return; }
  const champs = { faitParHugo:true, faitLe:new Date().toISOString(), preuve };
  Object.assign(a, champs); ui.preuve = null; rendre();
  await ecrire("attentes", id, champs, "Noté : Claude vérifie la preuve au début de la prochaine session.");
}
async function annulerAttente(id){
  const a = attentes.find(x => x.id === id); if (!a) return;
  const champs = { faitParHugo:false, faitLe:null };
  Object.assign(a, champs); rendre();
  await ecrire("attentes", id, champs, "Annulé.");
}

/* ════════════════════════════════════════════════════════════════════
   RENDU — éléments
   ════════════════════════════════════════════════════════════════════ */

function rond(id){
  const s = st(id);
  const lib = (STATUTS.find(x => x[0] === s) || STATUTS[0])[1];
  const ic = s === "done" ? ICONE.check : s === "wait" ? ICONE.clock : s === "skip" ? ICONE.tiret : "";
  return '<button class="rond" data-act="cycle" data-id="' + esc(id) + '" aria-label="Statut : ' + esc(lib) + ' — changer">' + ic + '</button>';
}
function puces(e){
  const out = [];
  if (e.qui === "tiers") out.push('<span class="chip tiers">Délai externe</span>');
  if (e.effort) out.push('<span class="chip">' + esc(e.effort) + '</span>');
  if (etat.focus.includes(e.id)) out.push('<span class="chip code">Engagement</span>');
  const x = etat.etapes[e.id];
  if (x && x.d && !fini(e.id)) out.push('<span class="chip' + (x.d < aujourdhui() ? " retard" : "") + '">' + (x.d < aujourdhui() ? "En retard · " : "Pour le ") + esc(dateFr(x.d)) + '</span>');
  if (!depsOk(e) && !fini(e.id)) out.push('<span class="chip">Attend : ' + esc((e.deps || []).filter(d => !fini(d)).map(d => (trouver(d) || {}).titre || d).join(", ")) + '</span>');
  const d = debloque(e.id);
  if (d.length && !fini(e.id)) out.push('<span class="chip bloquant">Débloque ' + plus(d.length, "étape", "étapes") + '</span>');
  return out.join("");
}
function blocFiche(f){
  return '<details class="fiche"><summary>' + esc(f.titre) + '</summary>'
    + (f.pourquoi ? '<p style="margin:0">' + esc(f.pourquoi) + '</p>' : "")
    + (f.comment && f.comment.length ? '<ol>' + f.comment.map(c => '<li>' + esc(c) + '</li>').join("") + '</ol>' : "")
    + (f.piege ? '<div class="boite piege"><b>Piège</b>' + esc(f.piege) + '</div>' : "")
    + (f.liens && f.liens.length ? '<div class="liens">' + f.liens.map(l => '<a href="' + esc(l[1]) + '" target="_blank" rel="noopener noreferrer">' + esc(l[0]) + ' ↗</a>').join("") + '</div>' : "")
    + '</details>';
}
function detail(e){
  const x = etat.etapes[e.id] || {};
  const s = st(e.id);
  const seg = STATUTS.map(([v,l]) => '<button data-act="statut" data-id="' + esc(e.id) + '" data-v="' + v + '" aria-pressed="' + (s === v) + '">' + l + '</button>').join("");
  const engage = etat.focus.includes(e.id);
  let h = '<div class="detail">';
  h += '<div class="seg" role="group" aria-label="Statut de l’étape">' + seg + '</div>';
  if (e.action) h += '<div class="boite mall"><b>Prochaine action</b>' + esc(e.action) + '</div>';
  if (e.pourquoi) h += '<div><h4>Pourquoi</h4><p>' + esc(e.pourquoi) + '</p></div>';
  if (e.comment && e.comment.length) h += '<div><h4>Comment</h4><ol>' + e.comment.map(c => '<li>' + esc(c) + '</li>').join("") + '</ol></div>';
  if (e.fait) h += '<div class="boite fait"><b>C’est fait quand</b>' + esc(e.fait) + '</div>';
  if (e.piege) h += '<div class="boite piege"><b>Piège</b>' + esc(e.piege) + '</div>';
  if (e.fiches && e.fiches.length) h += '<div><h4>À savoir</h4><div class="pile" style="gap:6px">' + e.fiches.map(blocFiche).join("") + '</div></div>';
  if (e.liens && e.liens.length) h += '<div class="liens">' + e.liens.map(l => '<a href="' + esc(l[1]) + '" target="_blank" rel="noopener noreferrer">' + esc(l[0]) + ' ↗</a>').join("") + '</div>';
  h += '<div class="outils">';
  if (!fini(e.id)) h += '<button class="btn' + (engage ? " primaire" : "") + '" data-act="engager" data-id="' + esc(e.id) + '" aria-pressed="' + engage + '">' + ICONE.cible + (engage ? "Engagement de la semaine" : "M’engager cette semaine") + '</button>';
  h += '<label class="champ" style="display:inline-grid">Échéance<input type="date" data-champ="date" data-id="' + esc(e.id) + '" value="' + esc(x.d || "") + '"></label>';
  if (e.perso) h += '<button class="btn discret" data-act="perso-suppr" data-id="' + esc(e.id) + '">Supprimer cette étape</button>';
  h += '</div>';
  h += '<label class="champ">Mes notes<textarea data-champ="note" data-id="' + esc(e.id) + '" placeholder="Décision prise, contact, numéro de dossier, prix obtenu…">' + esc(x.n || "") + '</textarea></label>';
  return h + '</div>';
}
function ligneEtape(e){
  const ouvert = ui.ouvert === e.id;
  return '<li class="etape s-' + st(e.id) + (ouvert ? " ouvert" : "") + '" id="e-' + esc(e.id) + '">'
    + '<div class="rangee">' + rond(e.id)
    + '<button class="ligne" data-act="ouvrir" data-id="' + esc(e.id) + '" aria-expanded="' + ouvert + '"><span class="titre">' + esc(e.titre) + '</span><span class="meta">' + puces(e) + '</span></button>'
    + ICONE.chevron + '</div>' + (ouvert ? detail(e) : "") + '</li>';
}

const STATUTS_BOITE = {
  nouvelle:["Envoyée — lue au prochain début de session","ambre"], acceptee:["Acceptée","ambre"], "en-cours":["En cours","ambre"],
  question:["Claude a besoin d’une précision","urgent"], planifiee:["Planifiée","vert"], existe:["Existe déjà","vert"],
  refusee:["Pas retenue",""], livree:["Livrée","vert"], "a-constater":["Livrée — à constater par vous","urgent"], close:["Close","vert"],
};
const TYPES = { demande:"Demande", friction:"Ça coince", idee:"Idée" };
function lienBoite(b){
  if (!b.lien || !b.lien.ref) return "";
  if (b.lien.type === "livraison") { const l = livraisons.find(x => x.id === b.lien.ref); return l ? "Livré : " + l.titre + " (" + dateHeureFr(l.date) + ")" : "Livraison " + b.lien.ref; }
  return ({ commit:"Commit ", tache:"Tâche ", decision:"Décision " }[b.lien.type] || "") + b.lien.ref;
}
function ligneBoite(b){
  const s = STATUTS_BOITE[b.statut] || STATUTS_BOITE.nouvelle;
  const ko = b.constat === "ko";
  let h = '<li class="b-' + esc(b.statut || "nouvelle") + '"><div class="tete"><span class="chip ' + s[1] + '">' + esc(ko ? "Ça ne marche pas — Claude reprend" : s[0]) + '</span>'
    + '<span class="chip">' + esc(TYPES[b.type] || "Note") + '</span>' + (b.bloquant ? '<span class="chip urgent">Ça me bloque</span>' : "")
    + '<span class="mono">' + esc(dateHeureFr(b.ecritLe)) + '</span></div>'
    + '<p class="texte">' + esc(b.texte) + '</p>';
  if (b.complement) h += '<p class="texte"><i>Votre précision :</i> ' + esc(b.complement) + '</p>';
  if (b.reponse) h += '<p class="reponse"><b>Claude' + (b.traiteLe ? " · " + esc(dateHeureFr(b.traiteLe)) : "") + '</b>' + esc(b.reponse) + '</p>';
  const lien = lienBoite(b); if (lien) h += '<p class="texte" style="font-size:.82rem">' + esc(lien) + '</p>';
  if (b.statut === "question" && !(b.complement && String(b.completeLe) > String(b.traiteLe || "")))
    h += '<label class="champ">Votre précision<textarea data-champ="complement" data-id="' + esc(b.id) + '" maxlength="4000"></textarea></label><div class="outils"><button class="btn primaire" data-act="b-complement" data-id="' + esc(b.id) + '">Envoyer la précision</button></div>';
  if (b.statut === "a-constater" && !b.constat)
    h += '<div class="outils"><button class="btn primaire" data-act="b-constat" data-id="' + esc(b.id) + '" data-v="ok">' + ICONE.check + 'C’est bon</button><button class="btn" data-act="b-constat" data-id="' + esc(b.id) + '" data-v="ko">Ça ne marche pas</button></div>'
      + '<label class="champ">Si ça ne marche pas : ce que vous voyez<textarea data-champ="constat" data-id="' + esc(b.id) + '" maxlength="4000"></textarea></label>';
  if (!b.statut || b.statut === "nouvelle") h += '<div class="outils"><button class="btn discret" data-act="b-retirer" data-id="' + esc(b.id) + '">Retirer cette note</button></div>';
  return h + '</li>';
}
function blocQuestion(q){
  const repondue = !!q.choix;
  const conf = ui.confirmer && ui.confirmer.startsWith(q.id + ":") ? ui.confirmer.slice(q.id.length + 1) : null;
  let h = '<div class="question' + (repondue ? " repondue" : "") + '"><div class="tete" style="display:flex;flex-wrap:wrap;gap:6px;align-items:center">'
    + (repondue ? '<span class="chip vert">' + (q.choix === "pas-encore" ? "« Pas encore » envoyé" : "Répondu") + ' le ' + esc(dateHeureFr(q.reponduLe)) + ' — Claude consigne au prochain début de session</span>' : '<span class="chip ambre">Décision attendue</span>' + age(q.ouverteLe, 7))
    + (q.irreversible ? '<span class="chip urgent">Irréversible</span>' : "")
    + '</div><h3>' + esc(q.question) + '</h3>'
    + (q.contexte ? '<p class="contexte">' + esc(q.contexte) + '</p>' : "")
    + (q.bloque ? '<p class="contexte"><b>Bloque :</b> ' + esc(q.bloque) + '</p>' : "")
    + '<div class="options" role="group" aria-label="Votre choix">' + (q.options || []).map(o =>
        '<button data-act="q-choix" data-id="' + esc(q.id) + '" data-v="' + esc(o.id) + '" aria-pressed="' + (q.choix === o.id) + '">'
        + (q.recommandation === o.id ? '<span class="reco">Recommandé par Claude</span>' : "")
        + '<b>' + esc(o.libelle) + '</b>' + (o.consequence ? '<span>' + esc(o.consequence) + '</span>' : "") + '</button>').join("")
      + '<button data-act="q-choix" data-id="' + esc(q.id) + '" data-v="pas-encore" aria-pressed="' + (q.choix === "pas-encore") + '"><b>Pas encore : il me faut…</b><span>Dites quoi dans le commentaire (un rendez-vous, un chiffre, une information).</span></button></div>'
    + (conf ? '<div class="confirmer"><span>Ce choix ne pourra pas être défait. Confirmer « ' + esc(((q.options || []).find(o => o.id === conf) || {}).libelle || conf) + ' » ?</span><button class="btn primaire" data-act="q-choix" data-id="' + esc(q.id) + '" data-v="' + esc(conf) + '">Confirmer</button><button class="btn" data-act="q-annuler-conf">Annuler</button></div>' : "")
    + (q.pourquoi ? '<p class="contexte"><b>Pourquoi cette recommandation :</b> ' + esc(q.pourquoi) + '</p>' : "")
    + '<label class="champ">Commentaire pour Claude' + (repondue ? "" : " (facultatif, sauf « pas encore »)") + '<textarea data-champ="q-com" data-id="' + esc(q.id) + '" maxlength="4000">' + esc(q.commentaire || "") + '</textarea></label>'
    + (repondue ? '<div class="outils"><button class="btn discret" data-act="q-choix" data-id="' + esc(q.id) + '" data-v="">Changer d’avis (retirer ma réponse)</button></div>' : "");
  return h + '</div>';
}
const CATEGORIES = { migration:"Migration SQL", deploiement:"Déploiement", reglage:"Réglage Supabase", action:"Action", information:"Information à fournir", decision:"Décision" };
function ligneAttente(a){
  const verifiee = a.statutClaude === "verifie";
  const etatA = verifiee ? "verifie" : a.faitParHugo ? "signale" : (a.urgent ? "urgent" : "");
  let h = '<li class="' + etatA + '"><div class="tete-att">'
    + '<span class="chip">' + esc(CATEGORIES[a.categorie] || "À faire") + '</span>'
    + (a.urgent && !verifiee ? '<span class="chip urgent">Urgent</span>' : "")
    + (!verifiee && !a.faitParHugo ? age(a.creeLe, 3) : "")
    + (etatA === "signale" ? '<span class="chip ambre">Signalé le ' + esc(dateHeureFr(a.faitLe)) + ' — Claude vérifie la preuve</span>' : "")
    + (verifiee ? '<span class="chip vert">Vérifié par Claude' + (a.verifieLe ? " le " + esc(dateFr(String(a.verifieLe).slice(0,10))) : "") + '</span>' : "")
    + '<b>' + esc(a.titre) + '</b></div>';
  if (a.messageClaude && !verifiee) h += '<p class="reponse" style="margin:0;padding:8px 10px;border-radius:7px;background:var(--rouge-fond)"><b>Claude :</b> ' + esc(a.messageClaude) + '</p>';
  if (a.detail) h += '<p>' + esc(a.detail) + '</p>';
  if (verifiee) return h + '</li>';
  if (a.commande) {
    const n = a.commande.split("\n").length;
    h += n > 6 ? '<details><summary class="btn discret" style="display:inline-flex">Voir ' + (a.categorie === "migration" ? "le SQL" : "le détail") + ' (' + n + ' lignes)</summary><pre class="commande">' + esc(a.commande) + '</pre></details>'
               : '<pre class="commande">' + esc(a.commande) + '</pre>';
  }
  h += '<div class="outils">' + (a.commande ? '<button class="btn" data-act="copier" data-id="att:' + esc(a.id) + '">' + ICONE.copie + (a.categorie === "migration" ? "Copier le SQL" : "Copier") + '</button>' : "");
  if (a.faitParHugo) h += '<button class="btn discret" data-act="att-annuler" data-id="' + esc(a.id) + '">Annuler</button></div>';
  else if (ui.preuve === a.id || !a.controle) h += (a.controle ? "" : '<button class="btn primaire" data-act="att-fait" data-id="' + esc(a.id) + '">' + ICONE.check + 'C’est fait</button>') + '</div>';
  else h += '<button class="btn primaire" data-act="att-preuve" data-id="' + esc(a.id) + '">' + ICONE.check + 'C’est fait</button></div>';
  h += zoneCopie("att:" + a.id, a.commande || "");
  if (!a.faitParHugo && a.controle && ui.preuve === a.id) {
    h += '<div class="pile" style="gap:6px"><p style="margin:0;font-size:.84rem"><b>Contrôle :</b> exécutez ceci, puis collez le résultat. C’est ce qui permet à Claude de constater que c’est vraiment appliqué.</p>'
      + '<pre class="commande">' + esc(a.controle) + '</pre>'
      + '<div class="outils"><button class="btn" data-act="copier" data-id="ctl:' + esc(a.id) + '">' + ICONE.copie + 'Copier le contrôle</button></div>' + zoneCopie("ctl:" + a.id, a.controle)
      + '<label class="champ">Résultat (collez-le ici)<textarea data-champ="preuve" data-id="' + esc(a.id) + '" maxlength="4000"></textarea></label>'
      + '<div class="outils"><button class="btn primaire" data-act="att-fait" data-id="' + esc(a.id) + '">Envoyer à Claude</button><button class="btn discret" data-act="att-preuve" data-id="">Plus tard</button></div></div>';
  }
  return h + '</li>';
}
function ligneLivraison(l, i){
  const liste = (titre, xs) => (xs && xs.length) ? '<div><h4>' + titre + '</h4><ul>' + xs.map(x => '<li>' + esc(x) + '</li>').join("") + '</ul></div>' : "";
  const notes = (l.notes || l.demandes || []).map(id => { const b = boite.find(x => x.id === id); return b ? b.texte.slice(0, 160) : null; }).filter(Boolean);
  return '<li><details' + (i === 0 ? " open" : "") + '><summary><b>' + esc(l.titre) + '</b><span class="mono">' + esc(dateHeureFr(l.date)) + (l.commit ? " · " + esc(l.commit) : "") + '</span>'
    + (l.statut === "en-production" ? '<span class="chip vert">En production</span>' : "") + '</summary>'
    + '<div class="corps">' + liste("Ce qui change pour vous", l.pourVous) + liste("Prouvé par", l.preuves) + liste("À faire de votre côté", l.aFaire) + liste("Répond à vos notes", notes)
    + ((l.commits && l.commits.length) ? '<div class="commits mono">' + l.commits.map(c => esc(c.sha) + " " + esc(c.msg)).join("<br>") + '</div>' : "")
    + '</div></details></li>';
}

/* Ce qui attend Hugo, et ce qui est nouveau depuis sa dernière visite. */
function questionsOuvertes(){ return questions.filter(q => q.statut !== "traitee"); }
function attentesOuvertes(){ return attentes.filter(a => a.statutClaude !== "verifie").sort((a,b) => Number(!!b.urgent) - Number(!!a.urgent) || (a.ordre || 99) - (b.ordre || 99)); }
function precisionsDemandees(){ return boite.filter(b => b.statut === "question" && !(b.complement && String(b.completeLe) > String(b.traiteLe || ""))); }
function aConstater(){ return boite.filter(b => b.statut === "a-constater" && !b.constat); }
// La pastille compte ce que l'écran « Aujourd'hui » montre (trois décisions, trois actions au plus) : pas tout le stock.
function aTraiterParHugo(){
  return Math.min(3, questionsOuvertes().filter(q => !q.choix).length) + Math.min(3, attentesOuvertes().filter(a => !a.faitParHugo).length) + precisionsDemandees().length + aConstater().length;
}
function nouveautes(){
  const vu = etat.vuLe || "";
  return {
    reponses: boite.filter(b => b.traiteLe && String(b.traiteLe) > vu && b.reponse),
    consignees: questions.filter(q => q.consigneeLe && String(q.consigneeLe) > vu),
    verifiees: attentes.filter(a => a.verifieLe && String(a.verifieLe) > vu),
    livrees: livraisons.filter(l => String(l.date) > vu),
  };
}

/* ════════════════════════════════════════════════════════════════════
   VUES
   ════════════════════════════════════════════════════════════════════ */

function temoin(){
  const ec = etatClaude || {};
  const j = joursDepuis(ec.lectureBoite);
  let h = '<div class="temoin">';
  h += ec.lectureBoite ? '<span>Claude a lu vos notes <b class="' + (j >= 3 ? "retard" : "") + '">' + (j === 0 ? "aujourd’hui" : "il y a " + plus(j, "jour", "jours")) + '</b> (' + esc(dateHeureFr(ec.lectureBoite)) + ')</span>'
                       : '<span>Claude n’a pas encore lu la boîte : ouvrez une session et tapez <b class="mono">/debut</b>.</span>';
  if (livraisons[0]) h += '<span>Dernière livraison : <b>' + esc(livraisons[0].titre) + '</b> (' + esc(dateHeureFr(livraisons[0].date)) + ')</span>';
  return h + '</div>';
}
function blocNoter(){
  return '<section class="bloc noter"><h2>Noter pour Claude</h2>'
    + '<p class="sous" style="margin:0">Une demande, ce qui a coincé sur un chantier, une idée : en une phrase, dans la minute. Claude lit tout au début de chaque session, vous répond ici, et attend votre « vas-y » dans la session avant d’agir.</p>'
    + '<div class="types"><div class="seg" role="group" aria-label="Type de note">' + Object.entries(TYPES).map(([v,l]) => '<button data-act="type" data-v="' + v + '" aria-pressed="' + (ui.type === v) + '">' + l + '</button>').join("") + '</div>'
    + '<label class="case"><input type="checkbox" id="note-bloquant"> Ça me bloque</label></div>'
    + '<textarea id="note-txt" maxlength="4000" aria-label="Votre note" placeholder="Ex. : le PDF est illisible en plein soleil sur mon téléphone"></textarea>'
    + '<div class="envoi"><button class="btn primaire" data-act="noter">Envoyer à Claude</button>'
    + '<button class="btn discret" data-act="copier" data-id="note">' + ICONE.copie + 'Copier pour une session déjà ouverte</button></div>'
    + zoneCopie("note", "/tache " + (($("#note-txt") || {}).value || "").trim())
    + '<p class="avert">Jamais de mot de passe, de clé ni de code secret ici. Un SIRET ou une adresse, oui.</p></section>';
}
function vueAujourdhui(){
  const nv = nouveautes();
  const qO = questionsOuvertes(), aO = attentesOuvertes(), prec = precisionsDemandees(), constat = aConstater();
  const engagements = etat.focus.map(trouver).filter(Boolean);
  let h = '<div class="pile">' + temoin();
  if (STORE.mode !== "compte") h += '<div class="alerte"><span><b>Ouvrez le Pilote depuis claude.ai, connecté</b> : c’est là que Claude lit vos notes et vous répond.</span></div>';
  if (notesLocales.length && STORE.col.boite) h += '<div class="alerte"><span>' + plus(notesLocales.length, "note du journal est restée", "notes du journal sont restées") + ' dans ce navigateur. <button class="btn" data-act="reprendre">Les envoyer à Claude</button></span></div>';

  const nNouv = nv.reponses.length + nv.consignees.length + nv.verifiees.length + nv.livrees.length;
  if (nNouv) {
    h += '<section class="bloc"><h2>Nouveau depuis votre dernière visite</h2><ul class="fil">'
      + nv.reponses.map(ligneBoite).join("")
      + nv.consignees.map(q => '<li class="b-close"><div class="tete"><span class="chip vert">Décision consignée' + (q.decision ? " " + esc(q.decision) : "") + '</span></div><p class="texte">' + esc(q.question) + ' → <b>' + esc(((q.options || []).find(o => o.id === q.choix) || {}).libelle || q.choix || "") + '</b></p></li>').join("")
      + nv.verifiees.map(a => '<li class="b-close"><div class="tete"><span class="chip vert">Vérifié par Claude</span></div><p class="texte">' + esc(a.titre) + '</p></li>').join("")
      + nv.livrees.map(l => '<li class="b-livree"><div class="tete"><span class="chip vert">Livré</span><span class="mono">' + esc(dateHeureFr(l.date)) + '</span></div><p class="texte"><b>' + esc(l.titre) + '</b>' + (l.pourVous && l.pourVous[0] ? " — " + esc(l.pourVous[0]) : "") + '</p></li>').join("")
      + '</ul><div class="outils" style="margin-top:10px"><button class="btn" data-act="vu">' + ICONE.check + 'Vu</button></div></section>';
  }

  h += blocNoter();

  if (prec.length || constat.length) h += '<section class="bloc"><h2>Claude vous demande</h2><p class="sous">Une précision ou un constat : sans vous, la note reste en suspens.</p><ul class="fil">' + prec.concat(constat).map(ligneBoite).join("") + '</ul></section>';

  const qVisibles = qO.filter(q => !q.choix).slice(0, 3);
  if (qVisibles.length) h += '<section class="bloc"><h2>Vos décisions</h2><p class="sous">Trois au plus, la plus bloquante d’abord. Claude consigne votre réponse dans les décisions du projet avant d’agir dessus.</p><div class="pile">'
    + qVisibles.map(blocQuestion).join("") + '</div>'
    + (qO.filter(q => !q.choix).length > 3 ? '<p class="sous" style="margin:10px 0 0">' + plus(qO.filter(q => !q.choix).length - 3, "autre question attend", "autres questions attendent") + ' : elles viendront ensuite.</p>' : "") + '</section>';

  const aVisibles = aO.filter(a => !a.faitParHugo).slice(0, 3);
  if (aVisibles.length) h += '<section class="bloc"><h2>À faire de votre côté</h2><p class="sous">Préparé par Claude, l’urgent d’abord. Faites l’action, lancez le contrôle, collez son résultat.</p><ul class="attentes">'
    + aVisibles.map(ligneAttente).join("") + '</ul>'
    + (aO.filter(a => !a.faitParHugo).length > 3 ? '<div class="outils" style="margin-top:10px"><button class="btn" data-act="onglet" data-v="claude">Voir les ' + aO.filter(a => !a.faitParHugo).length + ' actions</button></div>' : "") + '</section>';

  h += '<section class="bloc"><h2>Mes engagements de la semaine</h2><p class="sous">Trois au plus, choisis par vous. On termine avant d’en prendre un autre.</p>';
  if (engagements.length) h += '<div class="focus">' + engagements.map(e => {
    const s = st(e.id), j = jalon(e.jalon);
    return '<div class="carte-focus" style="--pc:var(--pour-' + esc(j ? j.pour : "deux") + ')"><div class="t">' + esc(e.titre) + '</div>'
      + (e.action ? '<div class="action" style="font-size:.86rem">' + esc(e.action) + '</div>' : "")
      + '<div class="actions"><div class="seg" role="group" aria-label="Statut"><button data-act="statut" data-id="' + esc(e.id) + '" data-v="doing" aria-pressed="' + (s==="doing") + '">En cours</button><button data-act="statut" data-id="' + esc(e.id) + '" data-v="wait" aria-pressed="' + (s==="wait") + '">Attend un tiers</button><button data-act="statut" data-id="' + esc(e.id) + '" data-v="done" aria-pressed="' + (s==="done") + '">Fait</button></div>'
      + '<button class="btn" data-act="ouvrir-etape" data-id="' + esc(e.id) + '">Le détail</button><button class="btn discret" data-act="engager" data-id="' + esc(e.id) + '">Retirer</button></div></div>';
  }).join("") + '</div>';
  else {
    const proposees = ETAPES.filter(e => !fini(e.id) && depsOk(e)).sort((a,b) => (JALONS.findIndex(j => j.id === a.jalon) - JALONS.findIndex(j => j.id === b.jalon)) || a.rang - b.rang).slice(0, 3);
    h += '<div class="vide" style="text-align:left">Aucun engagement. Les prochaines actions possibles, dans l’ordre des jalons :</div><ul class="compact" style="margin-top:8px">'
      + proposees.map(e => '<li><span class="pp" style="background:var(--pour-' + esc((jalon(e.jalon) || {}).pour || "deux") + ')"></span><button class="lien" data-act="ouvrir-etape" data-id="' + esc(e.id) + '">' + esc(e.titre) + '<small>' + esc(e.action || "") + '</small></button><button class="btn" data-act="engager" data-id="' + esc(e.id) + '">+ M’engager</button></li>').join("") + '</ul>';
  }
  h += '</section>';
  return h + '</div>';
}

function progressionJalon(jid){
  const l = ETAPES.filter(e => e.jalon === jid && st(e.id) !== "skip");
  return { faits: l.filter(e => st(e.id) === "done").length, total: l.length };
}
function vueEtapes(){
  let h = '<div class="pile"><p class="sous" style="margin:0">Vos démarches, dans l’ordre. Le travail de Claude n’est pas ici : il est dans l’onglet Claude (prochaines tâches, livraisons).</p>';
  for (const j of JALONS) {
    const es = ETAPES.filter(e => e.jalon === j.id).sort((a,b) => a.rang - b.rang);
    const g = progressionJalon(j.id);
    h += '<section class="bloc jalon" style="border-left:4px solid var(--pour-' + esc(j.pour) + ')"><div class="entete"><h2>' + esc(j.titre) + '</h2>'
      + '<span class="pour"><i style="background:var(--pour-' + esc(j.pour) + ')"></i>' + esc(POUR[j.pour]) + '</span>'
      + (es.length ? '<span class="n mono">' + g.faits + ' / ' + g.total + '</span>' : "") + '</div>'
      + (j.texte ? '<p class="sous" style="margin:0">' + esc(j.texte) + '</p>' : "")
      + '<p class="sortie"><b>Terminé quand :</b> ' + esc(j.sortie) + '</p>';
    if (j.auto === "attentes") {
      const o = attentesOuvertes();
      h += '<div class="outils"><span class="chip' + (o.some(a => a.urgent && !a.faitParHugo) ? " urgent" : "") + '">' + (o.length ? plus(o.length, "action ouverte", "actions ouvertes") : "Tout est vérifié") + '</span><button class="btn" data-act="onglet" data-v="claude">Les actions préparées par Claude</button></div>';
    }
    if (j.auto === "questions") {
      const o = questionsOuvertes();
      h += '<div class="outils"><span class="chip">' + (o.length ? plus(o.length, "décision ouverte", "décisions ouvertes") : "Aucune décision ouverte") + '</span><button class="btn" data-act="onglet" data-v="aujourdhui">Répondre</button></div>';
    }
    if (es.length) h += '<ul class="etapes">' + es.map(ligneEtape).join("") + '</ul>';
    h += '</section>';
  }
  h += '<section class="bloc"><h2>Mes ajouts</h2><p class="sous">Vos propres étapes, hors de la liste.</p>'
    + (etat.perso.length ? '<ul class="etapes">' + toutes().filter(e => e.perso).map(ligneEtape).join("") + '</ul>' : "")
    + '<form class="ajout-perso" data-act="perso-form"><input type="text" id="perso-txt" maxlength="140" placeholder="Ajouter une étape" aria-label="Nouvelle étape"><button class="btn" type="submit">Ajouter</button></form></section>';
  h += '<section class="bloc"><h2>Plus tard</h2><p class="sous">Volontairement hors du chemin. Chaque sujet a son déclencheur : on n’y revient que quand il est atteint.</p><ul class="compact">'
    + PLUS_TARD.map(p => '<li style="display:block"><b style="font-size:.88rem">' + esc(p.titre) + '</b><small style="display:block;color:var(--doux);font-size:.78rem">Quand : ' + esc(p.declencheur) + (p.pourquoi ? " — " + esc(p.pourquoi) : "") + '</small></li>').join("") + '</ul></section>';
  h += '<section class="bloc"><h2>Fiches pratiques</h2><p class="sous">À consulter au moment voulu, pas à suivre.</p><div class="pile" style="gap:6px">' + FICHES.map(blocFiche).join("") + '</div></section>';
  return h + '</div>';
}

function vueClaude(){
  const ec = etatClaude || {}, p = ec.production || {}, v = ec.verification || {}, g = ec.genere || {};
  const aO = attentesOuvertes(), verifiees = attentes.filter(a => a.statutClaude === "verifie").slice(-5);
  let h = '<div class="pile">' + temoin();
  h += '<section class="bloc"><h2>À faire de votre côté</h2><p class="sous">Préparé par Claude depuis l’état de la production, dans l’ordre. Après l’action : lancez le contrôle et collez son résultat.</p>'
    + (aO.length ? '<ul class="attentes">' + aO.map(ligneAttente).join("") + '</ul>' : '<div class="vide">Rien ne vous attend.</div>')
    + (verifiees.length ? '<h2 style="margin-top:14px;font-size:.86rem">Récemment vérifié</h2><ul class="attentes">' + verifiees.map(ligneAttente).join("") + '</ul>' : "") + '</section>';
  h += '<div class="grille2">';
  h += '<section class="bloc"><h2>En production</h2>'
    + (p.commit ? '<div class="prod">'
      + '<div class="l"><span>Version en ligne</span><b class="mono">' + esc(p.commit) + '</b>' + (p.verdict === "vert" ? '<span class="chip vert">Vercel et CI verts</span>' : p.verdict ? '<span class="chip ambre">' + esc(p.verdict) + '</span>' : "") + '</div>'
      + (p.date ? '<div class="l"><span>Livrée le</span><span>' + esc(dateHeureFr(p.date)) + '</span></div>' : "")
      + (p.resume ? '<div class="l"><span>Contenu</span><span>' + esc(p.resume) + '</span></div>' : "")
      + (v.niveau ? '<div class="l"><span>Dernière vérification</span><span>' + esc(v.niveau) + ' · ' + (v.reussi ? "verte" : "rouge") + '</span></div>' : "")
      + '</div>' : '<div class="vide">Pas encore d’état transmis par Claude.</div>')
    + (g.le ? '<p class="sous" style="margin:10px 0 0">Généré depuis le dépôt @ <span class="mono">' + esc(g.commit) + '</span>, le ' + esc(dateHeureFr(g.le)) + (joursDepuis(g.le) >= 7 ? ' — <b style="color:var(--rouge)">plus d’une semaine : à rafraîchir</b>' : "") + '.</p>' : "")
    + '</section>';
  const pt = ec.prochainesTaches || [];
  h += '<section class="bloc"><h2>Ce que Claude fera ensuite</h2><p class="sous">Par ordre de valeur, depuis la feuille de route. Pour lancer : une session, puis <span class="mono">/debut</span>.</p>'
    + (pt.length ? '<ul class="compact">' + pt.map(t => '<li><span class="lien" style="cursor:default">' + esc(t.titre) + '<small>' + esc([t.taille ? "Taille " + t.taille : "", t.critere ? "Fini quand : " + t.critere : ""].filter(Boolean).join(" · ")) + '</small></span></li>').join("") + '</ul>' : '<div class="vide">Aucune proposition pour l’instant.</div>')
    + '</section></div>';
  const ouvertes = boite.filter(b => !["livree","close","existe","refusee","planifiee"].includes(b.statut));
  const closes = boite.filter(b => ["livree","close","existe","refusee","planifiee"].includes(b.statut)).slice(0, 15);
  h += '<section class="bloc"><h2>Vos notes</h2><p class="sous">Tout ce que vous avez écrit à Claude, et où ça en est.</p>'
    + (ouvertes.length ? '<ul class="fil">' + ouvertes.map(ligneBoite).join("") + '</ul>' : '<div class="vide">Aucune note en cours.</div>')
    + (closes.length ? '<details style="margin-top:10px"><summary class="btn discret" style="display:inline-flex">Notes traitées (' + closes.length + ')</summary><ul class="fil" style="margin-top:8px">' + closes.map(ligneBoite).join("") + '</ul></details>' : "") + '</section>';
  const qT = questions.filter(q => q.statut === "traitee");
  if (qT.length) h += '<section class="bloc"><h2>Décisions prises</h2><ul class="compact">' + qT.map(q => '<li><span class="lien" style="cursor:default">' + esc(q.question) + '<small>' + esc((((q.options || []).find(o => o.id === q.choix) || {}).libelle || q.choix || "") + (q.decision ? " · " + q.decision : "") + (q.consigneeLe ? " · consignée le " + dateFr(String(q.consigneeLe).slice(0,10)) : "")) + '</small></span></li>').join("") + '</ul></section>';
  h += '<section class="bloc"><h2>Ce que Claude a livré</h2><p class="sous">Chaque mise en production : ce qui change pour vous, comment c’est prouvé, ce qui reste à votre main.</p>'
    + (livraisons.length ? '<ul class="livraisons">' + livraisons.map(ligneLivraison).join("") + '</ul>' : '<div class="vide">Le journal se remplit à la prochaine livraison.</div>') + '</section>';
  return h + '</div>';
}

function rendre(){
  const v = $("#vue");
  const vues = { aujourdhui:vueAujourdhui, etapes:vueEtapes, claude:vueClaude, reperes:vueReperes };
  // Un re-rendu ne doit jamais faire perdre une saisie : on garde les valeurs et le focus.
  const garde = {};
  v.querySelectorAll("#note-txt, #perso-txt").forEach(el => { garde[el.id] = el.value; });
  const bloquantCoche = !!($("#note-bloquant") || {}).checked;
  const champs = [];
  v.querySelectorAll("[data-champ]").forEach(el => { if (el.dataset.champ !== "note" && el.dataset.champ !== "date" && el.value) champs.push([el.dataset.champ, el.dataset.id, el.value]); });
  const actif = document.activeElement;
  let foc = null;
  if (actif && v.contains(actif) && (actif.tagName === "TEXTAREA" || actif.tagName === "INPUT")) foc = { id:actif.id, champ:actif.dataset.champ, did:actif.dataset.id, val:actif.value, s:actif.selectionStart, e:actif.selectionEnd };
  v.innerHTML = (vues[ui.onglet] || vueAujourdhui)();
  Object.keys(garde).forEach(id => { const el = document.getElementById(id); if (el && garde[id]) el.value = garde[id]; });
  if (bloquantCoche) { const b = $("#note-bloquant"); if (b) b.checked = true; }
  champs.forEach(([c, id, val]) => { const el = v.querySelector('[data-champ="' + c + '"][data-id="' + CSS.escape(id) + '"]'); if (el && !el.value) el.value = val; });
  if (foc) {
    const el = foc.id ? document.getElementById(foc.id) : (foc.champ && foc.did ? v.querySelector('[data-champ="' + foc.champ + '"][data-id="' + CSS.escape(foc.did) + '"]') : null);
    if (el) { if (foc.champ && foc.champ !== "date") el.value = foc.val; el.focus(); try { el.setSelectionRange(foc.s, foc.e); } catch(e) { /* champ sans sélection */ } }
  }
  document.querySelectorAll("nav.onglets button").forEach(b => { if (b.dataset.v === ui.onglet) b.setAttribute("aria-current","page"); else b.removeAttribute("aria-current"); });
  const n = aTraiterParHugo(); const p = $("#nb-hugo"); p.hidden = !n; p.textContent = n;
  const j = Math.max(0, Math.ceil((new Date(ECHEANCE_2027 + "T00:00:00") - new Date()) / 86400000));
  $("#echeance").innerHTML = 'E-facture TPE · <b class="mono">J-' + j + '</b>';
  $("#echeance").title = "Émission et e-reporting obligatoires pour les TPE et micro-entreprises le 1er septembre 2027";
}

/* ════════════════════════════════════════════════════════════════════
   ÉVÉNEMENTS
   ════════════════════════════════════════════════════════════════════ */

document.addEventListener("click", ev => {
  const b = ev.target.closest("[data-act]"); if (!b || b.tagName === "FORM") return;
  const a = b.dataset.act, id = b.dataset.id, v = b.dataset.v;
  if (a === "onglet") { ui.onglet = v; ui.copie = null; sauverUi(); rendre(); window.scrollTo({ top:0 }); return; }
  if (a === "ouvrir") { ui.ouvert = ui.ouvert === id ? null : id; ui.copie = null; sauverUi(); rendre(); return; }
  if (a === "ouvrir-etape") { ouvrirEtape(id); return; }
  if (a === "cycle") { cycle(id); return; }
  if (a === "statut") { setStatut(id, v); return; }
  if (a === "engager") { basculerEngagement(id); return; }
  if (a === "type") { ui.type = v; sauverUi(); document.querySelectorAll('[data-act="type"]').forEach(x => x.setAttribute("aria-pressed", String(x.dataset.v === v))); return; }
  if (a === "noter") { noter(); return; }
  if (a === "reprendre") { reprendreNotesLocales(); return; }
  if (a === "vu") { marquerVu(); return; }
  if (a === "copier") {
    let t = "";
    if (id === "note") { const n = (($("#note-txt") || {}).value || "").trim(); if (!n) { toast("Écrivez d’abord votre note."); return; } t = "/tache " + n; }
    else if (id.startsWith("att:")) t = ((attentes.find(x => x.id === id.slice(4)) || {}).commande) || "";
    else if (id.startsWith("ctl:")) t = ((attentes.find(x => x.id === id.slice(4)) || {}).controle) || "";
    if (t) copier(t, id);
    return;
  }
  if (a === "b-retirer") { if (STORE.col.boite) STORE.col.boite.doc(id).delete().then(() => toast("Note retirée."), () => toast("Non retirée — réessayez.")); return; }
  if (a === "b-complement") { const c = champSaisi("complement", id); if (!c) { toast("Écrivez d’abord votre précision."); return; } ecrire("boite", id, { complement:c, completeLe:new Date().toISOString() }, "Envoyé : Claude reprend la note à la prochaine session."); return; }
  if (a === "b-constat") {
    const txt = champSaisi("constat", id);
    if (v === "ko" && !txt) { toast("Dites ce que vous voyez, dans le champ en dessous."); const el = document.querySelector('[data-champ="constat"][data-id="' + CSS.escape(id) + '"]'); if (el) el.focus(); return; }
    ecrire("boite", id, v === "ok" ? { constat:"ok", constateLe:new Date().toISOString() } : { constat:"ko", constateLe:new Date().toISOString(), complement:txt, completeLe:new Date().toISOString() }, v === "ok" ? "Merci : Claude clôt la note." : "Noté : Claude reprend la note à la prochaine session.");
    return;
  }
  if (a === "q-choix") { repondre(id, v || null); return; }
  if (a === "q-annuler-conf") { ui.confirmer = null; rendre(); return; }
  if (a === "att-preuve") { ui.preuve = id || null; rendre(); return; }
  if (a === "att-fait") { signalerAttente(id); return; }
  if (a === "att-annuler") { annulerAttente(id); return; }
  if (a === "perso-suppr") { etat.perso = etat.perso.filter(p => p.id !== id); delete etat.etapes[id]; etat.focus = etat.focus.filter(f => f !== id); ui.ouvert = null; planifier(); rendre(); return; }
});
document.addEventListener("submit", ev => {
  const f = ev.target.closest("form[data-act='perso-form']"); if (!f) return;
  ev.preventDefault();
  const inp = document.getElementById("perso-txt");
  const titre = (inp.value || "").trim().slice(0, 140);
  if (!titre) return;
  if (etat.perso.length >= 80) { toast("Quatre-vingts étapes personnelles au plus : supprimez-en une terminée."); return; }
  etat.perso.push({ id:"p" + Date.now().toString(36), titre });
  inp.value = ""; planifier(); rendre();
  requestAnimationFrame(() => { const n = document.getElementById("perso-txt"); if (n) n.focus(); });
});
let noteMin = null;
document.addEventListener("input", ev => {
  const t = ev.target;
  if (t.dataset && t.dataset.champ === "note") {
    const x = etat.etapes[t.dataset.id] || (etat.etapes[t.dataset.id] = {});
    x.n = t.value.slice(0, 4000); sale = true; ecrireLocal(CLE, etat);
    clearTimeout(noteMin); noteMin = setTimeout(planifier, 900);
  }
});
document.addEventListener("change", ev => {
  const t = ev.target;
  if (t.dataset && t.dataset.champ === "date") {
    const x = etat.etapes[t.dataset.id] || (etat.etapes[t.dataset.id] = {});
    if (t.value) x.d = t.value; else delete x.d;
    planifier(); rendre();
  }
});
document.addEventListener("keydown", ev => {
  if (ev.key === "Enter" && (ev.metaKey || ev.ctrlKey) && ev.target.id === "note-txt") { ev.preventDefault(); noter(); }
});

/* Démarrage : on affiche ce que ce navigateur connaît, puis on se branche au compte. */
afficherStatut("init");
rendre();
brancher();
