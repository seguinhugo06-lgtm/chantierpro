import { createPortal } from 'react-dom';
import { useEffect } from 'react';
import { Download, X, Clock, Trash2 } from 'lucide-react';
import Modal, { ModalHeader, ModalTitle, ModalDescription, ModalBody, ModalFooter } from '../ui/Modal';
import { Bouton, BoutonIcone } from '../ui/Bouton';
import Champ from '../ui/Champ';
import { TAUX_DEPENSE } from '../../lib/tvaDepenses';
import { dateLue, jourLocal } from '../../lib/dates';

/**
 * Les fenêtres de la fiche chantier, toutes sur ui/Modal (portail, focus, Échap, feuille du bas au téléphone) : avant,
 * six fenêtres faites main sans rôle ni nom sur la croix (audit UX du 20 oct. 2026, § Task 9).
 */

const CATEGORIES_DEPENSE = ['Matériaux', 'Outillage', 'Location', 'Sous-traitance', 'Transport', 'Autre'];

/** « Ajouter une dépense » : un achat de matériel pour ce chantier (montant HT et TVA de la facture du fournisseur). */
export function FeuilleDepense({ ouvert, onFermer, onValider, depense, setDepense, franchiseTva, catalogue = [], fournituresManquantes = [], voitPrix = true, enCours = false }) {
  const majQuantitePrix = (quantite, prixUnitaire) => {
    const q = Math.max(1, parseInt(quantite) || 1);
    const prix = parseFloat(String(prixUnitaire).replace(',', '.')) || 0;
    setDepense((p) => ({ ...p, quantite: q, prixUnitaire: String(prixUnitaire), montant: String(prix * q) }));
  };
  const pasValide = !depense.description || !depense.montant;
  const htSaisi = parseFloat(String(depense.montant).replace(',', '.'));
  const tvaCalculee = depense.tauxTva !== '' && Number.isFinite(htSaisi)
    ? `Calculé : ${(Math.round(htSaisi * Number(depense.tauxTva)) / 100).toFixed(2).replace('.', ',')}`
    : 'Ex : 30,00';

  return (
    <Modal isOpen={ouvert} onClose={onFermer} size="md" closeOnBackdrop={!enCours} closeOnEscape={!enCours}>
      <ModalHeader>
        <ModalTitle>Ajouter une dépense</ModalTitle>
        <ModalDescription>Enregistrez un achat pour ce chantier.</ModalDescription>
      </ModalHeader>
      <ModalBody className="space-y-4">
        {fournituresManquantes.length > 0 && (
          <div className="p-3 rounded-xl bg-alerte-fond text-alerte-texte">
            <p className="text-sm font-semibold mb-2">Fournitures prévues au devis, pas encore achetées</p>
            <div className="flex flex-wrap gap-2">
              {fournituresManquantes.map((f, i) => (
                <button
                  key={i} type="button"
                  onClick={() => setDepense((p) => ({ ...p, description: f.description, montant: f.montant }))}
                  className="px-3 min-h-[44px] rounded-lg text-sm font-medium bg-surface text-encre hover:bg-surface-2 transition-colors"
                >
                  {f.description}
                </button>
              ))}
            </div>
          </div>
        )}

        {catalogue.length > 0 && (
          <Champ
            as="select" libelle="Depuis le catalogue" value={depense.catalogueId}
            onChange={(e) => {
              const article = catalogue.find((c) => c.id === e.target.value);
              if (!article) return;
              // Sans le droit de voir les prix, l'article donne sa description : le montant se saisit à la main
              const prix = voitPrix ? (article.prixAchat || article.prix || 0) : 0;
              setDepense((p) => ({ ...p, catalogueId: e.target.value, description: article.nom, prixUnitaire: voitPrix ? String(prix) : '', montant: voitPrix ? String(prix * (p.quantite || 1)) : '' }));
            }}
          >
            <option value="">Choisir un article...</option>
            {catalogue.map((c) => <option key={c.id} value={c.id}>{voitPrix ? `${c.nom} (${c.prixAchat || c.prix}€/${c.unite || 'unité'})` : c.nom}</option>)}
          </Champ>
        )}

        <Champ
          libelle="Description" placeholder="Ex: Sac de ciment 35kg" value={depense.description}
          onChange={(e) => setDepense((p) => ({ ...p, description: e.target.value }))}
        />

        {depense.catalogueId && (
          <div className="grid grid-cols-2 gap-3">
            <div>
              <p className="mb-1.5 text-sm font-medium text-encre-2">Quantité</p>
              <div className="flex items-center gap-2">
                <button type="button" aria-label="Une unité de moins" onClick={() => majQuantitePrix((parseInt(depense.quantite) || 1) - 1, depense.prixUnitaire)} className="w-12 h-12 rounded-xl flex items-center justify-center text-lg font-bold bg-surface-2 text-encre hover:bg-bord">-</button>
                <input
                  type="number" min="1" aria-label="Quantité" value={depense.quantite}
                  onChange={(e) => majQuantitePrix(e.target.value, depense.prixUnitaire)}
                  className="flex-1 min-w-0 h-12 px-2 border border-bord-fort rounded-xl text-center text-lg font-semibold bg-surface text-encre"
                />
                <button type="button" aria-label="Une unité de plus" onClick={() => majQuantitePrix((parseInt(depense.quantite) || 1) + 1, depense.prixUnitaire)} className="w-12 h-12 rounded-xl flex items-center justify-center text-lg font-bold bg-surface-2 text-encre hover:bg-bord">+</button>
              </div>
            </div>
            <Champ
              libelle={franchiseTva ? 'Prix unitaire (€)' : 'Prix unitaire HT (€)'} type="number" value={depense.prixUnitaire}
              onChange={(e) => majQuantitePrix(depense.quantite, e.target.value)}
            />
          </div>
        )}

        {/* Montant HT : c'est ce que compte la marge du chantier et ce que donne le catalogue (prix d'achat HT). */}
        <Champ
          id="depense-montant" libelle={franchiseTva ? 'Montant payé (€)' : 'Montant total HT (€)'} type="number" inputMode="decimal"
          placeholder="Ex: 150" value={depense.montant}
          onChange={(e) => setDepense((p) => ({ ...p, montant: e.target.value }))}
        />

        {!franchiseTva && (
          <Champ
            id="depense-tva" as="select" libelle="TVA de la facture du fournisseur" value={depense.tauxTva}
            onChange={(e) => setDepense((p) => ({ ...p, tauxTva: e.target.value }))}
            aide="Seule la TVA portée sur la facture se déduit. Sans taux ni montant de TVA, elle n’est pas comptée. Sous-traitance en autoliquidation : non gérée, voyez votre comptable."
          >
            {TAUX_DEPENSE.map((t) => <option key={t.valeur} value={t.valeur}>{t.libelle}</option>)}
          </Champ>
        )}

        {!franchiseTva && depense.tauxTva !== '0' && (
          <Champ
            id="depense-tva-montant" libelle="Montant de TVA écrit sur la facture (€)" facultatif type="text" inputMode="decimal"
            placeholder={tvaCalculee} value={depense.montantTva}
            onChange={(e) => setDepense((p) => ({ ...p, montantTva: e.target.value }))}
            aide="À remplir si la facture porte un autre montant (arrondis, plusieurs taux) : c’est lui qui se déduit."
          />
        )}

        <Champ as="select" libelle="Catégorie" value={depense.categorie} onChange={(e) => setDepense((p) => ({ ...p, categorie: e.target.value }))}>
          {CATEGORIES_DEPENSE.map((c) => <option key={c} value={c}>{c}</option>)}
        </Champ>
      </ModalBody>
      <ModalFooter>
        <Bouton variante="secondaire" onClick={onFermer} disabled={enCours}>Annuler</Bouton>
        <Bouton variante="principal" onClick={onValider} disabled={pasValide} chargement={enCours}>Enregistrer la dépense</Bouton>
      </ModalFooter>
    </Modal>
  );
}

/** « Pointer des heures » : la personne, le jour, le nombre d'heures. Sans équipe, on renvoie vers Équipe. */
export function FeuilleHeures({ ouvert, onFermer, onValider, heures, setHeures, equipe = [], onOuvrirEquipe, enCours = false }) {
  return (
    <Modal isOpen={ouvert} onClose={onFermer} size="md" closeOnBackdrop={!enCours} closeOnEscape={!enCours}>
      <ModalHeader>
        <ModalTitle>Pointer des heures</ModalTitle>
      </ModalHeader>
      {equipe.length === 0 ? (
        <>
          <ModalBody>
            <p className="text-sm text-encre-2">Pour pointer des heures, ajoutez d'abord la personne (vous-même ou un salarié) dans Équipe.</p>
          </ModalBody>
          <ModalFooter>
            <Bouton variante="secondaire" onClick={onFermer}>Fermer</Bouton>
            <Bouton variante="principal" onClick={onOuvrirEquipe}>Ouvrir Équipe</Bouton>
          </ModalFooter>
        </>
      ) : (
        <>
          <ModalBody className="space-y-4">
            <Champ as="select" libelle="Personne" value={heures.employeId} onChange={(e) => setHeures((p) => ({ ...p, employeId: e.target.value }))}>
              <option value="">Choisir…</option>
              {equipe.map((e) => <option key={e.id} value={e.id}>{e.nom} {e.prenom}</option>)}
            </Champ>
            <div className="grid grid-cols-2 gap-3">
              <Champ libelle="Date" type="date" value={heures.date} onChange={(e) => setHeures((p) => ({ ...p, date: e.target.value }))} />
              <Champ libelle="Nombre d'heures" type="number" step="0.5" inputMode="decimal" value={heures.heures} onChange={(e) => setHeures((p) => ({ ...p, heures: e.target.value }))} />
            </div>
            <Champ
              libelle="Travail réalisé" facultatif placeholder="Ex: Pose carrelage salle de bain..."
              value={heures.note} onChange={(e) => setHeures((p) => ({ ...p, note: e.target.value }))}
            />
          </ModalBody>
          <ModalFooter>
            <Bouton variante="secondaire" onClick={onFermer} disabled={enCours}>Annuler</Bouton>
            <Bouton variante="principal" onClick={onValider} chargement={enCours}>Ajouter</Bouton>
          </ModalFooter>
        </>
      )}
    </Modal>
  );
}

/** Le détail de la main-d'œuvre : un pointage par ligne (date et heures modifiables), le total dessous. */
export function DetailHeures({ ouvert, onFermer, pointages = [], equipe = [], coutHoraireDe, formatMoney, voitPrix = true, coutTotal, onModifier, onSupprimer, onAjouter }) {
  return (
    <Modal isOpen={ouvert} onClose={onFermer} size="lg">
      <ModalHeader>
        <ModalTitle>Détail main d'œuvre</ModalTitle>
      </ModalHeader>
      <ModalBody className="space-y-3">
        {pointages.length === 0 && <p className="text-center py-4 text-encre-3">Aucun pointage</p>}
        {pointages.map((p) => {
          const emp = equipe.find((e) => e.id === p.employeId);
          return (
            <div key={p.id} className={`p-3 rounded-xl bg-surface-2 ${p.verrouille ? 'opacity-60' : ''}`}>
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-sm font-semibold text-encre truncate">{emp?.nom || 'Personne supprimée'}</span>
                  {p.approuve === false && <span className="text-xs text-alerte-texte">en attente</span>}
                  {p.manuel && <span className="text-xs px-2 py-0.5 rounded-full bg-info-fond text-info-texte">Manuel</span>}
                </div>
                {!p.verrouille && onSupprimer && (
                  <BoutonIcone icone={Trash2} libelle="Supprimer le pointage" taille={16} onClick={() => onSupprimer(p.id)} />
                )}
              </div>
              <div className={`grid ${voitPrix ? 'grid-cols-3' : 'grid-cols-2'} gap-2 mt-2`}>
                <label className="text-sm text-encre-2">
                  Date
                  <input type="date" value={p.date} onChange={(e) => onModifier(p.id, 'date', e.target.value)} disabled={p.verrouille || !onModifier} className="mt-1 w-full h-11 px-2 border border-bord-fort rounded-lg text-sm bg-surface text-encre" />
                </label>
                <label className="text-sm text-encre-2">
                  Heures
                  <input type="number" step="0.5" value={p.heures} onChange={(e) => onModifier(p.id, 'heures', e.target.value)} disabled={p.verrouille || !onModifier} className="mt-1 w-full h-11 px-2 border border-bord-fort rounded-lg text-sm bg-surface text-encre" />
                </label>
                {voitPrix && (
                  <div className="text-sm text-encre-2">
                    Coût
                    <p className="mt-1 h-11 flex items-center font-bold tabular-nums text-encre">{formatMoney(p.heures * (coutHoraireDe(emp) || 0))}</p>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </ModalBody>
      <ModalFooter className="justify-between">
        {voitPrix ? (
          <div>
            <span className="text-sm text-encre-2">Total </span>
            <span className="text-xl font-bold tabular-nums text-encre">{formatMoney(coutTotal)}</span>
          </div>
        ) : <div />}
        <div className="flex gap-2">
          <Bouton variante="secondaire" onClick={onFermer}>Fermer</Bouton>
          {onAjouter && <Bouton variante="principal" icone={Clock} onClick={onAjouter}>Pointer des heures</Bouton>}
        </div>
      </ModalFooter>
    </Modal>
  );
}

/** Un revenu ou une dépense en plus du devis : travaux supplémentaires acceptés, remise, achat imprévu. */
export function FeuilleAjustement({ type, onFermer, onValider, valeur, setValeur, franchiseTva = false, enCours = false }) {
  const revenu = type === 'REVENU';
  return (
    <Modal isOpen={!!type} onClose={onFermer} size="sm" closeOnBackdrop={!enCours} closeOnEscape={!enCours}>
      <ModalHeader>
        <ModalTitle>{revenu ? 'Ajustement de revenu' : 'Ajustement de dépense'}</ModalTitle>
        <ModalDescription>{revenu ? 'Ex: Travaux supplémentaires acceptés' : 'Ex: Achat imprévu, sous-traitance...'}</ModalDescription>
      </ModalHeader>
      <ModalBody className="space-y-4">
        <Champ libelle="Libellé" placeholder="Ex: Travaux supplémentaires, Remise..." value={valeur.libelle} onChange={(e) => setValeur((p) => ({ ...p, libelle: e.target.value }))} />
        <Champ libelle={franchiseTva ? 'Montant (€)' : 'Montant HT (€)'} type="number" inputMode="decimal" value={valeur.montant_ht} onChange={(e) => setValeur((p) => ({ ...p, montant_ht: e.target.value }))} />
      </ModalBody>
      <ModalFooter>
        <Bouton variante="secondaire" onClick={onFermer} disabled={enCours}>Annuler</Bouton>
        <Bouton variante="principal" onClick={onValider} disabled={!valeur.libelle || !valeur.montant_ht} chargement={enCours}>Ajouter</Bouton>
      </ModalFooter>
    </Modal>
  );
}

/**
 * La photo en grand, avec son jour et son heure : la preuve en cas de litige. Un fond noir (une photo se regarde sur
 * noir), un nom, Échap pour fermer.
 */
export function VisionneusePhoto({ photo, chantier, onFermer }) {
  useEffect(() => {
    if (!photo) return undefined;
    const fermerSurEchap = (e) => { if (e.key === 'Escape') onFermer(); };
    document.addEventListener('keydown', fermerSurEchap);
    return () => document.removeEventListener('keydown', fermerSurEchap);
  }, [photo, onFermer]);
  if (!photo) return null;
  const jour = photo.date ? dateLue(photo.date) : null;
  return createPortal(
    <div
      role="dialog" aria-modal="true" aria-label="Photo du chantier en plein écran"
      className="fixed inset-0 z-[1060] bg-black/95 flex flex-col items-center justify-center p-4" onClick={onFermer}
    >
      <div className="absolute top-0 left-0 right-0 p-4 bg-gradient-to-b from-black/80 to-transparent z-10">
        <div className="flex items-start justify-between max-w-4xl mx-auto">
          <div className="text-white min-w-0">
            <p className="font-bold text-lg truncate">{chantier.nom}</p>
            <p className="text-sm opacity-80 truncate">{chantier.adresse || 'Adresse non renseignée'}</p>
          </div>
          <div className="flex items-center gap-1 flex-shrink-0">
            <a
              href={photo.src}
              download={`${chantier.nom?.replace(/\s+/g, '_')}_${photo.categorie}_${photo.date ? jourLocal(new Date(photo.date)) : 'photo'}.jpg`}
              onClick={(e) => e.stopPropagation()}
              aria-label="Télécharger la photo" title="Télécharger"
              className="w-12 h-12 flex items-center justify-center rounded-xl text-white hover:bg-white/20 transition-colors"
            >
              <Download size={22} aria-hidden="true" />
            </a>
            <button type="button" onClick={onFermer} aria-label="Fermer la photo" className="w-12 h-12 flex items-center justify-center rounded-xl text-white hover:bg-white/20 transition-colors">
              <X size={22} aria-hidden="true" />
            </button>
          </div>
        </div>
      </div>

      <img src={photo.src} className="max-w-full max-h-[70vh] object-contain rounded-xl shadow-2xl" alt={`Photo ${photo.categorie || ''} du chantier ${chantier.nom}`} onClick={(e) => e.stopPropagation()} />

      <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/90 to-transparent z-10">
        <div className="max-w-4xl mx-auto text-center text-white">
          <span className="inline-block px-4 py-2 rounded-lg font-bold text-sm bg-white/20 first-letter:uppercase">{photo.categorie}</span>
          <p className="mt-3 text-2xl font-bold">
            {jour ? jour.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }) : 'Date non disponible'}
          </p>
          {photo.date && (
            <p className="text-lg opacity-90 mt-1">{new Date(photo.date).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</p>
          )}
          <p className="text-sm opacity-70 mt-3 flex items-center justify-center gap-1"><Clock size={14} aria-hidden="true" /> Photo datée</p>
        </div>
      </div>
    </div>,
    document.body,
  );
}
