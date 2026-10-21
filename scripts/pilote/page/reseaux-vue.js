/* ════════════════════════════════════════════════════════════════════
   ONGLET « RÉSEAUX SOCIAUX » — rendu et actions. Les données (publications, légendes, montages, points à
   valider, guide Meta, plan du mois) sont dans reseaux-donnees.js (RESEAUX), généré par
   scripts/pilote/reseaux.mjs. Les cases cochées (points validés, publications programmées) vivent dans
   l'état d'Hugo : etat.reseaux.{valide,prog}, écrit avec le reste par la page (document principal du Pilote).
   Ce fichier est assemblé AVANT app.js : il n'utilise que des fonctions, appelées après le chargement complet.
   ════════════════════════════════════════════════════════════════════ */

function rzProg(id){ return !!etat.reseaux.prog[id]; }
function rzOuvert(cle){ return !!ui.ouv[cle]; }
function rzDate(iso){
  try { const t = new Date(iso + "T12:00:00").toLocaleDateString("fr-FR", { weekday:"short", day:"numeric", month:"short" }); return t.charAt(0).toUpperCase() + t.slice(1); }
  catch(e) { return iso; }
}
function rzDateLongue(iso){
  try { const t = new Date(iso + "T12:00:00").toLocaleDateString("fr-FR", { weekday:"long", day:"numeric", month:"long" }); return t.charAt(0).toUpperCase() + t.slice(1); }
  catch(e) { return iso; }
}
function rzEcart(iso){ return Math.round((new Date(iso + "T12:00:00") - new Date(aujourdhui() + "T12:00:00")) / 86400000); }
function rzEcartTexte(iso){
  const d = rzEcart(iso);
  return d === 0 ? "aujourd’hui" : d === 1 ? "demain" : d > 1 ? "dans " + d + " jours" : d === -1 ? "hier" : "il y a " + (-d) + " jours";
}
function rzProchaine(){ return RESEAUX.publications.find(p => !rzProg(p.id)) || null; }
function rzImg(p, im){ return "reseaux/miniatures/" + encodeURIComponent(p.dossier) + "/" + encodeURIComponent(im.fichier); }
function rzIco(html){ return String(html).replace(/%%ICO%%/g, ICONE.copie); }

/* Copier : writeText est appelé dans le gestionnaire du clic. En cas de refus, le texte est sélectionné. */
function rzSelectionner(id){
  const el = document.getElementById(id); if (!el) return;
  try { const r = document.createRange(); r.selectNodeContents(el); const s = window.getSelection(); s.removeAllRanges(); s.addRange(r); } catch(e) { /* sélection impossible : le texte reste affiché */ }
}
function rzCopier(btn){
  let texte = "", elId = "";
  if (btn.dataset.src) {
    const [k, id] = btn.dataset.src.split(":");
    const p = RESEAUX.publications.find(x => x.id === id); if (!p) return;
    texte = ({ ig:p.ig, fb:p.fb, ht:p.hashtags, mo:p.montageTexte, ch:p.cheminLocal })[k] || "";
    elId = "rz-" + k + "-" + id;
  } else {
    const el = document.getElementById(btn.dataset.cible); if (!el) return;
    texte = String(el.innerText || el.textContent || "").trim(); elId = btn.dataset.cible;
  }
  if (!texte) { toast("Rien à copier."); return; }
  const reussi = () => {
    toast("Copié.");
    const t = btn.lastChild; if (!t || t.nodeType !== 3) return;
    const avant = t.textContent; t.textContent = "Copié";
    setTimeout(() => { if (btn.isConnected) t.textContent = avant; }, 1600);
  };
  const refuse = () => { rzSelectionner(elId); toast("Sélectionné : faites Cmd+C"); };
  try {
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(texte).then(reussi, refuse);
    else refuse();
  } catch(e) { refuse(); }
}

function rzBouton(src){ return '<button class="btn" data-act="rz-copier" data-src="' + esc(src) + '">' + ICONE.copie + 'Copier</button>'; }
function rzBloc(titre, src, texte, classe){
  const id = "rz-" + src.replace(":", "-");
  return '<div class="rz-texte"><div class="rz-texte-tete"><span>' + esc(titre) + '</span>' + rzBouton(src) + '</div>'
    + '<pre class="rz-pre ' + (classe || "") + '" id="' + esc(id) + '">' + esc(texte) + '</pre></div>';
}
function rzCase(act, id, coche, libelle){
  return '<label class="rz-case"><input type="checkbox" data-act="' + act + '" data-id="' + esc(id) + '"' + (coche ? " checked" : "") + '><span>' + libelle + '</span></label>';
}
function rzAcc(cle, titre, corps, niveau){
  const o = rzOuvert(cle);
  return '<div class="rz-acc n' + niveau + (o ? " ouvert" : "") + '" id="rz-a-' + esc(cle) + '">'
    + '<button class="rz-acc-tete" data-act="rz-ouvrir" data-id="' + esc(cle) + '" aria-expanded="' + o + '"><span>' + esc(titre) + '</span>' + ICONE.chevron + '</button>'
    + (o ? '<div class="rz-acc-corps rz-md">' + rzIco(corps) + '</div>' : "") + '</div>';
}

/* Le montage d'un Reel, lisible : plans, textes à l'écran, durée, musique. */
function rzMontage(p){
  const m = p.montage; if (!m) return "";
  const lib = { filmer:"À filmer ou enregistrer", ecran:"Texte à l’écran" };
  return '<div class="rz-texte rz-montage"><div class="rz-texte-tete"><span>Montage du Reel · ' + esc(m.duree) + '</span>' + rzBouton("mo:" + p.id) + '</div>'
    + '<div class="rz-mo" id="rz-mo-' + esc(p.id) + '">'
    + '<div class="rz-mo-gen"><div><b>Durée</b>' + esc(m.duree) + '</div><div><b>Format</b>' + esc(m.format) + '</div></div>'
    + '<div class="rz-mo-gen"><div><b>Musique</b>' + esc(m.musique).replace(/\n/g, "<br>") + '</div><div><b>Sous-titres</b>' + esc(m.soustitres) + '</div></div>'
    + '<ol class="rz-plans">' + m.plans.map(pl => {
        const ch = pl.champs, v = k => (ch.find(c => c[0] === k) || [])[1];
        const autres = ch.filter(c => c[0] !== lib.filmer && c[0] !== lib.ecran);
        return '<li><div class="rz-plan-tete"><b>Plan ' + pl.n + '</b><span class="mono">' + esc(pl.temps) + '</span></div>'
          + (v(lib.filmer) ? '<p class="rz-filmer"><i>' + esc(lib.filmer) + '</i> ' + esc(v(lib.filmer)) + '</p>' : "")
          + (v(lib.ecran) ? '<p class="rz-ecran"><i>' + esc(lib.ecran) + '</i> ' + esc(v(lib.ecran)) + '</p>' : "")
          + (autres.length ? '<ul class="rz-plan-aut">' + autres.map(c => '<li><i>' + esc(c[0]) + '</i> ' + esc(c[1]) + '</li>').join("") + '</ul>' : "") + '</li>';
      }).join("") + '</ol>'
    + (m.titreShorts ? '<div class="rz-mo-gen"><div><b>Titre YouTube Shorts</b>' + esc(m.titreShorts) + '</div></div>' : "")
    + (m.rappels.length ? '<div class="rz-mo-rappels"><b>Rappels de tournage</b><ul>' + m.rappels.map(r => '<li>' + esc(r) + '</li>').join("") + '</ul></div>' : "")
    + '</div></div>';
}

function rzCarte(p){
  const o = rzOuvert("p:" + p.id), prog = rzProg(p.id), retard = !prog && rzEcart(p.date) < 0;
  const nbImg = p.images.length;
  let h = '<li class="rz-carte' + (prog ? " prog" : "") + (o ? " ouvert" : "") + '" id="rz-p-' + esc(p.id) + '">'
    + '<div class="rz-rangee"><span class="rz-etat" aria-hidden="true">' + (prog ? ICONE.check : "") + '</span>'
    + '<button class="rz-ligne" data-act="rz-ouvrir" data-id="p:' + esc(p.id) + '" aria-expanded="' + o + '">'
    + '<img class="rz-vignette" src="' + esc(rzImg(p, p.images[0])) + '" alt="" width="' + p.images[0].largeur + '" height="' + p.images[0].hauteur + '" loading="lazy">'
    + '<span class="rz-titre"><b>' + esc(p.titre) + '</b><span class="meta">'
    + '<span class="chip' + (retard ? " retard" : "") + '">' + esc(rzDate(p.date)) + ' · ' + esc(p.heure) + '</span>'
    + '<span class="chip">' + esc(p.format) + '</span>'
    + (prog ? '<span class="chip vert">Programmé dans Meta</span>' : retard ? '<span class="chip retard">Date passée</span>' : '')
    + '</span></span></button>' + ICONE.chevron + '</div>';
  if (!o) return h + '</li>';
  h += '<div class="rz-corps">';
  if (p.avant) h += '<div class="boite avert"><b>Avant de programmer</b>' + esc(p.avant) + ' <a href="#" data-act="rz-aller" data-id="rz-s-valider">Voir la liste à valider</a></div>';
  h += '<div><h4>Où publier</h4><div class="rz-reseaux">' + p.reseaux.map(r => '<span class="chip">' + esc(r) + '</span>').join("") + '</div></div>';
  h += '<div><h4>' + (p.reel ? "Couverture du Reel" : nbImg > 1 ? "Les " + nbImg + " images, dans l’ordre du carrousel" : "L’image") + '</h4><div class="rz-images' + (p.reel ? " reel" : "") + '">'
    + p.images.map((im, k) => '<a href="' + esc(rzImg(p, im)) + '" target="_blank" rel="noopener noreferrer"><img src="' + esc(rzImg(p, im)) + '" width="' + im.largeur + '" height="' + im.hauteur + '" alt="Image ' + (k + 1) + ' sur ' + nbImg + ' : ' + esc(p.titre) + '" loading="lazy">'
      + (nbImg > 1 ? '<span class="n">' + (k + 1) + '</span>' : "") + '<small class="mono">' + esc(im.fichier.replace(/\.jpg$/, ".png")) + '</small></a>').join("") + '</div></div>';
  h += rzBloc("Légende Instagram" + (p.reel ? " et Reels" : ""), "ig:" + p.id, p.ig);
  h += rzBloc("Légende Facebook", "fb:" + p.id, p.fb);
  if (p.hashtags) h += rzBloc("Hashtags seuls (commentaire, LinkedIn)", "ht:" + p.id, p.hashtags, "rz-hashtags");
  if (p.reel) h += rzMontage(p);
  h += rzBloc("Dossier des images en pleine taille", "ch:" + p.id, p.cheminLocal, "rz-chemin");
  h += '<div class="rz-prog">' + rzCase("rz-prog", p.id, prog, "<b>Programmé dans Meta</b>") + '</div>';
  return h + '</div></li>';
}

function rzTete(){
  const pubs = RESEAUX.publications, nProg = pubs.filter(p => rzProg(p.id)).length;
  const suiv = rzProchaine();
  const points = RESEAUX.aValider.sections.flatMap(s => s.points), restants = points.filter(x => !etat.reseaux.valide[x.id]).length;
  let h = '<section class="bloc rz-tete"><h2>Réseaux sociaux</h2>'
    + '<p class="sous" style="margin:0">Tout est ici, prêt à coller : les 11 publications du 22 octobre au 4 novembre, le guide pas à pas de Meta Business Suite et le plan du mois.</p>';
  if (suiv) {
    const d = rzEcart(suiv.date);
    h += '<div class="rz-prochaine"><div class="rz-pk">À programmer ensuite</div>'
      + '<div class="rz-pt">' + esc(suiv.titre) + '</div>'
      + '<div class="rz-pm"><span class="chip' + (d < 0 ? " retard" : "") + '">' + esc(rzDateLongue(suiv.date)) + ' · ' + esc(suiv.heure) + '</span><span class="chip">' + esc(rzEcartTexte(suiv.date)) + '</span><span class="chip">' + esc(suiv.format) + '</span></div>'
      + '<div class="rz-reseaux">' + suiv.reseaux.map(r => '<span class="chip">' + esc(r) + '</span>').join("") + '</div>'
      + (suiv.avant ? '<p class="rz-av"><b>Avant :</b> ' + esc(suiv.avant) + '</p>' : "")
      + '<div class="outils"><button class="btn primaire" data-act="rz-fiche" data-id="' + esc(suiv.id) + '">Ouvrir sa fiche</button></div></div>';
  } else h += '<div class="rz-prochaine fini"><div class="rz-pt">Les 11 publications sont programmées.</div><p class="sous" style="margin:0">Vérifiez-les dans le Planificateur de Meta, puis préparez le mois suivant.</p></div>';
  h += '<div class="rz-avance"><div class="barre"><span class="piste"><b>' + nProg + ' publication' + (nProg > 1 ? "s programmées" : " programmée") + ' sur ' + pubs.length + '</b></span><span class="n">à cocher dans chaque fiche</span>'
    + '<div class="jauge" role="img" aria-label="' + nProg + ' sur ' + pubs.length + ' programmées"><i style="width:' + Math.round(100 * nProg / pubs.length) + '%;background:var(--vert)"></i></div></div></div>';
  h += '<div class="rz-saut" role="group" aria-label="Aller à">'
    + '<button class="btn" data-act="rz-aller" data-id="rz-s-valider">À valider' + (restants ? ' <span class="compte-rz">' + restants + '</span>' : '') + '</button>'
    + '<button class="btn" data-act="rz-aller" data-id="rz-s-kit">Le kit des 10 jours</button>'
    + '<button class="btn" data-act="rz-aller" data-id="rz-s-guide">Le guide Meta</button>'
    + '<button class="btn" data-act="rz-aller" data-id="rz-s-plan">Le plan du mois</button>'
    + '<a class="btn rz-lien" href="' + esc(RESEAUX.planche) + '" target="_blank" rel="noopener noreferrer">La planche du mois ↗</a></div>';
  return h + '</section>';
}

function rzValider(){
  const v = RESEAUX.aValider, points = v.sections.flatMap(s => s.points), restants = points.filter(x => !etat.reseaux.valide[x.id]).length;
  return '<section class="bloc" id="rz-s-valider"><h2>À valider avant de publier</h2>'
    + '<p class="sous">' + esc(v.intro) + ' <b>' + (restants ? restants + " point" + (restants > 1 ? "s" : "") + " sur " + points.length + " à valider" : "Tout est validé") + '.</b></p>'
    + v.sections.map(s => '<h3 class="rz-h3">' + esc(s.titre) + '</h3><ul class="rz-valider">'
      + s.points.map(x => '<li class="' + (etat.reseaux.valide[x.id] ? "fait" : "") + '">' + rzCase("rz-valide", x.id, !!etat.reseaux.valide[x.id], x.html) + '</li>').join("") + '</ul>').join("")
    + '</section>';
}

function rzKit(){
  const pubs = RESEAUX.publications, epingles = pubs.filter(p => /^E\d/.test(p.id)), jours = pubs.filter(p => !/^E\d/.test(p.id));
  return '<section class="bloc" id="rz-s-kit"><h2>Le kit des 10 jours</h2>'
    + '<p class="sous">Du 22 octobre au 4 novembre : 3 publications épinglées, puis 5 publications et 3 Reels. Ouvrez une fiche, copiez la légende, collez-la dans Meta Business Suite, programmez, puis cochez « Programmé dans Meta ». Le 31 octobre et le 1ᵉʳ novembre, rien n’est prévu : 10 minutes pour répondre aux commentaires.</p>'
    + '<div class="phase"><h3>Avant le lancement : les 3 épinglées</h3></div><ul class="rz-cartes">' + epingles.map(rzCarte).join("") + '</ul>'
    + '<div class="phase"><h3>Les 10 jours</h3></div><ul class="rz-cartes">' + jours.map(rzCarte).join("") + '</ul></section>';
}

function rzGuide(){
  const g = RESEAUX.guide;
  const tout = (RESEAUX.guide.sections.flatMap(s => [s.id].concat(s.sous.map(x => x.id))));
  const nOuvertes = tout.filter(k => rzOuvert(k)).length;
  return '<section class="bloc" id="rz-s-guide"><h2>Le guide : Meta Business Suite et automatisation</h2>'
    + '<p class="sous">Chaque section se replie. Ce qui n’a pas pu être vérifié à la source est surligné « à vérifier ».</p>'
    + '<div class="rz-md rz-preambule">' + rzIco(g.preambule) + '</div>'
    + '<div class="outils" style="margin:6px 0 10px"><button class="btn" data-act="rz-guide-tout" data-v="1">Tout déplier</button>' + (nOuvertes ? '<button class="btn discret" data-act="rz-guide-tout" data-v="0">Tout replier</button>' : "") + '</div>'
    + '<div class="rz-accs">' + g.sections.map(s => rzAcc(s.id, s.titre, s.intro + s.sous.map(x => rzAcc(x.id, x.titre, x.html, 2)).join(""), 1)).join("") + '</div></section>';
}

function rzPlan(){
  const P = RESEAUX.plan;
  return '<section class="bloc" id="rz-s-plan"><h2>Le plan du mois</h2>'
    + '<p class="sous">Résumé de la planche (« Un fondateur seul, une heure par semaine »). Sans budget au départ, et une règle qui ne bouge pas : on ne dit que ce qui est vrai aujourd’hui.</p>'
    + '<h3 class="rz-h3">Ce qu’on cherche ce mois-ci</h3><ul class="rz-liste">' + P.objectifs.map(o => '<li><b>' + esc(o[0]) + '.</b> ' + esc(o[1]) + '</li>').join("") + '</ul>'
    + '<h3 class="rz-h3">Les réseaux, dans l’ordre</h3><ul class="rz-reseaux-liste">' + P.reseaux.map(r => '<li><span class="chip code">Priorité ' + esc(r[0]) + '</span><div><b>' + esc(r[1]) + '</b><p>' + esc(r[2]) + '</p></div></li>').join("") + '</ul>'
    + '<h3 class="rz-h3">La fréquence : cinq rendez-vous par semaine</h3><table class="rz-tab"><thead><tr><th>Jour</th><th>Format</th><th>Heure</th><th>Contenu</th></tr></thead><tbody>'
    + P.frequence.map(f => '<tr>' + ["Jour", "Format", "Heure", "Contenu"].map((l, k) => '<td data-l="' + l + '">' + esc(f[k]) + '</td>').join("") + '</tr>').join("") + '</tbody></table>'
    + '<p class="sous" style="margin:8px 0 0">' + esc(P.chaqueJour) + '</p>'
    + '<h3 class="rz-h3">Les cinq piliers éditoriaux</h3><ol class="rz-liste num">' + P.piliers.map(o => '<li><b>' + esc(o[0]) + '.</b> ' + esc(o[1]) + '</li>').join("") + '</ol>'
    + '<h3 class="rz-h3">Ma routine d’une heure par semaine</h3><p class="sous" style="margin:0 0 8px">Un créneau fixe, par exemple le mardi de 17 h à 18 h, après la tâche du lundi. Plus 10 minutes par jour pour répondre aux gens.</p>'
    + '<table class="rz-tab"><thead><tr><th>Minutes</th><th>Ce que vous faites</th></tr></thead><tbody>' + P.routine.map(r => '<tr><td data-l="Minutes" class="mono">' + esc(r[0]) + '</td><td data-l="Ce que vous faites">' + r[1] + '</td></tr>').join("") + '</tbody></table>'
    + '<h3 class="rz-h3">Avant chaque publication : six questions</h3><ol class="rz-liste num">' + P.questions.map(q => '<li>' + esc(q) + '</li>').join("") + '</ol>'
    + '<div class="outils" style="margin-top:14px"><a class="btn primaire rz-lien" href="' + esc(RESEAUX.planche) + '" target="_blank" rel="noopener noreferrer">Ouvrir la planche complète ↗</a></div>'
    + '<p class="sous" style="margin:10px 0 0">Données du ' + esc(dateFr(RESEAUX.genereLe)) + ', générées depuis le dossier « ' + esc(RESEAUX.source) + ' ».</p></section>';
}

function vueReseaux(){
  return '<div class="pile rz">' + rzTete() + rzValider() + rzKit() + rzGuide() + rzPlan() + '</div>';
}

/* Actions de l'onglet (appelées par le gestionnaire de clics de app.js). */
function rzAgir(a, b){
  const id = b.dataset.id;
  if (a === "rz-copier") { rzCopier(b); return true; }
  if (a === "rz-ouvrir") { ui.ouv[id] = !ui.ouv[id]; rendre(); const el = document.getElementById(id.startsWith("p:") ? "rz-p-" + id.slice(2) : "rz-a-" + id); if (el && ui.ouv[id] && el.getBoundingClientRect().top < 0) el.scrollIntoView({ block:"start" }); return true; }
  if (a === "rz-valide" || a === "rz-prog") {
    const k = a === "rz-valide" ? "valide" : "prog";
    if (b.checked) etat.reseaux[k][id] = Date.now(); else delete etat.reseaux[k][id];
    planifier(); rendre();
    const n = document.querySelector('[data-act="' + a + '"][data-id="' + CSS.escape(id) + '"]'); if (n) n.focus({ preventScroll:true });
    return true;
  }
  if (a === "rz-aller") {
    const el = document.getElementById(id); if (el) el.scrollIntoView({ block:"start", behavior:"smooth" });
    return true;
  }
  if (a === "rz-fiche") {
    ui.ouv["p:" + id] = true; rendre();
    requestAnimationFrame(() => { const el = document.getElementById("rz-p-" + id); if (el) el.scrollIntoView({ block:"start", behavior:"smooth" }); });
    return true;
  }
  if (a === "rz-guide-tout") {
    RESEAUX.guide.sections.forEach(s => { [s.id].concat(s.sous.map(x => x.id)).forEach(k => { ui.ouv[k] = b.dataset.v === "1"; }); });
    rendre(); return true;
  }
  return false;
}
