import { useState, useMemo } from 'react';
import { Star, Package, Plus, Check, ArrowLeft, LayoutGrid, Paintbrush, Wrench, Zap, Construction, Axe, HardHat, Hammer, Truck, Tag } from 'lucide-react';
import Modal, { ModalHeader, ModalTitle, ModalDescription, ModalBody } from './ui/Modal';
import { BoutonIcone } from './ui/Bouton';
import { ChampRecherche } from './ui/Filtres';
import EtatVide from './ui/EtatVide';
import { useDebounce } from '../hooks/useDebounce';
import { formatMoney } from '../lib/formatters';

// Une icône par catégorie (lucide, comme partout) : le mot et l'icône disent la catégorie, pas une couleur
const ICONES_CATEGORIE = {
  Carrelage: LayoutGrid,
  Peinture: Paintbrush,
  Plomberie: Wrench,
  'Électricité': Zap,
  'Maçonnerie': Construction,
  Menuiserie: Axe,
  'Matériaux': Package,
  "Main d'oeuvre": HardHat,
  Outillage: Hammer,
  Location: Truck,
  Autre: Tag,
};
function IconeCategorie({ categorie, size = 20, className = '' }) {
  const Icone = ICONES_CATEGORIE[categorie] || ICONES_CATEGORIE.Autre;
  return <Icone size={size} aria-hidden="true" className={`text-encre-2 ${className}`} />;
}

/**
 * CatalogBrowser — grille du catalogue par catégories, pour choisir un article d'un geste dans un devis.
 * Sur ui/Modal (rôle dialogue, focus, Échap, feuille du bas au téléphone) : refonte du 26 oct. 2026 (Task 7 « ancien code »).
 * `isDark` et `couleur` sont encore passés par les appelants et ignorés ici : le thème suit les jetons.
 */
export default function CatalogBrowser({ catalogue = [], onSelectItem, onClose, isOpen = true }) {
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search, 300);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [addedItems, setAddedItems] = useState(new Set());

  const groupedItems = useMemo(() => {
    const groups = {};
    catalogue.forEach((item) => {
      const cat = item.categorie || 'Autre';
      if (!groups[cat]) groups[cat] = [];
      groups[cat].push(item);
    });
    return groups;
  }, [catalogue]);

  const favorites = useMemo(() => catalogue.filter((item) => item.favori), [catalogue]);

  const filteredItems = useMemo(() => {
    let items = selectedCategory ? (groupedItems[selectedCategory] || []) : catalogue;
    if (debouncedSearch.trim()) {
      const q = debouncedSearch.toLowerCase();
      items = items.filter((item) => item.nom?.toLowerCase().includes(q) || item.categorie?.toLowerCase().includes(q));
    }
    return items;
  }, [catalogue, groupedItems, selectedCategory, debouncedSearch]);

  const categories = useMemo(
    () => Object.keys(groupedItems).map((cat) => ({ name: cat, count: groupedItems[cat].length })),
    [groupedItems],
  );

  const handleSelectItem = (item) => {
    setAddedItems((prev) => new Set([...prev, item.id]));
    onSelectItem?.(item);
    // Un instant de retour visuel : la coche
    setTimeout(() => {
      setAddedItems((prev) => {
        const suivant = new Set(prev);
        suivant.delete(item.id);
        return suivant;
      });
    }, 1500);
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="lg">
      <ModalHeader>
        <ModalTitle>Catalogue</ModalTitle>
        <ModalDescription>{catalogue.length} article{catalogue.length > 1 ? 's' : ''}</ModalDescription>
      </ModalHeader>
      <div className="px-6 py-3 border-b border-bord">
        <ChampRecherche valeur={search} onChange={setSearch} placeholder="Rechercher un article..." ariaLabel="Rechercher un article" />
      </div>

      <ModalBody className="space-y-6">
        {/* Favoris */}
        {favorites.length > 0 && !search && !selectedCategory && (
          <section>
            <h3 className="flex items-center gap-2 text-base font-semibold text-encre mb-3">
              <Star size={16} aria-hidden="true" className="text-alerte-point" fill="currentColor" /> Favoris
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {favorites.slice(0, 6).map((item) => <CarteArticle key={item.id} item={item} onSelect={handleSelectItem} ajoute={addedItems.has(item.id)} />)}
            </div>
          </section>
        )}

        {/* Catégories */}
        {!search && !selectedCategory && catalogue.length > 0 && (
          <section>
            <h3 className="text-base font-semibold text-encre mb-3">Catégories</h3>
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
              {categories.map((cat) => (
                <button
                  key={cat.name} type="button" onClick={() => setSelectedCategory(cat.name)}
                  className="min-h-[88px] p-3 rounded-xl border border-bord bg-surface text-center transition-colors hover:border-bord-fort hover:bg-surface-2"
                >
                  <IconeCategorie categorie={cat.name} size={24} className="mx-auto mb-1" />
                  <span className="block text-sm font-medium truncate text-encre">{cat.name}</span>
                  <span className="block text-sm text-encre-3 tabular-nums">{cat.count}</span>
                </button>
              ))}
            </div>
          </section>
        )}

        {/* Une catégorie, ou le résultat d'une recherche */}
        {(selectedCategory || search) && (
          <section>
            {selectedCategory && (
              <div className="flex items-center gap-2 mb-3">
                <BoutonIcone icone={ArrowLeft} libelle="Retour aux catégories" onClick={() => setSelectedCategory(null)} className="-ml-2" />
                <IconeCategorie categorie={selectedCategory} size={20} />
                <h3 className="text-base font-semibold text-encre">{selectedCategory}</h3>
                <span className="text-sm text-encre-3 tabular-nums">({filteredItems.length})</span>
              </div>
            )}
            {filteredItems.length > 0 ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {filteredItems.map((item) => <CarteArticle key={item.id} item={item} onSelect={handleSelectItem} ajoute={addedItems.has(item.id)} />)}
              </div>
            ) : (
              <EtatVide icone={Package} titre="Aucun article trouvé" />
            )}
          </section>
        )}

        {catalogue.length === 0 && <EtatVide icone={Package} titre="Catalogue vide" texte="Ajoutez des articles dans le catalogue." />}
      </ModalBody>
    </Modal>
  );
}

/** Un article : son nom, son unité et son prix ; une coche un instant après le choix. */
function CarteArticle({ item, onSelect, ajoute }) {
  return (
    <button
      type="button" onClick={() => onSelect(item)} disabled={ajoute}
      className={`group min-h-[88px] p-3 rounded-xl border text-left transition-colors relative overflow-hidden ${ajoute ? 'border-succes-point bg-succes-fond' : 'border-bord bg-surface hover:border-bord-fort hover:bg-surface-2'}`}
    >
      {ajoute && (
        <span className="absolute inset-0 flex items-center justify-center text-succes-texte" role="status" aria-label="Ajouté">
          <Check size={28} aria-hidden="true" />
        </span>
      )}
      {item.favori && !ajoute && <Star size={12} aria-hidden="true" className="absolute top-2 right-2 text-alerte-point" fill="currentColor" />}
      <div className={ajoute ? 'opacity-30' : ''}>
        <div className="flex items-start gap-2 mb-2">
          <IconeCategorie categorie={item.categorie} size={18} className="flex-shrink-0 mt-0.5" />
          <p className="text-sm font-medium leading-tight line-clamp-2 text-encre">{item.nom}</p>
        </div>
        <div className="flex items-center justify-between gap-2">
          <span className="text-sm text-encre-3">{item.unite || 'unité'}</span>
          <span className="text-sm font-bold whitespace-nowrap tabular-nums text-encre">{formatMoney(item.prix || 0)}</span>
        </div>
      </div>
      {!ajoute && (
        <span className="absolute bottom-2 right-2 w-6 h-6 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-accent text-sur-accent" aria-hidden="true">
          <Plus size={14} />
        </span>
      )}
    </button>
  );
}
