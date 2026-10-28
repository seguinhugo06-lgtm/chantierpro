import { useEffect, useMemo, useState } from 'react';
import {
  ArrowRightLeft, Check, ClipboardList, Download, Edit3, Layers, Minus, PackagePlus, Percent, Plus, RefreshCw, Search, Trash2, Truck, Upload, X,
} from 'lucide-react';
import { Bouton, BoutonIcone } from '../ui/Bouton';
import Carte from '../ui/Carte';
import Champ from '../ui/Champ';
import EtatVide from '../ui/EtatVide';
import LigneListe, { GroupeListe } from '../ui/LigneListe';
import Modal, { ModalHeader, ModalTitle, ModalDescription, ModalBody, ModalFooter } from '../ui/Modal';
import Pastille from '../ui/Pastille';
import { SegmentDefilant, ChampRecherche } from '../ui/Filtres';
import { useConfirm, useToast } from '../../context/AppContext';
import { remettreFichier } from '../../lib/natif';
import { jourLocal, dateLue } from '../../lib/dates';
import { achatConnu, margeBrute, niveauMarge, CLASSES_TON_MARGE } from '../../lib/margeArticle';
import { formatMoney } from '../../lib/formatters';
import { generateId } from '../../lib/utils';

/**
 * Les onglets de suivi du Catalogue : fournisseurs, mouvements de stock, packs, inventaire et coefficients. Refonte du 26 oct. 2026
 * (Task 7 « ancien code ») : jetons du thème, `Champ`, ui/Modal (avant : fenêtres faites main sans rôle), une confirmation avant
 * toute suppression (pack, liaison), et des écritures dont le résultat est lu avant d'être annoncé.
 *
 * Ce que ces onglets gardent vit dans le stockage de CET appareil (fournisseurs, liens, mouvements, packs, coefficients) :
 * seuls les articles et leur stock sont en base. Décision d'Hugo attendue : voir le rapport de la tâche.
 */

/**
 * Nombre décimal saisi en texte (« 2,25 », « 1.8 ») et validé à la sortie du champ (ou Entrée), borné.
 * Avant (recette du 9 oct. 2026), le champ nombre contrôlé retombait à 1,5 dès le point ou la virgule : « 2.25 » donnait 1,525.
 */
export function ChampDecimal({ valeur, min, max, onValider, ...props }) {
  const enTexte = (v) => String(v).replace('.', ',');
  const [texte, setTexte] = useState(enTexte(valeur));
  useEffect(() => { setTexte(enTexte(valeur)); }, [valeur]);
  const valider = () => {
    const n = parseFloat(String(texte).replace(',', '.'));
    const v = Number.isFinite(n) ? Math.max(min, Math.min(max, Math.round(n * 100) / 100)) : valeur;
    setTexte(enTexte(v));
    if (v !== valeur) onValider(v);
  };
  return (
    <input
      type="text" inputMode="decimal" value={texte}
      onChange={(e) => setTexte(e.target.value.replace(/[^\d.,]/g, ''))}
      onBlur={valider} onKeyDown={(e) => { if (e.key === 'Enter') e.currentTarget.blur(); }}
      {...props}
    />
  );
}

const TYPES_MOUVEMENT = [
  { valeur: 'in', libelle: 'Entrée (livraison)' },
  { valeur: 'out', libelle: 'Sortie (chantier)' },
  { valeur: 'return', libelle: 'Retour' },
  { valeur: 'adjustment', libelle: 'Ajustement' },
];
/** Ces onglets vivent dans le stockage de CET appareil (voir plus haut) : le dire en tête, toujours la même phrase. */
function NoteAppareil() {
  return <p className="text-sm text-encre-3">Gardé sur cet appareil uniquement.</p>;
}

/** Coût d'un pack : seulement si le prix d'achat de CHAQUE article est connu (sinon il serait sous-estimé et la marge fausse). */
function coutPack(articles, catalogue) {
  let total = 0;
  for (const a of articles) {
    const achat = achatConnu(catalogue.find((c) => c.id === a.articleId)?.prixAchat ?? a.prixAchatSnapshot);
    if (achat === null) return null;
    total += achat * (a.quantite || 1);
  }
  return articles.length > 0 ? total : null;
}

const normaliserType = (t) => (t === 'entree' ? 'in' : t === 'sortie' ? 'out' : t);
const LIBELLE_TYPE = { in: 'Entrée', out: 'Sortie', return: 'Retour', adjustment: 'Ajustement' };
const TON_TYPE = { in: 'succes', out: 'info', return: 'neutre', adjustment: 'alerte' };

/* ============================== FOURNISSEURS ============================== */

const FOURNISSEUR_VIDE = { nom: '', email: '', telephone: '', adresse: '', delaiLivraison: '3', conditions: '' };

export function OngletFournisseurs({ fournisseurs, setFournisseurs, liens, setLiens, catalogue, peutModifier, franchiseTva = false, onImporter }) {
  const { showToast } = useToast();
  const { confirm } = useConfirm();
  const [formulaire, setFormulaire] = useState(null); // null | { id|null, ...champs }
  const [lier, setLier] = useState(null); // { fournisseurId, fournisseurNom }
  const [recherche, setRecherche] = useState('');
  const [choisi, setChoisi] = useState(null);
  const [prix, setPrix] = useState('');

  const enregistrer = () => {
    if (!formulaire.nom.trim()) { showToast('Nom requis', 'error'); return; }
    const { id, ...champs } = formulaire;
    if (id) setFournisseurs((prev) => prev.map((f) => (f.id === id ? { ...f, ...champs } : f)));
    else setFournisseurs((prev) => [...prev, { id: generateId(), ...champs, createdAt: new Date().toISOString() }]);
    showToast(id ? 'Fournisseur modifié sur cet appareil' : 'Fournisseur ajouté sur cet appareil', 'success');
    setFormulaire(null);
  };

  const supprimer = async (f) => {
    if (!(await confirm({ title: 'Supprimer le fournisseur', message: `Supprimer "${f.nom}" et ses liaisons avec des articles ?` }))) return;
    setFournisseurs((prev) => prev.filter((x) => x.id !== f.id));
    setLiens((prev) => prev.filter((l) => l.fournisseurId !== f.id));
    showToast('Fournisseur supprimé de cet appareil', 'success');
  };

  const delier = async (lien, article, f) => {
    if (!(await confirm({ title: 'Retirer la liaison', message: `Retirer "${article.nom}" de la liste de ${f.nom} ?` }))) return;
    setLiens((prev) => prev.filter((x) => x.id !== lien.id));
    showToast('Liaison retirée sur cet appareil', 'info');
  };

  const dejaLies = lier ? liens.filter((l) => l.fournisseurId === lier.fournisseurId).map((l) => l.articleId) : [];
  const q = recherche.toLowerCase();
  const candidats = lier
    ? catalogue.filter((c) => !dejaLies.includes(c.id) && (!q || c.nom.toLowerCase().includes(q) || (c.reference || '').toLowerCase().includes(q) || (c.categorie || '').toLowerCase().includes(q))).slice(0, 20)
    : [];

  return (
    <div className="space-y-4">
      <NoteAppareil />
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm text-encre-2">{fournisseurs.length} fournisseur{fournisseurs.length > 1 ? 's' : ''}</p>
        {peutModifier && fournisseurs.length > 0 && <Bouton variante="secondaire" icone={Plus} onClick={() => setFormulaire({ id: null, ...FOURNISSEUR_VIDE })}>Ajouter un fournisseur</Bouton>}
      </div>

      {fournisseurs.length === 0 ? (
        <Carte marge="aucun">
          <EtatVide
            icone={Truck} titre="Gérez vos fournisseurs" texte="Centralisez leurs contacts, comparez les prix d'achat et suivez les délais de livraison."
            action={peutModifier ? (
              <div className="flex flex-col items-center gap-2">
                <Bouton variante="principal" icone={Plus} onClick={() => setFormulaire({ id: null, ...FOURNISSEUR_VIDE })}>Ajouter un fournisseur</Bouton>
                <Bouton variante="discret" icone={Upload} onClick={onImporter}>Importer un fichier CSV</Bouton>
              </div>
            ) : null}
          />
        </Carte>
      ) : (
        <div className="grid grid-cols-1 gap-3">
          {fournisseurs.map((f) => {
            const fLiens = liens.filter((l) => l.fournisseurId === f.id);
            return (
              <Carte key={f.id} className="min-w-0">
                <div className="flex items-start gap-3">
                  <span className="w-11 h-11 rounded-full bg-surface-2 text-encre-2 flex items-center justify-center font-semibold flex-shrink-0" aria-hidden="true">{f.nom.charAt(0).toUpperCase()}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-base font-semibold text-encre break-words">{f.nom}</p>
                    <p className="text-sm text-encre-2 break-words">{[f.telephone, f.email || f.contact].filter(Boolean).join(' · ')}</p>
                    <div className="flex items-center gap-2 mt-2 flex-wrap">
                      {f.delaiLivraison && <Pastille ton="neutre">Délai {f.delaiLivraison} j</Pastille>}
                      <Pastille ton={fLiens.length > 0 ? 'succes' : 'neutre'}>{fLiens.length} article{fLiens.length > 1 ? 's' : ''}</Pastille>
                    </div>
                    {/* Texte libre : une phrase à la ligne, pas une pastille qui ne se coupe pas */}
                    {f.conditions && <p className="mt-2 text-sm text-encre-2 break-words">Paiement : {f.conditions}</p>}
                  </div>
                  {peutModifier && (
                    <div className="flex items-center -mr-2">
                      <BoutonIcone icone={Edit3} libelle={`Modifier ${f.nom}`} onClick={() => setFormulaire({ id: f.id, nom: f.nom, email: f.email || f.contact || '', telephone: f.telephone || '', adresse: f.adresse || '', delaiLivraison: f.delaiLivraison || '3', conditions: f.conditions || '' })} />
                      <BoutonIcone icone={Trash2} libelle={`Supprimer ${f.nom}`} onClick={() => supprimer(f)} />
                    </div>
                  )}
                </div>
                <div className="mt-3 pt-3 border-t border-bord">
                  {fLiens.length > 0 && (
                    <ul className="mb-2 divide-y divide-bord">
                      {fLiens.map((l) => {
                        const article = catalogue.find((c) => c.id === l.articleId);
                        if (!article) return null;
                        return (
                          <li key={l.id} className="flex items-center justify-between gap-2 py-1.5 text-sm">
                            <span className="min-w-0 truncate text-encre-2">{article.nom} <span className="text-encre-3">{article.reference || ''}</span></span>
                            <span className="flex items-center gap-1 flex-shrink-0">
                              <span className="font-semibold tabular-nums text-encre">{achatConnu(l.prixAchat) !== null ? formatMoney(l.prixAchat, 2) : '—'}</span>
                              {peutModifier && <BoutonIcone icone={X} taille={16} libelle={`Retirer ${article.nom} de ${f.nom}`} onClick={() => delier(l, article, f)} />}
                            </span>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                  {peutModifier && (
                    <Bouton variante="discret" taille="compacte" icone={Plus} onClick={() => { setLier({ fournisseurId: f.id, fournisseurNom: f.nom }); setRecherche(''); setChoisi(null); setPrix(''); }}>
                      Lier un article
                    </Bouton>
                  )}
                </div>
              </Carte>
            );
          })}
        </div>
      )}

      {/* Nouveau fournisseur / modification */}
      <Modal isOpen={!!formulaire} onClose={() => setFormulaire(null)} size="md">
        <ModalHeader><ModalTitle>{formulaire?.id ? 'Modifier' : 'Nouveau'} fournisseur</ModalTitle></ModalHeader>
        <ModalBody className="space-y-4">
          <Champ id="fournisseur-nom" libelle="Nom" value={formulaire?.nom || ''} onChange={(e) => setFormulaire((p) => ({ ...p, nom: e.target.value }))} />
          <div className="grid grid-cols-2 gap-3 items-end">
            <Champ id="fournisseur-tel" libelle="Téléphone" facultatif type="tel" value={formulaire?.telephone || ''} onChange={(e) => setFormulaire((p) => ({ ...p, telephone: e.target.value }))} />
            <Champ id="fournisseur-mail" libelle="Email" facultatif type="email" value={formulaire?.email || ''} onChange={(e) => setFormulaire((p) => ({ ...p, email: e.target.value }))} />
          </div>
          <Champ id="fournisseur-adresse" libelle="Adresse" facultatif value={formulaire?.adresse || ''} onChange={(e) => setFormulaire((p) => ({ ...p, adresse: e.target.value }))} />
          <div className="grid grid-cols-2 gap-3 items-end">
            <Champ id="fournisseur-delai" libelle="Délai de livraison (jours)" facultatif type="number" inputMode="numeric" value={formulaire?.delaiLivraison || ''} onChange={(e) => setFormulaire((p) => ({ ...p, delaiLivraison: e.target.value }))} />
            <Champ id="fournisseur-conditions" libelle="Conditions de paiement" facultatif value={formulaire?.conditions || ''} onChange={(e) => setFormulaire((p) => ({ ...p, conditions: e.target.value }))} />
          </div>
        </ModalBody>
        <ModalFooter>
          <Bouton variante="secondaire" onClick={() => setFormulaire(null)}>Annuler</Bouton>
          <Bouton variante="principal" onClick={enregistrer}>{formulaire?.id ? 'Enregistrer' : 'Ajouter'}</Bouton>
        </ModalFooter>
      </Modal>

      {/* Lier un article à ce fournisseur */}
      <Modal isOpen={!!lier} onClose={() => setLier(null)} size="md">
        <ModalHeader>
          <ModalTitle>Lier un article</ModalTitle>
          <ModalDescription>Fournisseur : <span className="font-semibold text-encre">{lier?.fournisseurNom}</span></ModalDescription>
        </ModalHeader>
        <ModalBody className="space-y-4">
          {!choisi ? (
            <>
              <ChampRecherche valeur={recherche} onChange={setRecherche} placeholder="Rechercher un article..." ariaLabel="Rechercher un article à lier" />
              {candidats.length === 0 ? (
                <p className="p-6 text-center text-sm text-encre-3">{catalogue.length === 0 ? 'Aucun article dans le catalogue' : recherche ? 'Aucun article trouvé' : 'Tous les articles sont déjà liés'}</p>
              ) : (
                <GroupeListe>
                  {candidats.map((a) => (
                    <LigneListe
                      key={a.id} onClick={() => { setChoisi(a); setPrix(achatConnu(a.prixAchat) !== null ? String(a.prixAchat) : ''); }}
                      titre={a.nom} meta={[a.reference, a.categorie].filter(Boolean).join(' · ')}
                      montant={achatConnu(a.prixAchat) !== null ? formatMoney(a.prixAchat) : undefined}
                    />
                  ))}
                </GroupeListe>
              )}
            </>
          ) : (
            <>
              <div className="flex items-center justify-between gap-3 p-3 rounded-xl bg-surface-2">
                <div className="min-w-0">
                  <p className="font-semibold text-base text-encre truncate">{choisi.nom}</p>
                  <p className="text-sm text-encre-2">{[choisi.reference, choisi.categorie].filter(Boolean).join(' · ')}</p>
                </div>
                <Bouton variante="secondaire" taille="compacte" onClick={() => { setChoisi(null); setPrix(''); }}>Changer</Bouton>
              </div>
              <Champ id="lier-prix" libelle={`Prix d'achat chez ${lier?.fournisseurNom} (${franchiseTva ? '€, TVA comprise' : '€ HT'})`} facultatif type="number" inputMode="decimal" min="0" step="0.01" autoFocus value={prix} onChange={(e) => setPrix(e.target.value)} />
            </>
          )}
        </ModalBody>
        {choisi && (
          <ModalFooter>
            <Bouton variante="secondaire" onClick={() => setLier(null)}>Annuler</Bouton>
            <Bouton
              variante="principal"
              onClick={() => {
                setLiens((prev) => {
                  const existant = prev.find((l) => l.articleId === choisi.id && l.fournisseurId === lier.fournisseurId);
                  if (existant) return prev.map((l) => (l.id === existant.id ? { ...l, prixAchat: achatConnu(prix), updatedAt: new Date().toISOString() } : l));
                  return [...prev, { id: generateId(), articleId: choisi.id, fournisseurId: lier.fournisseurId, prixAchat: achatConnu(prix), createdAt: new Date().toISOString() }];
                });
                showToast(`"${choisi.nom}" lié à ${lier.fournisseurNom} sur cet appareil`, 'success');
                setLier(null);
              }}
            >
              Lier l'article
            </Bouton>
          </ModalFooter>
        )}
      </Modal>
    </div>
  );
}

/* ============================== MOUVEMENTS ============================== */

const MOUVEMENT_VIDE = { articleId: '', type: 'in', quantite: '', chantierId: '', raison: '' };

export function OngletMouvements({ mouvements, catalogue, chantiers, peutModifier, onAjouter }) {
  const { showToast } = useToast();
  const [typeFiltre, setTypeFiltre] = useState('all');
  const [articleFiltre, setArticleFiltre] = useState('');
  const [formulaire, setFormulaire] = useState(null);
  const [enCours, setEnCours] = useState(false);

  const filtres = useMemo(() => mouvements.filter((m) => {
    const t = normaliserType(m.type);
    if (typeFiltre !== 'all' && t !== typeFiltre) return false;
    if (articleFiltre && m.articleId !== articleFiltre) return false;
    return true;
  }), [mouvements, typeFiltre, articleFiltre]);

  const exporter = () => {
    const lignes = [['Date', 'Article', 'Référence', 'Type', 'Quantité', 'Chantier', 'Raison']];
    mouvements.forEach((m) => {
      const article = catalogue.find((c) => c.id === m.articleId);
      const chantier = chantiers?.find((c) => c.id === m.chantierId);
      lignes.push([dateLue(m.date).toLocaleDateString('fr-FR'), article?.nom || m.articleNom || '?', article?.reference || '', LIBELLE_TYPE[normaliserType(m.type)] || 'Ajustement', m.quantite, chantier?.nom || '', m.raison || m.motif || '']);
    });
    const csv = lignes.map((r) => r.map((v) => `"${String(v ?? '').replace(/"/g, '""')}"`).join(';')).join('\n');
    remettreFichier(new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' }), `mouvements_${jourLocal()}.csv`)
      .then((r) => { if (r !== 'annule') showToast('Export mouvements prêt', 'success'); })
      .catch(() => showToast('Export impossible', 'error'));
  };

  const valider = async () => {
    if (!formulaire.articleId || !formulaire.quantite) { showToast('Article et quantité requis', 'error'); return; }
    setEnCours(true);
    const ok = await onAjouter(formulaire);
    setEnCours(false);
    if (ok) setFormulaire(null); // refusé : la fenêtre et la saisie restent (le message vient de DataContext)
  };

  const entrees = mouvements.filter((m) => ['in', 'return'].includes(normaliserType(m.type))).reduce((s, m) => s + Math.abs(m.quantite || 0), 0);
  const sorties = mouvements.filter((m) => normaliserType(m.type) === 'out').reduce((s, m) => s + Math.abs(m.quantite || 0), 0);
  const articlesDuJournal = [...new Set(mouvements.map((m) => m.articleId))];

  return (
    <div className="space-y-4">
      <NoteAppareil />
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <p className="text-sm text-encre-2">
          {filtres.length} mouvement{filtres.length > 1 ? 's' : ''}{typeFiltre !== 'all' || articleFiltre ? ` sur ${mouvements.length}` : ''}
          {mouvements.length > 0 && ` · ${entrees} entrée${entrees > 1 ? 's' : ''} · ${sorties} sortie${sorties > 1 ? 's' : ''}`}
        </p>
        <div className="flex gap-2">
          {mouvements.length > 0 && <Bouton variante="secondaire" icone={Download} onClick={exporter}>CSV</Bouton>}
          {peutModifier && mouvements.length > 0 && <Bouton variante="secondaire" icone={Plus} onClick={() => setFormulaire({ ...MOUVEMENT_VIDE })}>Nouveau mouvement</Bouton>}
        </div>
      </div>

      {mouvements.length > 0 && (
        <div className="flex flex-col sm:flex-row gap-2 sm:items-center">
          <div className="flex-1 min-w-0">
            <SegmentDefilant
              ariaLabel="Type de mouvement" valeur={typeFiltre} onChange={setTypeFiltre}
              options={[{ valeur: 'all', libelle: 'Tous' }, { valeur: 'in', libelle: 'Entrées' }, { valeur: 'out', libelle: 'Sorties' }, { valeur: 'return', libelle: 'Retours' }, { valeur: 'adjustment', libelle: 'Ajustements' }]}
            />
          </div>
          {mouvements.length > 5 && (
            <select aria-label="Filtrer par article" className="h-11 px-3 rounded-xl border border-bord-fort bg-surface text-sm text-encre" value={articleFiltre} onChange={(e) => setArticleFiltre(e.target.value)}>
              <option value="">Tous les articles</option>
              {articlesDuJournal.map((id) => <option key={id} value={id}>{catalogue.find((c) => c.id === id)?.nom || 'Inconnu'}</option>)}
            </select>
          )}
        </div>
      )}

      {mouvements.length === 0 ? (
        <Carte marge="aucun">
          <EtatVide
            icone={ArrowRightLeft} titre="Tracez vos mouvements de stock" texte="Enregistrez les entrées et les sorties pour suivre vos stocks."
            action={peutModifier ? <Bouton variante="principal" icone={Plus} onClick={() => setFormulaire({ ...MOUVEMENT_VIDE })}>Enregistrer un mouvement</Bouton> : null}
          />
        </Carte>
      ) : filtres.length === 0 ? (
        <Carte marge="aucun">
          <EtatVide icone={Search} titre="Aucun mouvement pour ces filtres" action={<Bouton variante="secondaire" onClick={() => { setTypeFiltre('all'); setArticleFiltre(''); }}>Réinitialiser</Bouton>} />
        </Carte>
      ) : (
        <GroupeListe>
          {filtres.slice(0, 50).map((m) => {
            const chantier = chantiers?.find((c) => c.id === m.chantierId);
            const article = catalogue.find((c) => c.id === m.articleId);
            const t = normaliserType(m.type);
            const entree = t === 'in' || t === 'return';
            return (
              <LigneListe
                key={m.id}
                titre={<>{article?.nom || m.articleNom || 'Article inconnu'}{article?.reference && <span className="ml-2 text-sm font-normal text-encre-3">{article.reference}</span>}</>}
                meta={[dateLue(m.date).toLocaleDateString('fr-FR'), article?.categorie, chantier?.nom, m.raison || m.motif].filter(Boolean).join(' · ')}
                montant={`${entree ? '+' : t === 'out' ? '−' : ''}${Math.abs(m.quantite)}`}
                pastille={<Pastille ton={TON_TYPE[t] || 'alerte'}>{LIBELLE_TYPE[t] || 'Ajustement'}</Pastille>}
              />
            );
          })}
        </GroupeListe>
      )}

      <Modal isOpen={!!formulaire} onClose={() => setFormulaire(null)} size="md" closeOnBackdrop={!enCours} closeOnEscape={!enCours}>
        <ModalHeader><ModalTitle>Nouveau mouvement</ModalTitle></ModalHeader>
        <ModalBody className="space-y-4">
          <Champ id="mouvement-type" as="select" libelle="Type" value={formulaire?.type || 'in'} onChange={(e) => setFormulaire((p) => ({ ...p, type: e.target.value }))}>
            {TYPES_MOUVEMENT.map((t) => <option key={t.valeur} value={t.valeur}>{t.libelle}</option>)}
          </Champ>
          <Champ id="mouvement-article" as="select" libelle="Article" value={formulaire?.articleId || ''} onChange={(e) => setFormulaire((p) => ({ ...p, articleId: e.target.value }))}>
            <option value="">Choisir l'article</option>
            {catalogue.map((c) => <option key={c.id} value={c.id}>{c.nom} ({c.stock_actuel ?? '?'} en stock)</option>)}
          </Champ>
          <Champ id="mouvement-quantite" libelle="Quantité" type="number" inputMode="numeric" min="1" value={formulaire?.quantite || ''} onChange={(e) => setFormulaire((p) => ({ ...p, quantite: e.target.value }))} />
          {formulaire?.type === 'out' && chantiers.length > 0 && (
            <Champ id="mouvement-chantier" as="select" libelle="Chantier de destination" facultatif value={formulaire.chantierId || ''} onChange={(e) => setFormulaire((p) => ({ ...p, chantierId: e.target.value }))}>
              <option value="">Aucun</option>
              {chantiers.filter((c) => c.statut === 'en_cours').map((c) => <option key={c.id} value={c.id}>{c.nom}</option>)}
            </Champ>
          )}
          <Champ id="mouvement-raison" libelle="Raison ou commentaire" facultatif value={formulaire?.raison || ''} onChange={(e) => setFormulaire((p) => ({ ...p, raison: e.target.value }))} />
        </ModalBody>
        <ModalFooter>
          <Bouton variante="secondaire" onClick={() => setFormulaire(null)} disabled={enCours}>Annuler</Bouton>
          <Bouton variante="principal" onClick={valider} chargement={enCours}>Valider</Bouton>
        </ModalFooter>
      </Modal>
    </div>
  );
}

/* ============================== PACKS ============================== */

const PACK_VIDE = { nom: '', description: '', articles: [], prixVente: '' };

export function OngletPacks({ packs, setPacks, catalogue, peutModifier, modeDiscret }) {
  const { showToast } = useToast();
  const { confirm } = useConfirm();
  const [formulaire, setFormulaire] = useState(null); // null | { id|null, ...champs }
  const prix = (n) => (modeDiscret ? '·····' : formatMoney(Number(n)));

  const enregistrer = () => {
    if (!formulaire.nom.trim() || formulaire.articles.length === 0) { showToast('Nom et articles requis', 'error'); return; }
    // Chaque article garde un instantané (nom, prix, unité) : le pack résiste à la suppression d'un article
    const enrichis = formulaire.articles.map((a) => {
      const item = catalogue.find((c) => c.id === a.articleId);
      return { ...a, label: item?.nom || a.label || '?', prixSnapshot: item?.prix || a.prixSnapshot || 0, prixAchatSnapshot: achatConnu(item?.prixAchat) ?? achatConnu(a.prixAchatSnapshot), unite: item?.unite || a.unite || 'u' };
    });
    const coutTotal = coutPack(enrichis, catalogue); // null : un prix d'achat manque
    const venteTotale = enrichis.reduce((s, a) => s + ((catalogue.find((c) => c.id === a.articleId)?.prix ?? a.prixSnapshot) || 0) * (a.quantite || 1), 0);
    const { id, ...champs } = formulaire;
    const donnees = { ...champs, articles: enrichis, totalCost: coutTotal, totalVenteSuggere: venteTotale, prixVente: parseFloat(formulaire.prixVente) || venteTotale };
    if (id) setPacks((prev) => prev.map((p) => (p.id === id ? { ...p, ...donnees, updatedAt: new Date().toISOString() } : p)));
    else setPacks((prev) => [...prev, { id: generateId(), ...donnees, createdAt: new Date().toISOString() }]);
    showToast(id ? 'Pack modifié sur cet appareil' : 'Pack créé sur cet appareil', 'success');
    setFormulaire(null);
  };

  const dupliquer = (pack) => {
    setPacks((prev) => [...prev, { ...pack, id: generateId(), nom: `${pack.nom} (copie)`, createdAt: new Date().toISOString() }]);
    showToast(`Pack "${pack.nom}" dupliqué sur cet appareil`, 'success');
  };

  const supprimer = async (pack) => {
    if (!(await confirm({ title: 'Supprimer le pack', message: `Supprimer le pack "${pack.nom}" ? Les articles du catalogue ne sont pas touchés.` }))) return;
    setPacks((prev) => prev.filter((p) => p.id !== pack.id));
    showToast('Pack supprimé de cet appareil', 'success');
  };

  const majArticle = (i, champs) => setFormulaire((p) => ({ ...p, articles: p.articles.map((a, j) => (j === i ? { ...a, ...champs } : a)) }));
  const coutForm = formulaire ? coutPack(formulaire.articles.filter((a) => a.articleId), catalogue) : null;
  const venteForm = formulaire ? formulaire.articles.reduce((s, a) => s + (catalogue.find((c) => c.id === a.articleId)?.prix || 0) * (a.quantite || 1), 0) : 0;

  return (
    <div className="space-y-4">
      <NoteAppareil />
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm text-encre-2">{packs.length} pack{packs.length > 1 ? 's' : ''}</p>
        {peutModifier && packs.length > 0 && <Bouton variante="secondaire" icone={PackagePlus} onClick={() => setFormulaire({ id: null, ...PACK_VIDE })}>Nouveau pack</Bouton>}
      </div>

      {packs.length === 0 ? (
        <Carte marge="aucun">
          <EtatVide
            icone={Layers} titre="Créez des packs ou des kits" texte="Regroupez les articles qui vont ensemble (kit salle de bain, pack électricité cuisine…)."
            action={peutModifier ? <Bouton variante="principal" icone={PackagePlus} onClick={() => setFormulaire({ id: null, ...PACK_VIDE })}>Créer un pack</Bouton> : null}
          />
        </Carte>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {packs.map((pack) => {
            const totalVente = pack.articles.reduce((s, a) => s + ((catalogue.find((c) => c.id === a.articleId)?.prix ?? a.prixSnapshot) || 0) * (a.quantite || 1), 0);
            const totalCout = coutPack(pack.articles, catalogue); // null : un prix d'achat manque, ni coût ni marge
            const prixVente = pack.prixVente || totalVente;
            const marge = totalCout !== null ? margeBrute(prixVente, totalCout) : null;
            const niveau = niveauMarge(marge);
            const unites = pack.articles.reduce((s, a) => s + (a.quantite || 1), 0);
            return (
              <Carte key={pack.id} className="min-w-0">
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="min-w-0">
                    <h4 className="text-base font-bold text-encre">{pack.nom}</h4>
                    <p className="text-sm text-encre-3">{pack.articles.length} article{pack.articles.length > 1 ? 's' : ''} · {unites} unités</p>
                  </div>
                  {peutModifier && (
                    <div className="flex items-center -mr-2 flex-shrink-0">
                      <BoutonIcone icone={Edit3} libelle={`Modifier le pack ${pack.nom}`} onClick={() => setFormulaire({ id: pack.id, nom: pack.nom, description: pack.description || '', articles: pack.articles.map((a) => ({ ...a })), prixVente: pack.prixVente?.toString() || '' })} />
                      <BoutonIcone icone={PackagePlus} libelle={`Dupliquer le pack ${pack.nom}`} onClick={() => dupliquer(pack)} />
                      <BoutonIcone icone={Trash2} libelle={`Supprimer le pack ${pack.nom}`} onClick={() => supprimer(pack)} />
                    </div>
                  )}
                </div>
                {pack.description && <p className="text-sm text-encre-2 mb-2">{pack.description}</p>}
                <ul className="space-y-1 mb-3">
                  {pack.articles.map((a, i) => {
                    const item = catalogue.find((c) => c.id === a.articleId);
                    return (
                      <li key={i} className="flex items-center justify-between gap-2 text-sm text-encre-2">
                        <span className="min-w-0 truncate">{a.quantite} × {item?.nom || a.label || '?'}</span>
                        <span className="font-medium tabular-nums text-encre">{prix(((item?.prix ?? a.prixSnapshot) || 0) * (a.quantite || 1))}</span>
                      </li>
                    );
                  })}
                </ul>
                <div className="pt-3 border-t border-bord flex items-center justify-between gap-2">
                  <div>
                    <span className="text-lg font-bold tabular-nums text-encre">{prix(prixVente)}</span>
                    {totalCout !== null && totalCout > 0 && <span className="text-sm ml-2 text-encre-3">Coût : {prix(totalCout)}</span>}
                  </div>
                  {!modeDiscret && (marge !== null
                    ? <span className={`text-sm font-semibold tabular-nums ${CLASSES_TON_MARGE[niveau.ton].texte}`}>Marge {marge.toFixed(0)} %</span>
                    : <span className="text-sm text-encre-3">Marge non calculée</span>)}
                </div>
              </Carte>
            );
          })}
        </div>
      )}

      <Modal isOpen={!!formulaire} onClose={() => setFormulaire(null)} size="lg">
        <ModalHeader><ModalTitle>{formulaire?.id ? 'Modifier le pack' : 'Nouveau pack ou kit'}</ModalTitle></ModalHeader>
        <ModalBody className="space-y-4">
          <Champ id="pack-nom" libelle="Nom du pack" value={formulaire?.nom || ''} onChange={(e) => setFormulaire((p) => ({ ...p, nom: e.target.value }))} />
          <Champ id="pack-description" libelle="Description" facultatif value={formulaire?.description || ''} onChange={(e) => setFormulaire((p) => ({ ...p, description: e.target.value }))} />
          <div>
            <p className="text-sm font-medium text-encre-2 mb-2">Articles du pack</p>
            <div className="space-y-2">
              {formulaire?.articles.map((a, i) => (
                <div key={i} className="flex gap-2 items-center">
                  <select aria-label={`Article ${i + 1}`} className="flex-1 min-w-0 h-12 px-3 rounded-xl border border-bord-fort bg-surface text-base sm:text-sm text-encre" value={a.articleId} onChange={(e) => majArticle(i, { articleId: e.target.value })}>
                    <option value="">Choisir un article</option>
                    {catalogue.map((c) => <option key={c.id} value={c.id}>{c.nom} ({formatMoney(c.prix)})</option>)}
                  </select>
                  <input aria-label={`Quantité de l'article ${i + 1}`} type="number" inputMode="numeric" min="1" className="w-20 h-12 px-2 rounded-xl border border-bord-fort bg-surface text-center text-base text-encre" value={a.quantite} onChange={(e) => majArticle(i, { quantite: parseInt(e.target.value, 10) || 1 })} />
                  <BoutonIcone icone={X} libelle={`Retirer l'article ${i + 1}`} onClick={() => setFormulaire((p) => ({ ...p, articles: p.articles.filter((_, j) => j !== i) }))} />
                </div>
              ))}
            </div>
            <Bouton variante="discret" icone={Plus} onClick={() => setFormulaire((p) => ({ ...p, articles: [...p.articles, { articleId: '', quantite: 1 }] }))} className="mt-2">Ajouter un article</Bouton>
          </div>
          {formulaire?.articles.length > 0 && (
            <div className="p-3 rounded-xl bg-surface-2 text-sm text-encre-2 space-y-0.5">
              <p>Coût total : <strong className="text-encre">{coutForm !== null ? formatMoney(coutForm, 2) : 'non calculé (un prix d\'achat manque)'}</strong></p>
              <p>Prix de vente suggéré : <strong className="text-encre">{formatMoney(venteForm, 2)}</strong></p>
            </div>
          )}
          <Champ id="pack-prix" libelle="Prix de vente du pack (€)" facultatif type="number" inputMode="decimal" value={formulaire?.prixVente || ''} onChange={(e) => setFormulaire((p) => ({ ...p, prixVente: e.target.value }))} />
        </ModalBody>
        <ModalFooter>
          <Bouton variante="secondaire" onClick={() => setFormulaire(null)}>Annuler</Bouton>
          <Bouton variante="principal" onClick={enregistrer}>{formulaire?.id ? 'Enregistrer' : 'Créer le pack'}</Bouton>
        </ModalFooter>
      </Modal>
    </div>
  );
}

/* ============================== INVENTAIRE ============================== */

export function OngletInventaire({ catalogue, mouvements, alertesStock, voitPrix, modeDiscret, peutModifier, onDemarrer, onVoirCatalogue }) {
  const { confirm } = useConfirm();
  const suivis = catalogue.filter((c) => (c.stock_actuel ?? c.stock) != null || (c.stock_seuil_alerte ?? c.stockMin) > 0);
  const dernier = mouvements.find((m) => m.type === 'adjustment' && m.raison?.startsWith('Inventaire'));
  const avecPrix = suivis.filter((c) => achatConnu(c.prixAchat) > 0);
  const valeur = avecPrix.reduce((s, c) => s + c.prixAchat * (c.stock_actuel ?? c.stock ?? 0), 0);

  const demarrer = async () => {
    if (await confirm({ title: 'Démarrer un inventaire', message: `Vous allez compter ${suivis.length} article${suivis.length !== 1 ? 's' : ''}. Les écarts seront enregistrés comme ajustements de stock.` })) onDemarrer();
  };

  return (
    <div className="space-y-4">
      {suivis.length > 0 && (
        <p className="text-sm text-encre-2">
          {suivis.length} article{suivis.length > 1 ? 's' : ''} suivi{suivis.length > 1 ? 's' : ''}
          {voitPrix && valeur > 0 && ` · valeur du stock au prix d'achat : ${modeDiscret ? '·····' : formatMoney(valeur, 0)}`}
          {' · '}{dernier ? `dernier inventaire le ${dateLue(dernier.date).toLocaleDateString('fr-FR')}` : 'aucun inventaire fait'}
        </p>
      )}

      <Carte marge="aucun">
        <EtatVide
          icone={ClipboardList} titre="Mode inventaire"
          texte={suivis.length === 0
            ? 'Pour suivre le stock, modifiez un article et renseignez « Stock actuel » et « Stock minimum ». Vous pourrez ensuite le compter ici.'
            : 'Comptez rapidement votre stock physique. Les écarts sont enregistrés comme des mouvements d\'ajustement.'}
          action={suivis.length === 0
            ? <Bouton variante="secondaire" onClick={onVoirCatalogue}>Aller au catalogue</Bouton>
            : (peutModifier ? <Bouton variante="principal" icone={RefreshCw} onClick={demarrer}>Démarrer l'inventaire ({suivis.length} article{suivis.length > 1 ? 's' : ''})</Bouton> : null)}
        />
      </Carte>

      {alertesStock.length > 0 && (
        <Carte>
          <h3 className="flex items-center gap-2 text-base font-semibold text-alerte-texte mb-3">Articles en stock bas ({alertesStock.length})</h3>
          <GroupeListe>
            {alertesStock.map((a) => (
              <LigneListe key={a.id} titre={a.nom} meta={a.reference} montant={`${a.stock_actuel ?? a.stock} / ${a.stock_seuil_alerte ?? a.stockMin}`} pastille={<Pastille ton="alerte">Stock bas</Pastille>} />
            ))}
          </GroupeListe>
        </Carte>
      )}
    </div>
  );
}

/** Le comptage : un article par ligne, le stock du système et ce que l'artisan compte. */
export function ModeInventaire({ articles, comptes, setComptes, enCours, onTerminer, onRetour }) {
  const suivis = articles;
  const ecarts = Object.keys(comptes).filter((id) => comptes[id] !== (articles.find((c) => c.id === id)?.stock_actuel ?? 0)).length;
  return (
    <div className="space-y-5 max-w-3xl">
      <div className="flex items-center gap-2">
        <BoutonIcone icone={X} libelle="Quitter l'inventaire" onClick={onRetour} className="-ml-2" />
        <div className="flex-1 min-w-0">
          <h2 className="text-xl font-bold text-encre">Inventaire</h2>
          <p className="text-sm text-encre-2">{Object.keys(comptes).length} article{Object.keys(comptes).length > 1 ? 's' : ''} à compter · {ecarts} écart{ecarts > 1 ? 's' : ''}</p>
        </div>
        <Bouton variante="principal" icone={Check} onClick={onTerminer} chargement={enCours}>Terminer</Bouton>
      </div>
      <div className="space-y-2">
        {suivis.map((item) => {
          const systeme = item.stock_actuel ?? item.stock ?? 0;
          const compte = comptes[item.id] ?? systeme;
          const ecart = compte - systeme;
          return (
            <Carte key={item.id} marge="aucun" className="flex items-center gap-3 p-3 sm:p-4">
              <div className="flex-1 min-w-0">
                <p className="text-base font-semibold text-encre">{item.nom}</p>
                <p className="text-sm text-encre-3">Stock du système : {systeme} {item.unite}</p>
              </div>
              <div className="flex items-center gap-2">
                <BoutonIcone icone={Minus} libelle={`Un de moins pour ${item.nom}`} variante="secondaire" onClick={() => setComptes((p) => ({ ...p, [item.id]: Math.max(0, (p[item.id] ?? systeme) - 1) }))} />
                <input
                  type="number" inputMode="numeric" min="0" aria-label={`Quantité comptée pour ${item.nom}`} value={compte}
                  onChange={(e) => setComptes((p) => ({ ...p, [item.id]: Math.max(0, parseInt(e.target.value, 10) || 0) }))}
                  className="w-16 h-11 text-center rounded-xl border border-bord-fort bg-surface text-lg font-bold text-encre"
                />
                <BoutonIcone icone={Plus} libelle={`Un de plus pour ${item.nom}`} variante="secondaire" onClick={() => setComptes((p) => ({ ...p, [item.id]: (p[item.id] ?? systeme) + 1 }))} />
              </div>
              {ecart !== 0 && <span className={`w-10 text-right text-sm font-bold tabular-nums ${ecart > 0 ? 'text-succes-texte' : 'text-alerte-texte'}`}>{ecart > 0 ? '+' : ''}{ecart}</span>}
            </Carte>
          );
        })}
      </div>
    </div>
  );
}

/* ============================== COEFFICIENTS ============================== */

export function OngletCoefficients({ coefficients, setCoefficients, categories, valeursParDefaut, modeDiscret, peutModifier, onAppliquer }) {
  const { showToast } = useToast();
  const { confirm } = useConfirm();
  const [enregistre, setEnregistre] = useState(false);
  const change = (cat, val) => {
    setCoefficients((prev) => ({ ...prev, [cat]: val }));
    setEnregistre(true);
    setTimeout(() => setEnregistre(false), 2500);
  };
  return (
    <div className="space-y-4">
      <Carte>
        <div className="flex items-center justify-between gap-3 mb-1">
          <h3 className="flex items-center gap-2 text-base font-semibold text-encre"><Percent size={16} aria-hidden="true" className="text-encre-3" /> Coefficients par catégorie</h3>
          <span role="status" aria-live="polite" className="text-sm text-succes-texte min-h-[1.25rem]">{enregistre ? 'Enregistré sur cet appareil' : ''}</span>
        </div>
        <p className="text-sm text-encre-2 mb-4">Le prix de vente se calcule : prix d'achat × coefficient.</p>
        <div className="space-y-2">
          {categories.map((cat) => (
            <div key={cat} className="flex items-center gap-3 p-3 pl-4 rounded-xl bg-surface-2">
              <span className="font-medium flex-1 min-w-0 truncate text-encre">{cat}</span>
              <span className="text-sm text-encre-3">×</span>
              <ChampDecimal
                min={1} max={10} aria-label={`Coefficient pour ${cat}`} disabled={!peutModifier}
                className="w-20 h-11 px-3 rounded-xl border border-bord-fort bg-surface text-center font-bold text-encre"
                valeur={coefficients[cat] || 1.5} onValider={(v) => change(cat, v)}
              />
              <span className="text-sm text-encre-3 w-40 text-right flex-shrink-0 hidden sm:block">
                100 € → {modeDiscret ? '·····' : `${((coefficients[cat] || 1.5) * 100).toFixed(0)} €`} <span className="font-medium text-encre-2">(+{(((coefficients[cat] || 1.5) - 1) * 100).toFixed(0)} %)</span>
              </span>
            </div>
          ))}
        </div>
      </Carte>
      {peutModifier && (
        <div className="flex flex-wrap gap-3">
          <Bouton variante="secondaire" icone={Check} onClick={onAppliquer}>Appliquer à tous les articles</Bouton>
          <Bouton
            variante="discret" icone={RefreshCw}
            onClick={async () => {
              if (!(await confirm({ title: 'Réinitialiser les coefficients', message: 'Remettre tous les coefficients à leur valeur par défaut ? Vos réglages actuels, gardés sur cet appareil, seront perdus.', confirmText: 'Réinitialiser', variant: 'warning' }))) return;
              setCoefficients(valeursParDefaut);
              showToast('Coefficients réinitialisés sur cet appareil', 'info');
            }}
          >
            Réinitialiser par défaut
          </Bouton>
        </div>
      )}
    </div>
  );
}
