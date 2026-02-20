import React, { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Plus, Minus, ArrowLeft, Star, Search, Edit3, Trash2, Package, AlertTriangle, Box,
  ChevronUp, ChevronDown, ArrowUpDown, Sparkles, Filter, X, Download, Upload,
  TrendingUp, TrendingDown, BarChart3, Layers, ClipboardList, ShoppingCart,
  Truck, History, DollarSign, Percent, Check, ChevronRight, Eye, Hash,
  PackagePlus, ArrowRightLeft, AlertCircle, FileSpreadsheet, Settings, RefreshCw,
  Camera, ScanBarcode, FileText, Bell, BellOff, Zap
} from 'lucide-react';
import { useConfirm, useToast } from '../context/AppContext';
import { generateId } from '../lib/utils';
import { useDebounce } from '../hooks/useDebounce';
import ArticlePicker from './ArticlePicker';
import { ALL_ARTICLES_BTP, CATEGORIES_METIERS, getSousCategories, getArticlesBySousCategorie } from '../lib/data';

const BASE_CATEGORIES = ['Plomberie', 'Électricité', 'Maçonnerie', 'Carrelage', 'Peinture', 'Menuiserie', 'Matériaux', 'Isolation', 'Main d\'œuvre', 'Autre'];
const UNITES = [
  { value: 'u', label: 'u (unité)' }, { value: 'm²', label: 'm² (mètre carré)' },
  { value: 'ml', label: 'ml (mètre linéaire)' }, { value: 'h', label: 'h (heure)' },
  { value: 'forfait', label: 'Forfait' }, { value: 'jour', label: 'Jour' },
  { value: 'kg', label: 'kg' }, { value: 'L', label: 'L (litre)' },
  { value: 'sac', label: 'Sac' }, { value: 'pot', label: 'Pot' },
  { value: 'rouleau', label: 'Rouleau' }, { value: 'm³', label: 'm³' },
  { value: 'palette', label: 'Palette' },
];

const DEFAULT_COEFFICIENTS = {
  'Plomberie': 1.6, 'Électricité': 1.5, 'Maçonnerie': 1.4, 'Carrelage': 1.5,
  'Peinture': 1.8, 'Menuiserie': 1.5, 'Matériaux': 1.3, 'Autre': 1.5
};

export default function Catalogue({ catalogue, setCatalogue, addCatalogueItem: addCatalogueItemProp, updateCatalogueItem: updateCatalogueItemProp, deleteCatalogueItem: deleteCatalogueItemProp, couleur, isDark, setPage, chantiers = [], equipe = [], modeDiscret, devis = [] }) {
  const { confirm } = useConfirm();
  const { showToast } = useToast();

  // Format money with modeDiscret support
  const fmtPrice = (n) => modeDiscret ? '·····' : `${parseFloat(n || 0).toFixed(2)} €`;
  const fmtPriceShort = (n) => modeDiscret ? '·····' : `${n}€`;

  // Theme classes
  const cardBg = isDark ? "bg-slate-800 border-slate-700" : "bg-white border-slate-200";
  const inputBg = isDark ? "bg-slate-700 border-slate-600 text-white placeholder-slate-400" : "bg-white border-slate-300";
  const textPrimary = isDark ? "text-slate-100" : "text-slate-900";
  const textSecondary = isDark ? "text-slate-300" : "text-slate-600";
  const textMuted = isDark ? "text-slate-400" : "text-slate-600";

  // ====== CORE STATE ======
  const [activeTab, setActiveTab] = useState('catalogue'); // catalogue, fournisseurs, mouvements, packs, inventaire, parametres
  const [show, setShow] = useState(false);
  const [editId, setEditId] = useState(null);
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search, 300);
  const [catFilter, setCatFilter] = useState('Tous');
  const [showStock, setShowStock] = useState(false);
  const [sortBy, setSortBy] = useState('name');
  const [form, setForm] = useState({ nom: '', reference: '', description: '', prix: '', prixAchat: '', unite: 'u', categorie: 'Autre', tva_rate: '20', favori: false, stock_actuel: '', stock_seuil_alerte: '', fournisseur: '', coefAuto: true });
  const [showArticlePicker, setShowArticlePicker] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [priceRange, setPriceRange] = useState([0, 10000]);
  const [onlyInStock, setOnlyInStock] = useState(false);
  const [onlyFavoris, setOnlyFavoris] = useState(false);
  const [onlyLowStock, setOnlyLowStock] = useState(false);
  const [articleDetail, setArticleDetail] = useState(null);
  const [showImport, setShowImport] = useState(false);
  const [importData, setImportData] = useState(null);
  const [importMapping, setImportMapping] = useState({});
  const fileInputRef = React.useRef(null);

  // ====== ONBOARDING STATE ======
  const [onboardingStep, setOnboardingStep] = useState(null); // null | 'metiers' | 'importing' | 'done'
  const [selectedMetiers, setSelectedMetiers] = useState([]);
  const [importProgress, setImportProgress] = useState(0);
  const [onboardingDismissed, setOnboardingDismissed] = useState(() => {
    try { return localStorage.getItem('cp_catalogue_onboarding_dismissed') === 'true'; } catch { return false; }
  });

  // ====== BARCODE SCANNER STATE ======
  const [showScanner, setShowScanner] = useState(false);
  const [scanResult, setScanResult] = useState(null);
  const [scanLoading, setScanLoading] = useState(false);
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const scanStreamRef = useRef(null);

  // ====== STOCK ALERT NOTIFICATIONS ======
  const [stockAlertsEnabled, setStockAlertsEnabled] = useState(() => {
    try { return localStorage.getItem('cp_stock_alerts_enabled') !== 'false'; } catch { return true; }
  });
  const [stockAlertsDismissed, setStockAlertsDismissed] = useState(false);

  // ====== FOURNISSEURS STATE ======
  const [fournisseurs, setFournisseurs] = useState(() => {
    try { return JSON.parse(localStorage.getItem('chantierpro_fournisseurs') || '[]'); } catch { return []; }
  });
  const [showFournisseurForm, setShowFournisseurForm] = useState(false);
  const [fournisseurForm, setFournisseurForm] = useState({ nom: '', email: '', telephone: '', adresse: '', delaiLivraison: '3', conditions: '' });
  const [editFournisseurId, setEditFournisseurId] = useState(null);

  // ====== ARTICLE-FOURNISSEUR LINKS ======
  const [articleFournisseurs, setArticleFournisseurs] = useState(() => {
    try { return JSON.parse(localStorage.getItem('chantierpro_article_fournisseurs') || '[]'); } catch { return []; }
  });

  // ====== MOUVEMENTS STOCK ======
  const [mouvements, setMouvements] = useState(() => {
    try { return JSON.parse(localStorage.getItem('chantierpro_mouvements') || '[]'); } catch { return []; }
  });
  const [showMouvementForm, setShowMouvementForm] = useState(false);
  const [mouvementForm, setMouvementForm] = useState({ articleId: '', type: 'in', quantite: '', chantierId: '', employe: '', raison: '' });
  const [mouvTypeFilter, setMouvTypeFilter] = useState('all');
  const [mouvArticleFilter, setMouvArticleFilter] = useState('');

  // ====== PACKS/KITS ======
  const [packs, setPacks] = useState(() => {
    try { return JSON.parse(localStorage.getItem('chantierpro_packs') || '[]'); } catch { return []; }
  });
  const [showPackForm, setShowPackForm] = useState(false);
  const [packForm, setPackForm] = useState({ nom: '', description: '', articles: [], prixVente: '' });

  // ====== INVENTAIRE ======
  const [inventaireMode, setInventaireMode] = useState(false);
  const [inventaireCounts, setInventaireCounts] = useState({});

  // ====== DUPLICATE DETECTION ======
  const duplicateSuggestions = useMemo(() => {
    if (!show || editId || !form.nom || form.nom.length < 3) return [];
    const query = form.nom.toLowerCase();
    return catalogue.filter(c => {
      const nom = (c.nom || '').toLowerCase();
      // Check if names are similar (contains, or share 3+ char words)
      if (nom.includes(query) || query.includes(nom)) return true;
      const queryWords = query.split(/\s+/).filter(w => w.length >= 3);
      const nomWords = nom.split(/\s+/).filter(w => w.length >= 3);
      const shared = queryWords.filter(qw => nomWords.some(nw => nw.includes(qw) || qw.includes(nw)));
      return shared.length >= 2;
    }).slice(0, 3);
  }, [show, editId, form.nom, catalogue]);

  // ====== HISTORIQUE PRIX ======
  const [priceHistory, setPriceHistory] = useState(() => {
    try { return JSON.parse(localStorage.getItem('chantierpro_price_history') || '[]'); } catch { return []; }
  });

  // ====== COEFFICIENTS ======
  const [coefficients, setCoefficients] = useState(() => {
    try { return JSON.parse(localStorage.getItem('chantierpro_coefficients') || 'null') || DEFAULT_COEFFICIENTS; } catch { return DEFAULT_COEFFICIENTS; }
  });

  // ====== PERSISTENCE ======
  useEffect(() => { try { localStorage.setItem('chantierpro_fournisseurs', JSON.stringify(fournisseurs)); } catch {} }, [fournisseurs]);
  useEffect(() => { try { localStorage.setItem('chantierpro_article_fournisseurs', JSON.stringify(articleFournisseurs)); } catch {} }, [articleFournisseurs]);
  useEffect(() => { try { localStorage.setItem('chantierpro_mouvements', JSON.stringify(mouvements)); } catch {} }, [mouvements]);
  useEffect(() => { try { localStorage.setItem('chantierpro_packs', JSON.stringify(packs)); } catch {} }, [packs]);
  useEffect(() => { try { localStorage.setItem('chantierpro_price_history', JSON.stringify(priceHistory)); } catch {} }, [priceHistory]);
  useEffect(() => { try { localStorage.setItem('chantierpro_coefficients', JSON.stringify(coefficients)); } catch {} }, [coefficients]);

  // ====== ESCAPE KEY HANDLER ======
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        if (showImport) { setShowImport(false); return; }
        if (showArticlePicker) { setShowArticlePicker(false); return; }
        if (showMouvementForm) { setShowMouvementForm(false); return; }
        if (showFournisseurForm) { setShowFournisseurForm(false); setEditFournisseurId(null); return; }
        if (showPackForm) { setShowPackForm(false); return; }
        if (articleDetail) { setArticleDetail(null); return; }
        if (show) { setShow(false); setEditId(null); return; }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showImport, showArticlePicker, showMouvementForm, showFournisseurForm, showPackForm, articleDetail, show]);

  // ====== DYNAMIC CATEGORIES (include all used + base) ======
  const CATEGORIES = useMemo(() => {
    const usedCats = new Set(catalogue.map(c => c.categorie).filter(Boolean));
    const allCats = new Set([...BASE_CATEGORIES, ...usedCats]);
    return ['Tous', ...Array.from(allCats).sort((a, b) => {
      // Keep base categories in order, then extras alphabetically
      const ai = BASE_CATEGORIES.indexOf(a);
      const bi = BASE_CATEGORIES.indexOf(b);
      if (ai >= 0 && bi >= 0) return ai - bi;
      if (ai >= 0) return -1;
      if (bi >= 0) return 1;
      return a.localeCompare(b);
    })];
  }, [catalogue]);

  // ====== FUZZY SEARCH ======
  // Normalize accents for French search: é→e, è→e, ê→e, ù→u, ç→c, ô→o, î→i, ï→i etc.
  const normalize = useCallback((str) => (str || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase(), []);

  const fuzzyMatch = useCallback((text, query) => {
    if (!query) return true;
    const words = normalize(query).split(/\s+/).filter(Boolean);
    const target = normalize(text);
    return words.every(w => target.includes(w));
  }, [normalize]);

  // ====== DEVIS USAGE: count how many devis use each article ======
  const devisUsageMap = useMemo(() => {
    const map = {};
    (devis || []).forEach(d => {
      const lignes = d.lignes || d.items || d.articles || [];
      lignes.forEach(l => {
        const artId = l.catalogueId || l.articleId || l.article_id;
        const artNom = (l.designation || l.nom || '').toLowerCase();
        if (artId) {
          map[artId] = (map[artId] || 0) + 1;
        } else if (artNom) {
          const match = catalogue.find(c => (c.nom || '').toLowerCase() === artNom);
          if (match) map[match.id] = (map[match.id] || 0) + 1;
        }
      });
    });
    return map;
  }, [devis, catalogue]);

  // ====== FILTERED & SORTED ======
  const filtered = useMemo(() => {
    let items = catalogue.filter(c => {
      if (catFilter !== 'Tous' && c.categorie !== catFilter) return false;
      if (debouncedSearch && !fuzzyMatch(`${c.nom} ${c.reference || ''} ${c.description || ''} ${c.categorie} ${c.unite}`, debouncedSearch)) return false;
      if (onlyInStock && ((c.stock_actuel ?? c.stock) == null || (c.stock_actuel ?? c.stock) <= 0)) return false;
      if (onlyFavoris && !c.favori) return false;
      if (onlyLowStock) {
        const st = c.stock_actuel ?? c.stock;
        const se = c.stock_seuil_alerte ?? c.stockMin;
        if (!(st != null && se != null && se > 0 && st < se)) return false;
      }
      if (priceRange[0] > 0 && (c.prix || 0) < priceRange[0]) return false;
      if (priceRange[1] < 10000 && (c.prix || 0) > priceRange[1]) return false;
      return true;
    });
    switch (sortBy) {
      case 'price': return items.sort((a, b) => (b.prix || 0) - (a.prix || 0));
      case 'stock': return items.sort((a, b) => (a.stock_actuel ?? a.stock ?? 999) - (b.stock_actuel ?? b.stock ?? 999));
      case 'margin': return items.sort((a, b) => {
        const ma = a.prixAchat ? ((a.prix - a.prixAchat) / a.prix) * 100 : -1;
        const mb = b.prixAchat ? ((b.prix - b.prixAchat) / b.prix) * 100 : -1;
        return mb - ma;
      });
      case 'usage': return items.sort((a, b) => (devisUsageMap[b.id] || 0) - (devisUsageMap[a.id] || 0));
      default: return items.sort((a, b) => (a.nom || '').localeCompare(b.nom || ''));
    }
  }, [catalogue, catFilter, debouncedSearch, sortBy, fuzzyMatch, onlyInStock, onlyFavoris, onlyLowStock, priceRange, devisUsageMap]);

  const favoris = catalogue.filter(c => c.favori);
  const alertesStock = catalogue.filter(c => {
    const stock = c.stock_actuel ?? c.stock;
    const seuil = c.stock_seuil_alerte ?? c.stockMin;
    return stock != null && seuil != null && seuil > 0 && stock < seuil;
  });
  const activeFilters = (catFilter !== 'Tous' ? 1 : 0) + (onlyInStock ? 1 : 0) + (onlyFavoris ? 1 : 0) + (onlyLowStock ? 1 : 0) + (priceRange[0] > 0 || priceRange[1] < 10000 ? 1 : 0);

  // ====== AUTO-FAVORITES: top 5 most used in devis ======
  const trendingArticles = useMemo(() => {
    return Object.entries(devisUsageMap)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([id, count]) => ({ id, count, article: catalogue.find(c => c.id === id) }))
      .filter(t => t.article);
  }, [devisUsageMap, catalogue]);

  // ====== ONBOARDING BULK IMPORT ======
  const handleBulkImport = useCallback(async (metierIds) => {
    setOnboardingStep('importing');
    setImportProgress(0);
    let totalArticles = [];
    metierIds.forEach(catId => {
      const cat = ALL_ARTICLES_BTP[catId];
      if (!cat) return;
      const catMeta = CATEGORIES_METIERS.find(c => c.id === catId);
      Object.entries(cat.sousCategories).forEach(([, sousCat]) => {
        sousCat.articles.forEach(article => {
          const coef = coefficients[catMeta?.nom] || coefficients[cat.nom] || 1.5;
          totalArticles.push({
            nom: article.nom,
            prix: article.prixDefaut,
            prixAchat: Math.round(article.prixDefaut / coef * 100) / 100,
            unite: article.unite,
            categorie: catMeta?.nom || 'Autre',
            favori: false,
            coefAuto: true,
            reference: `REF-${article.id.toUpperCase().slice(0, 10)}`,
          });
        });
      });
    });
    // Import in batches with progress animation
    for (let i = 0; i < totalArticles.length; i++) {
      const item = totalArticles[i];
      if (addCatalogueItemProp) {
        await addCatalogueItemProp(item);
      } else {
        setCatalogue(prev => [...prev, { id: generateId(), ...item }]);
      }
      if (i % 3 === 0 || i === totalArticles.length - 1) {
        setImportProgress(Math.round(((i + 1) / totalArticles.length) * 100));
      }
    }
    setOnboardingStep('done');
    localStorage.setItem('cp_catalogue_onboarding_dismissed', 'true');
    setOnboardingDismissed(true);
    showToast(`${totalArticles.length} articles importés depuis le Référentiel BTP`, 'success');
    setTimeout(() => setOnboardingStep(null), 2000);
  }, [addCatalogueItemProp, setCatalogue, coefficients, showToast]);

  // ====== BARCODE SCANNER ======
  const startScanner = useCallback(async () => {
    setShowScanner(true);
    setScanResult(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } }
      });
      scanStreamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }
    } catch (err) {
      showToast('Impossible d\'accéder à la caméra', 'error');
      setShowScanner(false);
    }
  }, [showToast]);

  const stopScanner = useCallback(() => {
    if (scanStreamRef.current) {
      scanStreamRef.current.getTracks().forEach(t => t.stop());
      scanStreamRef.current = null;
    }
    setShowScanner(false);
    setScanResult(null);
  }, []);

  const handleBarcodeDetected = useCallback(async (barcode) => {
    setScanLoading(true);
    // Try to match barcode in catalogue first (by reference)
    const localMatch = catalogue.find(c =>
      (c.reference || '').toLowerCase() === barcode.toLowerCase() ||
      (c.ean || c.barcode || '').toLowerCase() === barcode.toLowerCase()
    );
    if (localMatch) {
      setScanResult({ found: true, local: true, article: localMatch });
      setScanLoading(false);
      return;
    }
    // Try Open Food Facts / Open Product API for EAN codes
    try {
      const resp = await fetch(`https://world.openfoodfacts.org/api/v2/product/${barcode}.json`);
      if (resp.ok) {
        const data = await resp.json();
        if (data.status === 1 && data.product) {
          setScanResult({
            found: true, local: false,
            product: {
              nom: data.product.product_name || data.product.product_name_fr || barcode,
              marque: data.product.brands || '',
              barcode: barcode,
              image: data.product.image_front_small_url,
            }
          });
          setScanLoading(false);
          return;
        }
      }
    } catch {}
    setScanResult({ found: false, barcode });
    setScanLoading(false);
  }, [catalogue]);

  // BarcodeDetector API (available in Chrome/Edge)
  useEffect(() => {
    if (!showScanner || !videoRef.current) return;
    let running = true;
    const detectBarcode = async () => {
      if (!running || !videoRef.current) return;
      if ('BarcodeDetector' in window) {
        try {
          const detector = new window.BarcodeDetector({ formats: ['ean_13', 'ean_8', 'code_128', 'code_39', 'qr_code'] });
          const detect = async () => {
            if (!running || !videoRef.current || videoRef.current.readyState < 2) {
              if (running) requestAnimationFrame(detect);
              return;
            }
            try {
              const barcodes = await detector.detect(videoRef.current);
              if (barcodes.length > 0 && running) {
                running = false;
                handleBarcodeDetected(barcodes[0].rawValue);
              } else if (running) {
                requestAnimationFrame(detect);
              }
            } catch {
              if (running) setTimeout(detect, 500);
            }
          };
          detect();
        } catch {}
      } else {
        // Fallback: prompt user to enter barcode manually
        setScanResult({ noBarcodeAPI: true });
      }
    };
    const timer = setTimeout(detectBarcode, 500);
    return () => { running = false; clearTimeout(timer); };
  }, [showScanner, handleBarcodeDetected]);

  // ====== STOCK ALERTS NOTIFICATION EFFECT ======
  useEffect(() => {
    if (stockAlertsEnabled && alertesStock.length > 0 && !stockAlertsDismissed && 'Notification' in window && Notification.permission === 'granted') {
      const lastAlert = localStorage.getItem('cp_stock_alert_last');
      const now = Date.now();
      if (!lastAlert || now - parseInt(lastAlert) > 24 * 60 * 60 * 1000) {
        localStorage.setItem('cp_stock_alert_last', now.toString());
        try {
          new Notification('ChantierPro — Stock bas', {
            body: `${alertesStock.length} article${alertesStock.length > 1 ? 's' : ''} en dessous du seuil d'alerte`,
            icon: '/icons/icon-192.png',
          });
        } catch {}
      }
    }
  }, [alertesStock, stockAlertsEnabled, stockAlertsDismissed]);

  useEffect(() => {
    localStorage.setItem('cp_stock_alerts_enabled', stockAlertsEnabled.toString());
  }, [stockAlertsEnabled]);

  // ====== HELPERS ======
  const getMargeBrute = (prix, prixAchat) => {
    const p = parseFloat(prix) || 0;
    const a = parseFloat(prixAchat);
    if (p === 0) return null;
    // If prixAchat is 0 (e.g. main d'œuvre), marge = 100%
    if (isNaN(a) || a === undefined || a === null) return null;
    if (a === 0) return 100;
    return ((p - a) / p) * 100;
  };

  const getMargeColor = (marge) => {
    if (marge === null) return textMuted;
    if (marge >= 60) return 'text-emerald-600 font-bold';
    if (marge >= 40) return 'text-emerald-500';
    if (marge >= 25) return 'text-orange-500';
    if (marge >= 10) return 'text-yellow-600';
    return 'text-red-500';
  };

  const handleAddFromPicker = async (item) => {
    const coef = coefficients[item.categorie] || 1.5;
    const newItem = {
      nom: item.nom, prix: item.prixUnitaire,
      prixAchat: item.prixAchat || Math.round(item.prixUnitaire / coef * 100) / 100,
      unite: item.unite, categorie: item.categorie, favori: false,
      stock_actuel: undefined, stock_seuil_alerte: undefined,
    };
    if (addCatalogueItemProp) {
      await addCatalogueItemProp(newItem);
    } else {
      setCatalogue([...catalogue, { id: generateId(), ...newItem }]);
    }
    showToast(`"${item.nom}" ajouté au catalogue`, 'success');
  };

  // ====== CRUD ======
  const submit = async () => {
    if (!form.nom?.trim() || !form.prix) return showToast('Nom et prix requis', 'error');
    const prixVente = parseFloat(form.prix);
    if (prixVente <= 0) return showToast('Le prix de vente doit être supérieur à 0', 'error');
    let prixAchat = parseFloat(form.prixAchat) || 0;
    // Auto coefficient
    if (form.coefAuto && prixAchat > 0 && !form.prix) {
      const coef = coefficients[form.categorie] || 1.5;
      // prix = prixAchat * coef
    }
    const data = {
      ...form,
      prix: prixVente, prixAchat,
      reference: form.reference || undefined,
      description: form.description || undefined,
      tva_rate: parseFloat(form.tva_rate) || 20,
      tva: parseFloat(form.tva_rate) || 20,
      favori: form.favori || false,
      coefAuto: form.coefAuto || false,
      stock_actuel: form.stock_actuel !== '' ? parseInt(form.stock_actuel) : undefined,
      stock_seuil_alerte: form.stock_seuil_alerte !== '' ? parseInt(form.stock_seuil_alerte) : undefined
    };
    // Track price history
    if (editId) {
      const old = catalogue.find(c => c.id === editId);
      if (old && (old.prix !== prixVente || old.prixAchat !== prixAchat)) {
        setPriceHistory(prev => [...prev, { id: generateId(), articleId: editId, prixVente: old.prix, prixAchat: old.prixAchat, date: new Date().toISOString() }]);
      }
      if (updateCatalogueItemProp) {
        await updateCatalogueItemProp(editId, data);
      } else {
        setCatalogue(catalogue.map(c => c.id === editId ? { id: editId, ...data } : c));
      }
      showToast('Article modifié', 'success');
    } else {
      if (addCatalogueItemProp) {
        await addCatalogueItemProp(data);
      } else {
        setCatalogue([...catalogue, { id: generateId(), ...data }]);
      }
      showToast('Article ajouté', 'success');
    }
    setShow(false); setEditId(null);
    setForm({ nom: '', reference: '', description: '', prix: '', prixAchat: '', unite: 'u', categorie: 'Autre', tva_rate: '20', favori: false, stock_actuel: '', stock_seuil_alerte: '', fournisseur: '', coefAuto: true });
  };

  const startEdit = (item) => {
    setForm({ nom: item.nom || '', reference: item.reference || '', description: item.description || '', prix: item.prix?.toString() || '', prixAchat: item.prixAchat?.toString() || '', unite: item.unite || 'u', categorie: item.categorie || 'Autre', tva_rate: (item.tva_rate || item.tva || 20).toString(), favori: item.favori || false, stock_actuel: item.stock_actuel?.toString() ?? '', stock_seuil_alerte: item.stock_seuil_alerte?.toString() ?? '', fournisseur: '', coefAuto: item.coefAuto || false });
    setEditId(item.id); setShow(true);
  };

  const toggleFavori = async (id) => {
    const item = catalogue.find(c => c.id === id);
    if (!item) return;
    const newFavori = !item.favori;
    if (updateCatalogueItemProp) {
      await updateCatalogueItemProp(id, { ...item, favori: newFavori });
    } else {
      setCatalogue(catalogue.map(c => c.id === id ? { ...c, favori: newFavori } : c));
    }
    showToast(item.favori ? 'Retiré des favoris' : 'Ajouté aux favoris', 'success');
  };

  const deleteItem = async (id) => {
    const confirmed = await confirm({ title: 'Supprimer', message: 'Supprimer cet article du catalogue ?' });
    if (confirmed) {
      if (deleteCatalogueItemProp) {
        await deleteCatalogueItemProp(id);
      } else {
        setCatalogue(catalogue.filter(c => c.id !== id));
      }
      showToast('Article supprimé', 'info');
    }
  };

  const updateStock = async (id, value) => {
    const item = catalogue.find(c => c.id === id);
    if (!item) return;
    const updated = { ...item, stock_actuel: Math.max(0, parseInt(value) || 0) };
    if (updateCatalogueItemProp) { await updateCatalogueItemProp(id, updated); }
    else { setCatalogue(catalogue.map(c => c.id === id ? updated : c)); }
  };
  const incrementStock = async (id) => {
    const item = catalogue.find(c => c.id === id);
    if (!item) return;
    const updated = { ...item, stock_actuel: (item.stock_actuel || 0) + 1 };
    if (updateCatalogueItemProp) { await updateCatalogueItemProp(id, updated); }
    else { setCatalogue(catalogue.map(c => c.id === id ? updated : c)); }
  };
  const decrementStock = async (id) => {
    const item = catalogue.find(c => c.id === id);
    if (!item) return;
    const updated = { ...item, stock_actuel: Math.max(0, (item.stock_actuel || 0) - 1) };
    if (updateCatalogueItemProp) { await updateCatalogueItemProp(id, updated); }
    else { setCatalogue(catalogue.map(c => c.id === id ? updated : c)); }
  };

  // ====== FOURNISSEUR CRUD ======
  const addFournisseur = () => {
    if (!fournisseurForm.nom) return showToast('Nom requis', 'error');
    if (editFournisseurId) {
      setFournisseurs(prev => prev.map(f => f.id === editFournisseurId ? { ...f, ...fournisseurForm } : f));
    } else {
      setFournisseurs(prev => [...prev, { id: generateId(), ...fournisseurForm, createdAt: new Date().toISOString() }]);
    }
    setShowFournisseurForm(false); setEditFournisseurId(null);
    setFournisseurForm({ nom: '', email: '', telephone: '', adresse: '', delaiLivraison: '3', conditions: '' });
    showToast(editFournisseurId ? 'Fournisseur modifié' : 'Fournisseur ajouté', 'success');
  };

  const linkArticleFournisseur = (articleId, fournisseurId, prixAchat) => {
    const existing = articleFournisseurs.find(af => af.articleId === articleId && af.fournisseurId === fournisseurId);
    if (existing) {
      setArticleFournisseurs(prev => prev.map(af => af.id === existing.id ? { ...af, prixAchat, updatedAt: new Date().toISOString() } : af));
    } else {
      setArticleFournisseurs(prev => [...prev, { id: generateId(), articleId, fournisseurId, prixAchat: parseFloat(prixAchat) || 0, createdAt: new Date().toISOString() }]);
    }
  };

  // ====== MOUVEMENTS ======
  const addMouvement = async () => {
    if (!mouvementForm.articleId || !mouvementForm.quantite) return showToast('Article et quantité requis', 'error');
    const qty = parseInt(mouvementForm.quantite);
    const article = catalogue.find(c => c.id === mouvementForm.articleId);
    const newMouvement = { id: generateId(), ...mouvementForm, quantite: qty, date: new Date().toISOString(), articleNom: article?.nom };
    setMouvements(prev => [newMouvement, ...prev]);
    // Update stock via DataContext
    if (article && (mouvementForm.type === 'in' || mouvementForm.type === 'return')) {
      const newStock = (article.stock_actuel || 0) + qty;
      if (updateCatalogueItemProp) { await updateCatalogueItemProp(article.id, { ...article, stock_actuel: newStock }); }
      else { setCatalogue(prev => prev.map(c => c.id === article.id ? { ...c, stock_actuel: newStock } : c)); }
    } else if (article && mouvementForm.type === 'out') {
      const newStock = Math.max(0, (article.stock_actuel || 0) - qty);
      if (updateCatalogueItemProp) { await updateCatalogueItemProp(article.id, { ...article, stock_actuel: newStock }); }
      else { setCatalogue(prev => prev.map(c => c.id === article.id ? { ...c, stock_actuel: newStock } : c)); }
    }
    setShowMouvementForm(false);
    setMouvementForm({ articleId: '', type: 'in', quantite: '', chantierId: '', employe: '', raison: '' });
    showToast(`Mouvement enregistré — stock mis à jour`, 'success');
  };

  // ====== PACKS ======
  const addPack = () => {
    if (!packForm.nom || packForm.articles.length === 0) return showToast('Nom et articles requis', 'error');
    const totalCost = packForm.articles.reduce((s, a) => {
      const item = catalogue.find(c => c.id === a.articleId);
      return s + (item?.prixAchat || 0) * (a.quantite || 1);
    }, 0);
    const totalVente = packForm.articles.reduce((s, a) => {
      const item = catalogue.find(c => c.id === a.articleId);
      return s + (item?.prix || 0) * (a.quantite || 1);
    }, 0);
    const newPack = { id: generateId(), ...packForm, totalCost, totalVenteSuggere: totalVente, prixVente: parseFloat(packForm.prixVente) || totalVente, createdAt: new Date().toISOString() };
    setPacks(prev => [...prev, newPack]);
    setShowPackForm(false);
    setPackForm({ nom: '', description: '', articles: [], prixVente: '' });
    showToast('Pack créé', 'success');
  };

  const duplicatePack = (pack) => {
    const newPack = { ...pack, id: generateId(), nom: `${pack.nom} (copie)`, createdAt: new Date().toISOString() };
    setPacks(prev => [...prev, newPack]);
    showToast(`Pack "${pack.nom}" dupliqué`, 'success');
  };

  // ====== INVENTAIRE ======
  const startInventaire = () => {
    const counts = {};
    catalogue.forEach(c => {
      const stock = c.stock_actuel ?? c.stock;
      if (stock != null || (c.stock_seuil_alerte ?? c.stockMin) > 0) {
        counts[c.id] = stock ?? 0;
      }
    });
    setInventaireCounts(counts);
    setInventaireMode(true);
  };

  const finishInventaire = async () => {
    let adjustments = 0;
    const newMouvements = [];
    Object.entries(inventaireCounts).forEach(([id, counted]) => {
      const item = catalogue.find(c => c.id === id);
      if (item && item.stock_actuel !== undefined && counted !== item.stock_actuel) {
        adjustments++;
        newMouvements.push({ id: generateId(), articleId: id, type: 'adjustment', quantite: counted, date: new Date().toISOString(), raison: `Inventaire — écart: ${counted - item.stock_actuel}`, articleNom: item.nom });
      }
    });
    // Update stock for each adjusted item
    if (updateCatalogueItemProp) {
      for (const [id, counted] of Object.entries(inventaireCounts)) {
        const item = catalogue.find(c => c.id === id);
        if (item && item.stock_actuel !== counted) {
          await updateCatalogueItemProp(id, { ...item, stock_actuel: counted });
        }
      }
    } else {
      setCatalogue(prev => prev.map(c => {
        if (inventaireCounts[c.id] !== undefined) return { ...c, stock_actuel: inventaireCounts[c.id] };
        return c;
      }));
    }
    setMouvements(prev => [...newMouvements, ...prev]);
    setInventaireMode(false);
    showToast(`Inventaire terminé — ${adjustments} ajustement${adjustments > 1 ? 's' : ''}`, 'success');
  };

  // ====== EXPORT CSV ======
  const exportCSV = () => {
    const rows = [['Référence', 'Nom', 'Description', 'Catégorie', 'Unité', 'TVA %', 'Prix vente HT', 'Prix achat HT', 'Marge %', 'Stock', 'Seuil alerte', 'Favori']];
    catalogue.forEach(c => {
      const marge = getMargeBrute(c.prix, c.prixAchat);
      rows.push([c.reference || '', c.nom, c.description || '', c.categorie, c.unite, c.tva_rate || c.tva || 20, c.prix, c.prixAchat || '', marge !== null ? marge.toFixed(1) : '', c.stock_actuel ?? '', c.stock_seuil_alerte ?? '', c.favori ? 'Oui' : '']);
    });
    const csv = rows.map(r => r.map(v => `"${v}"`).join(';')).join('\n');
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `catalogue_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    showToast('Export CSV téléchargé', 'success');
  };

  // ====== MOUVEMENTS EXPORT ======
  const exportMouvements = () => {
    const rows = [['Date', 'Article', 'Référence', 'Type', 'Quantité', 'Chantier', 'Raison']];
    mouvements.forEach(m => {
      const article = catalogue.find(c => c.id === m.articleId);
      const ch = chantiers?.find(c => c.id === m.chantierId);
      const type = m.type === 'in' || m.type === 'entree' ? 'Entrée' : m.type === 'out' || m.type === 'sortie' ? 'Sortie' : m.type === 'return' ? 'Retour' : 'Ajustement';
      rows.push([new Date(m.date).toLocaleDateString('fr-FR'), article?.nom || m.articleNom || '?', article?.reference || '', type, m.quantite, ch?.nom || '', m.raison || m.motif || '']);
    });
    const csv = rows.map(r => r.map(v => `"${v}"`).join(';')).join('\n');
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `mouvements_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    showToast('Export mouvements téléchargé', 'success');
  };

  // ====== FILTERED MOUVEMENTS ======
  const filteredMouvements = useMemo(() => {
    return mouvements.filter(m => {
      const typeNorm = m.type === 'entree' ? 'in' : m.type === 'sortie' ? 'out' : m.type;
      if (mouvTypeFilter !== 'all' && typeNorm !== mouvTypeFilter) return false;
      if (mouvArticleFilter && m.articleId !== mouvArticleFilter) return false;
      return true;
    });
  }, [mouvements, mouvTypeFilter, mouvArticleFilter]);

  // ====== CSV IMPORT ======
  const handleFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      const text = evt.target.result;
      const lines = text.split('\n').map(l => l.replace(/\r/g, ''));
      if (lines.length < 2) return showToast('Fichier vide ou invalide', 'error');
      const sep = lines[0].includes(';') ? ';' : ',';
      const headers = lines[0].split(sep).map(h => h.replace(/^"|"$/g, '').trim());
      const rows = lines.slice(1).filter(l => l.trim()).map(l => {
        const vals = l.split(sep).map(v => v.replace(/^"|"$/g, '').trim());
        const row = {};
        headers.forEach((h, i) => { row[h] = vals[i] || ''; });
        return row;
      });
      // Auto-map common column names
      const autoMap = {};
      const MAP_HINTS = {
        designation: ['nom', 'designation', 'désignation', 'article', 'name', 'libelle', 'libellé'],
        reference: ['reference', 'référence', 'ref', 'sku', 'code'],
        description: ['description', 'desc'],
        prix: ['prix_vente', 'prix vente', 'prix_unitaire_ht', 'prix ht', 'prix vente ht', 'price', 'tarif'],
        prixAchat: ['prix_achat', 'prix achat', 'cout', 'coût', 'cost', 'pa'],
        unite: ['unite', 'unité', 'unit', 'u'],
        categorie: ['categorie', 'catégorie', 'category', 'cat'],
        tva_rate: ['tva', 'tva_rate', 'taux_tva'],
        stock: ['stock', 'stock_actuel', 'quantite', 'quantité', 'qty'],
      };
      headers.forEach(h => {
        const hl = h.toLowerCase();
        for (const [field, hints] of Object.entries(MAP_HINTS)) {
          if (hints.some(hint => hl.includes(hint) || hl === hint)) {
            autoMap[field] = h;
            break;
          }
        }
      });
      setImportMapping(autoMap);
      setImportData({ headers, rows });
      setShowImport(true);
    };
    reader.readAsText(file, 'UTF-8');
    e.target.value = '';
  };

  const executeImport = async () => {
    if (!importData) return;
    let imported = 0, skipped = 0, updated = 0;
    for (const row of importData.rows) {
      const nom = row[importMapping.designation] || '';
      if (!nom) { skipped++; continue; }
      const ref = row[importMapping.reference] || '';
      const prixStr = row[importMapping.prix] || '';
      const prix = parseFloat(prixStr.replace(',', '.')) || 0;
      if (prix === 0 && !prixStr) { skipped++; continue; }
      // Check duplicate by reference
      const existing = ref ? catalogue.find(c => c.reference === ref) : null;
      if (existing) {
        const updatedData = {
          ...existing,
          nom: nom || existing.nom,
          prix: prix || existing.prix,
          prixAchat: parseFloat((row[importMapping.prixAchat] || '').replace(',', '.')) || existing.prixAchat,
          unite: row[importMapping.unite] || existing.unite,
          categorie: row[importMapping.categorie] || existing.categorie,
          description: row[importMapping.description] || existing.description,
          tva_rate: parseFloat(row[importMapping.tva_rate]) || existing.tva_rate,
          stock_actuel: row[importMapping.stock] ? parseInt(row[importMapping.stock]) : existing.stock_actuel,
        };
        if (updateCatalogueItemProp) { await updateCatalogueItemProp(existing.id, updatedData); }
        else { setCatalogue(prev => prev.map(c => c.id === existing.id ? updatedData : c)); }
        updated++;
      } else {
        const newItem = {
          nom,
          reference: ref,
          description: row[importMapping.description] || '',
          prix: prix,
          prixAchat: parseFloat((row[importMapping.prixAchat] || '').replace(',', '.')) || 0,
          unite: row[importMapping.unite] || 'u',
          categorie: row[importMapping.categorie] || 'Autre',
          tva_rate: parseFloat(row[importMapping.tva_rate]) || 20,
          tva: parseFloat(row[importMapping.tva_rate]) || 20,
          favori: false,
          stock_actuel: row[importMapping.stock] ? parseInt(row[importMapping.stock]) : undefined,
          stock_seuil_alerte: undefined,
        };
        if (addCatalogueItemProp) { await addCatalogueItemProp(newItem); }
        else { setCatalogue(prev => [...prev, { id: generateId(), ...newItem }]); }
        imported++;
      }
    }
    setShowImport(false);
    setImportData(null);
    showToast(`Import terminé: ${imported} ajoutés, ${updated} mis à jour, ${skipped} ignorés`, 'success');
  };

  // ====== ARTICLE DETAIL VIEW ======
  if (articleDetail) {
    const item = catalogue.find(c => c.id === articleDetail);
    if (!item) { setArticleDetail(null); return null; }
    const marge = getMargeBrute(item.prix, item.prixAchat);
    const itemFournisseurs = articleFournisseurs.filter(af => af.articleId === item.id).map(af => ({ ...af, fournisseur: fournisseurs.find(f => f.id === af.fournisseurId) })).filter(af => af.fournisseur);
    const itemMouvements = mouvements.filter(m => m.articleId === item.id).slice(0, 15);
    const itemHistory = priceHistory.filter(h => h.articleId === item.id).sort((a, b) => new Date(b.date) - new Date(a.date));

    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <button onClick={() => setArticleDetail(null)} className={`p-2.5 min-w-[44px] min-h-[44px] flex items-center justify-center rounded-xl ${isDark ? 'hover:bg-slate-700' : 'hover:bg-slate-100'}`}>
            <ArrowLeft size={20} className={textPrimary} />
          </button>
          <div className="flex-1">
            <h2 className={`text-xl font-bold ${textPrimary}`}>{item.nom}</h2>
            <p className={`text-sm ${textMuted}`}>
              {item.reference && <span className="font-mono mr-1">{item.reference} ·</span>}
              {item.categorie} · {item.unite} · TVA {item.tva_rate || item.tva || 20}%
            </p>
            {item.description && <p className={`text-sm ${textMuted} mt-1`}>{item.description}</p>}
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {/* Devis usage badge */}
            {devisUsageMap[item.id] > 0 && (
              <span className={`px-2.5 py-1.5 rounded-lg text-xs font-bold ${isDark ? 'bg-blue-900/30 text-blue-400' : 'bg-blue-50 text-blue-600'}`}>
                <FileText size={12} className="inline mr-1" />
                {devisUsageMap[item.id]} devis
              </span>
            )}
            <button onClick={async () => {
              const clone = { ...item, nom: `${item.nom} (copie)`, favori: false };
              delete clone.id; delete clone.createdAt;
              if (addCatalogueItemProp) {
                const created = await addCatalogueItemProp(clone);
                showToast(`Article dupliqué`, 'success');
                if (created?.id) setArticleDetail(created.id);
              } else {
                const newClone = { ...clone, id: generateId() };
                setCatalogue(prev => [...prev, newClone]);
                showToast(`Article dupliqué`, 'success');
                setArticleDetail(newClone.id);
              }
            }} className={`px-3 py-2 rounded-xl text-sm font-medium ${isDark ? 'bg-slate-700 text-slate-300 hover:bg-slate-600' : 'bg-slate-100 hover:bg-slate-200'}`}>
              <PackagePlus size={14} className="inline mr-1" /> Dupliquer
            </button>
            <button onClick={() => { setArticleDetail(null); startEdit(item); }} className="px-4 py-2 rounded-xl text-sm font-medium" style={{ background: `${couleur}15`, color: couleur }}>
              <Edit3 size={14} className="inline mr-1" /> Modifier
            </button>
            {/* Créer devis button */}
            {setPage && (
              <button onClick={() => {
                // Navigate to devis with this article prefilled
                if (setPage) setPage('devis');
                showToast(`Article "${item.nom}" prêt pour ajout au devis`, 'success');
              }} className="px-4 py-2 rounded-xl text-sm font-medium text-white flex items-center gap-1.5 shadow-md" style={{ background: '#22c55e' }}>
                <FileText size={14} /> Créer devis
              </button>
            )}
          </div>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: 'Prix vente', value: modeDiscret ? '·····' : `${item.prix}€`, sub: `/${item.unite}`, color: couleur },
            { label: 'Prix achat', value: modeDiscret ? '·····' : `${item.prixAchat || '—'}€`, sub: !modeDiscret && item.prixAchat ? `/${item.unite}` : '', color: '#3b82f6' },
            { label: 'Marge', value: modeDiscret ? '·····' : (marge !== null ? `${marge.toFixed(0)}%` : '—'), sub: !modeDiscret && marge !== null ? `${(item.prix - (item.prixAchat || 0)).toFixed(2)}€/u` : '', color: marge >= 25 ? '#22c55e' : '#ef4444' },
            { label: 'Stock', value: item.stock_actuel !== undefined ? item.stock_actuel.toString() : '—', sub: item.stock_seuil_alerte ? `Min: ${item.stock_seuil_alerte}` : '', color: (item.stock_actuel !== undefined && item.stock_seuil_alerte && item.stock_actuel < item.stock_seuil_alerte) ? '#ef4444' : '#8b5cf6' }
          ].map((kpi, i) => (
            <div key={i} className={`${cardBg} rounded-xl border p-4`}>
              <p className={`text-xs ${textMuted} mb-1`}>{kpi.label}</p>
              <p className="text-2xl font-bold" style={{ color: kpi.color }}>{kpi.value}</p>
              {kpi.sub && <p className={`text-xs ${textMuted}`}>{kpi.sub}</p>}
            </div>
          ))}
        </div>

        {/* Fournisseurs comparateur */}
        <div className={`${cardBg} rounded-2xl border p-5`}>
          <div className="flex items-center justify-between mb-3">
            <h3 className={`font-semibold flex items-center gap-2 ${textPrimary}`}><Truck size={16} style={{ color: couleur }} /> Fournisseurs ({itemFournisseurs.length})</h3>
            <button onClick={() => {
              const fId = prompt('ID ou nom du fournisseur à lier ?');
              const found = fournisseurs.find(f => f.nom.toLowerCase().includes((fId || '').toLowerCase()));
              if (found) {
                const prix = prompt('Prix achat chez ce fournisseur ?');
                linkArticleFournisseur(item.id, found.id, prix);
                showToast(`Lié à ${found.nom}`, 'success');
              } else {
                showToast('Fournisseur non trouvé — créez-le dans l\'onglet Fournisseurs', 'error');
              }
            }} className={`text-xs px-3 py-1.5 rounded-lg ${isDark ? 'bg-slate-700 text-slate-300' : 'bg-slate-100 text-slate-600'}`}>
              + Lier fournisseur
            </button>
          </div>
          {itemFournisseurs.length === 0 ? (
            <p className={`text-sm ${textMuted} text-center py-4`}>Aucun fournisseur lié — ajoutez-en via le bouton ci-dessus</p>
          ) : (
            <div className="space-y-2">
              {itemFournisseurs.sort((a, b) => a.prixAchat - b.prixAchat).map((af, idx) => (
                <div key={af.id} className={`flex items-center gap-3 p-3 rounded-xl ${idx === 0 ? (isDark ? 'bg-emerald-900/20 border border-emerald-800' : 'bg-emerald-50 border border-emerald-200') : (isDark ? 'bg-slate-700/50' : 'bg-slate-50')}`}>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <p className={`font-medium text-sm ${textPrimary}`}>{af.fournisseur.nom}</p>
                      {idx === 0 && <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500 text-white">Meilleur prix</span>}
                    </div>
                    <p className={`text-xs ${textMuted}`}>{af.fournisseur.telephone || af.fournisseur.email || '—'} · Délai {af.fournisseur.delaiLivraison || '?'}j</p>
                  </div>
                  <p className="text-lg font-bold" style={{ color: idx === 0 ? '#22c55e' : couleur }}>{af.prixAchat}€</p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Historique prix */}
        {itemHistory.length > 0 && (
          <div className={`${cardBg} rounded-2xl border p-5`}>
            <h3 className={`font-semibold flex items-center gap-2 mb-3 ${textPrimary}`}><History size={16} style={{ color: couleur }} /> Historique prix</h3>
            <div className="space-y-2">
              {itemHistory.map(h => (
                <div key={h.id} className={`flex items-center justify-between py-2 border-b last:border-0 ${isDark ? 'border-slate-700' : 'border-slate-100'}`}>
                  <span className={`text-sm ${textMuted}`}>{new Date(h.date).toLocaleDateString('fr-FR')}</span>
                  <div className="flex items-center gap-4">
                    <span className={`text-sm ${textPrimary}`}>Vente: {h.prixVente}€</span>
                    <span className={`text-sm ${textMuted}`}>Achat: {h.prixAchat}€</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Mouvements récents */}
        <div className={`${cardBg} rounded-2xl border p-5`}>
          <h3 className={`font-semibold flex items-center gap-2 mb-3 ${textPrimary}`}><ArrowRightLeft size={16} style={{ color: couleur }} /> Mouvements récents</h3>
          {itemMouvements.length === 0 ? (
            <p className={`text-sm ${textMuted} text-center py-4`}>Aucun mouvement enregistré</p>
          ) : (
            <div className="space-y-2">
              {itemMouvements.map(m => (
                <div key={m.id} className={`flex items-center gap-3 py-2 border-b last:border-0 ${isDark ? 'border-slate-700' : 'border-slate-100'}`}>
                  <span className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold ${m.type === 'in' ? 'bg-emerald-100 text-emerald-700' : m.type === 'out' ? 'bg-red-100 text-red-700' : m.type === 'return' ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-600'}`}>
                    {m.type === 'in' ? '📥' : m.type === 'out' ? '📤' : m.type === 'return' ? '↩️' : '⚖️'}
                  </span>
                  <div className="flex-1">
                    <p className={`text-sm font-medium ${textPrimary}`}>{m.type === 'in' ? 'Entrée' : m.type === 'out' ? 'Sortie' : m.type === 'return' ? 'Retour' : 'Ajustement'} — {m.quantite} unités</p>
                    <p className={`text-xs ${textMuted}`}>{m.raison || '—'} · {new Date(m.date).toLocaleDateString('fr-FR')}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  // ====== FORM VIEW ======
  if (show) return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <button onClick={() => { setShow(false); setEditId(null); }} className={`p-2.5 min-w-[44px] min-h-[44px] flex items-center justify-center rounded-xl ${isDark ? 'hover:bg-slate-700' : 'hover:bg-slate-100'}`}>
          <ArrowLeft size={20} className={textPrimary} />
        </button>
        <h2 className={`text-2xl font-bold ${textPrimary}`}>{editId ? 'Modifier' : 'Nouvel'} article</h2>
      </div>
      <div className={`${cardBg} rounded-2xl border p-6`}>
        <div className="space-y-4">
          <div>
            <label className={`block text-sm font-medium mb-1 ${textPrimary}`}>Nom *</label>
            <input className={`w-full px-4 py-2.5 border rounded-xl ${inputBg}`} value={form.nom} onChange={e => setForm(p => ({...p, nom: e.target.value}))} placeholder="Ex: Tube PER 16mm, Câble R2V 3G2.5..." />
            {duplicateSuggestions.length > 0 && (
              <div className={`mt-2 p-3 rounded-xl text-sm ${isDark ? 'bg-amber-900/20 border border-amber-700' : 'bg-amber-50 border border-amber-200'}`}>
                <p className="text-amber-600 font-medium flex items-center gap-1 mb-1"><AlertTriangle size={14} /> Articles similaires :</p>
                {duplicateSuggestions.map(s => (
                  <p key={s.id} className={`text-xs ${textMuted} ml-5`}>• {s.nom} ({s.categorie}, {s.prix}€/{s.unite})</p>
                ))}
              </div>
            )}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div><label className={`block text-sm font-medium mb-1 ${textPrimary}`}>Référence / SKU</label><input className={`w-full px-4 py-2.5 border rounded-xl ${inputBg}`} value={form.reference} onChange={e => setForm(p => ({...p, reference: e.target.value}))} placeholder="Ex: PLB-TUB-016" /></div>
            <div><label className={`block text-sm font-medium mb-1 ${textPrimary}`}>Description</label><textarea className={`w-full px-4 py-2.5 border rounded-xl resize-none ${inputBg}`} rows={2} value={form.description} onChange={e => setForm(p => ({...p, description: e.target.value}))} placeholder="Description détaillée (optionnel)" /></div>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <label className={`block text-sm font-medium mb-1 ${textPrimary}`}>Prix achat HT</label>
              <input type="number" className={`w-full px-4 py-2.5 border rounded-xl ${inputBg}`} value={form.prixAchat} onChange={e => {
                const pa = e.target.value;
                setForm(p => {
                  const newForm = { ...p, prixAchat: pa };
                  if (p.coefAuto && pa) {
                    const coef = coefficients[p.categorie] || 1.5;
                    newForm.prix = (parseFloat(pa) * coef).toFixed(2);
                  }
                  return newForm;
                });
              }} />
            </div>
            <div>
              <label className={`block text-sm font-medium mb-1 ${textPrimary}`}>
                Prix vente HT *
                {form.coefAuto && <span className={`ml-1 text-xs ${textMuted}`}>(×{coefficients[form.categorie] || 1.5})</span>}
              </label>
              <input type="number" min="0.01" step="0.01" className={`w-full px-4 py-2.5 border rounded-xl ${inputBg}`} value={form.prix} onChange={e => setForm(p => ({...p, prix: e.target.value, coefAuto: false}))} />
            </div>
            <div><label className={`block text-sm font-medium mb-1 ${textPrimary}`}>Unité</label><select className={`w-full px-4 py-2.5 border rounded-xl ${inputBg}`} value={form.unite} onChange={e => setForm(p => ({...p, unite: e.target.value}))}>{UNITES.map(u => <option key={u.value} value={u.value}>{u.label}</option>)}</select></div>
            <div>
              <label className={`block text-sm font-medium mb-1 ${textPrimary}`}>Catégorie</label>
              <select className={`w-full px-4 py-2.5 border rounded-xl ${inputBg}`} value={form.categorie} onChange={e => {
                setForm(p => {
                  const newForm = { ...p, categorie: e.target.value };
                  if (p.coefAuto && p.prixAchat) {
                    const coef = coefficients[e.target.value] || 1.5;
                    newForm.prix = (parseFloat(p.prixAchat) * coef).toFixed(2);
                  }
                  return newForm;
                });
              }}>
                {CATEGORIES.filter(c => c !== 'Tous').map(c => <option key={c}>{c}</option>)}
              </select>
            </div>
          </div>
          {/* TVA Rate */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={`block text-sm font-medium mb-1 ${textPrimary}`}>Taux TVA %</label>
              <select className={`w-full px-4 py-2.5 border rounded-xl ${inputBg}`} value={form.tva_rate} onChange={e => setForm(p => ({...p, tva_rate: e.target.value}))}>
                <option value="20">20% (standard)</option>
                <option value="10">10% (rénovation)</option>
                <option value="5.5">5,5% (rénovation énergétique)</option>
                <option value="2.1">2,1%</option>
                <option value="0">0% (exonéré)</option>
              </select>
            </div>
            <div className={`flex items-end pb-1`}>
              <p className={`text-sm ${textMuted}`}>
                {form.prix ? `TTC: ${(parseFloat(form.prix) * (1 + parseFloat(form.tva_rate || 20) / 100)).toFixed(2)}€` : ''}
              </p>
            </div>
          </div>
          {/* Coefficient toggle */}
          <label className={`flex items-center gap-2 ${textMuted} text-sm cursor-pointer`}>
            <input type="checkbox" checked={form.coefAuto} onChange={e => {
              const checked = e.target.checked;
              setForm(p => {
                const newForm = { ...p, coefAuto: checked };
                if (checked && p.prixAchat) {
                  const coef = coefficients[p.categorie] || 1.5;
                  newForm.prix = (parseFloat(p.prixAchat) * coef).toFixed(2);
                }
                return newForm;
              });
            }} className="rounded" />
            <Percent size={14} /> Prix de vente auto (coefficient ×{coefficients[form.categorie] || 1.5} pour {form.categorie})
          </label>
          {/* Enhanced Marge Preview */}
          {form.prix && form.prixAchat && parseFloat(form.prixAchat) > 0 && (() => {
            const pv = parseFloat(form.prix);
            const pa = parseFloat(form.prixAchat);
            const margePercent = getMargeBrute(pv, pa);
            const margeEuro = pv - pa;
            const coefReel = pa > 0 ? (pv / pa).toFixed(2) : '—';
            const margeColor = margePercent >= 40 ? '#22c55e' : margePercent >= 25 ? '#f59e0b' : '#ef4444';
            const margeLabel = margePercent >= 40 ? 'Excellente' : margePercent >= 25 ? 'Correcte' : 'Faible';
            return (
              <div className={`p-4 rounded-xl border ${isDark ? 'bg-slate-700/50 border-slate-600' : 'bg-slate-50 border-slate-200'}`}>
                <div className="flex items-center justify-between mb-2">
                  <span className={`text-sm font-semibold ${textPrimary}`}>Marge live</span>
                  <span className="text-xs px-2 py-0.5 rounded-full font-bold text-white" style={{ background: margeColor }}>{margeLabel}</span>
                </div>
                <div className="flex items-end gap-4 mb-2">
                  <div>
                    <p className="text-2xl font-bold" style={{ color: margeColor }}>{margePercent?.toFixed(1)}%</p>
                    <p className={`text-xs ${textMuted}`}>{modeDiscret ? '·····' : `${margeEuro.toFixed(2)}€ par ${form.unite}`}</p>
                  </div>
                  <div className={`text-xs ${textMuted}`}>
                    <p>Coef réel: <strong className={textPrimary}>×{coefReel}</strong></p>
                    <p>TTC: <strong className={textPrimary}>{modeDiscret ? '·····' : `${(pv * (1 + parseFloat(form.tva_rate || 20) / 100)).toFixed(2)}€`}</strong></p>
                  </div>
                </div>
                {/* Progress bar */}
                <div className={`w-full h-2 rounded-full ${isDark ? 'bg-slate-600' : 'bg-slate-200'}`}>
                  <div className="h-full rounded-full transition-all duration-300" style={{ width: `${Math.min(margePercent, 100)}%`, background: margeColor }} />
                </div>
                {/* Benchmarks */}
                <div className={`flex justify-between mt-1 text-[10px] ${textMuted}`}>
                  <span>0%</span><span>25% min</span><span>40% bon</span><span>60%+</span>
                </div>
              </div>
            );
          })()}
          <div className="grid grid-cols-2 gap-4">
            <div><label className={`block text-sm font-medium mb-1 ${textPrimary}`}>Stock actuel</label><input type="number" className={`w-full px-4 py-2.5 border rounded-xl ${inputBg}`} value={form.stock_actuel} onChange={e => setForm(p => ({...p, stock_actuel: e.target.value}))} placeholder="Optionnel" /></div>
            <div><label className={`block text-sm font-medium mb-1 ${textPrimary}`}>Stock minimum</label><input type="number" className={`w-full px-4 py-2.5 border rounded-xl ${inputBg}`} value={form.stock_seuil_alerte} onChange={e => setForm(p => ({...p, stock_seuil_alerte: e.target.value}))} placeholder="Optionnel" /></div>
          </div>
          <label className={`flex items-center gap-3 cursor-pointer py-2 ${textPrimary}`}>
            <div className="relative">
              <input type="checkbox" checked={form.favori} onChange={e => setForm(p => ({...p, favori: e.target.checked}))} className="sr-only peer" />
              <div className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors peer-checked:border-amber-500 peer-checked:bg-amber-500 ${isDark ? 'border-slate-600 bg-slate-700' : 'border-slate-300 bg-white'}`}>
                {form.favori && <Star size={12} className="text-white" fill="currentColor" />}
              </div>
            </div>
            <Star size={16} className="text-amber-500" fill={form.favori ? "currentColor" : "none"} /> Favori
          </label>
        </div>
        <div className={`flex justify-end gap-3 mt-6 pt-6 border-t ${isDark ? 'border-slate-700' : ''}`}>
          <button onClick={() => setShow(false)} className={`px-4 py-2.5 rounded-xl min-h-[44px] ${isDark ? 'bg-slate-700 text-slate-300' : 'bg-slate-100'}`}>Annuler</button>
          <button onClick={submit} className="px-6 py-2.5 text-white rounded-xl min-h-[44px] flex items-center gap-2" style={{background: couleur}}>
            {editId ? <Edit3 size={16} /> : <Plus size={16} />} {editId ? 'Enregistrer' : 'Ajouter'}
          </button>
        </div>
      </div>
    </div>
  );

  // ====== INVENTAIRE MODE ======
  if (inventaireMode) {
    const stockItems = catalogue.filter(c => c.stock_actuel !== undefined);
    const counted = Object.keys(inventaireCounts).filter(id => inventaireCounts[id] !== catalogue.find(c => c.id === id)?.stock_actuel).length;
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={() => setInventaireMode(false)} className={`p-2.5 rounded-xl ${isDark ? 'hover:bg-slate-700' : 'hover:bg-slate-100'}`}><ArrowLeft size={20} className={textPrimary} /></button>
            <div>
              <h2 className={`text-xl font-bold ${textPrimary}`}>Mode Inventaire</h2>
              <p className={`text-sm ${textMuted}`}>{Object.keys(inventaireCounts).length} articles à compter · {counted} écart{counted > 1 ? 's' : ''}</p>
            </div>
          </div>
          <button onClick={finishInventaire} className="px-5 py-2.5 text-white rounded-xl font-medium flex items-center gap-2 shadow-lg" style={{ background: couleur }}>
            <Check size={16} /> Terminer
          </button>
        </div>

        {/* Progress */}
        <div className={`w-full h-2 rounded-full ${isDark ? 'bg-slate-700' : 'bg-slate-200'}`}>
          <div className="h-full rounded-full transition-all" style={{ width: `${(Object.keys(inventaireCounts).length / Math.max(stockItems.length, 1)) * 100}%`, background: couleur }} />
        </div>

        <div className="space-y-2">
          {stockItems.map(item => {
            const sysStock = item.stock_actuel;
            const counted = inventaireCounts[item.id] ?? sysStock;
            const diff = counted - sysStock;
            return (
              <div key={item.id} className={`${cardBg} rounded-xl border p-4 flex items-center gap-4`}>
                <div className="flex-1 min-w-0">
                  <p className={`font-medium ${textPrimary}`}>{item.nom}</p>
                  <p className={`text-xs ${textMuted}`}>Stock système: {sysStock} {item.unite}</p>
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={() => setInventaireCounts(p => ({...p, [item.id]: Math.max(0, (p[item.id] ?? sysStock) - 1)}))} className={`w-10 h-10 rounded-lg flex items-center justify-center ${isDark ? 'bg-slate-700 hover:bg-slate-600' : 'bg-slate-100 hover:bg-slate-200'}`}><Minus size={16} className={textMuted} /></button>
                  <input type="number" value={counted} onChange={e => setInventaireCounts(p => ({...p, [item.id]: Math.max(0, parseInt(e.target.value) || 0)}))} className={`w-16 text-center py-2 border rounded-lg text-lg font-bold ${inputBg}`} />
                  <button onClick={() => setInventaireCounts(p => ({...p, [item.id]: (p[item.id] ?? sysStock) + 1}))} className={`w-10 h-10 rounded-lg flex items-center justify-center ${isDark ? 'bg-slate-700 hover:bg-slate-600' : 'bg-slate-100 hover:bg-slate-200'}`}><Plus size={16} className={textMuted} /></button>
                </div>
                {diff !== 0 && (
                  <span className={`text-sm font-bold ${diff > 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                    {diff > 0 ? '+' : ''}{diff}
                  </span>
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  // ====== ONBOARDING: Catalogue vide + import BTP ======
  if (catalogue.length === 0 && !onboardingDismissed && !show && !showArticlePicker) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          {setPage && (
            <button onClick={() => setPage('dashboard')} className={`p-2.5 rounded-xl min-w-[44px] min-h-[44px] flex items-center justify-center ${isDark ? 'hover:bg-slate-700 text-slate-400' : 'hover:bg-slate-100 text-slate-500'}`}>
              <ArrowLeft size={20} />
            </button>
          )}
          <h1 className={`text-2xl font-bold ${textPrimary}`}>Catalogue</h1>
        </div>

        {!onboardingStep && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className={`${cardBg} rounded-2xl border p-8 text-center`}>
            <div className="w-24 h-24 mx-auto mb-6 rounded-3xl flex items-center justify-center shadow-xl" style={{ background: `linear-gradient(135deg, ${couleur}, ${couleur}dd)` }}>
              <Package size={48} className="text-white" />
            </div>
            <h2 className={`text-2xl font-bold mb-2 ${textPrimary}`}>Bienvenue dans votre Catalogue</h2>
            <p className={`text-sm ${textMuted} mb-8 max-w-md mx-auto`}>
              Centralisez vos matériaux, tarifs et marges. Commencez en important des articles depuis notre référentiel BTP ou ajoutez-les manuellement.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <button onClick={() => setOnboardingStep('metiers')} className="px-8 py-4 text-white rounded-2xl font-semibold flex items-center justify-center gap-3 shadow-xl hover:shadow-2xl transition-all text-lg" style={{ background: couleur }}>
                <Sparkles size={22} /> Importer le Référentiel BTP
              </button>
              <button onClick={() => setShow(true)} className={`px-6 py-4 rounded-2xl font-medium flex items-center justify-center gap-2 border-2 transition-all ${isDark ? 'text-slate-300 border-slate-600 hover:bg-slate-700' : 'text-slate-700 border-slate-200 hover:bg-slate-50'}`}>
                <Plus size={18} /> Ajouter manuellement
              </button>
            </div>
            <button onClick={() => { setOnboardingDismissed(true); localStorage.setItem('cp_catalogue_onboarding_dismissed', 'true'); }} className={`mt-4 text-xs ${textMuted} hover:underline`}>
              Passer l'onboarding
            </button>
          </motion.div>
        )}

        {onboardingStep === 'metiers' && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className={`${cardBg} rounded-2xl border p-6`}>
            <div className="flex items-center gap-3 mb-2">
              <button onClick={() => setOnboardingStep(null)} className={`p-2 rounded-xl ${isDark ? 'hover:bg-slate-700' : 'hover:bg-slate-100'}`}>
                <ArrowLeft size={18} className={textMuted} />
              </button>
              <h2 className={`text-xl font-bold ${textPrimary}`}>Choisissez vos métiers</h2>
            </div>
            <p className={`text-sm ${textMuted} mb-6`}>Sélectionnez un ou plusieurs métiers pour importer les articles correspondants.</p>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 mb-6">
              {CATEGORIES_METIERS.map(cat => {
                const isSelected = selectedMetiers.includes(cat.id);
                const sousCount = getSousCategories(cat.id).reduce((s, sc) => s + sc.articlesCount, 0);
                return (
                  <button key={cat.id} onClick={() => setSelectedMetiers(prev => isSelected ? prev.filter(id => id !== cat.id) : [...prev, cat.id])}
                    className={`relative p-4 rounded-xl border-2 text-center transition-all hover:scale-[1.02] ${isSelected ? 'shadow-lg' : isDark ? 'border-slate-600 hover:border-slate-500' : 'border-slate-200 hover:border-slate-300'}`}
                    style={isSelected ? { borderColor: couleur, background: `${couleur}10` } : {}}>
                    {isSelected && <div className="absolute top-2 right-2 w-5 h-5 rounded-full flex items-center justify-center text-white" style={{ background: couleur }}><Check size={12} /></div>}
                    <div className="text-3xl mb-2">{cat.icon}</div>
                    <p className={`font-medium text-sm ${textPrimary}`}>{cat.nom}</p>
                    <p className={`text-[10px] ${textMuted}`}>{sousCount} articles</p>
                  </button>
                );
              })}
            </div>
            <div className="flex items-center justify-between">
              <p className={`text-sm ${textMuted}`}>
                {selectedMetiers.length > 0 ? `${selectedMetiers.length} métier${selectedMetiers.length > 1 ? 's' : ''} sélectionné${selectedMetiers.length > 1 ? 's' : ''}` : 'Aucun métier sélectionné'}
              </p>
              <button onClick={() => handleBulkImport(selectedMetiers)} disabled={selectedMetiers.length === 0}
                className="px-6 py-3 text-white rounded-xl font-semibold flex items-center gap-2 shadow-lg disabled:opacity-40 transition-all"
                style={{ background: couleur }}>
                <Download size={18} /> Importer {selectedMetiers.length > 0 ? `(${selectedMetiers.reduce((s, id) => s + getSousCategories(id).reduce((ss, sc) => ss + sc.articlesCount, 0), 0)} articles)` : ''}
              </button>
            </div>
          </motion.div>
        )}

        {onboardingStep === 'importing' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className={`${cardBg} rounded-2xl border p-12 text-center`}>
            <div className="w-16 h-16 mx-auto mb-6 rounded-2xl flex items-center justify-center animate-pulse" style={{ background: `${couleur}20` }}>
              <Download size={32} style={{ color: couleur }} />
            </div>
            <h3 className={`text-xl font-bold mb-2 ${textPrimary}`}>Import en cours...</h3>
            <p className={`text-sm ${textMuted} mb-6`}>Ajout des articles depuis le Référentiel BTP</p>
            <div className={`w-full max-w-md mx-auto h-3 rounded-full ${isDark ? 'bg-slate-700' : 'bg-slate-200'}`}>
              <motion.div className="h-full rounded-full" style={{ background: couleur }} initial={{ width: 0 }} animate={{ width: `${importProgress}%` }} transition={{ ease: 'easeOut' }} />
            </div>
            <p className="text-sm font-bold mt-3" style={{ color: couleur }}>{importProgress}%</p>
          </motion.div>
        )}

        {onboardingStep === 'done' && (
          <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className={`${cardBg} rounded-2xl border p-12 text-center`}>
            <div className="w-16 h-16 mx-auto mb-4 rounded-full flex items-center justify-center bg-emerald-500 text-white">
              <Check size={32} />
            </div>
            <h3 className={`text-xl font-bold mb-2 ${textPrimary}`}>Import terminé !</h3>
            <p className={`text-sm ${textMuted}`}>Votre catalogue est prêt. Vous pouvez maintenant personnaliser les prix et marges.</p>
          </motion.div>
        )}

        {/* Quick CSV import option */}
        <div className={`p-4 rounded-xl border flex items-center justify-between ${isDark ? 'bg-slate-800/50 border-slate-700' : 'bg-slate-50 border-slate-200'}`}>
          <div className="flex items-center gap-3">
            <FileSpreadsheet size={20} className={textMuted} />
            <div>
              <p className={`text-sm font-medium ${textPrimary}`}>Vous avez déjà un catalogue ?</p>
              <p className={`text-xs ${textMuted}`}>Importez votre fichier CSV existant</p>
            </div>
          </div>
          <button onClick={() => fileInputRef.current?.click()} className={`px-4 py-2 rounded-lg text-sm font-medium ${isDark ? 'bg-slate-700 text-slate-300 hover:bg-slate-600' : 'bg-white border border-slate-200 hover:bg-slate-100'}`}>
            <Upload size={14} className="inline mr-1.5" /> Import CSV
          </button>
          <input type="file" ref={fileInputRef} accept=".csv,.txt" onChange={handleFileUpload} className="hidden" />
        </div>
      </div>
    );
  }

  // ====== MAIN VIEW ======
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center flex-wrap gap-4">
        <div className="flex items-center gap-3">
          {setPage && (
            <button onClick={() => setPage('dashboard')} className={`p-2.5 rounded-xl min-w-[44px] min-h-[44px] flex items-center justify-center ${isDark ? 'hover:bg-slate-700 text-slate-400' : 'hover:bg-slate-100 text-slate-500'}`}>
              <ArrowLeft size={20} />
            </button>
          )}
          <h1 className={`text-2xl font-bold ${textPrimary}`}>Catalogue ({catalogue.length})</h1>
        </div>
        <div className="flex gap-2 flex-wrap">
          <input type="file" ref={fileInputRef} accept=".csv,.txt" onChange={handleFileUpload} className="hidden" />
          <button onClick={() => fileInputRef.current?.click()} className={`w-11 h-11 rounded-xl flex items-center justify-center ${isDark ? 'bg-slate-700 text-slate-300 hover:bg-slate-600' : 'bg-slate-100 hover:bg-slate-200'}`} title="Import CSV">
            <Upload size={16} />
          </button>
          <button onClick={exportCSV} className={`w-11 h-11 rounded-xl flex items-center justify-center ${isDark ? 'bg-slate-700 text-slate-300 hover:bg-slate-600' : 'bg-slate-100 hover:bg-slate-200'}`} title="Export CSV">
            <Download size={16} />
          </button>
          {/* Barcode Scanner button */}
          <button onClick={startScanner} className={`w-11 h-11 rounded-xl flex items-center justify-center ${isDark ? 'bg-slate-700 text-slate-300 hover:bg-slate-600' : 'bg-slate-100 hover:bg-slate-200'}`} title="Scanner code-barres">
            <Camera size={16} />
          </button>
          <button onClick={() => setShowArticlePicker(true)} className={`w-11 h-11 sm:w-auto sm:h-11 sm:px-4 rounded-xl flex items-center justify-center sm:gap-2 border-2 font-medium ${isDark ? 'bg-slate-800 text-white hover:bg-slate-700' : 'bg-white hover:bg-slate-50'}`} style={{borderColor: couleur, color: couleur}}>
            <Sparkles size={16} /><span className="hidden sm:inline">Référentiel BTP</span>
          </button>
          <button onClick={() => setShow(true)} className="w-11 h-11 sm:w-auto sm:h-11 sm:px-4 text-white rounded-xl flex items-center justify-center sm:gap-2 shadow-lg" style={{background: couleur}}>
            <Plus size={16} /><span className="hidden sm:inline">Ajouter</span>
          </button>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className={`p-1.5 rounded-2xl relative ${isDark ? 'bg-slate-800' : 'bg-slate-100'}`}>
        <div className={`absolute right-0 top-0 bottom-0 w-8 pointer-events-none z-10 rounded-r-2xl bg-gradient-to-l ${isDark ? 'from-slate-800' : 'from-slate-100'} sm:hidden`} />
        <div className="flex gap-1 overflow-x-auto scrollbar-hide" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
          {[
            { key: 'catalogue', label: 'Articles', icon: Package, count: catalogue.length },
            { key: 'fournisseurs', label: 'Fournisseurs', icon: Truck, count: fournisseurs.length },
            { key: 'mouvements', label: 'Mouvements', icon: ArrowRightLeft, count: mouvements.length },
            { key: 'packs', label: 'Packs', icon: Layers, count: packs.length },
            { key: 'favoris', label: 'Favoris', icon: Star, count: favoris.length },
            { key: 'inventaire', label: 'Inventaire', icon: ClipboardList },
            { key: 'parametres', label: 'Coefs', icon: Settings }
          ].map(({ key, label, icon: Icon, count }) => (
            <button key={key} onClick={() => setActiveTab(key)} className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-medium whitespace-nowrap min-h-[44px] transition-all ${activeTab === key ? 'text-white shadow-lg' : isDark ? 'text-slate-400 hover:text-slate-200' : 'text-slate-500 hover:text-slate-700'}`} style={activeTab === key ? { background: couleur } : {}}>
              <Icon size={16} />
              <span className="hidden sm:inline">{label}</span>
              {count !== undefined && count > 0 && (
                <span className={`min-w-[20px] h-5 px-1.5 rounded-full text-xs font-bold flex items-center justify-center ${activeTab === key ? 'bg-white/20 text-white' : isDark ? 'bg-slate-600 text-slate-300' : 'bg-slate-200 text-slate-600'}`}>{count}</span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* ====== ARTICLES TAB ====== */}
      {activeTab === 'catalogue' && (
        <>
          {/* Catalogue Stats */}
          {catalogue.length > 0 && (
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
              {(() => {
                const totalArticles = catalogue.length;
                const stockItems = catalogue.filter(c => (c.stock_actuel ?? c.stock) != null && (c.stock_actuel ?? c.stock) > 0);
                const totalStockValue = stockItems.reduce((s, c) => s + (c.prixAchat || 0) * (c.stock_actuel ?? c.stock ?? 0), 0);
                const avgMargin = (() => {
                  const withMargin = catalogue.filter(c => c.prix > 0 && c.prixAchat != null);
                  if (withMargin.length === 0) return null;
                  return withMargin.reduce((s, c) => {
                    if (c.prixAchat === 0) return s + 100; // Main d'œuvre = 100% marge
                    return s + ((c.prix - c.prixAchat) / c.prix) * 100;
                  }, 0) / withMargin.length;
                })();
                return [
                  { label: 'Articles', value: totalArticles, color: couleur },
                  { label: 'Valeur stock', value: modeDiscret ? '·····' : (totalStockValue > 0 ? `${(totalStockValue / 1000).toFixed(1)}k€` : '—'), color: '#3b82f6' },
                  { label: 'Marge moy.', value: modeDiscret ? '·····' : (avgMargin ? `${avgMargin.toFixed(0)}%` : '—'), color: avgMargin && avgMargin >= 25 ? '#22c55e' : '#f59e0b' },
                  { label: 'Stock bas', value: alertesStock.length, color: alertesStock.length > 0 ? '#ef4444' : '#22c55e' },
                  { label: 'Favoris', value: favoris.length, color: '#f59e0b' },
                ].map((s, i) => (
                  <div key={i} className={`p-3 rounded-xl border ${isDark ? 'bg-slate-800/50 border-slate-700' : 'bg-white border-slate-200'}`}>
                    <p className={`text-[11px] font-medium ${textMuted}`}>{s.label}</p>
                    <p className="text-xl font-bold" style={{ color: s.color }}>{s.value}</p>
                  </div>
                ));
              })()}
            </div>
          )}

          {/* Enhanced Stock alerts with notification toggle */}
          {alertesStock.length > 0 && !stockAlertsDismissed && (
            <div className={`rounded-2xl p-4 ${isDark ? 'bg-red-900/30 border border-red-700' : 'bg-red-50 border border-red-200'}`}>
              <div className="flex items-center justify-between mb-3">
                <span className="text-red-600 dark:text-red-400 font-semibold flex items-center gap-2"><AlertTriangle size={18} /> {alertesStock.length} article{alertesStock.length > 1 ? 's' : ''} en stock bas</span>
                <div className="flex items-center gap-2">
                  <button onClick={() => {
                    if ('Notification' in window && Notification.permission === 'default') {
                      Notification.requestPermission().then(p => {
                        if (p === 'granted') { setStockAlertsEnabled(true); showToast('Notifications stock activées', 'success'); }
                      });
                    } else {
                      setStockAlertsEnabled(!stockAlertsEnabled);
                    }
                  }} className={`p-1.5 rounded-lg transition-colors ${stockAlertsEnabled ? 'text-red-500' : textMuted}`} title={stockAlertsEnabled ? 'Désactiver alertes' : 'Activer alertes'}>
                    {stockAlertsEnabled ? <Bell size={16} /> : <BellOff size={16} />}
                  </button>
                  <button onClick={() => setStockAlertsDismissed(true)} className={`p-1.5 rounded-lg ${isDark ? 'hover:bg-slate-700' : 'hover:bg-red-100'}`}>
                    <X size={14} className={textMuted} />
                  </button>
                </div>
              </div>
              <div className="flex gap-2 flex-wrap">
                {alertesStock.map(item => (
                  <button key={item.id} onClick={() => setArticleDetail(item.id)} className={`flex items-center gap-2 px-3 py-1.5 rounded-lg shadow-sm transition-all hover:shadow-md ${isDark ? 'bg-slate-700 hover:bg-slate-600' : 'bg-white hover:bg-slate-50'}`}>
                    <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                    <span className={`text-sm font-medium ${textPrimary}`}>{item.nom}</span>
                    <span className="text-xs text-red-500 font-bold">{item.stock_actuel}/{item.stock_seuil_alerte}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Trending articles (auto-favorites based on devis usage) */}
          {trendingArticles.length > 0 && (
            <div className={`rounded-2xl p-4 ${isDark ? 'bg-purple-900/20 border border-purple-800' : 'bg-purple-50 border border-purple-100'}`}>
              <h3 className={`font-semibold mb-3 flex items-center gap-2 ${textPrimary}`}>
                <Zap size={16} className="text-purple-500" /> Tendances ({trendingArticles.length})
                <span className={`text-xs font-normal ${textMuted}`}>— les plus utilisés dans vos devis</span>
              </h3>
              <div className="flex gap-2 flex-wrap">
                {trendingArticles.map(({ id, count, article }) => (
                  <button key={id} onClick={() => setArticleDetail(id)} className={`group flex items-center gap-2 px-3 py-2 rounded-xl shadow-sm border transition-all hover:shadow-md ${isDark ? 'bg-slate-700 border-slate-600 hover:border-purple-500' : 'bg-white border-slate-200 hover:border-purple-300'}`}>
                    <span className={`font-medium text-sm ${textPrimary}`}>{article.nom}</span>
                    <span className="text-purple-600 font-bold text-xs">{count}×</span>
                    <span className="font-semibold text-sm" style={{ color: couleur }}>{article.prix}€</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Favorites */}
          {favoris.length > 0 && (
            <div className={`rounded-2xl p-5 ${isDark ? 'bg-amber-900/30 border border-amber-700' : 'bg-amber-50'}`}>
              <h3 className={`font-semibold mb-3 flex items-center gap-2 ${textPrimary}`}><Star size={18} className="text-amber-500" fill="currentColor" /> Favoris ({favoris.length})</h3>
              <div className="flex gap-2 flex-wrap">
                {favoris.map(item => (
                  <button key={item.id} onClick={() => setArticleDetail(item.id)} className={`group flex items-center gap-2 px-3 py-2 rounded-xl shadow-sm border transition-all hover:shadow-md ${isDark ? 'bg-slate-700 border-slate-600 hover:border-amber-500' : 'bg-white border-slate-200 hover:border-amber-300'}`}>
                    <span className={`font-medium ${textPrimary}`}>{item.nom}</span>
                    <span className="text-amber-600 font-semibold">{item.prix}€</span>
                    <span className={`text-xs ${textMuted}`}>/{item.unite}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Search + Filters */}
          <div className="space-y-3">
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search size={18} className={`absolute left-3 top-1/2 -translate-y-1/2 ${textMuted}`} />
                <input type="text" placeholder="Rechercher (fuzzy)..." value={search} onChange={e => setSearch(e.target.value)} className={`w-full pl-10 pr-4 py-2.5 border rounded-xl ${inputBg}`} />
              </div>
              <button onClick={() => setShowFilters(!showFilters)} className={`px-4 py-2.5 rounded-xl flex items-center gap-2 font-medium transition-all ${showFilters ? 'text-white' : isDark ? 'bg-slate-700 text-slate-300' : 'bg-slate-100 text-slate-600'}`} style={showFilters ? { background: couleur } : {}}>
                <Filter size={16} /> {activeFilters > 0 && `(${activeFilters})`}
              </button>
              <button onClick={() => setShowStock(!showStock)} className={`px-4 py-2.5 rounded-xl flex items-center gap-2 ${showStock ? 'text-white' : isDark ? 'bg-slate-700 text-slate-300' : 'bg-slate-100'}`} style={showStock ? {background: couleur} : {}}>
                <Box size={16} />
              </button>
            </div>

            {/* Filter Panel */}
            <AnimatePresence>
              {showFilters && (
                <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className={`overflow-hidden rounded-xl border p-4 ${cardBg}`}>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    <label className={`flex items-center gap-2 text-sm ${textPrimary} cursor-pointer`}>
                      <input type="checkbox" checked={onlyInStock} onChange={e => setOnlyInStock(e.target.checked)} className="rounded" />
                      En stock uniquement
                    </label>
                    <label className={`flex items-center gap-2 text-sm ${textPrimary} cursor-pointer`}>
                      <input type="checkbox" checked={onlyFavoris} onChange={e => setOnlyFavoris(e.target.checked)} className="rounded" />
                      Favoris uniquement
                    </label>
                    <label className={`flex items-center gap-2 text-sm cursor-pointer ${alertesStock.length > 0 ? 'text-red-500 font-medium' : textPrimary}`}>
                      <input type="checkbox" checked={onlyLowStock} onChange={e => setOnlyLowStock(e.target.checked)} className="rounded" />
                      Stock bas ({alertesStock.length})
                    </label>
                    <div>
                      <label className={`text-xs ${textMuted}`}>Prix min</label>
                      <input type="number" value={priceRange[0] || ''} onChange={e => setPriceRange([parseInt(e.target.value) || 0, priceRange[1]])} className={`w-full px-3 py-1.5 border rounded-lg text-sm ${inputBg}`} placeholder="0€" />
                    </div>
                    <div>
                      <label className={`text-xs ${textMuted}`}>Prix max</label>
                      <input type="number" value={priceRange[1] < 10000 ? priceRange[1] : ''} onChange={e => setPriceRange([priceRange[0], parseInt(e.target.value) || 10000])} className={`w-full px-3 py-1.5 border rounded-lg text-sm ${inputBg}`} placeholder="∞" />
                    </div>
                  </div>
                  {activeFilters > 0 && (
                    <button onClick={() => { setOnlyInStock(false); setOnlyFavoris(false); setOnlyLowStock(false); setPriceRange([0, 10000]); setCatFilter('Tous'); }} className="mt-2 text-xs text-red-500 hover:text-red-600">Réinitialiser les filtres</button>
                  )}
                </motion.div>
              )}
            </AnimatePresence>

            {/* Category chips */}
            <div className="flex gap-2 overflow-x-auto pb-2">
              {CATEGORIES.map(cat => (
                <button key={cat} onClick={() => setCatFilter(cat)} className={`whitespace-nowrap px-3 py-1.5 rounded-lg text-sm font-medium min-h-[36px] transition-colors ${catFilter === cat ? 'text-white shadow-sm' : isDark ? 'bg-slate-700 text-slate-300' : 'bg-slate-100 text-slate-600'}`} style={catFilter === cat ? {background: couleur} : {}}>
                  {cat}
                </button>
              ))}
            </div>
          </div>

          {/* Sort */}
          {catalogue.length > 1 && (
            <div className="flex items-center gap-2 overflow-x-auto pb-1">
              <span className={`text-sm ${textMuted} flex items-center gap-1`}><ArrowUpDown size={14} /> Trier:</span>
              {[{ key: 'name', label: 'Nom' }, { key: 'price', label: 'Prix' }, { key: 'stock', label: 'Stock' }, { key: 'margin', label: 'Marge' }, { key: 'usage', label: 'Plus utilisé' }].map(opt => (
                <button key={opt.key} onClick={() => setSortBy(opt.key)} className={`px-3 py-1.5 rounded-lg text-sm whitespace-nowrap ${sortBy === opt.key ? 'text-white' : isDark ? 'bg-slate-700 text-slate-300' : 'bg-slate-100 text-slate-600'}`} style={sortBy === opt.key ? { background: couleur } : {}}>
                  {opt.label}
                </button>
              ))}
            </div>
          )}

          {/* Table */}
          {filtered.length === 0 ? (
            <div className={`${cardBg} rounded-2xl border p-12 text-center`}>
              <div className="w-20 h-20 mx-auto mb-4 rounded-2xl flex items-center justify-center shadow-lg" style={{ background: `${couleur}20` }}>
                <Package size={40} style={{ color: couleur }} />
              </div>
              <h2 className={`text-xl font-bold mb-2 ${textPrimary}`}>{search || catFilter !== 'Tous' ? 'Aucun article trouvé' : 'Créez votre catalogue'}</h2>
              <p className={`text-sm ${textMuted} mb-4`}>{search || catFilter !== 'Tous' ? 'Modifiez vos filtres ou ajoutez un nouvel article.' : 'Centralisez vos matériaux, tarifs et stocks.'}</p>
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <button onClick={() => setShowArticlePicker(true)} className="px-6 py-3 text-white rounded-xl flex items-center justify-center gap-2 font-medium hover:shadow-lg transition-all" style={{ background: couleur }}>
                  <Sparkles size={18} /> Importer depuis le Référentiel BTP
                </button>
                <button onClick={() => setShow(true)} className={`px-6 py-3 rounded-xl flex items-center justify-center gap-2 border-2 font-medium transition-all ${isDark ? 'text-slate-300 border-slate-600 hover:bg-slate-700' : 'text-slate-700 border-slate-200 hover:bg-slate-50'}`}>
                  <Plus size={18} /> Ajouter manuellement
                </button>
              </div>
            </div>
          ) : (
            <>
            {/* CTA Référentiel BTP when catalogue has few items */}
            {catalogue.length > 0 && catalogue.length < 5 && !search && catFilter === 'Tous' && (
              <div className={`mb-4 p-4 rounded-xl border flex flex-col sm:flex-row items-center justify-between gap-3 ${isDark ? 'bg-slate-800/50 border-slate-700' : 'bg-gradient-to-r from-orange-50 to-amber-50 border-orange-200'}`}>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: `${couleur}20` }}>
                    <Sparkles size={20} style={{ color: couleur }} />
                  </div>
                  <div>
                    <p className={`text-sm font-semibold ${textPrimary}`}>Enrichissez votre catalogue</p>
                    <p className={`text-xs ${textMuted}`}>Importez des articles depuis le référentiel BTP pour gagner du temps</p>
                  </div>
                </div>
                <button onClick={() => setShowArticlePicker(true)} className="px-4 py-2 text-white rounded-lg text-sm font-medium flex items-center gap-2 whitespace-nowrap hover:shadow-lg transition-all" style={{ background: couleur }}>
                  <Sparkles size={14} /> Référentiel BTP
                </button>
              </div>
            )}
            <div className={`${cardBg} rounded-2xl border overflow-hidden`}>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className={`border-b ${isDark ? 'bg-slate-700' : 'bg-slate-50'}`}>
                    <tr>
                      <th className={`text-left px-4 py-3 ${textPrimary}`}>Article</th>
                      <th className={`text-right px-4 py-3 w-24 ${textPrimary}`}>Vente</th>
                      <th className={`text-right px-4 py-3 w-24 hidden sm:table-cell ${textPrimary}`}>Achat</th>
                      <th className={`text-right px-4 py-3 w-20 hidden sm:table-cell ${textPrimary}`}>Marge</th>
                      {showStock && <th className={`text-center px-4 py-3 w-28 ${textPrimary}`}>Stock</th>}
                      <th className="w-28"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map(item => {
                      const marge = getMargeBrute(item.prix, item.prixAchat);
                      const stockVal = item.stock_actuel ?? item.stock;
                      const seuilVal = item.stock_seuil_alerte ?? item.stockMin;
                      const stockLow = stockVal != null && seuilVal != null && seuilVal > 0 && stockVal < seuilVal;
                      return (
                        <tr key={item.id} className={`border-b last:border-0 transition-colors cursor-pointer ${isDark ? 'hover:bg-slate-700/70' : 'hover:bg-slate-100'}`} onClick={() => setArticleDetail(item.id)}>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-3">
                              <button onClick={(e) => { e.stopPropagation(); toggleFavori(item.id); }} className={`w-11 h-11 min-w-[44px] min-h-[44px] flex items-center justify-center rounded-lg ${isDark ? 'hover:bg-slate-600' : 'hover:bg-slate-100'}`}>
                                <Star size={18} className={item.favori ? 'text-amber-500' : textMuted} fill={item.favori ? 'currentColor' : 'none'} />
                              </button>
                              <div>
                                <div className="flex items-center gap-2">
                                  <p className={`font-medium ${textPrimary}`}>{item.nom}</p>
                                  {stockLow && <span className="w-2 h-2 rounded-full bg-red-500" />}
                                  {devisUsageMap[item.id] > 0 && (
                                    <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold ${isDark ? 'bg-blue-900/30 text-blue-400' : 'bg-blue-50 text-blue-600'}`}>
                                      {devisUsageMap[item.id]} devis
                                    </span>
                                  )}
                                  {item.tva_rate && item.tva_rate !== 20 && <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${isDark ? 'bg-blue-900/40 text-blue-300' : 'bg-blue-50 text-blue-600'}`}>TVA {item.tva_rate}%</span>}
                                </div>
                                <p className={`text-xs ${textMuted}`}>
                                  {item.reference && <span className="font-mono mr-1.5">{item.reference} ·</span>}
                                  {item.categorie} · {item.unite}
                                </p>
                              </div>
                            </div>
                          </td>
                          <td className={`px-4 py-3 text-right font-medium ${textPrimary}`}>{fmtPriceShort(item.prix)}</td>
                          <td className={`px-4 py-3 text-right hidden sm:table-cell ${textMuted}`}>{modeDiscret ? '·····' : (item.prixAchat != null ? `${item.prixAchat}€` : '—')}</td>
                          <td className="px-4 py-3 text-right hidden sm:table-cell"><span className={getMargeColor(marge)}>{modeDiscret ? '·····' : (marge !== null ? `${marge.toFixed(0)}%` : '—')}</span></td>
                          {showStock && (
                            <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                              {(item.stock_actuel ?? item.stock) != null ? (
                                <div className="flex items-center justify-center gap-1">
                                  <button onClick={() => decrementStock(item.id)} className={`p-2.5 min-w-[44px] min-h-[44px] rounded-lg flex items-center justify-center ${isDark ? 'hover:bg-slate-600' : 'hover:bg-slate-100'}`}><Minus size={16} className={textMuted} /></button>
                                  <input type="number" value={item.stock_actuel ?? item.stock} onChange={e => updateStock(item.id, e.target.value)} className={`w-14 px-1 py-1 border rounded text-center text-sm ${inputBg}`} />
                                  <button onClick={() => incrementStock(item.id)} className={`p-2.5 min-w-[44px] min-h-[44px] rounded-lg flex items-center justify-center ${isDark ? 'hover:bg-slate-600' : 'hover:bg-slate-100'}`}><Plus size={16} className={textMuted} /></button>
                                </div>
                              ) : (
                                <span className={`text-xs px-2 py-1 rounded ${isDark ? 'bg-slate-700 text-slate-400' : 'bg-slate-100 text-slate-400'}`}>Non géré</span>
                              )}
                            </td>
                          )}
                          <td className="px-4 py-3">
                            <div className="flex items-center justify-center gap-1">
                              <button onClick={(e) => { e.stopPropagation(); startEdit(item); }} className={`p-2.5 min-w-[44px] min-h-[44px] rounded-lg flex items-center justify-center ${isDark ? 'hover:bg-blue-900/40 text-slate-400 hover:text-blue-400' : 'hover:bg-blue-50 text-slate-500 hover:text-blue-600'}`}><Edit3 size={18} /></button>
                              <button onClick={(e) => { e.stopPropagation(); deleteItem(item.id); }} className={`p-2.5 min-w-[44px] min-h-[44px] rounded-lg flex items-center justify-center ${isDark ? 'text-slate-400 hover:text-red-400 hover:bg-red-900/40' : 'text-slate-500 hover:text-red-600 hover:bg-red-50'}`}><Trash2 size={18} /></button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
            </>
          )}
        </>
      )}

      {/* ====== FOURNISSEURS TAB ====== */}
      {activeTab === 'fournisseurs' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className={`text-sm ${textMuted}`}>{fournisseurs.length} fournisseur{fournisseurs.length > 1 ? 's' : ''}</p>
            <button onClick={() => setShowFournisseurForm(true)} className="px-4 py-2.5 text-white rounded-xl text-sm font-medium flex items-center gap-2 shadow-md" style={{ background: couleur }}><Plus size={16} /> Ajouter</button>
          </div>

          {fournisseurs.length === 0 ? (
            <div className={`${cardBg} rounded-2xl border p-12 text-center`}>
              <Truck size={40} className={`mx-auto mb-3 ${textMuted}`} />
              <p className={`font-medium ${textPrimary}`}>Aucun fournisseur</p>
              <p className={`text-sm ${textMuted} mt-1`}>Ajoutez vos fournisseurs pour comparer les prix</p>
            </div>
          ) : (
            <div className="grid gap-3">
              {fournisseurs.map(f => {
                const links = articleFournisseurs.filter(af => af.fournisseurId === f.id);
                const linkedArticles = links.length;
                return (
                  <div key={f.id} className={`${cardBg} rounded-xl border p-4`}>
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-xl flex items-center justify-center text-white font-bold flex-shrink-0" style={{ background: couleur }}>
                        {f.nom.charAt(0).toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className={`font-semibold ${textPrimary}`}>{f.nom}</p>
                        <p className={`text-xs ${textMuted}`}>
                          {f.telephone || ''}
                          {f.telephone && (f.email || f.contact) ? ' · ' : ''}
                          {f.email || f.contact || ''}
                        </p>
                        <div className="flex items-center gap-2 mt-1 flex-wrap">
                          {f.delaiLivraison && <span className={`text-[10px] px-1.5 py-0.5 rounded ${isDark ? 'bg-slate-600 text-slate-300' : 'bg-slate-100 text-slate-600'}`}>Délai {f.delaiLivraison}j</span>}
                          {f.conditions && <span className={`text-[10px] px-1.5 py-0.5 rounded ${isDark ? 'bg-slate-600 text-slate-300' : 'bg-slate-100 text-slate-600'}`}>{f.conditions}</span>}
                          {f.categorie && <span className={`text-[10px] px-1.5 py-0.5 rounded ${isDark ? 'bg-blue-900/30 text-blue-400' : 'bg-blue-50 text-blue-600'}`}>{f.categorie}</span>}
                          <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${linkedArticles > 0 ? isDark ? 'bg-emerald-900/30 text-emerald-400' : 'bg-emerald-50 text-emerald-600' : isDark ? 'bg-slate-600 text-slate-400' : 'bg-slate-100 text-slate-500'}`}>
                            {linkedArticles} article{linkedArticles > 1 ? 's' : ''}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        <button onClick={() => { setFournisseurForm({ nom: f.nom, email: f.email || f.contact || '', telephone: f.telephone || '', adresse: f.adresse || '', delaiLivraison: f.delaiLivraison || '3', conditions: f.conditions || '' }); setEditFournisseurId(f.id); setShowFournisseurForm(true); }} className={`p-2 rounded-lg ${isDark ? 'hover:bg-slate-700' : 'hover:bg-slate-100'}`} title="Modifier"><Edit3 size={16} className={textMuted} /></button>
                        <button onClick={async () => {
                          const confirmed = await confirm({ title: 'Supprimer fournisseur', message: `Supprimer "${f.nom}" et ses liaisons articles ?` });
                          if (confirmed) {
                            setFournisseurs(prev => prev.filter(x => x.id !== f.id));
                            setArticleFournisseurs(prev => prev.filter(af => af.fournisseurId !== f.id));
                            showToast('Fournisseur supprimé', 'success');
                          }
                        }} className={`p-2 rounded-lg ${isDark ? 'hover:bg-red-900/30 text-slate-400 hover:text-red-400' : 'hover:bg-red-50 text-slate-400 hover:text-red-500'}`} title="Supprimer"><Trash2 size={16} /></button>
                      </div>
                    </div>
                    {/* Linked articles list + link button */}
                    <div className={`mt-3 pt-3 border-t ${isDark ? 'border-slate-600' : 'border-slate-200'}`}>
                      {links.length > 0 && (
                        <div className="space-y-1 mb-2">
                          {links.map(af => {
                            const article = catalogue.find(c => c.id === af.articleId);
                            return article ? (
                              <div key={af.id} className={`flex items-center justify-between text-xs ${textMuted}`}>
                                <span>{article.nom} <span className="font-mono">{article.reference || ''}</span></span>
                                <div className="flex items-center gap-2">
                                  <span className={`font-medium ${textPrimary}`}>{(af.prixAchat || article.prixAchat || 0).toFixed(2)} €</span>
                                  <button onClick={() => { setArticleFournisseurs(prev => prev.filter(x => x.id !== af.id)); showToast('Liaison retirée', 'info'); }} className="text-red-400 hover:text-red-500"><X size={12} /></button>
                                </div>
                              </div>
                            ) : null;
                          })}
                        </div>
                      )}
                      <button onClick={() => {
                        const articleId = prompt('Quel article lier ? (tapez un nom)');
                        if (!articleId) return;
                        const found = catalogue.find(c => c.nom.toLowerCase().includes(articleId.toLowerCase()));
                        if (found) {
                          const prix = prompt(`Prix achat de "${found.nom}" chez ${f.nom} ?`, found.prixAchat?.toString() || '0');
                          linkArticleFournisseur(found.id, f.id, prix);
                          showToast(`"${found.nom}" lié à ${f.nom}`, 'success');
                        } else {
                          showToast('Article non trouvé', 'error');
                        }
                      }} className={`text-xs flex items-center gap-1 ${isDark ? 'text-blue-400' : 'text-blue-600'}`}>
                        <Plus size={12} /> Lier un article
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Fournisseur Form Modal */}
          <AnimatePresence>
            {showFournisseurForm && (
              <motion.div className="fixed inset-0 z-50 flex items-center justify-center p-4" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <div className="absolute inset-0 bg-black/50" onClick={() => { setShowFournisseurForm(false); setEditFournisseurId(null); }} />
                <motion.div className={`relative w-full max-w-md rounded-2xl p-6 ${isDark ? 'bg-slate-800' : 'bg-white'} shadow-2xl`} initial={{ scale: 0.9 }} animate={{ scale: 1 }} exit={{ scale: 0.9 }}>
                  <h3 className={`font-bold text-lg mb-4 ${textPrimary}`}>{editFournisseurId ? 'Modifier' : 'Nouveau'} fournisseur</h3>
                  <div className="space-y-3">
                    <input placeholder="Nom *" className={`w-full px-4 py-3 border rounded-xl ${inputBg}`} value={fournisseurForm.nom} onChange={e => setFournisseurForm(p => ({...p, nom: e.target.value}))} />
                    <div className="grid grid-cols-2 gap-3">
                      <input placeholder="Téléphone" className={`px-4 py-3 border rounded-xl ${inputBg}`} value={fournisseurForm.telephone} onChange={e => setFournisseurForm(p => ({...p, telephone: e.target.value}))} />
                      <input placeholder="Email" className={`px-4 py-3 border rounded-xl ${inputBg}`} value={fournisseurForm.email} onChange={e => setFournisseurForm(p => ({...p, email: e.target.value}))} />
                    </div>
                    <input placeholder="Adresse" className={`w-full px-4 py-3 border rounded-xl ${inputBg}`} value={fournisseurForm.adresse} onChange={e => setFournisseurForm(p => ({...p, adresse: e.target.value}))} />
                    <div className="grid grid-cols-2 gap-3">
                      <input type="number" placeholder="Délai livraison (jours)" className={`px-4 py-3 border rounded-xl ${inputBg}`} value={fournisseurForm.delaiLivraison} onChange={e => setFournisseurForm(p => ({...p, delaiLivraison: e.target.value}))} />
                      <input placeholder="Conditions paiement" className={`px-4 py-3 border rounded-xl ${inputBg}`} value={fournisseurForm.conditions} onChange={e => setFournisseurForm(p => ({...p, conditions: e.target.value}))} />
                    </div>
                  </div>
                  <div className="flex gap-3 mt-5">
                    <button onClick={() => { setShowFournisseurForm(false); setEditFournisseurId(null); }} className={`flex-1 py-3 rounded-xl ${isDark ? 'bg-slate-700 text-slate-300' : 'bg-slate-100'}`}>Annuler</button>
                    <button onClick={addFournisseur} className="flex-1 py-3 text-white rounded-xl font-medium" style={{ background: couleur }}>{editFournisseurId ? 'Modifier' : 'Ajouter'}</button>
                  </div>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}

      {/* ====== MOUVEMENTS TAB ====== */}
      {activeTab === 'mouvements' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <p className={`text-sm ${textMuted}`}>{filteredMouvements.length} mouvement{filteredMouvements.length > 1 ? 's' : ''}{mouvTypeFilter !== 'all' || mouvArticleFilter ? ` (sur ${mouvements.length})` : ''}</p>
            <div className="flex gap-2">
              {mouvements.length > 0 && (
                <button onClick={exportMouvements} className={`px-3 py-2 rounded-xl text-sm flex items-center gap-1.5 ${isDark ? 'bg-slate-700 text-slate-300 hover:bg-slate-600' : 'bg-slate-100 hover:bg-slate-200'}`}>
                  <Download size={14} /> CSV
                </button>
              )}
              <button onClick={() => setShowMouvementForm(true)} className="px-4 py-2.5 text-white rounded-xl text-sm font-medium flex items-center gap-2 shadow-md" style={{ background: couleur }}><Plus size={16} /> Nouveau mouvement</button>
            </div>
          </div>

          {/* Mouvements Stats */}
          {mouvements.length > 0 && (() => {
            const totalIn = mouvements.filter(m => m.type === 'in' || m.type === 'entree' || m.type === 'return').reduce((s, m) => s + Math.abs(m.quantite || 0), 0);
            const totalOut = mouvements.filter(m => m.type === 'out' || m.type === 'sortie').reduce((s, m) => s + Math.abs(m.quantite || 0), 0);
            const uniqueArticles = new Set(mouvements.map(m => m.articleId)).size;
            return (
              <div className="grid grid-cols-3 gap-3">
                <div className={`p-3 rounded-xl border ${isDark ? 'bg-slate-800/50 border-slate-700' : 'bg-white border-slate-200'}`}>
                  <p className={`text-[11px] ${textMuted}`}>Entrées</p>
                  <p className="text-lg font-bold text-emerald-500">+{totalIn}</p>
                </div>
                <div className={`p-3 rounded-xl border ${isDark ? 'bg-slate-800/50 border-slate-700' : 'bg-white border-slate-200'}`}>
                  <p className={`text-[11px] ${textMuted}`}>Sorties</p>
                  <p className="text-lg font-bold text-red-500">-{totalOut}</p>
                </div>
                <div className={`p-3 rounded-xl border ${isDark ? 'bg-slate-800/50 border-slate-700' : 'bg-white border-slate-200'}`}>
                  <p className={`text-[11px] ${textMuted}`}>Articles</p>
                  <p className="text-lg font-bold" style={{ color: couleur }}>{uniqueArticles}</p>
                </div>
              </div>
            );
          })()}

          {/* Mouvements Filters */}
          {mouvements.length > 0 && (
            <div className="flex gap-2 flex-wrap">
              {[
                { key: 'all', label: 'Tous' },
                { key: 'in', label: 'Entrées' },
                { key: 'out', label: 'Sorties' },
                { key: 'return', label: 'Retours' },
                { key: 'adjustment', label: 'Ajustements' },
              ].map(f => (
                <button key={f.key} onClick={() => setMouvTypeFilter(f.key)} className={`px-3 py-1.5 rounded-lg text-sm font-medium min-h-[36px] transition-colors ${mouvTypeFilter === f.key ? 'text-white shadow-sm' : isDark ? 'bg-slate-700 text-slate-300' : 'bg-slate-100 text-slate-600'}`} style={mouvTypeFilter === f.key ? { background: couleur } : {}}>
                  {f.label}
                </button>
              ))}
              {mouvements.length > 5 && (
                <select className={`px-3 py-1.5 rounded-lg text-sm border ${inputBg}`} value={mouvArticleFilter} onChange={e => setMouvArticleFilter(e.target.value)}>
                  <option value="">Tous les articles</option>
                  {[...new Set(mouvements.map(m => m.articleId))].map(aid => {
                    const art = catalogue.find(c => c.id === aid);
                    return <option key={aid} value={aid}>{art?.nom || 'Inconnu'}</option>;
                  })}
                </select>
              )}
            </div>
          )}

          {mouvements.length === 0 ? (
            <div className={`${cardBg} rounded-2xl border p-12 text-center`}>
              <ArrowRightLeft size={40} className={`mx-auto mb-3 ${textMuted}`} />
              <p className={`font-medium ${textPrimary}`}>Aucun mouvement de stock</p>
              <p className={`text-sm ${textMuted} mt-1`}>Enregistrez les entrées/sorties pour tracer vos stocks</p>
            </div>
          ) : filteredMouvements.length === 0 ? (
            <div className={`${cardBg} rounded-2xl border p-8 text-center`}>
              <Filter size={32} className={`mx-auto mb-2 ${textMuted}`} />
              <p className={`text-sm font-medium ${textPrimary}`}>Aucun mouvement pour ces filtres</p>
              <button onClick={() => { setMouvTypeFilter('all'); setMouvArticleFilter(''); }} className="text-sm mt-2" style={{ color: couleur }}>Réinitialiser</button>
            </div>
          ) : (
            <div className="space-y-2">
              {filteredMouvements.slice(0, 50).map(m => {
                const ch = chantiers?.find(c => c.id === m.chantierId);
                const article = catalogue.find(c => c.id === m.articleId);
                const articleName = article?.nom || m.articleNom || 'Article inconnu';
                const articleRef = article?.reference || '';
                const articleCat = article?.categorie || '';
                const typeNormalized = m.type === 'entree' ? 'in' : m.type === 'sortie' ? 'out' : m.type;
                const isIn = typeNormalized === 'in' || typeNormalized === 'return';
                const isOut = typeNormalized === 'out';
                return (
                  <div key={m.id} className={`${cardBg} rounded-xl border p-4 flex items-center gap-4`}>
                    <span className={`w-10 h-10 rounded-xl flex items-center justify-center text-sm font-bold ${isIn ? isDark ? 'bg-emerald-900/40 text-emerald-400' : 'bg-emerald-100 text-emerald-700' : isOut ? isDark ? 'bg-red-900/40 text-red-400' : 'bg-red-100 text-red-700' : isDark ? 'bg-orange-900/40 text-orange-400' : 'bg-orange-100 text-orange-700'}`}>
                      {isIn ? '↗' : isOut ? '↘' : '⇄'}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className={`font-medium ${textPrimary}`}>
                        {articleName}
                        {articleRef && <span className={`ml-2 text-xs font-normal ${textMuted}`}>{articleRef}</span>}
                      </p>
                      <p className={`text-xs ${textMuted}`}>
                        {isIn ? 'Entrée' : isOut ? 'Sortie' : typeNormalized === 'return' ? 'Retour' : 'Ajustement'}
                        {articleCat && ` · ${articleCat}`}
                        {ch ? ` · ${ch.nom}` : ''}
                        {(m.raison || m.motif) ? ` · ${m.raison || m.motif}` : ''}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className={`font-bold ${isIn ? 'text-emerald-500' : isOut ? 'text-red-500' : isDark ? 'text-orange-400' : 'text-orange-600'}`}>
                        {isIn ? '+' : isOut ? '-' : ''}{Math.abs(m.quantite)}
                      </p>
                      <p className={`text-xs ${textMuted}`}>{new Date(m.date).toLocaleDateString('fr-FR')}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Mouvement Form Modal */}
          <AnimatePresence>
            {showMouvementForm && (
              <motion.div className="fixed inset-0 z-50 flex items-center justify-center p-4" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <div className="absolute inset-0 bg-black/50" onClick={() => setShowMouvementForm(false)} />
                <motion.div className={`relative w-full max-w-md rounded-2xl p-6 ${isDark ? 'bg-slate-800' : 'bg-white'} shadow-2xl`} initial={{ scale: 0.9 }} animate={{ scale: 1 }} exit={{ scale: 0.9 }}>
                  <h3 className={`font-bold text-lg mb-4 ${textPrimary}`}>Nouveau mouvement</h3>
                  <div className="space-y-3">
                    <select className={`w-full px-4 py-3 border rounded-xl ${inputBg}`} value={mouvementForm.type} onChange={e => setMouvementForm(p => ({...p, type: e.target.value}))}>
                      <option value="in">📥 Entrée (Livraison)</option>
                      <option value="out">📤 Sortie (Chantier)</option>
                      <option value="return">↩️ Retour</option>
                      <option value="adjustment">⚖️ Ajustement</option>
                    </select>
                    <select className={`w-full px-4 py-3 border rounded-xl ${inputBg}`} value={mouvementForm.articleId} onChange={e => setMouvementForm(p => ({...p, articleId: e.target.value}))}>
                      <option value="">Choisir l'article *</option>
                      {catalogue.map(c => <option key={c.id} value={c.id}>{c.nom} ({c.stock_actuel ?? '?'} en stock)</option>)}
                    </select>
                    <input type="number" placeholder="Quantité *" className={`w-full px-4 py-3 border rounded-xl ${inputBg}`} value={mouvementForm.quantite} onChange={e => setMouvementForm(p => ({...p, quantite: e.target.value}))} />
                    {mouvementForm.type === 'out' && chantiers.length > 0 && (
                      <select className={`w-full px-4 py-3 border rounded-xl ${inputBg}`} value={mouvementForm.chantierId} onChange={e => setMouvementForm(p => ({...p, chantierId: e.target.value}))}>
                        <option value="">Chantier destination</option>
                        {chantiers.filter(c => c.statut === 'en_cours').map(c => <option key={c.id} value={c.id}>{c.nom}</option>)}
                      </select>
                    )}
                    <input placeholder="Raison / Commentaire" className={`w-full px-4 py-3 border rounded-xl ${inputBg}`} value={mouvementForm.raison} onChange={e => setMouvementForm(p => ({...p, raison: e.target.value}))} />
                  </div>
                  <div className="flex gap-3 mt-5">
                    <button onClick={() => setShowMouvementForm(false)} className={`flex-1 py-3 rounded-xl ${isDark ? 'bg-slate-700 text-slate-300' : 'bg-slate-100'}`}>Annuler</button>
                    <button onClick={addMouvement} className="flex-1 py-3 text-white rounded-xl font-medium" style={{ background: couleur }}>Valider</button>
                  </div>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}

      {/* ====== PACKS TAB ====== */}
      {activeTab === 'packs' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className={`text-sm ${textMuted}`}>{packs.length} pack{packs.length > 1 ? 's' : ''}</p>
            <button onClick={() => setShowPackForm(true)} className="px-4 py-2.5 text-white rounded-xl text-sm font-medium flex items-center gap-2 shadow-md" style={{ background: couleur }}><PackagePlus size={16} /> Nouveau pack</button>
          </div>

          {packs.length === 0 ? (
            <div className={`${cardBg} rounded-2xl border p-12 text-center`}>
              <Layers size={40} className={`mx-auto mb-3 ${textMuted}`} />
              <p className={`font-medium ${textPrimary}`}>Aucun pack/kit</p>
              <p className={`text-sm ${textMuted} mt-1`}>Combinez des articles en packs pour ajout rapide aux devis</p>
            </div>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              {packs.map(pack => {
                // Calculate pack totals dynamically from articles
                const totalVente = pack.articles.reduce((s, a) => {
                  const item = catalogue.find(c => c.id === a.articleId);
                  return s + (item?.prix || 0) * (a.quantite || 1);
                }, 0);
                const totalCout = pack.articles.reduce((s, a) => {
                  const item = catalogue.find(c => c.id === a.articleId);
                  return s + (item?.prixAchat || 0) * (a.quantite || 1);
                }, 0);
                const prixVente = pack.prixVente || totalVente;
                const marge = totalCout > 0 ? ((prixVente - totalCout) / prixVente * 100) : null;
                const nbArticles = pack.articles.reduce((s, a) => s + (a.quantite || 1), 0);
                return (
                  <div key={pack.id} className={`${cardBg} rounded-xl border p-4`}>
                    <div className="flex items-center justify-between mb-2">
                      <div>
                        <h4 className={`font-bold ${textPrimary}`}>{pack.nom}</h4>
                        <span className={`text-[10px] px-1.5 py-0.5 rounded ${isDark ? 'bg-slate-600 text-slate-300' : 'bg-slate-100 text-slate-600'}`}>
                          {pack.articles.length} article{pack.articles.length > 1 ? 's' : ''} · {nbArticles} unités
                        </span>
                      </div>
                      <div className="flex items-center gap-1">
                        <button onClick={() => duplicatePack(pack)} className={`p-1.5 rounded ${isDark ? 'hover:bg-slate-700' : 'hover:bg-slate-100'}`} title="Dupliquer"><PackagePlus size={14} className={textMuted} /></button>
                        <button onClick={() => setPacks(prev => prev.filter(p => p.id !== pack.id))} className={`p-1.5 rounded ${isDark ? 'hover:bg-slate-700' : 'hover:bg-slate-100'}`} title="Supprimer"><Trash2 size={14} className="text-red-500" /></button>
                      </div>
                    </div>
                    {pack.description && <p className={`text-xs ${textMuted} mb-2`}>{pack.description}</p>}
                    <div className="space-y-1 mb-3">
                      {pack.articles.map((a, i) => {
                        const item = catalogue.find(c => c.id === a.articleId);
                        return (
                          <p key={i} className={`text-xs ${textMuted} flex items-center justify-between`}>
                            <span>• {a.quantite}× {item?.nom || a.label || '?'}</span>
                            <span className={`font-medium ${textPrimary}`}>{((item?.prix || 0) * (a.quantite || 1)).toFixed(0)} €</span>
                          </p>
                        );
                      })}
                    </div>
                    <div className={`pt-3 border-t flex items-center justify-between ${isDark ? 'border-slate-600' : 'border-slate-200'}`}>
                      <div>
                        <span className={`text-lg font-bold`} style={{ color: couleur }}>{prixVente.toFixed(0)} €</span>
                        {totalCout > 0 && <span className={`text-xs ml-2 ${textMuted}`}>Coût: {totalCout.toFixed(0)} €</span>}
                      </div>
                      {marge !== null && <span className={`text-sm font-semibold ${getMargeColor(marge)}`}>Marge {marge.toFixed(0)}%</span>}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Pack Form Modal */}
          <AnimatePresence>
            {showPackForm && (
              <motion.div className="fixed inset-0 z-50 flex items-center justify-center p-4" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <div className="absolute inset-0 bg-black/50" onClick={() => setShowPackForm(false)} />
                <motion.div className={`relative w-full max-w-lg rounded-2xl p-6 ${isDark ? 'bg-slate-800' : 'bg-white'} shadow-2xl`} initial={{ scale: 0.9 }} animate={{ scale: 1 }} exit={{ scale: 0.9 }}>
                  <h3 className={`font-bold text-lg mb-4 ${textPrimary}`}>Nouveau pack / kit</h3>
                  <div className="space-y-3">
                    <input placeholder="Nom du pack *" className={`w-full px-4 py-3 border rounded-xl ${inputBg}`} value={packForm.nom} onChange={e => setPackForm(p => ({...p, nom: e.target.value}))} />
                    <input placeholder="Description" className={`w-full px-4 py-3 border rounded-xl ${inputBg}`} value={packForm.description} onChange={e => setPackForm(p => ({...p, description: e.target.value}))} />
                    <div>
                      <p className={`text-sm font-medium mb-2 ${textPrimary}`}>Articles du pack</p>
                      {packForm.articles.map((a, i) => (
                        <div key={i} className="flex gap-2 mb-2">
                          <select className={`flex-1 px-3 py-2 border rounded-lg text-sm ${inputBg}`} value={a.articleId} onChange={e => {
                            const arts = [...packForm.articles]; arts[i].articleId = e.target.value;
                            setPackForm(p => ({...p, articles: arts}));
                          }}>
                            <option value="">Choisir article</option>
                            {catalogue.map(c => <option key={c.id} value={c.id}>{c.nom} ({c.prix}€)</option>)}
                          </select>
                          <input type="number" placeholder="Qté" className={`w-16 px-2 py-2 border rounded-lg text-sm ${inputBg}`} value={a.quantite} onChange={e => {
                            const arts = [...packForm.articles]; arts[i].quantite = parseInt(e.target.value) || 1;
                            setPackForm(p => ({...p, articles: arts}));
                          }} />
                          <button onClick={() => setPackForm(p => ({...p, articles: p.articles.filter((_, j) => j !== i)}))} className="p-2 text-red-500"><X size={16} /></button>
                        </div>
                      ))}
                      <button onClick={() => setPackForm(p => ({...p, articles: [...p.articles, { articleId: '', quantite: 1 }]}))} className={`text-sm ${isDark ? 'text-blue-400' : 'text-blue-600'} flex items-center gap-1`}><Plus size={14} /> Ajouter article</button>
                    </div>
                    {/* Auto-calculated totals */}
                    {packForm.articles.length > 0 && (
                      <div className={`p-3 rounded-xl ${isDark ? 'bg-slate-700/50' : 'bg-slate-50'}`}>
                        <p className={`text-xs ${textMuted}`}>Coût total: <strong>{packForm.articles.reduce((s, a) => s + (catalogue.find(c => c.id === a.articleId)?.prixAchat || 0) * (a.quantite || 1), 0).toFixed(2)}€</strong></p>
                        <p className={`text-xs ${textMuted}`}>Prix vente suggéré: <strong>{packForm.articles.reduce((s, a) => s + (catalogue.find(c => c.id === a.articleId)?.prix || 0) * (a.quantite || 1), 0).toFixed(2)}€</strong></p>
                      </div>
                    )}
                    <input type="number" placeholder="Prix de vente du pack" className={`w-full px-4 py-3 border rounded-xl ${inputBg}`} value={packForm.prixVente} onChange={e => setPackForm(p => ({...p, prixVente: e.target.value}))} />
                  </div>
                  <div className="flex gap-3 mt-5">
                    <button onClick={() => setShowPackForm(false)} className={`flex-1 py-3 rounded-xl ${isDark ? 'bg-slate-700 text-slate-300' : 'bg-slate-100'}`}>Annuler</button>
                    <button onClick={addPack} className="flex-1 py-3 text-white rounded-xl font-medium" style={{ background: couleur }}>Créer le pack</button>
                  </div>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}

      {/* ====== FAVORIS TAB ====== */}
      {activeTab === 'favoris' && (
        <div className={`rounded-2xl border ${cardBg} p-5`}>
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-3">
              <Star size={20} className="text-amber-500" fill="currentColor" />
              <div>
                <h2 className={`text-base font-bold ${textPrimary}`}>Articles favoris</h2>
                <p className={`text-xs ${textMuted}`}>{favoris.length} article{favoris.length > 1 ? 's' : ''} en favoris — accès rapide pour vos devis</p>
              </div>
            </div>
          </div>
          {favoris.length === 0 ? (
            <div className={`text-center py-12 ${textMuted}`}>
              <Star size={40} className="mx-auto mb-3 opacity-30" />
              <p className="text-sm font-medium mb-2">Aucun article en favoris</p>
              <p className="text-xs mb-4">Cliquez sur l'étoile ★ d'un article pour l'ajouter à vos favoris.</p>
              <button onClick={() => setActiveTab('catalogue')}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium text-white shadow-md" style={{ backgroundColor: couleur }}>
                <Package size={16} /> Voir le catalogue
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {favoris.map(item => {
                const marge = getMargeBrute(item.prix, item.prixAchat);
                const itemStock = item.stock_actuel ?? item.stock;
                const itemSeuil = item.stock_seuil_alerte ?? item.stockMin;
                const isLowStock = itemStock != null && itemSeuil != null && itemSeuil > 0 && itemStock < itemSeuil;
                return (
                  <div key={item.id} className={`rounded-xl border p-4 transition-all hover:shadow-md ${isDark ? 'bg-slate-700/50 border-slate-600 hover:bg-slate-700' : 'bg-white border-slate-200 hover:bg-slate-50'}`}>
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm font-bold truncate ${textPrimary}`}>{item.nom}</p>
                        {item.reference && <p className={`text-xs font-mono ${textMuted}`}>{item.reference}</p>}
                        <span className={`inline-block mt-1 text-[10px] px-1.5 py-0.5 rounded font-medium ${isDark ? 'bg-slate-600 text-slate-300' : 'bg-slate-100 text-slate-600'}`}>{item.categorie}</span>
                      </div>
                      <div className="flex items-center gap-1 ml-2">
                        <button onClick={() => toggleFavori(item.id)} title="Retirer des favoris"
                          className="p-1.5 rounded-lg text-amber-500 hover:bg-amber-50 dark:hover:bg-amber-500/10 transition-colors">
                          <Star size={16} fill="currentColor" />
                        </button>
                        <button onClick={() => startEdit(item)} title="Modifier"
                          className={`p-1.5 rounded-lg transition-colors ${isDark ? 'hover:bg-slate-600 text-slate-400' : 'hover:bg-slate-100 text-slate-500'}`}>
                          <Edit3 size={14} />
                        </button>
                      </div>
                    </div>
                    <div className="flex items-end justify-between mt-3">
                      <div>
                        <p className={`text-lg font-bold ${textPrimary}`}>{fmtPrice(item.prix)}<span className={`text-xs font-normal ml-1 ${textMuted}`}>/{item.unite}</span></p>
                        {!modeDiscret && (item.prixAchat > 0 || marge === 100) && (
                          <p className={`text-xs ${textMuted}`}>
                            {item.prixAchat > 0 ? `Achat : ${parseFloat(item.prixAchat).toFixed(2)} €` : 'Main d\'œuvre'}
                            {marge !== null && <span className={`ml-2 font-semibold ${getMargeColor(marge)}`}>{marge.toFixed(0)}% marge</span>}
                          </p>
                        )}
                      </div>
                      {isLowStock && (
                        <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${isDark ? 'bg-red-900/30 text-red-400' : 'bg-red-50 text-red-600'}`}>
                          <AlertTriangle size={10} className="inline mr-0.5" />Stock bas
                        </span>
                      )}
                      {(item.stock_actuel ?? item.stock) != null && !isLowStock && (
                        <span className={`text-xs ${textMuted}`}>{item.stock_actuel ?? item.stock} en stock</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Stock alerts section inside favoris */}
          {alertesStock.length > 0 && (
            <div className={`mt-6 pt-5 border-t ${isDark ? 'border-slate-700' : 'border-slate-200'}`}>
              <div className="flex items-center gap-2 mb-3">
                <AlertTriangle size={16} className="text-red-500" />
                <h3 className={`text-sm font-bold ${textPrimary}`}>Alertes de stock ({alertesStock.length})</h3>
              </div>
              <div className="space-y-2">
                {alertesStock.slice(0, 8).map(item => (
                  <div key={item.id} className={`flex items-center justify-between p-2.5 rounded-lg ${isDark ? 'bg-red-900/10 border border-red-500/20' : 'bg-red-50 border border-red-100'}`}>
                    <div className="flex items-center gap-3 min-w-0">
                      <span className={`text-sm font-medium truncate ${textPrimary}`}>{item.nom}</span>
                      {item.reference && <span className={`text-xs font-mono ${textMuted}`}>{item.reference}</span>}
                    </div>
                    <div className="flex items-center gap-3 ml-2">
                      <span className="text-xs text-red-500 font-bold whitespace-nowrap">{item.stock_actuel} / {item.stock_seuil_alerte}</span>
                      <button onClick={() => startEdit(item)} className={`text-xs px-2 py-1 rounded font-medium ${isDark ? 'bg-slate-700 text-slate-300 hover:bg-slate-600' : 'bg-white text-slate-600 hover:bg-slate-100'}`}>Modifier</button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ====== INVENTAIRE TAB ====== */}
      {activeTab === 'inventaire' && (() => {
        const stockItems = catalogue.filter(c => (c.stock_actuel ?? c.stock) != null || (c.stock_seuil_alerte ?? c.stockMin) > 0);
        const lastInventaire = mouvements.find(m => m.type === 'adjustment' && m.raison?.startsWith('Inventaire'));
        return (
          <div className="space-y-4">
            {/* Stats */}
            {stockItems.length > 0 && (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className={`p-3 rounded-xl border ${isDark ? 'bg-slate-800/50 border-slate-700' : 'bg-white border-slate-200'}`}>
                  <p className={`text-[11px] ${textMuted}`}>Articles suivis</p>
                  <p className="text-xl font-bold" style={{ color: couleur }}>{stockItems.length}</p>
                </div>
                <div className={`p-3 rounded-xl border ${isDark ? 'bg-slate-800/50 border-slate-700' : 'bg-white border-slate-200'}`}>
                  <p className={`text-[11px] ${textMuted}`}>Stock bas</p>
                  <p className={`text-xl font-bold ${alertesStock.length > 0 ? 'text-red-500' : 'text-emerald-500'}`}>{alertesStock.length}</p>
                </div>
                <div className={`p-3 rounded-xl border ${isDark ? 'bg-slate-800/50 border-slate-700' : 'bg-white border-slate-200'}`}>
                  <p className={`text-[11px] ${textMuted}`}>Valeur stock</p>
                  <p className="text-xl font-bold text-blue-500">{modeDiscret ? '·····' : `${(stockItems.reduce((s, c) => s + (c.prixAchat || 0) * (c.stock_actuel ?? c.stock ?? 0), 0) / 1000).toFixed(1)}k€`}</p>
                </div>
                <div className={`p-3 rounded-xl border ${isDark ? 'bg-slate-800/50 border-slate-700' : 'bg-white border-slate-200'}`}>
                  <p className={`text-[11px] ${textMuted}`}>Dernier inventaire</p>
                  <p className={`text-sm font-bold ${textPrimary}`}>{lastInventaire ? new Date(lastInventaire.date).toLocaleDateString('fr-FR') : '—'}</p>
                </div>
              </div>
            )}

            <div className={`${cardBg} rounded-2xl border p-8 text-center`}>
              <ClipboardList size={48} className={`mx-auto mb-4 ${textMuted}`} />
              <h3 className={`text-lg font-bold mb-2 ${textPrimary}`}>Mode Inventaire</h3>
              <p className={`text-sm ${textMuted} mb-6 max-w-md mx-auto`}>
                Comptez rapidement votre stock physique. Les écarts seront automatiquement enregistrés comme mouvements d'ajustement.
              </p>
              {stockItems.length === 0 ? (
                <div className={`p-4 rounded-xl mb-4 ${isDark ? 'bg-amber-900/20' : 'bg-amber-50'}`}>
                  <p className={`text-sm text-amber-600 font-medium mb-1`}>Aucun article avec gestion de stock</p>
                  <p className={`text-xs ${textMuted}`}>Pour activer le suivi de stock, modifiez un article et remplissez les champs "Stock actuel" et "Stock minimum".</p>
                  <button onClick={() => setActiveTab('catalogue')} className="mt-2 text-sm font-medium" style={{ color: couleur }}>Aller au catalogue</button>
                </div>
              ) : (
                <button onClick={startInventaire} className="px-8 py-3 text-white rounded-xl font-medium flex items-center justify-center gap-2 mx-auto shadow-lg" style={{ background: couleur }}>
                  <RefreshCw size={18} /> Démarrer l'inventaire ({stockItems.length} articles)
                </button>
              )}
            </div>

            {/* Stock alerts in Inventaire */}
            {alertesStock.length > 0 && (
              <div className={`rounded-2xl border p-5 ${isDark ? 'bg-red-900/10 border-red-800' : 'bg-red-50 border-red-200'}`}>
                <h3 className={`font-semibold flex items-center gap-2 mb-3 ${textPrimary}`}>
                  <AlertTriangle size={16} className="text-red-500" /> Articles en stock bas ({alertesStock.length})
                </h3>
                <div className="space-y-2">
                  {alertesStock.map(item => (
                    <div key={item.id} className={`flex items-center justify-between p-2.5 rounded-lg ${isDark ? 'bg-slate-800/80' : 'bg-white'}`}>
                      <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-red-500" />
                        <span className={`text-sm font-medium ${textPrimary}`}>{item.nom}</span>
                        {item.reference && <span className={`text-xs font-mono ${textMuted}`}>{item.reference}</span>}
                      </div>
                      <span className="text-sm text-red-500 font-bold">{item.stock_actuel ?? item.stock} / {item.stock_seuil_alerte ?? item.stockMin}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        );
      })()}

      {/* ====== PARAMETRES / COEFFICIENTS TAB ====== */}
      {activeTab === 'parametres' && (
        <div className="space-y-4">
          <div className={`${cardBg} rounded-2xl border p-5`}>
            <h3 className={`font-semibold mb-4 flex items-center gap-2 ${textPrimary}`}><Percent size={16} style={{ color: couleur }} /> Coefficients par catégorie</h3>
            <p className={`text-sm ${textMuted} mb-4`}>Le prix de vente sera automatiquement calculé: Prix achat × Coefficient</p>
            <div className="space-y-3">
              {CATEGORIES.filter(c => c !== 'Tous').map(cat => (
                <div key={cat} className={`flex items-center gap-3 sm:gap-4 p-3 pl-4 rounded-xl ${isDark ? 'bg-slate-700/50' : 'bg-slate-50'}`}>
                  <span className={`font-medium flex-1 min-w-0 truncate ${textPrimary}`}>{cat}</span>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span className={`text-sm ${textMuted}`}>×</span>
                    <input type="number" step="0.1" min="1" className={`w-20 px-3 py-2 border rounded-lg text-center font-bold ${inputBg}`} value={coefficients[cat] || 1.5} onChange={e => setCoefficients(prev => ({...prev, [cat]: parseFloat(e.target.value) || 1.5}))} />
                  </div>
                  <span className={`text-xs ${textMuted} w-36 text-right flex-shrink-0 hidden sm:block`}>100€ achat → {modeDiscret ? '·····' : `${((coefficients[cat] || 1.5) * 100).toFixed(0)}€`} vente</span>
                </div>
              ))}
            </div>
          </div>
          <button onClick={() => { setCoefficients(DEFAULT_COEFFICIENTS); showToast('Coefficients réinitialisés', 'info'); }} className={`text-sm flex items-center gap-1 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
            <RefreshCw size={14} /> Réinitialiser les coefficients par défaut
          </button>
        </div>
      )}

      {/* CSV Import Modal */}
      <AnimatePresence>
        {showImport && importData && (
          <motion.div className="fixed inset-0 z-50 flex items-center justify-center p-4" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <div className="absolute inset-0 bg-black/50" onClick={() => setShowImport(false)} />
            <motion.div className={`relative w-full max-w-2xl rounded-2xl p-6 max-h-[80vh] overflow-y-auto ${isDark ? 'bg-slate-800' : 'bg-white'} shadow-2xl`} initial={{ scale: 0.9 }} animate={{ scale: 1 }} exit={{ scale: 0.9 }}>
              <h3 className={`font-bold text-lg mb-2 ${textPrimary}`}>Import CSV — {importData.rows.length} lignes détectées</h3>
              <p className={`text-sm ${textMuted} mb-4`}>Associez les colonnes de votre fichier aux champs du catalogue</p>
              <div className="space-y-3 mb-4">
                {[
                  { key: 'designation', label: 'Nom / Désignation *', required: true },
                  { key: 'reference', label: 'Référence / SKU' },
                  { key: 'description', label: 'Description' },
                  { key: 'prix', label: 'Prix vente HT' },
                  { key: 'prixAchat', label: 'Prix achat HT' },
                  { key: 'unite', label: 'Unité' },
                  { key: 'categorie', label: 'Catégorie' },
                  { key: 'tva_rate', label: 'Taux TVA' },
                  { key: 'stock', label: 'Stock' },
                ].map(({ key, label, required }) => (
                  <div key={key} className="flex items-center gap-3">
                    <span className={`text-sm w-40 ${required ? 'font-semibold' : ''} ${textPrimary}`}>{label}</span>
                    <select className={`flex-1 px-3 py-2 border rounded-lg text-sm ${inputBg}`} value={importMapping[key] || ''} onChange={e => setImportMapping(p => ({...p, [key]: e.target.value}))}>
                      <option value="">— Ignorer —</option>
                      {importData.headers.map(h => <option key={h} value={h}>{h}</option>)}
                    </select>
                  </div>
                ))}
              </div>
              {/* Preview */}
              <div className={`rounded-xl p-3 mb-4 ${isDark ? 'bg-slate-700/50' : 'bg-slate-50'}`}>
                <p className={`text-xs font-medium ${textMuted} mb-2`}>Aperçu (5 premières lignes)</p>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead><tr>{importData.headers.slice(0, 6).map(h => <th key={h} className={`text-left p-1 ${textMuted}`}>{h}</th>)}</tr></thead>
                    <tbody>{importData.rows.slice(0, 5).map((row, i) => <tr key={i} className={`border-t ${isDark ? 'border-slate-600' : 'border-slate-200'}`}>{importData.headers.slice(0, 6).map(h => <td key={h} className={`p-1 ${textPrimary}`}>{row[h]}</td>)}</tr>)}</tbody>
                  </table>
                </div>
              </div>
              <div className="flex gap-3">
                <button onClick={() => setShowImport(false)} className={`flex-1 py-3 rounded-xl ${isDark ? 'bg-slate-700 text-slate-300' : 'bg-slate-100'}`}>Annuler</button>
                <button onClick={executeImport} disabled={!importMapping.designation} className="flex-1 py-3 text-white rounded-xl font-medium disabled:opacity-50" style={{ background: couleur }}>
                  <Upload size={16} className="inline mr-2" />Importer {importData.rows.length} articles
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Barcode Scanner Modal */}
      <AnimatePresence>
        {showScanner && (
          <motion.div className="fixed inset-0 z-50 flex items-center justify-center p-4" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <div className="absolute inset-0 bg-black/70" onClick={stopScanner} />
            <motion.div className={`relative w-full max-w-lg rounded-2xl overflow-hidden ${isDark ? 'bg-slate-800' : 'bg-white'} shadow-2xl`} initial={{ scale: 0.9 }} animate={{ scale: 1 }} exit={{ scale: 0.9 }}>
              <div className={`p-4 border-b flex items-center justify-between ${isDark ? 'border-slate-700' : 'border-slate-200'}`}>
                <h3 className={`font-bold text-lg flex items-center gap-2 ${textPrimary}`}><Camera size={20} style={{ color: couleur }} /> Scanner un code-barres</h3>
                <button onClick={stopScanner} className={`p-2 rounded-lg ${isDark ? 'hover:bg-slate-700' : 'hover:bg-slate-100'}`}><X size={20} className={textMuted} /></button>
              </div>
              {!scanResult ? (
                <div className="relative">
                  <video ref={videoRef} className="w-full aspect-video object-cover bg-black" autoPlay playsInline muted />
                  <canvas ref={canvasRef} className="hidden" />
                  {/* Scan overlay with aiming guide */}
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <div className="w-64 h-32 border-2 border-white/60 rounded-xl">
                      <div className="absolute top-0 left-0 w-6 h-6 border-t-2 border-l-2 border-white rounded-tl-lg" />
                      <div className="absolute top-0 right-0 w-6 h-6 border-t-2 border-r-2 border-white rounded-tr-lg" />
                      <div className="absolute bottom-0 left-0 w-6 h-6 border-b-2 border-l-2 border-white rounded-bl-lg" />
                      <div className="absolute bottom-0 right-0 w-6 h-6 border-b-2 border-r-2 border-white rounded-br-lg" />
                    </div>
                  </div>
                  {scanLoading && (
                    <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                      <div className="w-8 h-8 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    </div>
                  )}
                  <p className="absolute bottom-3 left-0 right-0 text-center text-white text-sm font-medium bg-black/40 py-2">
                    Placez le code-barres dans le cadre
                  </p>
                </div>
              ) : (
                <div className="p-6">
                  {scanResult.noBarcodeAPI && (
                    <div className="text-center">
                      <p className={`text-sm ${textMuted} mb-4`}>Scanner non supporté. Entrez le code manuellement :</p>
                      <form onSubmit={(e) => { e.preventDefault(); const v = e.target.barcode.value; if (v) handleBarcodeDetected(v); }}>
                        <input name="barcode" type="text" placeholder="Code-barres (EAN)" className={`w-full px-4 py-3 border rounded-xl text-center text-lg font-mono ${inputBg}`} autoFocus />
                        <button type="submit" className="mt-3 w-full py-3 text-white rounded-xl font-medium" style={{ background: couleur }}>Rechercher</button>
                      </form>
                    </div>
                  )}
                  {scanResult.found && scanResult.local && (
                    <div className="text-center">
                      <div className="w-12 h-12 mx-auto mb-3 rounded-full flex items-center justify-center bg-emerald-100 text-emerald-600">
                        <Check size={24} />
                      </div>
                      <p className={`font-bold text-lg mb-1 ${textPrimary}`}>{scanResult.article.nom}</p>
                      <p className={`text-sm ${textMuted} mb-4`}>Trouvé dans votre catalogue</p>
                      <div className="flex gap-2">
                        <button onClick={() => { stopScanner(); setArticleDetail(scanResult.article.id); }} className="flex-1 py-3 text-white rounded-xl font-medium" style={{ background: couleur }}>Voir la fiche</button>
                        <button onClick={() => setScanResult(null)} className={`flex-1 py-3 rounded-xl ${isDark ? 'bg-slate-700 text-slate-300' : 'bg-slate-100'}`}>Scanner encore</button>
                      </div>
                    </div>
                  )}
                  {scanResult.found && !scanResult.local && scanResult.product && (
                    <div className="text-center">
                      <div className="w-12 h-12 mx-auto mb-3 rounded-full flex items-center justify-center bg-blue-100 text-blue-600">
                        <Package size={24} />
                      </div>
                      {scanResult.product.image && <img src={scanResult.product.image} alt="" className="w-20 h-20 mx-auto mb-3 object-contain rounded-lg" />}
                      <p className={`font-bold text-lg mb-1 ${textPrimary}`}>{scanResult.product.nom}</p>
                      {scanResult.product.marque && <p className={`text-sm ${textMuted}`}>{scanResult.product.marque}</p>}
                      <p className={`text-xs ${textMuted} mb-4`}>Code: {scanResult.product.barcode}</p>
                      <button onClick={() => {
                        stopScanner();
                        setForm(prev => ({ ...prev, nom: scanResult.product.nom, reference: scanResult.product.barcode }));
                        setShow(true);
                      }} className="w-full py-3 text-white rounded-xl font-medium flex items-center justify-center gap-2" style={{ background: couleur }}>
                        <Plus size={18} /> Ajouter au catalogue
                      </button>
                    </div>
                  )}
                  {!scanResult.found && !scanResult.noBarcodeAPI && (
                    <div className="text-center">
                      <div className="w-12 h-12 mx-auto mb-3 rounded-full flex items-center justify-center bg-amber-100 text-amber-600">
                        <Search size={24} />
                      </div>
                      <p className={`font-bold mb-1 ${textPrimary}`}>Produit non trouvé</p>
                      <p className={`text-sm ${textMuted} mb-4`}>Code: {scanResult.barcode}</p>
                      <div className="flex gap-2">
                        <button onClick={() => {
                          stopScanner();
                          setForm(prev => ({ ...prev, reference: scanResult.barcode }));
                          setShow(true);
                        }} className="flex-1 py-3 text-white rounded-xl font-medium" style={{ background: couleur }}>Créer l'article</button>
                        <button onClick={() => setScanResult(null)} className={`flex-1 py-3 rounded-xl ${isDark ? 'bg-slate-700 text-slate-300' : 'bg-slate-100'}`}>Réessayer</button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Article Picker Modal */}
      <ArticlePicker isOpen={showArticlePicker} onClose={() => setShowArticlePicker(false)} onSelect={handleAddFromPicker} isDark={isDark} couleur={couleur} />
    </div>
  );
}
