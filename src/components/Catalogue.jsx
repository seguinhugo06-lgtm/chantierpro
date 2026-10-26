import { useState, useMemo, useCallback, useEffect, useRef, Suspense, lazy } from 'react';
import {
  Plus, Minus, Search, Edit3, Trash2, Star, Download, Upload, ArrowUpDown, Camera, FileText, Library, Package, Sparkles, X,
} from 'lucide-react';
import { useConfirm, useToast } from '../context/AppContext';
import { generateId } from '../lib/utils';
import { useDebounce } from '../hooks/useDebounce';
import useStockageLocal from '../hooks/useStockageLocal';
import { ALL_ARTICLES_BTP, CATEGORIES_METIERS } from '../lib/data';
import { usePermissions } from '../hooks/usePermissions';
import { EnTetePage } from './ui/EnTete';
import { Onglets } from './ui/Onglets';
import { Bouton, BoutonIcone } from './ui/Bouton';
import Carte from './ui/Carte';
import Champ from './ui/Champ';
import EtatVide from './ui/EtatVide';
import LigneListe, { GroupeListe } from './ui/LigneListe';
import MenuActions from './ui/MenuActions';
import Pastille from './ui/Pastille';
import { ChampRecherche, BoutonVolet, Volet, GroupeChoix, ListeChoix, PucesActives, SegmentDefilant } from './ui/Filtres';
import { remettreFichier } from '../lib/natif';
import { jourLocal } from '../lib/dates';
import { devisAvecLigneAjoutee } from '../lib/ajoutLigneDevis';
import { estFranchiseTva } from '../lib/franchiseTva';
import { lireCsv, nombreFr, associerColonnes } from '../lib/csvImport';
import { margeBrute, niveauMarge, CLASSES_TON_MARGE } from '../lib/margeArticle';
import ArticleDetail from './catalogue/ArticleDetail';
import FormulaireArticle from './catalogue/FormulaireArticle';
import Demarrage from './catalogue/Demarrage';
import { FenetreImportCsv, FenetreScanner, FenetreAjoutDevis } from './catalogue/FenetresCatalogue';
import {
  OngletFournisseurs, OngletMouvements, OngletPacks, OngletInventaire, OngletCoefficients, ModeInventaire,
} from './catalogue/OngletsStock';

/**
 * Chargés à la demande : la bibliothèque d'ouvrages embarque à elle seule
 * 460 Ko de référentiel BTP, et le sélecteur d'articles tout le catalogue —
 * pour deux écrans que l'artisan n'ouvre pas à chaque visite.
 */
const chargerALaDemande = (importer) => {
  const Composant = lazy(importer);
  function EcranDiffere(props) {
    return (
      <Suspense fallback={<div className="py-12 text-center text-sm opacity-60">Chargement…</div>}>
        <Composant {...props} />
      </Suspense>
    );
  }
  return EcranDiffere;
};

const ArticlePicker = chargerALaDemande(() => import('./ArticlePicker'));
const Bibliotheque = chargerALaDemande(() => import('./bibliotheque/Bibliotheque'));

const BASE_CATEGORIES = ['Plomberie', 'Électricité', 'Maçonnerie', 'Carrelage', 'Peinture', 'Menuiserie', 'Matériaux', 'Isolation', 'Main d\'œuvre', 'Autre'];
const DEFAULT_COEFFICIENTS = {
  'Plomberie': 1.6, 'Électricité': 1.5, 'Maçonnerie': 1.4, 'Carrelage': 1.5,
  'Peinture': 1.8, 'Menuiserie': 1.5, 'Matériaux': 1.3, 'Autre': 1.5,
};
const FORMULAIRE_VIDE = { nom: '', reference: '', description: '', prix: '', prixAchat: '', unite: 'u', categorie: 'Autre', tva_rate: '20', favori: false, stock_actuel: '', stock_seuil_alerte: '', fournisseur: '', coefAuto: true };
const nombreDe = (v) => Number.isFinite(parseFloat(String(v).replace(',', '.'))) ? parseFloat(String(v).replace(',', '.')) : null;
const estMobile = () => /Mobi|Android|iPhone|iPad/i.test(navigator.userAgent);

// Le stock d'un article (deux noms selon l'origine des données), son seuil d'alerte, et « stock bas » : sous le seuil
const stockDe = (c) => c.stock_actuel ?? c.stock;
const seuilDe = (c) => c.stock_seuil_alerte ?? c.stockMin;
const estStockBas = (c) => { const st = stockDe(c); const se = seuilDe(c); return st != null && se != null && se > 0 && st < se; };

export default function Catalogue({ entreprise = {}, catalogue, setCatalogue, addCatalogueItem: addCatalogueItemProp, updateCatalogueItem: updateCatalogueItemProp, deleteCatalogueItem: deleteCatalogueItemProp, setPage, chantiers = [], modeDiscret, devis = [], updateDevis, clients = [], couleur, isDark }) {
  const { confirm } = useConfirm();
  const { showToast } = useToast();

  // Droits : chaque action réservée passe par canPerform. Sans le droit de voir les prix (chef de chantier, ouvrier :
  // canViewPrices de usePermissions, une seule règle), aucun prix de vente ni d'achat, aucune marge, aucun fournisseur, pack ni
  // coefficient : les articles, leur référence, leur unité et leur stock restent.
  const { canPerform, canViewPrices } = usePermissions();
  const peutCreer = canPerform('catalogue', 'create');
  const peutModifier = canPerform('catalogue', 'edit');
  const peutSupprimer = canPerform('catalogue', 'delete');
  const peutAjouterAuDevis = canPerform('devis', 'edit');

  // Prix au format français (« 2,5 € », pas « 2.5€ »), masqué en mode discret
  const fmtPrix = (n) => (modeDiscret ? '·····' : `${Number(n || 0).toLocaleString('fr-FR', { maximumFractionDigits: 2 })} €`);

  // ====== ÉTAT ======
  const [activeTab, setActiveTab] = useState('catalogue');
  const [show, setShow] = useState(false);
  const [priceFlash, setPriceFlash] = useState(false);
  const [formErrors, setFormErrors] = useState({});
  const [enregistrement, setEnregistrement] = useState(false);
  const [editId, setEditId] = useState(null);
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search, 300);
  const [catFilter, setCatFilter] = useState('Tous');
  const [sortBy, setSortBy] = useState('name');
  const [form, setForm] = useState(FORMULAIRE_VIDE);
  // Fermer le formulaire le vide aussi : avant (recette du 9 oct. 2026), « Modifier » puis « Annuler » puis « Ajouter »
  // rouvrait l'article précédent, et « Enregistrer » le remplaçait.
  const fermerFormulaire = () => { setShow(false); setEditId(null); setForm(FORMULAIRE_VIDE); setFormErrors({}); };
  const ouvrirNouvelArticle = (preremplissage = {}) => { setEditId(null); setForm({ ...FORMULAIRE_VIDE, ...preremplissage }); setFormErrors({}); setShow(true); };
  const [showArticlePicker, setShowArticlePicker] = useState(false);
  const [priceRange, setPriceRange] = useState([0, 10000]);
  const [onlyInStock, setOnlyInStock] = useState(false);
  const [onlyFavoris, setOnlyFavoris] = useState(false);
  const [onlyLowStock, setOnlyLowStock] = useState(false);
  const [articleDetail, setArticleDetail] = useState(null);
  const [volet, setVolet] = useState(null); // null | 'filtres' | 'tri'
  const boutonFiltresRef = useRef(null);
  const boutonTriRef = useRef(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(25);
  const [importData, setImportData] = useState(null);
  const [importMapping, setImportMapping] = useState({});
  const [importEnCours, setImportEnCours] = useState(false);
  const fileInputRef = useRef(null);

  // Premier usage : référentiel BTP, ajout à la main ou fichier CSV
  const [etapeDemarrage, setEtapeDemarrage] = useState(null); // null | 'metiers' | 'importing' | 'done'
  const [metiersChoisis, setMetiersChoisis] = useState([]);
  const [progression, setProgression] = useState(0);
  const [resultatDemarrage, setResultatDemarrage] = useState(null);
  const [onboardingDismissed, setOnboardingDismissed] = useState(() => {
    try { return localStorage.getItem('cp_catalogue_onboarding_dismissed') === 'true'; } catch { return false; }
  });
  const passerLeDemarrage = () => {
    setOnboardingDismissed(true);
    try { localStorage.setItem('cp_catalogue_onboarding_dismissed', 'true'); } catch { /* préférence non enregistrée : quota plein ou navigation privée */ }
  };

  const [scannerOuvert, setScannerOuvert] = useState(false);

  // Suivi gardé sur cet appareil : fournisseurs, liens article-fournisseur, mouvements, packs, historique des prix, coefficients
  const [fournisseurs, setFournisseurs] = useStockageLocal('mallettico_fournisseurs', []);
  const [liens, setLiens] = useStockageLocal('mallettico_article_fournisseurs', []);
  const [mouvements, setMouvements] = useStockageLocal('mallettico_mouvements', []);
  const [packs, setPacks] = useStockageLocal('mallettico_packs', []);
  const [priceHistory, setPriceHistory] = useStockageLocal('mallettico_price_history', []);
  const [coefficients, setCoefficients] = useStockageLocal('mallettico_coefficients', DEFAULT_COEFFICIENTS);

  // « Ajouter au devis »
  const [articleDevis, setArticleDevis] = useState(null);
  const [devisQte, setDevisQte] = useState(1);
  const [devisChoisi, setDevisChoisi] = useState(null);
  const [ajoutEnCours, setAjoutEnCours] = useState(false);

  // Inventaire
  const [inventaireMode, setInventaireMode] = useState(false);
  const [comptes, setComptes] = useState({});
  const [inventaireEnCours, setInventaireEnCours] = useState(false);

  // ====== ARTICLES SIMILAIRES (à la saisie du nom) ======
  const similaires = useMemo(() => {
    if (!show || editId || !form.nom || form.nom.length < 3) return [];
    const q = form.nom.toLowerCase();
    return catalogue.filter((c) => {
      const nom = (c.nom || '').toLowerCase();
      if (nom.includes(q) || q.includes(nom)) return true;
      const mots = q.split(/\s+/).filter((w) => w.length >= 3);
      const motsNom = nom.split(/\s+/).filter((w) => w.length >= 3);
      return mots.filter((m) => motsNom.some((n) => n.includes(m) || m.includes(n))).length >= 2;
    }).slice(0, 3);
  }, [show, editId, form.nom, catalogue]);

  // Revenir à la première page quand la liste change
  useEffect(() => { setCurrentPage(1); }, [debouncedSearch, catFilter, onlyInStock, onlyFavoris, onlyLowStock, sortBy, priceRange]);

  // Échap : ferme le formulaire ou la fiche, jamais quand une fenêtre est ouverte par-dessus (c'est elle qui se ferme)
  useEffect(() => {
    const surEchap = (e) => {
      if (e.key !== 'Escape' || document.querySelector('[role="dialog"]')) return;
      if (inventaireMode) setInventaireMode(false);
      else if (articleDetail) setArticleDetail(null);
      else if (show) fermerFormulaire();
    };
    window.addEventListener('keydown', surEchap);
    return () => window.removeEventListener('keydown', surEchap);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [articleDetail, show, inventaireMode]);

  // ====== CATÉGORIES (les usuelles, plus celles que les articles utilisent) ======
  const CATEGORIES = useMemo(() => {
    const utilisees = new Set(catalogue.map((c) => c.categorie).filter(Boolean));
    const toutes = new Set([...BASE_CATEGORIES, ...utilisees]);
    return ['Tous', ...Array.from(toutes).sort((a, b) => {
      const ai = BASE_CATEGORIES.indexOf(a);
      const bi = BASE_CATEGORIES.indexOf(b);
      if (ai >= 0 && bi >= 0) return ai - bi;
      if (ai >= 0) return -1;
      if (bi >= 0) return 1;
      return a.localeCompare(b);
    })];
  }, [catalogue]);
  // La rangée de puces ne propose que les catégories qui ont des articles
  const categoriesUtilisees = useMemo(() => CATEGORIES.filter((c) => c !== 'Tous' && (catalogue.some((a) => a.categorie === c) || catFilter === c)), [CATEGORIES, catalogue, catFilter]);

  // ====== RECHERCHE (sans accents : é → e) ======
  const normalize = useCallback((str) => (str || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase(), []);
  const fuzzyMatch = useCallback((text, query) => {
    if (!query) return true;
    const mots = normalize(query).split(/\s+/).filter(Boolean);
    const cible = normalize(text);
    return mots.every((w) => cible.includes(w));
  }, [normalize]);

  // ====== USAGE DANS LES DEVIS : combien de devis utilisent chaque article ======
  const devisUsageMap = useMemo(() => {
    const map = {};
    (devis || []).forEach((d) => {
      (d.lignes || d.items || d.articles || []).forEach((l) => {
        const artId = l.catalogueId || l.articleId || l.article_id;
        const artNom = (l.designation || l.nom || '').toLowerCase();
        if (artId) map[artId] = (map[artId] || 0) + 1;
        else if (artNom) {
          const match = catalogue.find((c) => (c.nom || '').toLowerCase() === artNom);
          if (match) map[match.id] = (map[match.id] || 0) + 1;
        }
      });
    });
    return map;
  }, [devis, catalogue]);

  // ====== STOCK : suivi seulement des articles qui ont un stock ======
  const stockSuivi = useMemo(() => catalogue.some((c) => stockDe(c) != null), [catalogue]);
  const alertesStock = useMemo(() => catalogue.filter(estStockBas), [catalogue]);
  const favoris = useMemo(() => catalogue.filter((c) => c.favori), [catalogue]);

  // ====== FILTRÉ ET TRIÉ ======
  const filtered = useMemo(() => {
    const items = catalogue.filter((c) => {
      if (catFilter !== 'Tous' && c.categorie !== catFilter) return false;
      if (debouncedSearch && !fuzzyMatch(`${c.nom} ${c.reference || ''} ${c.description || ''} ${c.categorie} ${c.unite}`, debouncedSearch)) return false;
      if (onlyInStock && (stockDe(c) == null || stockDe(c) <= 0)) return false;
      if (onlyFavoris && !c.favori) return false;
      if (onlyLowStock && !estStockBas(c)) return false;
      if (canViewPrices) {
        if (priceRange[0] > 0 && (c.prix || 0) < priceRange[0]) return false;
        if (priceRange[1] < 10000 && (c.prix || 0) > priceRange[1]) return false;
      }
      return true;
    });
    switch (sortBy) {
      case 'price': return items.sort((a, b) => (b.prix || 0) - (a.prix || 0));
      case 'stock': return items.sort((a, b) => (stockDe(a) ?? 999) - (stockDe(b) ?? 999));
      case 'margin': return items.sort((a, b) => (margeBrute(b.prix, b.prixAchat) ?? -1) - (margeBrute(a.prix, a.prixAchat) ?? -1));
      case 'usage': return items.sort((a, b) => (devisUsageMap[b.id] || 0) - (devisUsageMap[a.id] || 0));
      default: return items.sort((a, b) => (a.nom || '').localeCompare(b.nom || ''));
    }
  }, [catalogue, catFilter, debouncedSearch, sortBy, fuzzyMatch, onlyInStock, onlyFavoris, onlyLowStock, priceRange, devisUsageMap, canViewPrices]);

  // ====== ÉCRITURES : le résultat est lu avant d'être annoncé ======
  /** Modifie un article ; vrai si la base (ou l'écran, en démo) a pris la modification. */
  const modifierArticle = async (id, champs) => {
    if (updateCatalogueItemProp) return !!(await updateCatalogueItemProp(id, champs));
    setCatalogue((prev) => prev.map((c) => (c.id === id ? { ...c, ...champs } : c)));
    return true;
  };
  const creerArticle = async (donnees) => {
    if (addCatalogueItemProp) return !!(await addCatalogueItemProp(donnees));
    setCatalogue((prev) => [...prev, { id: generateId(), ...donnees }]);
    return true;
  };

  // Import en masse du référentiel BTP (premier usage)
  const importerReferentiel = useCallback(async (metierIds) => {
    setEtapeDemarrage('importing');
    setProgression(0);
    const aImporter = [];
    metierIds.forEach((catId) => {
      const cat = ALL_ARTICLES_BTP[catId];
      if (!cat) return;
      const meta = CATEGORIES_METIERS.find((c) => c.id === catId);
      Object.values(cat.sousCategories).forEach((sousCat) => {
        sousCat.articles.forEach((article) => {
          const coef = coefficients[meta?.nom] || coefficients[cat.nom] || 1.5;
          aImporter.push({
            nom: article.nom, prix: article.prixDefaut, prixAchat: Math.round(article.prixDefaut / coef * 100) / 100,
            unite: article.unite, categorie: meta?.nom || 'Autre', favori: false, coefAuto: true,
            reference: `REF-${article.id.toUpperCase().slice(0, 10)}`,
          });
        });
      });
    });
    let importes = 0;
    for (let i = 0; i < aImporter.length; i++) {
      if (!(await creerArticle(aImporter[i]))) break; // refus : DataContext l'a dit, on s'arrête
      importes++;
      if (i % 3 === 0 || i === aImporter.length - 1) setProgression(Math.round(((i + 1) / aImporter.length) * 100));
    }
    setResultatDemarrage({ importes, total: aImporter.length });
    setEtapeDemarrage('done');
    if (importes > 0) passerLeDemarrage();
    if (importes === aImporter.length) showToast(`${importes} articles importés depuis le Référentiel BTP`, 'success');
    else showToast(`${importes} articles importés sur ${aImporter.length} : l'import s'est arrêté`, 'error');
    if (importes === aImporter.length) setTimeout(() => setEtapeDemarrage(null), 2000);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [addCatalogueItemProp, setCatalogue, coefficients, showToast]);

  // Un article choisi dans le référentiel BTP
  const ajouterDepuisReferentiel = async (item) => {
    const coef = coefficients[item.categorie] || 1.5;
    const nouveau = {
      nom: item.nom, prix: item.prixUnitaire,
      prixAchat: item.prixAchat || Math.round(item.prixUnitaire / coef * 100) / 100,
      unite: item.unite, categorie: item.categorie, favori: false,
      stock_actuel: undefined, stock_seuil_alerte: undefined,
    };
    if (!(await creerArticle(nouveau))) return;
    showToast(`"${item.nom}" ajouté au catalogue`, 'success');
  };

  // Enregistrer le formulaire
  const submit = async () => {
    const erreurs = {};
    if (!form.nom?.trim()) erreurs.nom = 'Le nom est requis';
    if (!form.prix) erreurs.prix = 'Le prix de vente est requis';
    else if (parseFloat(form.prix) <= 0) erreurs.prix = 'Le prix doit être supérieur à 0';
    if (Object.keys(erreurs).length > 0) {
      setFormErrors(erreurs);
      showToast('Veuillez corriger les erreurs', 'error');
      return;
    }
    setFormErrors({});
    const prixVente = parseFloat(form.prix);
    const prixAchat = parseFloat(form.prixAchat) || 0;
    // 0 % est un vrai taux (autoliquidation, franchise) : `|| 20` le remplaçait par 20 %
    const tva = nombreDe(form.tva_rate) ?? 20;
    const donnees = {
      ...form,
      prix: prixVente, prixAchat,
      reference: form.reference || undefined,
      description: form.description || undefined,
      tva_rate: tva, tva,
      favori: form.favori || false,
      coefAuto: form.coefAuto || false,
      stock_actuel: form.stock_actuel !== '' ? parseInt(form.stock_actuel, 10) : undefined,
      stock_seuil_alerte: form.stock_seuil_alerte !== '' ? parseInt(form.stock_seuil_alerte, 10) : undefined,
    };
    setEnregistrement(true);
    // Refus de la base : le formulaire reste ouvert avec la saisie (DataContext a dit pourquoi)
    if (editId) {
      const ancien = catalogue.find((c) => c.id === editId);
      if (!(await modifierArticle(editId, donnees))) { setEnregistrement(false); return; }
      // L'historique des prix ne retient que ce que la base a accepté
      if (ancien && (ancien.prix !== prixVente || ancien.prixAchat !== prixAchat)) {
        setPriceHistory((prev) => [...prev, { id: generateId(), articleId: editId, prixVente: ancien.prix, prixAchat: ancien.prixAchat, date: new Date().toISOString() }]);
      }
      showToast('Article modifié', 'success');
    } else if (!(await creerArticle(donnees))) {
      setEnregistrement(false);
      return;
    }
    setEnregistrement(false);
    fermerFormulaire();
  };

  const startEdit = (item) => {
    setForm({
      nom: item.nom || '', reference: item.reference || '', description: item.description || '', prix: item.prix?.toString() || '', prixAchat: item.prixAchat?.toString() || '',
      unite: item.unite || 'u', categorie: item.categorie || 'Autre', tva_rate: String(item.tva_rate ?? item.tva ?? 20), favori: item.favori || false,
      stock_actuel: item.stock_actuel?.toString() ?? '', stock_seuil_alerte: item.stock_seuil_alerte?.toString() ?? '', fournisseur: '', coefAuto: item.coefAuto || false,
    });
    setEditId(item.id); setShow(true); setFormErrors({});
  };

  const toggleFavori = async (id) => {
    const item = catalogue.find((c) => c.id === id);
    if (!item) return;
    if (!(await modifierArticle(id, { favori: !item.favori }))) return;
    showToast(item.favori ? 'Retiré des favoris' : 'Ajouté aux favoris', 'success');
  };

  const deleteItem = async (id) => {
    if (!(await confirm({ title: 'Supprimer', message: 'Supprimer cet article du catalogue ?' }))) return;
    if (deleteCatalogueItemProp) {
      await deleteCatalogueItemProp(id); // l'enveloppe d'App.jsx dit « supprimé » si la base a confirmé
    } else {
      setCatalogue((prev) => prev.filter((c) => c.id !== id));
      showToast('Article supprimé', 'info');
    }
  };

  const dupliquer = async (item) => {
    const copie = { ...item, nom: `${item.nom} (copie)`, favori: false };
    delete copie.id; delete copie.createdAt;
    if (addCatalogueItemProp) {
      const cree = await addCatalogueItemProp(copie);
      if (!cree) return;
      showToast('Article dupliqué', 'success');
      if (cree?.id) setArticleDetail(cree.id);
    } else {
      const avecId = { ...copie, id: generateId() };
      setCatalogue((prev) => [...prev, avecId]);
      showToast('Article dupliqué', 'success');
      setArticleDetail(avecId.id);
    }
  };

  const changerStock = async (id, valeur) => {
    await modifierArticle(id, { stock_actuel: Math.max(0, parseInt(valeur, 10) || 0) });
  };

  // Lier un article à un fournisseur (depuis sa fiche)
  const lierFournisseur = (articleId, fournisseurId, prixAchat) => {
    setLiens((prev) => {
      const existant = prev.find((l) => l.articleId === articleId && l.fournisseurId === fournisseurId);
      if (existant) return prev.map((l) => (l.id === existant.id ? { ...l, prixAchat: parseFloat(prixAchat) || 0, updatedAt: new Date().toISOString() } : l));
      return [...prev, { id: generateId(), articleId, fournisseurId, prixAchat: parseFloat(prixAchat) || 0, createdAt: new Date().toISOString() }];
    });
    showToast(`Lié à ${fournisseurs.find((f) => f.id === fournisseurId)?.nom || 'ce fournisseur'}`, 'success');
  };

  // Mouvement de stock : la base prend le nouveau stock AVANT que le mouvement soit noté et annoncé
  const ajouterMouvement = async (f) => {
    const quantite = parseInt(f.quantite, 10);
    if (!(quantite > 0)) { showToast('Article et quantité requis', 'error'); return false; }
    const article = catalogue.find((c) => c.id === f.articleId);
    let nouveauStock = null;
    if (article && (f.type === 'in' || f.type === 'return')) nouveauStock = (article.stock_actuel || 0) + quantite;
    else if (article && f.type === 'out') nouveauStock = Math.max(0, (article.stock_actuel || 0) - quantite);
    if (nouveauStock !== null && !(await modifierArticle(article.id, { stock_actuel: nouveauStock }))) return false;
    setMouvements((prev) => [{ id: generateId(), ...f, quantite, date: new Date().toISOString(), articleNom: article?.nom }, ...prev]);
    showToast(nouveauStock !== null ? 'Mouvement enregistré — stock mis à jour' : 'Mouvement enregistré', 'success');
    return true;
  };

  // Ajouter au devis
  const devisBrouillons = useMemo(() => (devis || []).filter((d) => (d.statut || d.status || '').toLowerCase() === 'brouillon'), [devis]);
  const ouvrirAjoutDevis = (article) => {
    setArticleDevis(article);
    setDevisQte(1);
    setDevisChoisi(devisBrouillons.length > 0 ? devisBrouillons[0].id : null);
  };
  const fermerAjoutDevis = () => { setArticleDevis(null); setDevisQte(1); setDevisChoisi(null); };
  const ajouterAuDevis = async () => {
    if (!devisChoisi || !articleDevis) return;
    const cible = devis.find((d) => d.id === devisChoisi);
    if (!cible) { showToast('Devis introuvable', 'error'); return; }
    // Seulement un brouillon : un devis envoyé ou signé ne se modifie pas en douce
    if ((cible.statut || '') !== 'brouillon') { showToast('Seul un devis en brouillon peut recevoir un article', 'error'); return; }
    // Ligne visible (désignation), dans les lots, totaux HT / TVA / TTC recalculés comme dans l'éditeur
    const champs = devisAvecLigneAjoutee(cible, articleDevis, { quantite: devisQte, franchise: estFranchiseTva(entreprise), tauxDefaut: Number(cible.tvaRate ?? entreprise?.tvaDefaut ?? 20) });
    setAjoutEnCours(true);
    const ok = updateDevis && (await updateDevis(cible.id, champs)); // refus : DataContext l'a dit
    setAjoutEnCours(false);
    if (!ok) return;
    showToast(`Article ajouté au devis ${cible.numero || cible.reference || cible.id?.slice(0, 8)}`, 'success');
    fermerAjoutDevis();
  };

  // Inventaire : chaque ajustement est lu avant d'être noté
  const articlesSuivis = useMemo(() => catalogue.filter((c) => stockDe(c) != null || (seuilDe(c) > 0)), [catalogue]);
  const demarrerInventaire = () => {
    const depart = {};
    articlesSuivis.forEach((c) => { depart[c.id] = stockDe(c) ?? 0; });
    setComptes(depart);
    setInventaireMode(true);
  };
  const terminerInventaire = async () => {
    setInventaireEnCours(true);
    let ajustements = 0;
    let refus = 0;
    const nouveaux = [];
    for (const [id, compte] of Object.entries(comptes)) {
      const item = catalogue.find((c) => c.id === id);
      const avant = item ? (stockDe(item) ?? 0) : 0;
      if (!item || compte === avant) continue;
      if (await modifierArticle(id, { stock_actuel: compte })) {
        ajustements++;
        nouveaux.push({ id: generateId(), articleId: id, type: 'adjustment', quantite: compte, date: new Date().toISOString(), raison: `Inventaire — écart: ${compte - avant}`, articleNom: item.nom });
      } else refus++;
    }
    setMouvements((prev) => [...nouveaux, ...prev]);
    setInventaireEnCours(false);
    if (refus > 0) { showToast(`${ajustements} ajustement${ajustements > 1 ? 's' : ''} enregistré${ajustements > 1 ? 's' : ''}, ${refus} non enregistré${refus > 1 ? 's' : ''}`, 'error'); return; }
    setInventaireMode(false);
    showToast(`Inventaire terminé — ${ajustements} ajustement${ajustements > 1 ? 's' : ''}`, 'success');
  };

  // Coefficients : prix de vente = prix d'achat × coefficient, ENREGISTRÉ article par article (avant, recette du 9 oct. 2026 :
  // un champ `prixVente` inexistant, en mémoire seulement, et « 13 prix recalculés » sans rien changer)
  const appliquerCoefficients = async () => {
    const avecAchat = catalogue.filter((c) => c.prixAchat > 0);
    if (avecAchat.length === 0) { showToast('Aucun article avec prix d\'achat à recalculer', 'info'); return; }
    const ok = await confirm({
      title: 'Appliquer les coefficients',
      message: `Recalculer le prix de vente de ${avecAchat.length} article${avecAchat.length > 1 ? 's' : ''} selon les coefficients actuels ? Les prix de vente seront écrasés.`,
      confirmText: 'Appliquer', variant: 'warning',
    });
    if (!ok) return;
    let modifies = 0;
    let refuses = 0;
    for (const c of avecAchat) {
      const coef = coefficients[c.categorie] || coefficients.Divers || 1.5;
      const prix = Math.round(c.prixAchat * coef * 100) / 100;
      if (Math.abs((Number(c.prix) || 0) - prix) < 0.005) continue;
      if (updateCatalogueItemProp && (await updateCatalogueItemProp(c.id, { prix }))) modifies++;
      else refuses++;
    }
    if (refuses) showToast(`${modifies} prix modifié${modifies > 1 ? 's' : ''}, ${refuses} non enregistré${refuses > 1 ? 's' : ''}`, 'error');
    else showToast(modifies ? `${modifies} prix modifié${modifies > 1 ? 's' : ''}` : 'Tous les prix étaient déjà à jour', 'success');
  };

  // Export CSV du catalogue (avec ses prix et ses marges : réservé à qui les voit)
  const exporterCsv = () => {
    const lignes = [['Référence', 'Nom', 'Description', 'Catégorie', 'Unité', 'TVA %', 'Prix vente HT', 'Prix achat HT', 'Marge %', 'Stock', 'Seuil alerte', 'Favori']];
    catalogue.forEach((c) => {
      const marge = margeBrute(c.prix, c.prixAchat);
      lignes.push([c.reference || '', c.nom, c.description || '', c.categorie, c.unite, c.tva_rate || c.tva || 20, c.prix, c.prixAchat || '', marge !== null ? marge.toFixed(1) : '', c.stock_actuel ?? '', c.stock_seuil_alerte ?? '', c.favori ? 'Oui' : '']);
    });
    const csv = lignes.map((r) => r.map((v) => `"${String(v ?? '').replace(/"/g, '""')}"`).join(';')).join('\n');
    remettreFichier(new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' }), `catalogue_${jourLocal()}.csv`)
      .then((r) => { if (r !== 'annule') showToast('Export CSV prêt', 'success'); })
      .catch(() => showToast('Export impossible', 'error'));
  };

  // Import CSV : lecture, puis association des colonnes dans une fenêtre
  const choisirFichier = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const lecteur = new FileReader();
    lecteur.onload = (evt) => {
      // Lecteur CSV commun (src/lib/csvImport.js) : guillemets, séparateur, colonnes associées par mot entier
      const { entetes, lignes } = lireCsv(evt.target.result);
      if (!entetes.length || !lignes.length) { showToast('Fichier vide ou invalide', 'error'); return; }
      setImportMapping(associerColonnes(entetes));
      setImportData({ headers: entetes, rows: lignes });
    };
    lecteur.readAsText(file, 'UTF-8');
    e.target.value = '';
  };

  const importerCsv = async () => {
    if (!importData) return;
    setImportEnCours(true);
    // Prix et TVA lus à la française (« 1 250,00 », « 5,5 ») ; un prix illisible ou nul : ligne écartée et comptée
    // (avant : 1 €, TVA 5, articles à 0 €) ; TVA 0 % respectée ; chaque refus de la base compté.
    let importes = 0, ecartees = 0, misAJour = 0, refuses = 0, prixIllisibles = 0;
    const tvaDe = (v, defaut) => { const n = nombreFr(v); return Number.isFinite(n) ? n : defaut; };
    for (const row of importData.rows) {
      const nom = row[importMapping.designation] || '';
      if (!nom) { ecartees++; continue; }
      const ref = row[importMapping.reference] || '';
      const prix = nombreFr(row[importMapping.prix]);
      const achatLu = nombreFr(row[importMapping.prixAchat]);
      const stockLu = nombreFr(row[importMapping.stock]);
      const existant = ref ? catalogue.find((c) => c.reference === ref) : null; // doublon par référence
      if (!(prix > 0) && !existant) { prixIllisibles++; continue; }
      if (existant) {
        const maj = {
          ...existant,
          nom: nom || existant.nom,
          prix: prix > 0 ? prix : existant.prix,
          prixAchat: Number.isFinite(achatLu) ? achatLu : existant.prixAchat,
          unite: row[importMapping.unite] || existant.unite,
          categorie: row[importMapping.categorie] || existant.categorie,
          description: row[importMapping.description] || existant.description,
          tva_rate: tvaDe(row[importMapping.tva_rate], existant.tva_rate),
          tva: tvaDe(row[importMapping.tva_rate], existant.tva ?? existant.tva_rate),
          stock_actuel: Number.isFinite(stockLu) ? Math.round(stockLu) : existant.stock_actuel,
        };
        if (updateCatalogueItemProp) { if (await updateCatalogueItemProp(existant.id, maj)) misAJour++; else refuses++; }
        else { setCatalogue((prev) => prev.map((c) => (c.id === existant.id ? maj : c))); misAJour++; }
      } else {
        const tva = tvaDe(row[importMapping.tva_rate], 20);
        const nouveau = {
          nom, reference: ref, description: row[importMapping.description] || '', prix,
          prixAchat: Number.isFinite(achatLu) ? achatLu : 0, unite: row[importMapping.unite] || 'u', categorie: row[importMapping.categorie] || 'Autre',
          tva_rate: tva, tva, favori: false, stock_actuel: Number.isFinite(stockLu) ? Math.round(stockLu) : undefined, stock_seuil_alerte: undefined,
        };
        if (await creerArticle(nouveau)) importes++; else refuses++;
      }
    }
    setImportEnCours(false);
    setImportData(null);
    const ecart = ecartees + prixIllisibles;
    const resume = `${importes} ajouté${importes > 1 ? 's' : ''}, ${misAJour} mis à jour${ecart ? `, ${ecart} ligne${ecart > 1 ? 's' : ''} écartée${ecart > 1 ? 's' : ''}${prixIllisibles ? ` (${prixIllisibles} sans prix lisible)` : ''}` : ''}${refuses ? `, ${refuses} non enregistré${refuses > 1 ? 's' : ''}` : ''}`;
    showToast(`Import : ${resume}`, refuses || prixIllisibles ? 'error' : 'success');
  };

  // Un article supprimé pendant qu'on le regarde : on revient à la liste
  useEffect(() => {
    if (articleDetail && !catalogue.find((c) => c.id === articleDetail)) setArticleDetail(null);
  }, [articleDetail, catalogue]);

  // ====== LES FENÊTRES, communes à tous les écrans du Catalogue ======
  const fenetres = (
    <>
      <input type="file" ref={fileInputRef} accept=".csv,.txt" onChange={choisirFichier} className="hidden" aria-label="Fichier CSV à importer" />
      <FenetreImportCsv donnees={importData} mapping={importMapping} setMapping={setImportMapping} onFermer={() => setImportData(null)} onImporter={importerCsv} enCours={importEnCours} />
      {scannerOuvert && (
        <FenetreScanner
          catalogue={catalogue} onFermer={() => setScannerOuvert(false)}
          onVoirFiche={(id) => { setScannerOuvert(false); setArticleDetail(id); }}
          onCreer={(prerempli) => { setScannerOuvert(false); ouvrirNouvelArticle(prerempli); }}
        />
      )}
      <FenetreAjoutDevis
        article={articleDevis} brouillons={devisBrouillons} clients={clients} quantite={devisQte} setQuantite={setDevisQte}
        devisChoisi={devisChoisi} setDevisChoisi={setDevisChoisi} onFermer={fermerAjoutDevis} onAjouter={ajouterAuDevis}
        onCreerDevis={() => { fermerAjoutDevis(); setPage?.('devis'); }} enCours={ajoutEnCours}
      />
      {showArticlePicker && <ArticlePicker isOpen={showArticlePicker} onClose={() => setShowArticlePicker(false)} onSelect={ajouterDepuisReferentiel} />}
    </>
  );

  const scanner = () => {
    // Sur ordinateur, pas de caméra arrière : on le dit
    if (!estMobile()) showToast('Scan de code-barres — disponible sur mobile uniquement', 'info');
    else setScannerOuvert(true);
  };

  // ====== FICHE D'UN ARTICLE ======
  if (articleDetail) {
    const item = catalogue.find((c) => c.id === articleDetail);
    if (!item) return null;
    return (
      <>
        <ArticleDetail
          item={item} fournisseurs={fournisseurs} liens={liens} mouvements={mouvements}
          historique={priceHistory.filter((h) => h.articleId === item.id).sort((a, b) => new Date(b.date) - new Date(a.date))}
          nbDevis={devisUsageMap[item.id] || 0} voitPrix={canViewPrices} modeDiscret={modeDiscret}
          peutModifier={peutModifier} peutCreer={peutCreer} peutAjouterAuDevis={peutAjouterAuDevis}
          onRetour={() => setArticleDetail(null)} onModifier={() => { setArticleDetail(null); startEdit(item); }}
          onDupliquer={() => dupliquer(item)} onAjouterAuDevis={() => ouvrirAjoutDevis(item)} onLier={lierFournisseur}
          onVoirFournisseurs={() => { setArticleDetail(null); setActiveTab('fournisseurs'); }}
        />
        {fenetres}
      </>
    );
  }

  // ====== FORMULAIRE D'ARTICLE ======
  if (show) {
    return (
      <>
        <FormulaireArticle
          form={form} setForm={setForm} editId={editId} erreurs={formErrors} effacerErreur={(cle) => setFormErrors((p) => ({ ...p, [cle]: '' }))}
          categories={CATEGORIES} coefficients={coefficients} similaires={similaires} modeDiscret={modeDiscret} prixAchatFlash={priceFlash} enCours={enregistrement}
          onPrixAchat={(pa) => setForm((p) => {
            const suivant = { ...p, prixAchat: pa };
            if (p.coefAuto && pa) {
              suivant.prix = (parseFloat(pa) * (coefficients[p.categorie] || 1.5)).toFixed(2);
              setPriceFlash(true);
              setTimeout(() => setPriceFlash(false), 1200);
            }
            return suivant;
          })}
          onCategorie={(cat) => setForm((p) => {
            const suivant = { ...p, categorie: cat };
            if (p.coefAuto && p.prixAchat) suivant.prix = (parseFloat(p.prixAchat) * (coefficients[cat] || 1.5)).toFixed(2);
            return suivant;
          })}
          onCoefAuto={(coche) => setForm((p) => {
            const suivant = { ...p, coefAuto: coche };
            if (coche && p.prixAchat) suivant.prix = (parseFloat(p.prixAchat) * (coefficients[p.categorie] || 1.5)).toFixed(2);
            return suivant;
          })}
          onEnregistrer={submit} onAnnuler={fermerFormulaire}
        />
        {fenetres}
      </>
    );
  }

  // ====== INVENTAIRE : LE COMPTAGE ======
  if (inventaireMode) {
    return (
      <>
        <ModeInventaire articles={articlesSuivis} comptes={comptes} setComptes={setComptes} enCours={inventaireEnCours} onTerminer={terminerInventaire} onRetour={() => setInventaireMode(false)} />
        {fenetres}
      </>
    );
  }

  // ====== PREMIER USAGE : CATALOGUE VIDE ======
  if (catalogue.length === 0 && !onboardingDismissed && !showArticlePicker) {
    return (
      <>
        <Demarrage
          etape={etapeDemarrage} setEtape={setEtapeDemarrage} metiersChoisis={metiersChoisis} setMetiersChoisis={setMetiersChoisis}
          progression={progression} resultat={resultatDemarrage} onImporter={importerReferentiel}
          onNouveau={() => ouvrirNouvelArticle()} onPasser={passerLeDemarrage} onCsv={() => fileInputRef.current?.click()}
          onRetour={setPage ? () => setPage('dashboard') : undefined}
        />
        {fenetres}
      </>
    );
  }

  // ====== LA PAGE : EN-TÊTE, ONGLETS, PUIS L'ONGLET ======
  const vide = catalogue.length === 0;
  const onglets = [
    { id: 'catalogue', libelle: 'Articles', compte: catalogue.length },
    ...(canViewPrices ? [{ id: 'bibliotheque', libelle: 'Référentiel' }, { id: 'fournisseurs', libelle: 'Fournisseurs', compte: fournisseurs.length }] : []),
    { id: 'mouvements', libelle: 'Mouvements', compte: mouvements.length },
    ...(canViewPrices ? [{ id: 'packs', libelle: 'Packs', compte: packs.length }] : []),
    { id: 'inventaire', libelle: 'Inventaire' },
    ...(canViewPrices && peutModifier ? [{ id: 'coefficients', libelle: 'Coefficients' }] : []),
  ];
  const ongletActif = onglets.some((o) => o.id === activeTab) ? activeTab : 'catalogue';
  const sousTitre = [`${catalogue.length} article${catalogue.length > 1 ? 's' : ''}`, alertesStock.length > 0 ? `${alertesStock.length} en stock bas` : null].filter(Boolean).join(' · ');

  // Recherche, filtres, tri : la boîte à outils commune (ui/Filtres.jsx)
  const TRIS = [
    ['name', 'Nom de A à Z'],
    ...(canViewPrices ? [['price', 'Prix de vente'], ['margin', 'Marge']] : []),
    ...(stockSuivi ? [['stock', 'Stock']] : []),
    ['usage', 'Plus utilisés dans vos devis'],
  ];
  const vueRangee = onlyFavoris ? 'favoris' : onlyLowStock ? 'stockbas' : catFilter !== 'Tous' ? `cat:${catFilter}` : 'tous';
  const choisirVue = (v) => {
    setOnlyFavoris(v === 'favoris');
    setOnlyLowStock(v === 'stockbas');
    setCatFilter(v.startsWith('cat:') ? v.slice(4) : 'Tous');
  };
  const prixActif = canViewPrices && (priceRange[0] > 0 || priceRange[1] < 10000);
  const nbFiltres = (onlyInStock ? 1 : 0) + (prixActif ? 1 : 0);
  const effacerFiltres = () => { setOnlyInStock(false); setPriceRange([0, 10000]); setCatFilter('Tous'); setOnlyFavoris(false); setOnlyLowStock(false); };
  const puces = [
    onlyInStock && { cle: 'enstock', libelle: 'En stock', onRetirer: () => setOnlyInStock(false) },
    prixActif && { cle: 'prix', libelle: `Prix ${priceRange[0] > 0 ? `dès ${priceRange[0]} €` : ''}${priceRange[0] > 0 && priceRange[1] < 10000 ? ' ' : ''}${priceRange[1] < 10000 ? `jusqu'à ${priceRange[1]} €` : ''}`.trim(), onRetirer: () => setPriceRange([0, 10000]) },
  ].filter(Boolean);
  const aucunFiltre = !debouncedSearch && vueRangee === 'tous' && nbFiltres === 0;
  const lignes = filtered.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);
  const nbPages = Math.max(1, Math.ceil(filtered.length / itemsPerPage));

  return (
    <div className="space-y-4">
      <EnTetePage
        titre="Catalogue"
        sousTitre={sousTitre}
        actions={(
          <>
            <MenuActions
              titre="Plus d'actions"
              actions={[
                { libelle: 'Ajouter depuis le référentiel BTP', icone: Library, onClick: () => setShowArticlePicker(true), masque: !peutCreer },
                { libelle: 'Importer un fichier (CSV)', icone: Upload, onClick: () => fileInputRef.current?.click(), masque: !peutCreer },
                { libelle: 'Exporter le catalogue', icone: Download, onClick: exporterCsv, masque: !canViewPrices || vide },
                { libelle: 'Scanner un code-barres', icone: Camera, onClick: scanner },
              ]}
            />
            {peutCreer && !vide && <Bouton variante="principal" icone={Plus} onClick={() => ouvrirNouvelArticle()}>Ajouter</Bouton>}
          </>
        )}
      />

      <Onglets ariaLabel="Sections du catalogue" actif={ongletActif} onChange={setActiveTab} onglets={onglets} />

      {ongletActif === 'bibliotheque' && canViewPrices && (
        <Bibliotheque isDark={isDark} couleur={couleur} setPage={setPage} devis={devis} updateDevis={updateDevis} clients={clients} showToast={showToast} />
      )}

      {ongletActif === 'fournisseurs' && canViewPrices && (
        <OngletFournisseurs
          fournisseurs={fournisseurs} setFournisseurs={setFournisseurs} liens={liens} setLiens={setLiens} catalogue={catalogue}
          peutModifier={peutModifier} onImporter={() => fileInputRef.current?.click()}
        />
      )}

      {ongletActif === 'mouvements' && (
        <OngletMouvements mouvements={mouvements} catalogue={catalogue} chantiers={chantiers} peutModifier={peutModifier} onAjouter={ajouterMouvement} />
      )}

      {ongletActif === 'packs' && canViewPrices && (
        <OngletPacks packs={packs} setPacks={setPacks} catalogue={catalogue} peutModifier={peutModifier} modeDiscret={modeDiscret} />
      )}

      {ongletActif === 'inventaire' && (
        <OngletInventaire
          catalogue={catalogue} mouvements={mouvements} alertesStock={alertesStock} voitPrix={canViewPrices} modeDiscret={modeDiscret}
          peutModifier={peutModifier} onDemarrer={demarrerInventaire} onVoirCatalogue={() => setActiveTab('catalogue')}
        />
      )}

      {ongletActif === 'coefficients' && canViewPrices && peutModifier && (
        <OngletCoefficients
          coefficients={coefficients} setCoefficients={setCoefficients} categories={CATEGORIES.filter((c) => c !== 'Tous')}
          valeursParDefaut={DEFAULT_COEFFICIENTS} modeDiscret={modeDiscret} peutModifier={peutModifier} onAppliquer={appliquerCoefficients}
        />
      )}

      {/* ====== ARTICLES : la recherche en tête, puis la liste ====== */}
      {ongletActif === 'catalogue' && (
        <div className="space-y-3">
          {!vide && (
            <>
              <div className="flex items-center gap-2">
                <ChampRecherche valeur={search} onChange={setSearch} placeholder="Rechercher un article, une référence…" ariaLabel="Rechercher un article" className="flex-1" />
                <BoutonVolet ref={boutonFiltresRef} libelle="Filtres" compte={nbFiltres} ouvert={volet === 'filtres'} onClick={() => setVolet((v) => (v === 'filtres' ? null : 'filtres'))} libelleCacheTelephone />
                {catalogue.length > 1 && (
                  <BoutonVolet ref={boutonTriRef} icone={ArrowUpDown} libelle="Trier" valeur={TRIS.find((t) => t[0] === sortBy)?.[1]} ouvert={volet === 'tri'} onClick={() => setVolet((v) => (v === 'tri' ? null : 'tri'))} libelleCacheTelephone />
                )}
              </div>
              <SegmentDefilant
                ariaLabel="Affichage du catalogue" valeur={vueRangee} onChange={choisirVue}
                options={[
                  { valeur: 'tous', libelle: 'Tous' },
                  ...(favoris.length > 0 ? [{ valeur: 'favoris', libelle: 'Favoris', icone: Star, compte: favoris.length }] : []),
                  ...(alertesStock.length > 0 ? [{ valeur: 'stockbas', libelle: 'Stock bas', compte: alertesStock.length, alerte: true }] : []),
                  ...categoriesUtilisees.map((c) => ({ valeur: `cat:${c}`, libelle: c })),
                ]}
              />
              <PucesActives puces={puces} onToutEffacer={effacerFiltres} />

              <Volet
                ouvert={volet === 'filtres'} onFermer={() => setVolet(null)} titre="Filtres" ancreRef={boutonFiltresRef} largeur={340}
                pied={(
                  <>
                    <Bouton variante="discret" onClick={effacerFiltres} disabled={aucunFiltre}>Tout effacer</Bouton>
                    <Bouton variante="principal" className="flex-1" onClick={() => setVolet(null)}>Voir {filtered.length} article{filtered.length > 1 ? 's' : ''}</Bouton>
                  </>
                )}
              >
                {stockSuivi && (
                  <GroupeChoix titre="Stock" multiple valeur={onlyInStock ? new Set(['enstock']) : new Set()} onChange={(s) => setOnlyInStock(s.has('enstock'))} options={[{ valeur: 'enstock', libelle: 'En stock uniquement' }]} />
                )}
                {canViewPrices && (
                  <fieldset>
                    <legend className="text-xs font-semibold uppercase tracking-wider mb-2.5 text-encre-3">Prix de vente</legend>
                    <div className="grid grid-cols-2 gap-3">
                      <Champ id="filtre-prix-min" libelle="Prix minimum (€)" type="number" inputMode="numeric" min="0" placeholder="0" value={priceRange[0] || ''} onChange={(e) => setPriceRange([parseInt(e.target.value, 10) || 0, priceRange[1]])} />
                      <Champ id="filtre-prix-max" libelle="Prix maximum (€)" type="number" inputMode="numeric" min="0" placeholder="Aucun" value={priceRange[1] < 10000 ? priceRange[1] : ''} onChange={(e) => setPriceRange([priceRange[0], parseInt(e.target.value, 10) || 10000])} />
                    </div>
                  </fieldset>
                )}
                {!stockSuivi && !canViewPrices && <p className="text-sm text-encre-3">Aucun autre filtre.</p>}
              </Volet>

              <Volet ouvert={volet === 'tri'} onFermer={() => setVolet(null)} titre="Trier" ancreRef={boutonTriRef} largeur={320}>
                <ListeChoix titre="Trier par" rechercheAuDela={99} options={TRIS.map(([valeur, libelle]) => ({ valeur, libelle }))} valeur={sortBy} onChange={(v) => { setSortBy(v); setVolet(null); }} />
              </Volet>
            </>
          )}

          {filtered.length === 0 ? (
            <Carte marge="aucun">
              {vide || aucunFiltre ? (
                <EtatVide
                  icone={Package} titre="Créez votre catalogue" texte="Centralisez vos matériaux, vos tarifs et vos stocks."
                  action={peutCreer ? (
                    <div className="flex flex-col items-center gap-2">
                      <Bouton variante="principal" icone={Sparkles} onClick={() => setShowArticlePicker(true)}>Importer depuis le référentiel BTP</Bouton>
                      <Bouton variante="secondaire" icone={Plus} onClick={() => ouvrirNouvelArticle()}>Ajouter un article</Bouton>
                    </div>
                  ) : null}
                />
              ) : (
                <EtatVide
                  icone={Search} titre="Aucun article trouvé" texte="Modifiez la recherche ou les filtres."
                  action={<Bouton variante="secondaire" icone={X} onClick={() => { setSearch(''); effacerFiltres(); }}>Effacer la recherche et les filtres</Bouton>}
                />
              )}
            </Carte>
          ) : (
            <>
              {/* Téléphone : une ligne par article (le tableau débordait : sa colonne d'actions n'apparaît qu'au survol). */}
              <GroupeListe className="sm:hidden">
                {lignes.map((item) => {
                  const stockVal = stockDe(item);
                  const bas = estStockBas(item);
                  return (
                    <div key={item.id} className="flex items-center bg-surface">
                      {peutModifier ? (
                        <button
                          type="button" onClick={() => toggleFavori(item.id)} aria-pressed={!!item.favori}
                          aria-label={item.favori ? `Retirer ${item.nom} des favoris` : `Ajouter ${item.nom} aux favoris`}
                          className="w-11 h-11 ml-1 flex-shrink-0 flex items-center justify-center rounded-lg"
                        >
                          <Star size={18} aria-hidden="true" className={item.favori ? 'text-alerte-point' : 'text-encre-3'} fill={item.favori ? 'currentColor' : 'none'} />
                        </button>
                      ) : <span className="w-3 flex-shrink-0" />}
                      <LigneListe
                        className="flex-1 min-w-0"
                        onClick={() => setArticleDetail(item.id)}
                        titre={item.nom}
                        meta={[item.reference, item.categorie, item.unite].filter(Boolean).join(' · ')}
                        montant={canViewPrices ? fmtPrix(item.prix) : undefined}
                        pastille={bas ? <Pastille ton="alerte">Stock bas</Pastille> : stockVal != null ? <span className="text-sm text-encre-2 tabular-nums">Stock {stockVal}</span> : undefined}
                      />
                    </div>
                  );
                })}
              </GroupeListe>

              {/* Ordinateur : le tableau, avec ses colonnes de prix pour qui les voit */}
              <div className="hidden sm:block bg-surface border border-bord rounded-2xl shadow-e1 overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-surface-2 text-encre-3">
                    <tr>
                      <th className="text-left font-medium px-4 py-3">Article</th>
                      {canViewPrices && <th className="text-right font-medium px-4 py-3 w-24">Vente</th>}
                      {canViewPrices && <th className="text-right font-medium px-4 py-3 w-24">Achat</th>}
                      {canViewPrices && <th className="text-right font-medium px-4 py-3 w-20">Marge</th>}
                      {stockSuivi && <th className="text-center font-medium px-4 py-3 w-36">Stock</th>}
                      <th className="w-32"><span className="sr-only">Actions</span></th>
                    </tr>
                  </thead>
                  <tbody>
                    {lignes.map((item) => {
                      const marge = margeBrute(item.prix, item.prixAchat);
                      const niveau = niveauMarge(marge);
                      const stockVal = stockDe(item);
                      const bas = estStockBas(item);
                      return (
                        <tr key={item.id} className="group border-b border-bord last:border-0 transition-colors cursor-pointer hover:bg-surface-2" onClick={() => setArticleDetail(item.id)}>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-3">
                              {peutModifier ? (
                                <button
                                  type="button" onClick={(e) => { e.stopPropagation(); toggleFavori(item.id); }} aria-pressed={!!item.favori}
                                  aria-label={item.favori ? `Retirer ${item.nom} des favoris` : `Ajouter ${item.nom} aux favoris`} className="w-11 h-11 flex-shrink-0 flex items-center justify-center rounded-lg hover:bg-bord"
                                >
                                  <Star size={18} aria-hidden="true" className={item.favori ? 'text-alerte-point' : 'text-encre-3'} fill={item.favori ? 'currentColor' : 'none'} />
                                </button>
                              ) : item.favori ? <Star size={18} aria-hidden="true" className="text-alerte-point mx-3" fill="currentColor" /> : null}
                              <div className="min-w-0">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <button type="button" onClick={(e) => { e.stopPropagation(); setArticleDetail(item.id); }} className="text-left text-base font-semibold text-encre hover:underline">{item.nom}</button>
                                  {devisUsageMap[item.id] > 0 && <Pastille ton="info">{devisUsageMap[item.id]} devis</Pastille>}
                                  {canViewPrices && item.tva_rate && item.tva_rate !== 20 && <Pastille ton="neutre">TVA {item.tva_rate} %</Pastille>}
                                </div>
                                <p className="text-sm text-encre-3">
                                  {item.reference && <span className="font-mono mr-1.5">{item.reference} ·</span>}
                                  {item.categorie} · {item.unite}
                                </p>
                              </div>
                            </div>
                          </td>
                          {canViewPrices && <td className="px-4 py-3 text-right font-semibold tabular-nums text-encre">{fmtPrix(item.prix)}</td>}
                          {canViewPrices && <td className="px-4 py-3 text-right tabular-nums text-encre-3">{item.prixAchat != null ? fmtPrix(item.prixAchat) : '—'}</td>}
                          {canViewPrices && (
                            <td className="px-4 py-3 text-right tabular-nums">
                              <span className={marge !== null ? CLASSES_TON_MARGE[niveau.ton].texte : 'text-encre-3'}>{modeDiscret ? '·····' : (marge !== null ? `${marge.toFixed(0)} %` : '—')}</span>
                            </td>
                          )}
                          {stockSuivi && (
                            <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                              {stockVal != null ? (
                                <div className="flex items-center justify-center gap-1">
                                  {peutModifier && <BoutonIcone icone={Minus} taille={16} libelle={`Un de moins pour ${item.nom}`} onClick={() => changerStock(item.id, (item.stock_actuel || 0) - 1)} />}
                                  {peutModifier ? (
                                    <input type="number" inputMode="numeric" aria-label={`Stock de ${item.nom}`} value={stockVal} onChange={(e) => changerStock(item.id, e.target.value)} className="w-14 h-10 px-1 rounded-lg border border-bord-fort bg-surface text-center text-sm text-encre" />
                                  ) : <span className="w-14 text-center tabular-nums text-encre">{stockVal}</span>}
                                  {peutModifier && <BoutonIcone icone={Plus} taille={16} libelle={`Un de plus pour ${item.nom}`} onClick={() => changerStock(item.id, (item.stock_actuel || 0) + 1)} />}
                                  {bas && <Pastille ton="alerte">Bas</Pastille>}
                                </div>
                              ) : <span className="block text-center text-sm text-encre-3">Non suivi</span>}
                            </td>
                          )}
                          <td className="px-4 py-3">
                            <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity" onClick={(e) => e.stopPropagation()}>
                              {peutAjouterAuDevis && canViewPrices && <BoutonIcone icone={FileText} libelle={`Ajouter ${item.nom} au devis`} onClick={() => ouvrirAjoutDevis(item)} />}
                              {peutModifier && <BoutonIcone icone={Edit3} libelle={`Modifier ${item.nom}`} onClick={() => startEdit(item)} />}
                              {peutSupprimer && <BoutonIcone icone={Trash2} libelle={`Supprimer ${item.nom}`} onClick={() => deleteItem(item.id)} />}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {filtered.length > itemsPerPage && (
                <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-3 rounded-xl bg-surface-2">
                  <label className="flex items-center gap-2 text-sm text-encre-2">
                    Afficher
                    <select value={itemsPerPage} onChange={(e) => { setItemsPerPage(Number(e.target.value)); setCurrentPage(1); }} className="h-10 px-2 rounded-lg border border-bord-fort bg-surface text-sm text-encre" aria-label="Nombre d'articles par page">
                      {[25, 50, 100].map((n) => <option key={n} value={n}>{n}</option>)}
                    </select>
                    par page
                  </label>
                  <div className="flex items-center gap-2">
                    <Bouton variante="secondaire" taille="compacte" onClick={() => setCurrentPage((p) => Math.max(1, p - 1))} disabled={currentPage <= 1}>Précédent</Bouton>
                    <span className="text-sm font-medium text-encre tabular-nums">Page {currentPage} sur {nbPages}</span>
                    <Bouton variante="secondaire" taille="compacte" onClick={() => setCurrentPage((p) => Math.min(nbPages, p + 1))} disabled={currentPage >= nbPages}>Suivant</Bouton>
                  </div>
                  <span className="text-sm text-encre-3">{filtered.length} article{filtered.length > 1 ? 's' : ''} au total</span>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {fenetres}
    </div>
  );
}
