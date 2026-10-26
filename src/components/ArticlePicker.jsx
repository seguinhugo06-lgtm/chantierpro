/**
 * ArticlePicker — sélecteur d'article BTP en 4 étapes (« Référentiel BTP » du Catalogue).
 * Parcours : catégorie de métier → sous-catégorie → article → prix et quantité.
 *
 * Sur ui/Modal (rôle dialogue, focus, Échap, feuille du bas au téléphone) et `Champ` : refonte du 26 oct. 2026 (Task 7
 * « ancien code »). Avant : fenêtre faite main sans rôle, couleur de l'entreprise posée en style (barre d'avancement,
 * anneaux de focus), une teinte par métier, marge en vert / jaune / rouge. `isDark` et `couleur` sont encore passés par
 * l'appelant et ignorés ici.
 */
import { useState, useMemo } from 'react';
import { ChevronLeft, Plus, Tag, Info } from 'lucide-react';
import Modal, { ModalHeader, ModalTitle, ModalDescription, ModalBody, ModalFooter } from './ui/Modal';
import { Bouton, BoutonIcone } from './ui/Bouton';
import { ChampRecherche } from './ui/Filtres';
import LigneListe, { GroupeListe } from './ui/LigneListe';
import Carte from './ui/Carte';
import Champ from './ui/Champ';
import { achatConnu, margeBrute, niveauMarge, CLASSES_TON_MARGE } from '../lib/margeArticle';
import { formatMoney } from '../lib/formatters';
import { CATEGORIES_METIERS, getSousCategories, getArticlesBySousCategorie, searchAllArticles } from '../lib/data';

const CONSIGNES = { 1: 'Sélectionnez votre type d\'activité', 2: 'Sélectionnez une sous-catégorie', 3: 'Sélectionnez un article', 4: 'Ajustez les prix et la quantité' };
const ETIQUETTES_ETAPES = ['Catégorie', 'Type', 'Article', 'Config'];

export default function ArticlePicker({ isOpen, onClose, onSelect }) {
  const [step, setStep] = useState(1); // 1 : catégorie, 2 : sous-catégorie, 3 : article, 4 : prix
  const [selectedCategorie, setSelectedCategorie] = useState(null);
  const [selectedSousCategorie, setSelectedSousCategorie] = useState(null);
  const [selectedArticle, setSelectedArticle] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [customPrix, setCustomPrix] = useState(null);
  // Prix d'achat : un texte, vide tant que l'artisan ne l'a pas saisi (inconnu, jamais déduit du prix de vente)
  const [customPrixAchat, setCustomPrixAchat] = useState('');
  const [tva, setTva] = useState('10');
  const [quantite, setQuantite] = useState(1);

  // Fermer remet tout à zéro
  const handleClose = () => {
    setStep(1);
    setSelectedCategorie(null);
    setSelectedSousCategorie(null);
    setSelectedArticle(null);
    setSearchQuery('');
    setCustomPrix(null);
    setCustomPrixAchat('');
    setTva('10');
    setQuantite(1);
    onClose();
  };

  // Une étape en arrière
  const handleBack = () => {
    if (step === 4) {
      setStep(3);
      setCustomPrix(null);
      setCustomPrixAchat('');
    } else if (step === 3) {
      setStep(2);
      setSelectedArticle(null);
    } else if (step === 2) {
      setStep(1);
      setSelectedSousCategorie(null);
    }
  };

  const handleSelectCategorie = (cat) => { setSelectedCategorie(cat); setStep(2); setSearchQuery(''); };
  const handleSelectSousCategorie = (sousCat) => { setSelectedSousCategorie(sousCat); setStep(3); };
  const handleSelectArticle = (article) => {
    setSelectedArticle(article);
    setCustomPrix(article.prixDefaut);
    setCustomPrixAchat('');
    setStep(4);
  };

  const handleConfirm = () => {
    if (!selectedArticle) return;
    const catalogueItem = {
      id: crypto.randomUUID(),
      reference: `REF-${selectedArticle.id.toUpperCase().slice(0, 10)}`,
      nom: selectedArticle.nom,
      designation: selectedArticle.nom,
      description: '',
      unite: selectedArticle.unite,
      prixUnitaire: customPrix || selectedArticle.prixDefaut,
      prix_unitaire_ht: customPrix || selectedArticle.prixDefaut,
      prixAchat: achatConnu(customPrixAchat), // null = inconnu (avant : 60 % du prix de vente, inventé)
      tva: parseFloat(tva),
      categorie: selectedCategorie?.nom || 'Autre',
      favori: false,
      actif: true,
      quantite,
    };
    onSelect(catalogueItem);
    handleClose();
  };

  const searchResults = useMemo(() => (searchQuery.length < 2 ? [] : searchAllArticles(searchQuery).slice(0, 20)), [searchQuery]);
  const sousCategories = useMemo(() => (selectedCategorie ? getSousCategories(selectedCategorie.id) : []), [selectedCategorie]);
  const articles = useMemo(
    () => (selectedCategorie && selectedSousCategorie ? getArticlesBySousCategorie(selectedCategorie.id, selectedSousCategorie.id) : []),
    [selectedCategorie, selectedSousCategorie],
  );

  const marge = margeBrute(customPrix, customPrixAchat);
  const achatSaisi = achatConnu(customPrixAchat) !== null;
  const niveau = niveauMarge(marge);
  const classes = CLASSES_TON_MARGE[niveau.ton];
  const titre = { 1: 'Choisir une catégorie', 2: selectedCategorie?.nom, 3: selectedSousCategorie?.nom, 4: 'Configurer l\'article' }[step];
  const recherche = searchQuery.length >= 2 && step < 4;

  return (
    <Modal isOpen={isOpen} onClose={handleClose} size="lg">
      <ModalHeader>
        <div className="flex items-center gap-2">
          {step > 1 && <BoutonIcone icone={ChevronLeft} libelle="Retour" onClick={handleBack} className="-ml-2" />}
          <ModalTitle>{titre}</ModalTitle>
        </div>
        <ModalDescription>{CONSIGNES[step]}</ModalDescription>
      </ModalHeader>

      {/* Avancement : quatre étapes */}
      <div className="px-6 pt-3 pb-2 border-b border-bord">
        <div className="flex gap-1" aria-hidden="true">
          {[1, 2, 3, 4].map((s) => <div key={s} className={`h-1 flex-1 rounded-full transition-colors ${s <= step ? 'bg-accent' : 'bg-bord'}`} />)}
        </div>
        <div className="flex justify-between mt-1">
          {ETIQUETTES_ETAPES.map((e, i) => <span key={e} className={`text-xs ${step >= i + 1 ? 'text-encre-2 font-medium' : 'text-encre-3'}`}>{e}</span>)}
        </div>
      </div>

      {step < 4 && (
        <div className="px-6 py-3 border-b border-bord">
          <ChampRecherche valeur={searchQuery} onChange={setSearchQuery} placeholder="Rechercher un article..." ariaLabel="Rechercher un article" />
        </div>
      )}

      <ModalBody className="space-y-4">
        {/* Résultats de recherche : dans tout le référentiel */}
        {recherche && (
          <div className="space-y-2">
            <p className="text-sm text-encre-3">{searchResults.length} résultat{searchResults.length > 1 ? 's' : ''}</p>
            {searchResults.length > 0 ? (
              <GroupeListe>
                {searchResults.map((article) => (
                  <LigneListe
                    key={`${article.categorieId}-${article.sousCategorieId}-${article.id}`}
                    onClick={() => {
                      setSelectedCategorie(CATEGORIES_METIERS.find((c) => c.id === article.categorieId));
                      setSelectedSousCategorie({ id: article.sousCategorieId, nom: article.sousCategorieNom });
                      handleSelectArticle(article);
                    }}
                    titre={article.nom}
                    meta={`${article.categorieNom} → ${article.sousCategorieNom}`}
                    montant={`${formatMoney(article.prixDefaut)} / ${article.unite}`}
                  />
                ))}
              </GroupeListe>
            ) : (
              <p className="text-center py-8 text-encre-3">Aucun article trouvé</p>
            )}
          </div>
        )}

        {/* Étape 1 : les métiers */}
        {step === 1 && !recherche && (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {CATEGORIES_METIERS.map((cat) => (
              <Carte key={cat.id} as="button" marge="aucun" onClick={() => handleSelectCategorie(cat)} className="text-center p-4">
                <span className="w-12 h-12 mx-auto mb-2 rounded-xl bg-surface-2 flex items-center justify-center text-2xl" aria-hidden="true">{cat.icon}</span>
                <span className="block font-semibold text-sm text-encre">{cat.nom}</span>
              </Carte>
            ))}
          </div>
        )}

        {/* Étape 2 : les sous-catégories */}
        {step === 2 && !recherche && (
          <GroupeListe>
            {sousCategories.map((sousCat) => (
              <LigneListe
                key={sousCat.id}
                onClick={() => handleSelectSousCategorie(sousCat)}
                debut={<span className="w-10 h-10 rounded-lg bg-surface-2 text-encre-2 flex items-center justify-center"><Tag size={18} aria-hidden="true" /></span>}
                titre={sousCat.nom}
                meta={`${sousCat.articlesCount} articles`}
              />
            ))}
          </GroupeListe>
        )}

        {/* Étape 3 : les articles, avec le prix conseillé */}
        {step === 3 && !recherche && (
          <GroupeListe>
            {articles.map((article) => (
              <LigneListe
                key={article.id}
                onClick={() => handleSelectArticle(article)}
                titre={article.nom}
                meta={`${formatMoney(article.prixMin)} - ${formatMoney(article.prixMax)} / ${article.unite}`}
                montant={<span className="flex flex-col items-end leading-tight"><span>{formatMoney(article.prixDefaut)}</span><span className="text-xs font-medium text-encre-3">prix conseillé</span></span>}
              />
            ))}
          </GroupeListe>
        )}

        {/* Étape 4 : prix et quantité */}
        {step === 4 && selectedArticle && (
          <div className="space-y-5">
            <Carte>
              <div className="flex items-start gap-3">
                <span className="w-12 h-12 rounded-xl bg-surface-2 flex items-center justify-center text-xl flex-shrink-0" aria-hidden="true">{selectedCategorie?.icon}</span>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-base text-encre">{selectedArticle.nom}</p>
                  <p className="text-sm text-encre-3">{selectedCategorie?.nom} → {selectedSousCategorie?.nom}</p>
                  <p className="flex items-center gap-2 mt-2 text-sm text-encre-3">
                    <Info size={14} aria-hidden="true" className="flex-shrink-0" />
                    Prix marché : {formatMoney(selectedArticle.prixMin)} - {formatMoney(selectedArticle.prixMax)} / {selectedArticle.unite}
                  </p>
                </div>
              </div>
            </Carte>

            <div>
              <Champ
                id="picker-prix" libelle={`Prix de vente HT (€ / ${selectedArticle.unite})`} type="number" inputMode="decimal" min="0" step="0.01"
                value={customPrix || ''} onChange={(e) => setCustomPrix(parseFloat(e.target.value) || 0)}
              />
              <div className="flex gap-2 mt-2">
                {[selectedArticle.prixMin, selectedArticle.prixDefaut, selectedArticle.prixMax].map((prix, i) => (
                  <button
                    key={i} type="button" onClick={() => setCustomPrix(prix)} aria-pressed={customPrix === prix}
                    className={`flex-1 min-h-[52px] px-3 rounded-xl text-sm font-medium transition-colors ${customPrix === prix ? 'bg-encre text-surface' : 'bg-surface-2 text-encre-2 hover:bg-bord'}`}
                  >
                    {['Min', 'Moyen', 'Max'][i]}
                    <span className="block font-bold tabular-nums">{formatMoney(prix)}</span>
                  </button>
                ))}
              </div>
            </div>

            <Champ
              id="picker-achat" libelle="Prix d'achat HT" facultatif type="number" inputMode="decimal" min="0" step="0.01" placeholder="Vide si inconnu"
              value={customPrixAchat} onChange={(e) => setCustomPrixAchat(e.target.value)}
            />
            <Champ id="picker-tva" as="select" libelle="TVA" value={tva} onChange={(e) => setTva(e.target.value)}>
              <option value="20">20 %</option>
              <option value="10">10 %</option>
              <option value="5.5">5,5 %</option>
              <option value="0">0 %</option>
            </Champ>
            <Champ
              id="picker-quantite" libelle="Quantité par défaut" type="number" inputMode="decimal" min="0.01" step="0.01"
              value={quantite} onChange={(e) => setQuantite(parseFloat(e.target.value) || 1)}
            />

            {achatSaisi && marge !== null && (
              <Carte>
                <div className="flex items-center justify-between">
                  <span className="text-base text-encre-2">Marge brute</span>
                  <span className={`font-bold text-lg tabular-nums ${classes.texte}`}>{marge === null ? '—' : `${Math.round(marge)} %`} <span className="text-sm font-semibold">· {niveau.libelle}</span></span>
                </div>
                <div className="h-2 rounded-full mt-2 bg-bord" role="progressbar" aria-valuenow={Math.max(0, Math.min(Math.round(marge ?? 0), 100))} aria-valuemin={0} aria-valuemax={100} aria-label="Marge brute">
                  <div className={`h-full rounded-full transition-all ${classes.fond}`} style={{ width: `${Math.max(0, Math.min(marge ?? 0, 100))}%` }} />
                </div>
              </Carte>
            )}
          </div>
        )}
      </ModalBody>

      {step === 4 && (
        <ModalFooter>
          <Bouton variante="principal" taille="grande" icone={Plus} pleineLargeur onClick={handleConfirm}>Ajouter au catalogue</Bouton>
        </ModalFooter>
      )}
    </Modal>
  );
}
