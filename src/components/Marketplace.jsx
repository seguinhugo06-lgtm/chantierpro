import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  Store,
  Plus,
  Search,
  MapPin,
  Filter,
  Grid3X3,
  List,
  Map,
  ChevronDown,
  Heart,
  Tag,
  Star,
  Truck,
  X,
  Loader2,
  SlidersHorizontal,
  RefreshCw,
  MessageCircle,
  Eye,
  ArrowUpDown,
  Check,
  MapPinOff,
} from 'lucide-react';
import { useDebounce, useDebouncedSearch } from '../hooks/useDebounce';
import supabase, { isDemo } from '../supabaseClient';
import { cn } from '../lib/utils';
import { Button, IconButton } from './ui/Button';
import Input from './ui/Input';
import Modal, { ModalHeader, ModalTitle, ModalBody, ModalFooter } from './ui/Modal';

/**
 * @typedef {Object} MarketplaceListing
 * @property {string} id
 * @property {string} titre
 * @property {string} description
 * @property {string} categorie
 * @property {number} prix_unitaire
 * @property {number} quantite
 * @property {string} unite
 * @property {string} etat - 'neuf' | 'bon_etat' | 'usage'
 * @property {boolean} livraison_disponible
 * @property {string} ville
 * @property {number} latitude
 * @property {number} longitude
 * @property {string[]} photos
 * @property {string} user_id
 * @property {string} status - 'active' | 'vendu' | 'expire'
 * @property {string} created_at
 * @property {string} expires_at
 * @property {number} [distance] - Calculated distance in km
 * @property {Object} [seller] - Seller info
 */

// Categories for marketplace
const CATEGORIES = [
  { id: 'maconnerie', label: 'Maçonnerie', icon: '🧱' },
  { id: 'electricite', label: 'Électricité', icon: '⚡' },
  { id: 'plomberie', label: 'Plomberie', icon: '🔧' },
  { id: 'menuiserie', label: 'Menuiserie', icon: '🪚' },
  { id: 'peinture', label: 'Peinture', icon: '🎨' },
  { id: 'isolation', label: 'Isolation', icon: '🏠' },
  { id: 'toiture', label: 'Toiture', icon: '🏗️' },
  { id: 'carrelage', label: 'Carrelage', icon: '🔲' },
  { id: 'outillage', label: 'Outillage', icon: '🛠️' },
  { id: 'autre', label: 'Autre', icon: '📦' },
];

// Condition/state options
const ETATS = [
  { id: 'neuf', label: 'Neuf', color: 'text-green-600 bg-green-100 dark:bg-green-900/30 dark:text-green-400' },
  { id: 'bon_etat', label: 'Bon état', color: 'text-blue-600 bg-blue-100 dark:bg-blue-900/30 dark:text-blue-400' },
  { id: 'usage', label: "Traces d'usage", color: 'text-amber-600 bg-amber-100 dark:bg-amber-900/30 dark:text-amber-400' },
];

// Distance options
const DISTANCE_OPTIONS = [5, 10, 20, 30, 50, 100];

// Sort options
const SORT_OPTIONS = [
  { id: 'recent', label: 'Plus récentes' },
  { id: 'prix_asc', label: 'Prix croissant' },
  { id: 'prix_desc', label: 'Prix décroissant' },
  { id: 'distance', label: 'Distance' },
  { id: 'rating', label: 'Meilleures notes' },
];

// Demo listings for development
const DEMO_LISTINGS = [
  {
    id: '1',
    titre: '50 Parpaings 20x20x50',
    description: 'Parpaings neufs, reste de chantier. Excellente qualité.',
    categorie: 'maconnerie',
    prix_unitaire: 2.00,
    quantite: 50,
    unite: 'unité',
    etat: 'neuf',
    livraison_disponible: false,
    ville: 'Bordeaux',
    latitude: 44.8378,
    longitude: -0.5792,
    photos: ['https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400'],
    user_id: 'demo-1',
    status: 'active',
    created_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    expires_at: new Date(Date.now() + 28 * 24 * 60 * 60 * 1000).toISOString(),
    seller: { nom: 'Martin Dupont', rating: 4.8, reviews: 12 },
  },
  {
    id: '2',
    titre: '100 Tuiles terre cuite',
    description: 'Tuiles récupérées lors d\'une rénovation. Très bon état.',
    categorie: 'toiture',
    prix_unitaire: 1.50,
    quantite: 100,
    unite: 'unité',
    etat: 'bon_etat',
    livraison_disponible: true,
    ville: 'Mérignac',
    latitude: 44.8386,
    longitude: -0.6436,
    photos: ['https://images.unsplash.com/photo-1558618047-3c8c76ca7d13?w=400'],
    user_id: 'demo-2',
    status: 'active',
    created_at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
    expires_at: new Date(Date.now() + 25 * 24 * 60 * 60 * 1000).toISOString(),
    seller: { nom: 'Sophie Bernard', rating: 5.0, reviews: 8 },
  },
  {
    id: '3',
    titre: '25 Sacs de ciment',
    description: 'Sacs de ciment 35kg. Stockage au sec.',
    categorie: 'maconnerie',
    prix_unitaire: 5.00,
    quantite: 25,
    unite: 'sac',
    etat: 'neuf',
    livraison_disponible: false,
    ville: 'Pessac',
    latitude: 44.8067,
    longitude: -0.6313,
    photos: ['https://images.unsplash.com/photo-1504307651254-35680f356dfd?w=400'],
    user_id: 'demo-3',
    status: 'active',
    created_at: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
    expires_at: new Date(Date.now() + 29 * 24 * 60 * 60 * 1000).toISOString(),
    seller: { nom: 'Pierre Moreau', rating: 4.5, reviews: 23 },
  },
  {
    id: '4',
    titre: 'Câble électrique 2.5mm²',
    description: '100m de câble électrique rigide. Neuf, jamais utilisé.',
    categorie: 'electricite',
    prix_unitaire: 0.80,
    quantite: 100,
    unite: 'mètre',
    etat: 'neuf',
    livraison_disponible: true,
    ville: 'Talence',
    latitude: 44.8094,
    longitude: -0.5847,
    photos: ['https://images.unsplash.com/photo-1544724569-5f546fd6f2b5?w=400'],
    user_id: 'demo-4',
    status: 'active',
    created_at: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
    expires_at: new Date(Date.now() + 27 * 24 * 60 * 60 * 1000).toISOString(),
    seller: { nom: 'Jean Lefebvre', rating: 4.9, reviews: 45 },
  },
  {
    id: '5',
    titre: 'Lot de plinthes bois',
    description: 'Plinthes en chêne massif. Quelques traces de manipulation.',
    categorie: 'menuiserie',
    prix_unitaire: 3.50,
    quantite: 30,
    unite: 'mètre',
    etat: 'usage',
    livraison_disponible: false,
    ville: 'Gradignan',
    latitude: 44.7725,
    longitude: -0.6158,
    photos: ['https://images.unsplash.com/photo-1558618047-3c8c76ca7d13?w=400'],
    user_id: 'demo-5',
    status: 'active',
    created_at: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
    expires_at: new Date(Date.now() + 23 * 24 * 60 * 60 * 1000).toISOString(),
    seller: { nom: 'Marie Durand', rating: 4.2, reviews: 6 },
  },
  {
    id: '6',
    titre: 'Pots de peinture blanche',
    description: 'Peinture acrylique mate. 10L par pot, reste de chantier.',
    categorie: 'peinture',
    prix_unitaire: 25.00,
    quantite: 8,
    unite: 'pot',
    etat: 'neuf',
    livraison_disponible: true,
    ville: 'Cenon',
    latitude: 44.8564,
    longitude: -0.5314,
    photos: ['https://images.unsplash.com/photo-1562259949-e8e7689d7828?w=400'],
    user_id: 'demo-6',
    status: 'active',
    created_at: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString(),
    expires_at: new Date(Date.now() + 26 * 24 * 60 * 60 * 1000).toISOString(),
    seller: { nom: 'Luc Martin', rating: 4.7, reviews: 19 },
  },
];

/**
 * Calculate distance between two points using Haversine formula
 */
function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371; // Earth's radius in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Format currency
 */
function formatCurrency(amount) {
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 2,
  }).format(amount || 0);
}

/**
 * Format distance
 */
function formatDistance(km) {
  if (km < 1) return `${Math.round(km * 1000)}m`;
  return `${km.toFixed(1)}km`;
}

/**
 * Search history management
 */
const SEARCH_HISTORY_KEY = 'marketplace_search_history';
const MAX_SEARCH_HISTORY = 10;

function getSearchHistory() {
  try {
    const history = localStorage.getItem(SEARCH_HISTORY_KEY);
    return history ? JSON.parse(history) : [];
  } catch {
    return [];
  }
}

function addToSearchHistory(query) {
  if (!query.trim()) return;
  try {
    let history = getSearchHistory();
    history = history.filter(q => q.toLowerCase() !== query.toLowerCase());
    history.unshift(query);
    history = history.slice(0, MAX_SEARCH_HISTORY);
    localStorage.setItem(SEARCH_HISTORY_KEY, JSON.stringify(history));
  } catch {
    // Ignore localStorage errors
  }
}

// ============ LISTING CARD COMPONENT ============

/**
 * @param {Object} props
 * @param {MarketplaceListing} props.listing
 * @param {boolean} props.isFavorite
 * @param {Function} props.onToggleFavorite
 * @param {Function} props.onContact
 * @param {Function} props.onView
 * @param {boolean} props.isDark
 * @param {string} props.viewMode - 'grid' | 'list'
 */
function ListingCard({ listing, isFavorite, onToggleFavorite, onContact, onView, isDark, viewMode = 'grid' }) {
  const etat = ETATS.find(e => e.id === listing.etat) || ETATS[0];
  const category = CATEGORIES.find(c => c.id === listing.categorie);
  const totalPrice = listing.prix_unitaire * listing.quantite;

  const cardBg = isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-gray-200';
  const textPrimary = isDark ? 'text-white' : 'text-gray-900';
  const textSecondary = isDark ? 'text-slate-300' : 'text-gray-600';
  const textMuted = isDark ? 'text-slate-400' : 'text-gray-500';

  if (viewMode === 'list') {
    return (
      <div className={cn('flex gap-4 p-4 border rounded-xl', cardBg, 'hover:shadow-md transition-shadow cursor-pointer')} onClick={onView}>
        {/* Image */}
        <div className="relative w-32 h-32 flex-shrink-0">
          <img
            src={listing.photos?.[0] || 'https://via.placeholder.com/128?text=No+image'}
            alt={listing.titre}
            className="w-full h-full object-cover rounded-lg"
          />
          {listing.livraison_disponible && (
            <div className="absolute top-2 left-2 px-2 py-0.5 bg-blue-500 text-white text-xs font-medium rounded-full flex items-center gap-1">
              <Truck size={12} />
            </div>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <h3 className={cn('font-semibold truncate', textPrimary)}>{listing.titre}</h3>
              <div className="flex items-center gap-2 mt-1">
                <span className={cn('px-2 py-0.5 text-xs font-medium rounded-full', etat.color)}>
                  {etat.label}
                </span>
                <span className={cn('text-sm', textMuted)}>
                  {category?.icon} {category?.label}
                </span>
              </div>
            </div>
            <button
              onClick={(e) => { e.stopPropagation(); onToggleFavorite(); }}
              className={cn('p-2 rounded-lg transition-colors', isDark ? 'hover:bg-slate-700' : 'hover:bg-gray-100')}
            >
              <Heart size={20} className={isFavorite ? 'fill-red-500 text-red-500' : textMuted} />
            </button>
          </div>

          <p className={cn('text-sm mt-2 line-clamp-2', textSecondary)}>{listing.description}</p>

          <div className="flex items-center justify-between mt-3">
            <div>
              <p className="text-lg font-bold text-primary-500">
                {formatCurrency(listing.prix_unitaire)}/{listing.unite}
              </p>
              <p className={cn('text-sm', textMuted)}>
                {formatCurrency(totalPrice)} total ({listing.quantite} {listing.unite})
              </p>
            </div>
            <div className="text-right">
              <p className={cn('text-sm flex items-center gap-1', textSecondary)}>
                <MapPin size={14} />
                {listing.ville}
                {listing.distance !== undefined && (
                  <span className={textMuted}>• {formatDistance(listing.distance)}</span>
                )}
              </p>
              {listing.seller && (
                <p className={cn('text-sm flex items-center gap-1 justify-end', textMuted)}>
                  <Star size={14} className="text-amber-500 fill-amber-500" />
                  {listing.seller.rating} ({listing.seller.reviews} avis)
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Grid view (default)
  return (
    <div className={cn('border rounded-xl overflow-hidden', cardBg, 'hover:shadow-lg transition-shadow cursor-pointer group')} onClick={onView}>
      {/* Image */}
      <div className="relative aspect-[4/3]">
        <img
          src={listing.photos?.[0] || 'https://via.placeholder.com/300x225?text=No+image'}
          alt={listing.titre}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
        />

        {/* Badges */}
        <div className="absolute top-3 left-3 flex gap-2">
          {listing.livraison_disponible && (
            <span className="px-2 py-1 bg-blue-500 text-white text-xs font-medium rounded-full flex items-center gap-1">
              <Truck size={12} /> Livraison
            </span>
          )}
        </div>

        {/* Favorite button */}
        <button
          onClick={(e) => { e.stopPropagation(); onToggleFavorite(); }}
          className={cn(
            'absolute top-3 right-3 p-2 rounded-full transition-all',
            isFavorite ? 'bg-red-500 text-white' : 'bg-white/90 text-gray-600 hover:bg-white'
          )}
        >
          <Heart size={18} className={isFavorite ? 'fill-current' : ''} />
        </button>

        {/* Deal badge */}
        {listing.prix_unitaire < 5 && (
          <div className="absolute bottom-3 left-3 px-2 py-1 bg-green-500 text-white text-xs font-medium rounded-full flex items-center gap-1">
            <Tag size={12} /> Bon plan
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-4">
        <h3 className={cn('font-semibold line-clamp-1', textPrimary)}>{listing.titre}</h3>

        <div className="flex items-center gap-2 mt-1.5">
          <span className={cn('px-2 py-0.5 text-xs font-medium rounded-full', etat.color)}>
            {etat.label}
          </span>
          <span className={cn('text-xs', textMuted)}>
            {category?.label}
          </span>
        </div>

        <div className="mt-3">
          <p className="text-lg font-bold text-primary-500">
            {formatCurrency(listing.prix_unitaire)}/{listing.unite}
          </p>
          <p className={cn('text-sm', textMuted)}>
            {formatCurrency(totalPrice)} total
          </p>
        </div>

        <div className={cn('flex items-center justify-between mt-3 pt-3 border-t', isDark ? 'border-slate-700' : 'border-gray-100')}>
          <div className={cn('flex items-center gap-1 text-sm', textSecondary)}>
            <MapPin size={14} />
            <span>{listing.ville}</span>
            {listing.distance !== undefined && (
              <span className={textMuted}>• {formatDistance(listing.distance)}</span>
            )}
          </div>
          {listing.seller && (
            <div className={cn('flex items-center gap-1 text-sm', textMuted)}>
              <Star size={14} className="text-amber-500 fill-amber-500" />
              <span>{listing.seller.rating}</span>
            </div>
          )}
        </div>

        {/* Action buttons */}
        <div className="flex gap-2 mt-3">
          <Button
            variant="outline"
            size="sm"
            className="flex-1"
            onClick={(e) => { e.stopPropagation(); onContact(); }}
          >
            <MessageCircle size={16} className="mr-1.5" />
            Contacter
          </Button>
          <Button
            variant="primary"
            size="sm"
            className="flex-1"
            onClick={(e) => { e.stopPropagation(); onView(); }}
          >
            <Eye size={16} className="mr-1.5" />
            Voir
          </Button>
        </div>
      </div>
    </div>
  );
}

// ============ FILTER DROPDOWN COMPONENT ============

function FilterDropdown({ label, isOpen, onToggle, onClose, children, isDark, hasActiveFilters }) {
  const dropdownRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        onClose();
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen, onClose]);

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={onToggle}
        className={cn(
          'flex items-center gap-2 px-3 py-2 rounded-lg border text-sm font-medium transition-colors',
          isDark ? 'border-slate-600 text-slate-200 hover:bg-slate-700' : 'border-gray-200 text-gray-700 hover:bg-gray-50',
          hasActiveFilters && 'border-primary-500 text-primary-600 dark:text-primary-400'
        )}
      >
        {label}
        <ChevronDown size={16} className={cn('transition-transform', isOpen && 'rotate-180')} />
      </button>

      {isOpen && (
        <div className={cn(
          'absolute top-full left-0 mt-2 min-w-[200px] rounded-lg border shadow-lg z-50',
          isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-gray-200'
        )}>
          {children}
        </div>
      )}
    </div>
  );
}

// ============ SEARCH SUGGESTIONS COMPONENT ============

function SearchSuggestions({ query, history, suggestions, onSelect, onClear, isDark, isVisible }) {
  if (!isVisible) return null;

  const textPrimary = isDark ? 'text-white' : 'text-gray-900';
  const textMuted = isDark ? 'text-slate-400' : 'text-gray-500';

  return (
    <div className={cn(
      'absolute top-full left-0 right-0 mt-1 rounded-lg border shadow-lg z-50 max-h-64 overflow-y-auto',
      isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-gray-200'
    )}>
      {/* Search history */}
      {!query && history.length > 0 && (
        <div className="p-2">
          <div className="flex items-center justify-between px-2 py-1">
            <span className={cn('text-xs font-medium', textMuted)}>Recherches récentes</span>
            <button onClick={onClear} className={cn('text-xs', textMuted, 'hover:text-red-500')}>
              Effacer
            </button>
          </div>
          {history.map((item, index) => (
            <button
              key={index}
              onClick={() => onSelect(item)}
              className={cn(
                'w-full text-left px-3 py-2 rounded-md text-sm flex items-center gap-2',
                isDark ? 'hover:bg-slate-700' : 'hover:bg-gray-50',
                textPrimary
              )}
            >
              <Search size={14} className={textMuted} />
              {item}
            </button>
          ))}
        </div>
      )}

      {/* Suggestions */}
      {query && suggestions.length > 0 && (
        <div className="p-2">
          {suggestions.map((item, index) => (
            <button
              key={index}
              onClick={() => onSelect(item)}
              className={cn(
                'w-full text-left px-3 py-2 rounded-md text-sm',
                isDark ? 'hover:bg-slate-700' : 'hover:bg-gray-50',
                textPrimary
              )}
            >
              {item}
            </button>
          ))}
        </div>
      )}

      {/* No results */}
      {query && suggestions.length === 0 && (
        <div className={cn('p-4 text-center text-sm', textMuted)}>
          Aucune suggestion
        </div>
      )}
    </div>
  );
}

// ============ CONTACT MODAL COMPONENT ============

function ContactModal({ isOpen, onClose, listing, isDark }) {
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);

  const handleSend = async () => {
    setSending(true);
    // Simulate sending message
    await new Promise(resolve => setTimeout(resolve, 1000));
    setSending(false);
    onClose();
  };

  const defaultMessage = `Bonjour,\n\nJe suis intéressé(e) par votre annonce "${listing?.titre}".\n\nPouvez-vous me donner plus d'informations ?\n\nCordialement`;

  useEffect(() => {
    if (isOpen && !message) {
      setMessage(defaultMessage);
    }
  }, [isOpen, listing]);

  if (!listing) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="md">
      <ModalHeader>
        <ModalTitle>Contacter le vendeur</ModalTitle>
      </ModalHeader>
      <ModalBody>
        <div className={cn('p-3 rounded-lg mb-4', isDark ? 'bg-slate-700' : 'bg-gray-50')}>
          <p className={cn('font-medium', isDark ? 'text-white' : 'text-gray-900')}>{listing.titre}</p>
          <p className={cn('text-sm', isDark ? 'text-slate-300' : 'text-gray-600')}>
            {formatCurrency(listing.prix_unitaire)}/{listing.unite} • {listing.ville}
          </p>
        </div>

        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          rows={6}
          className={cn(
            'w-full px-3 py-2 border rounded-lg text-sm resize-none',
            isDark ? 'bg-slate-800 border-slate-600 text-white' : 'bg-white border-gray-200 text-gray-900'
          )}
          placeholder="Votre message..."
        />
      </ModalBody>
      <ModalFooter>
        <Button variant="ghost" onClick={onClose}>Annuler</Button>
        <Button variant="primary" onClick={handleSend} isLoading={sending}>
          <MessageCircle size={16} className="mr-1.5" />
          Envoyer
        </Button>
      </ModalFooter>
    </Modal>
  );
}

// ============ MAIN MARKETPLACE COMPONENT ============

/**
 * Marketplace - Materials marketplace with search, filters, and geolocation
 *
 * @param {Object} props
 * @param {string} [props.userId]
 * @param {boolean} [props.isDark]
 * @param {string} [props.couleur]
 * @param {Function} [props.setPage]
 * @param {Function} [props.showToast]
 */
export default function Marketplace({
  userId,
  isDark = false,
  couleur = '#f97316',
  setPage,
  showToast,
}) {
  // State
  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [page, setPageNum] = useState(0);
  const ITEMS_PER_PAGE = 20;

  // Search
  const { query, setQuery, debouncedQuery, isSearching } = useDebouncedSearch('', 300);
  const [searchHistory, setSearchHistory] = useState(getSearchHistory());
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [suggestions, setSuggestions] = useState([]);

  // Geolocation
  const [userLocation, setUserLocation] = useState(null);
  const [locationEnabled, setLocationEnabled] = useState(false);
  const [locationLoading, setLocationLoading] = useState(false);
  const [locationError, setLocationError] = useState(null);
  const [radius, setRadius] = useState(30);

  // Filters
  const [openFilter, setOpenFilter] = useState(null);
  const [selectedCategories, setSelectedCategories] = useState([]);
  const [priceRange, setPriceRange] = useState({ min: '', max: '' });
  const [selectedEtats, setSelectedEtats] = useState([]);
  const [livraisonOnly, setLivraisonOnly] = useState(false);
  const [sortBy, setSortBy] = useState('recent');

  // View mode
  const [viewMode, setViewMode] = useState('grid');

  // Favorites
  const [favorites, setFavorites] = useState(new Set());

  // Contact modal
  const [contactModalOpen, setContactModalOpen] = useState(false);
  const [selectedListing, setSelectedListing] = useState(null);

  // Refs
  const listContainerRef = useRef(null);

  // Theme classes
  const cardBg = isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-gray-200';
  const textPrimary = isDark ? 'text-white' : 'text-gray-900';
  const textSecondary = isDark ? 'text-slate-300' : 'text-gray-600';
  const textMuted = isDark ? 'text-slate-400' : 'text-gray-500';
  const inputBg = isDark ? 'bg-slate-700 border-slate-600 text-white' : 'bg-white border-gray-200';

  // Request user location
  const requestLocation = useCallback(() => {
    if (!navigator.geolocation) {
      setLocationError('La géolocalisation n\'est pas supportée par votre navigateur');
      return;
    }

    setLocationLoading(true);
    setLocationError(null);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setUserLocation({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        });
        setLocationEnabled(true);
        setLocationLoading(false);
      },
      (error) => {
        setLocationLoading(false);
        switch (error.code) {
          case error.PERMISSION_DENIED:
            setLocationError('Accès à la position refusé');
            break;
          case error.POSITION_UNAVAILABLE:
            setLocationError('Position indisponible');
            break;
          case error.TIMEOUT:
            setLocationError('Délai d\'attente dépassé');
            break;
          default:
            setLocationError('Erreur de géolocalisation');
        }
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  }, []);

  // Fetch listings
  const fetchListings = useCallback(async (reset = false) => {
    if (reset) {
      setLoading(true);
      setPageNum(0);
    } else {
      setLoadingMore(true);
    }

    try {
      let data;
      const currentPage = reset ? 0 : page;
      const offset = currentPage * ITEMS_PER_PAGE;

      if (isDemo || !supabase) {
        // Demo mode - filter locally
        await new Promise(resolve => setTimeout(resolve, 500));

        let filtered = [...DEMO_LISTINGS];

        // Apply search
        if (debouncedQuery) {
          const searchLower = debouncedQuery.toLowerCase();
          filtered = filtered.filter(l =>
            l.titre.toLowerCase().includes(searchLower) ||
            l.description.toLowerCase().includes(searchLower)
          );
        }

        // Apply category filter
        if (selectedCategories.length > 0) {
          filtered = filtered.filter(l => selectedCategories.includes(l.categorie));
        }

        // Apply state filter
        if (selectedEtats.length > 0) {
          filtered = filtered.filter(l => selectedEtats.includes(l.etat));
        }

        // Apply price filter
        if (priceRange.min) {
          filtered = filtered.filter(l => l.prix_unitaire >= parseFloat(priceRange.min));
        }
        if (priceRange.max) {
          filtered = filtered.filter(l => l.prix_unitaire <= parseFloat(priceRange.max));
        }

        // Apply delivery filter
        if (livraisonOnly) {
          filtered = filtered.filter(l => l.livraison_disponible);
        }

        // Calculate distances if location enabled
        if (userLocation) {
          filtered = filtered.map(l => ({
            ...l,
            distance: calculateDistance(userLocation.lat, userLocation.lng, l.latitude, l.longitude)
          }));

          // Filter by radius
          if (locationEnabled) {
            filtered = filtered.filter(l => l.distance <= radius);
          }
        }

        // Apply sorting
        switch (sortBy) {
          case 'prix_asc':
            filtered.sort((a, b) => a.prix_unitaire - b.prix_unitaire);
            break;
          case 'prix_desc':
            filtered.sort((a, b) => b.prix_unitaire - a.prix_unitaire);
            break;
          case 'distance':
            if (userLocation) {
              filtered.sort((a, b) => (a.distance || 999) - (b.distance || 999));
            }
            break;
          case 'rating':
            filtered.sort((a, b) => (b.seller?.rating || 0) - (a.seller?.rating || 0));
            break;
          default: // recent
            filtered.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
        }

        // Pagination
        const paginatedData = filtered.slice(offset, offset + ITEMS_PER_PAGE);
        data = paginatedData;
        setHasMore(offset + ITEMS_PER_PAGE < filtered.length);
      } else {
        // Real Supabase query
        let query = supabase
          .from('marketplace_listings')
          .select('*, seller:profiles(nom, rating, reviews_count)')
          .eq('status', 'active')
          .gte('expires_at', new Date().toISOString());

        // Apply text search
        if (debouncedQuery) {
          query = query.textSearch('titre_description', debouncedQuery, { config: 'french' });
        }

        // Apply filters
        if (selectedCategories.length > 0) {
          query = query.in('categorie', selectedCategories);
        }
        if (selectedEtats.length > 0) {
          query = query.in('etat', selectedEtats);
        }
        if (priceRange.min) {
          query = query.gte('prix_unitaire', parseFloat(priceRange.min));
        }
        if (priceRange.max) {
          query = query.lte('prix_unitaire', parseFloat(priceRange.max));
        }
        if (livraisonOnly) {
          query = query.eq('livraison_disponible', true);
        }

        // Location-based filtering
        if (locationEnabled && userLocation) {
          const { data: nearbyData } = await supabase.rpc('search_nearby_listings', {
            user_lat: userLocation.lat,
            user_lon: userLocation.lng,
            max_distance_km: radius,
          });
          if (nearbyData) {
            const ids = nearbyData.map(l => l.id);
            query = query.in('id', ids);
          }
        }

        // Sorting
        switch (sortBy) {
          case 'prix_asc':
            query = query.order('prix_unitaire', { ascending: true });
            break;
          case 'prix_desc':
            query = query.order('prix_unitaire', { ascending: false });
            break;
          case 'rating':
            query = query.order('seller_rating', { ascending: false });
            break;
          default:
            query = query.order('created_at', { ascending: false });
        }

        // Pagination
        query = query.range(offset, offset + ITEMS_PER_PAGE - 1);

        const { data: queryData, error } = await query;
        if (error) throw error;

        data = queryData || [];
        setHasMore(data.length === ITEMS_PER_PAGE);
      }

      if (reset) {
        setListings(data);
      } else {
        setListings(prev => [...prev, ...data]);
      }

      if (reset) {
        setPageNum(1);
      } else {
        setPageNum(prev => prev + 1);
      }

      // Save search to history
      if (debouncedQuery && reset) {
        addToSearchHistory(debouncedQuery);
        setSearchHistory(getSearchHistory());
      }
    } catch (error) {
      console.error('Error fetching listings:', error);
      showToast?.('Erreur lors du chargement des annonces', 'error');
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [
    debouncedQuery,
    selectedCategories,
    selectedEtats,
    priceRange,
    livraisonOnly,
    sortBy,
    userLocation,
    locationEnabled,
    radius,
    page,
    showToast,
  ]);

  // Initial fetch and refetch on filter changes
  useEffect(() => {
    fetchListings(true);
  }, [debouncedQuery, selectedCategories, selectedEtats, priceRange, livraisonOnly, sortBy, locationEnabled, radius]);

  // Infinite scroll
  useEffect(() => {
    const container = listContainerRef.current;
    if (!container) return;

    const handleScroll = () => {
      const { scrollTop, scrollHeight, clientHeight } = container;
      if (scrollHeight - scrollTop <= clientHeight * 1.5 && !loadingMore && hasMore) {
        fetchListings(false);
      }
    };

    container.addEventListener('scroll', handleScroll);
    return () => container.removeEventListener('scroll', handleScroll);
  }, [fetchListings, loadingMore, hasMore]);

  // Generate suggestions based on query
  useEffect(() => {
    if (!query) {
      setSuggestions([]);
      return;
    }

    // Generate suggestions from categories and common terms
    const lowerQuery = query.toLowerCase();
    const categoryMatches = CATEGORIES
      .filter(c => c.label.toLowerCase().includes(lowerQuery))
      .map(c => c.label);

    const commonTerms = [
      'Parpaings', 'Ciment', 'Tuiles', 'Briques', 'Câbles', 'Peinture',
      'Plinthes', 'Carrelage', 'Isolation', 'Vis', 'Boulons', 'Planches',
    ].filter(t => t.toLowerCase().includes(lowerQuery));

    setSuggestions([...new Set([...categoryMatches, ...commonTerms])].slice(0, 5));
  }, [query]);

  // Toggle favorite
  const toggleFavorite = useCallback(async (listingId) => {
    setFavorites(prev => {
      const next = new Set(prev);
      if (next.has(listingId)) {
        next.delete(listingId);
      } else {
        next.add(listingId);
      }
      return next;
    });

    // In real app, save to Supabase
    if (!isDemo && supabase && userId) {
      try {
        if (favorites.has(listingId)) {
          await supabase
            .from('marketplace_favoris')
            .delete()
            .eq('user_id', userId)
            .eq('listing_id', listingId);
        } else {
          await supabase
            .from('marketplace_favoris')
            .insert({ user_id: userId, listing_id: listingId });
        }
      } catch (error) {
        console.error('Error toggling favorite:', error);
      }
    }
  }, [userId, favorites]);

  // Handle contact
  const handleContact = useCallback((listing) => {
    setSelectedListing(listing);
    setContactModalOpen(true);
  }, []);

  // Handle view listing
  const handleViewListing = useCallback((listing) => {
    // Navigate to detail page (would be implemented with routing)
    console.log('View listing:', listing.id);
    showToast?.(`Voir annonce: ${listing.titre}`, 'info');
  }, [showToast]);

  // Clear search history
  const clearSearchHistory = useCallback(() => {
    localStorage.removeItem(SEARCH_HISTORY_KEY);
    setSearchHistory([]);
  }, []);

  // Reset filters
  const resetFilters = useCallback(() => {
    setSelectedCategories([]);
    setSelectedEtats([]);
    setPriceRange({ min: '', max: '' });
    setLivraisonOnly(false);
    setQuery('');
  }, [setQuery]);

  // Check if any filters are active
  const hasActiveFilters = selectedCategories.length > 0 || selectedEtats.length > 0 ||
    priceRange.min || priceRange.max || livraisonOnly;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl" style={{ background: `${couleur}20` }}>
            <Store size={24} style={{ color: couleur }} />
          </div>
          <div>
            <h1 className={cn('text-2xl font-bold', textPrimary)}>Marketplace Matériaux</h1>
            <p className={textMuted}>Achetez et vendez vos surplus de chantier</p>
          </div>
        </div>
        <Button
          variant="primary"
          onClick={() => showToast?.('Créer une annonce', 'info')}
          style={{ background: couleur }}
        >
          <Plus size={18} className="mr-1.5" />
          Vendre
        </Button>
      </div>

      {/* Search and Location */}
      <div className="flex flex-wrap gap-3">
        {/* Search */}
        <div className="relative flex-1 min-w-[250px]">
          <div className="relative">
            <Search size={18} className={cn('absolute left-3 top-1/2 -translate-y-1/2', textMuted)} />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onFocus={() => setShowSuggestions(true)}
              onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
              placeholder="Rechercher des matériaux..."
              className={cn(
                'w-full pl-10 pr-10 py-2.5 border rounded-xl text-sm',
                inputBg,
                'focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500'
              )}
            />
            {query && (
              <button
                onClick={() => setQuery('')}
                className={cn('absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-full', isDark ? 'hover:bg-slate-600' : 'hover:bg-gray-100')}
              >
                <X size={16} className={textMuted} />
              </button>
            )}
            {isSearching && (
              <Loader2 size={18} className={cn('absolute right-10 top-1/2 -translate-y-1/2 animate-spin', textMuted)} />
            )}
          </div>

          <SearchSuggestions
            query={query}
            history={searchHistory}
            suggestions={suggestions}
            onSelect={(item) => { setQuery(item); setShowSuggestions(false); }}
            onClear={clearSearchHistory}
            isDark={isDark}
            isVisible={showSuggestions && (searchHistory.length > 0 || suggestions.length > 0 || query)}
          />
        </div>

        {/* Location button */}
        <button
          onClick={requestLocation}
          disabled={locationLoading}
          className={cn(
            'flex items-center gap-2 px-4 py-2.5 rounded-xl border text-sm font-medium transition-colors',
            locationEnabled
              ? 'border-primary-500 bg-primary-50 text-primary-700 dark:bg-primary-900/20 dark:text-primary-400'
              : isDark ? 'border-slate-600 text-slate-200 hover:bg-slate-700' : 'border-gray-200 text-gray-700 hover:bg-gray-50'
          )}
        >
          {locationLoading ? (
            <Loader2 size={18} className="animate-spin" />
          ) : locationEnabled ? (
            <MapPin size={18} />
          ) : (
            <MapPinOff size={18} />
          )}
          <span>
            {locationEnabled ? `${radius}km` : 'Autour de moi'}
          </span>
          {locationEnabled && (
            <select
              value={radius}
              onChange={(e) => setRadius(parseInt(e.target.value))}
              onClick={(e) => e.stopPropagation()}
              className={cn('bg-transparent border-none text-sm font-medium focus:outline-none', textPrimary)}
            >
              {DISTANCE_OPTIONS.map(d => (
                <option key={d} value={d}>{d}km</option>
              ))}
            </select>
          )}
        </button>
      </div>

      {/* Location error */}
      {locationError && (
        <div className={cn('flex items-center gap-2 px-4 py-3 rounded-lg', isDark ? 'bg-red-900/20 text-red-400' : 'bg-red-50 text-red-600')}>
          <MapPinOff size={18} />
          <span className="text-sm">{locationError}</span>
          <button onClick={() => setLocationError(null)} className="ml-auto">
            <X size={16} />
          </button>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <span className={cn('text-sm font-medium', textMuted)}>Filtres :</span>

        {/* Categories filter */}
        <FilterDropdown
          label={selectedCategories.length > 0 ? `Catégories (${selectedCategories.length})` : 'Catégories'}
          isOpen={openFilter === 'categories'}
          onToggle={() => setOpenFilter(openFilter === 'categories' ? null : 'categories')}
          onClose={() => setOpenFilter(null)}
          isDark={isDark}
          hasActiveFilters={selectedCategories.length > 0}
        >
          <div className="p-2 max-h-64 overflow-y-auto">
            {CATEGORIES.map(cat => (
              <label
                key={cat.id}
                className={cn(
                  'flex items-center gap-3 px-3 py-2 rounded-md cursor-pointer',
                  isDark ? 'hover:bg-slate-700' : 'hover:bg-gray-50'
                )}
              >
                <input
                  type="checkbox"
                  checked={selectedCategories.includes(cat.id)}
                  onChange={(e) => {
                    if (e.target.checked) {
                      setSelectedCategories(prev => [...prev, cat.id]);
                    } else {
                      setSelectedCategories(prev => prev.filter(c => c !== cat.id));
                    }
                  }}
                  className="w-4 h-4 rounded border-gray-300 text-primary-500 focus:ring-primary-500"
                />
                <span>{cat.icon}</span>
                <span className={cn('text-sm', textPrimary)}>{cat.label}</span>
              </label>
            ))}
          </div>
        </FilterDropdown>

        {/* Price filter */}
        <FilterDropdown
          label={priceRange.min || priceRange.max ? 'Prix (actif)' : 'Prix'}
          isOpen={openFilter === 'prix'}
          onToggle={() => setOpenFilter(openFilter === 'prix' ? null : 'prix')}
          onClose={() => setOpenFilter(null)}
          isDark={isDark}
          hasActiveFilters={!!(priceRange.min || priceRange.max)}
        >
          <div className="p-4 space-y-3">
            <div className="flex items-center gap-2">
              <input
                type="number"
                placeholder="Min"
                value={priceRange.min}
                onChange={(e) => setPriceRange(prev => ({ ...prev, min: e.target.value }))}
                className={cn('w-24 px-3 py-2 border rounded-lg text-sm', inputBg)}
              />
              <span className={textMuted}>-</span>
              <input
                type="number"
                placeholder="Max"
                value={priceRange.max}
                onChange={(e) => setPriceRange(prev => ({ ...prev, max: e.target.value }))}
                className={cn('w-24 px-3 py-2 border rounded-lg text-sm', inputBg)}
              />
              <span className={cn('text-sm', textMuted)}>€</span>
            </div>
          </div>
        </FilterDropdown>

        {/* Condition filter */}
        <FilterDropdown
          label={selectedEtats.length > 0 ? `État (${selectedEtats.length})` : 'État'}
          isOpen={openFilter === 'etat'}
          onToggle={() => setOpenFilter(openFilter === 'etat' ? null : 'etat')}
          onClose={() => setOpenFilter(null)}
          isDark={isDark}
          hasActiveFilters={selectedEtats.length > 0}
        >
          <div className="p-2">
            {ETATS.map(etat => (
              <label
                key={etat.id}
                className={cn(
                  'flex items-center gap-3 px-3 py-2 rounded-md cursor-pointer',
                  isDark ? 'hover:bg-slate-700' : 'hover:bg-gray-50'
                )}
              >
                <input
                  type="checkbox"
                  checked={selectedEtats.includes(etat.id)}
                  onChange={(e) => {
                    if (e.target.checked) {
                      setSelectedEtats(prev => [...prev, etat.id]);
                    } else {
                      setSelectedEtats(prev => prev.filter(s => s !== etat.id));
                    }
                  }}
                  className="w-4 h-4 rounded border-gray-300 text-primary-500 focus:ring-primary-500"
                />
                <span className={cn('px-2 py-0.5 text-xs font-medium rounded-full', etat.color)}>
                  {etat.label}
                </span>
              </label>
            ))}
          </div>
        </FilterDropdown>

        {/* Delivery toggle */}
        <button
          onClick={() => setLivraisonOnly(!livraisonOnly)}
          className={cn(
            'flex items-center gap-2 px-3 py-2 rounded-lg border text-sm font-medium transition-colors',
            livraisonOnly
              ? 'border-primary-500 bg-primary-50 text-primary-700 dark:bg-primary-900/20 dark:text-primary-400'
              : isDark ? 'border-slate-600 text-slate-200 hover:bg-slate-700' : 'border-gray-200 text-gray-700 hover:bg-gray-50'
          )}
        >
          <Truck size={16} />
          Livraison
        </button>

        {/* Reset filters */}
        {hasActiveFilters && (
          <button
            onClick={resetFilters}
            className={cn('flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-red-600 hover:text-red-700')}
          >
            <X size={16} />
            Réinitialiser
          </button>
        )}
      </div>

      {/* Results header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <p className={cn('text-sm', textSecondary)}>
          <span className="font-semibold">{listings.length}</span> annonces
          {hasMore && ' • Défilez pour charger plus'}
        </p>

        <div className="flex items-center gap-3">
          {/* Sort */}
          <div className="flex items-center gap-2">
            <span className={cn('text-sm', textMuted)}>Trier par :</span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className={cn('px-3 py-1.5 border rounded-lg text-sm', inputBg)}
            >
              {SORT_OPTIONS.map(opt => (
                <option key={opt.id} value={opt.id}>{opt.label}</option>
              ))}
            </select>
          </div>

          {/* View mode */}
          <div className={cn('flex items-center border rounded-lg', isDark ? 'border-slate-600' : 'border-gray-200')}>
            <button
              onClick={() => setViewMode('grid')}
              className={cn(
                'p-2 rounded-l-lg transition-colors',
                viewMode === 'grid'
                  ? 'bg-primary-500 text-white'
                  : isDark ? 'text-slate-300 hover:bg-slate-700' : 'text-gray-600 hover:bg-gray-50'
              )}
            >
              <Grid3X3 size={18} />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={cn(
                'p-2 rounded-r-lg transition-colors',
                viewMode === 'list'
                  ? 'bg-primary-500 text-white'
                  : isDark ? 'text-slate-300 hover:bg-slate-700' : 'text-gray-600 hover:bg-gray-50'
              )}
            >
              <List size={18} />
            </button>
          </div>
        </div>
      </div>

      {/* Listings */}
      <div
        ref={listContainerRef}
        className="overflow-y-auto"
        style={{ maxHeight: 'calc(100vh - 400px)' }}
      >
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 size={32} className={cn('animate-spin', textMuted)} />
          </div>
        ) : listings.length === 0 ? (
          <div className={cn('text-center py-12 rounded-xl border', cardBg)}>
            <Store size={48} className={cn('mx-auto mb-4', textMuted)} />
            <h3 className={cn('text-lg font-semibold mb-2', textPrimary)}>
              Aucune annonce trouvée
            </h3>
            <p className={cn('mb-4', textMuted)}>
              Modifiez vos filtres ou créez une nouvelle annonce
            </p>
            <Button variant="primary" onClick={() => showToast?.('Créer une annonce', 'info')}>
              <Plus size={18} className="mr-1.5" />
              Créer une annonce
            </Button>
          </div>
        ) : (
          <>
            <div className={cn(
              'grid gap-4',
              viewMode === 'grid' ? 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3' : 'grid-cols-1'
            )}>
              {listings.map(listing => (
                <ListingCard
                  key={listing.id}
                  listing={listing}
                  isFavorite={favorites.has(listing.id)}
                  onToggleFavorite={() => toggleFavorite(listing.id)}
                  onContact={() => handleContact(listing)}
                  onView={() => handleViewListing(listing)}
                  isDark={isDark}
                  viewMode={viewMode}
                />
              ))}
            </div>

            {/* Loading more indicator */}
            {loadingMore && (
              <div className="flex items-center justify-center py-6">
                <Loader2 size={24} className={cn('animate-spin', textMuted)} />
              </div>
            )}

            {/* End of results */}
            {!hasMore && listings.length > 0 && (
              <p className={cn('text-center py-6 text-sm', textMuted)}>
                Fin des résultats
              </p>
            )}
          </>
        )}
      </div>

      {/* Contact Modal */}
      <ContactModal
        isOpen={contactModalOpen}
        onClose={() => setContactModalOpen(false)}
        listing={selectedListing}
        isDark={isDark}
      />
    </div>
  );
}
