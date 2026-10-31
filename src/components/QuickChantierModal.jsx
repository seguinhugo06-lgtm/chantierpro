import { useState, useRef, useEffect } from 'react';
import { Check, ChevronDown, ChevronUp, User, Clock, Search } from 'lucide-react';
import Modal, { ModalHeader, ModalTitle, ModalDescription, ModalBody, ModalFooter } from './ui/Modal';
import Champ from './ui/Champ';
import { Bouton } from './ui/Bouton';
import { validateForm, hasErrors, chantierSchema } from '../lib/validation';

/**
 * QuickChantierModal — création ou modification d'un chantier avec le minimum : un nom et un client, le reste dans
 * « Plus de détails ». Sur ui/Modal (rôle dialogue, portail, focus, Échap, feuille du bas au téléphone) et `Champ` :
 * refonte du 26 oct. 2026 (Task 7 « ancien code », audit UX du 20 oct. : pas de rôle dialogue, astérisques rouges, encadré
 * Budget vert « succès », « Appuyez sur Entrée » affiché au téléphone, bouton désactivé orange pâle). `isDark` et
 * `couleur` sont encore passés par les appelants et ignorés ici : le thème suit les jetons.
 *
 * @param {object|null} editChantier un chantier à modifier au lieu d'en créer un
 * @param {string|null} clientInitial id du client choisi d'avance (création depuis sa fiche)
 * @param {boolean} voitPrix faux (chef de chantier, ouvrier) : ni budget ni objectif de coûts ; les valeurs déjà saisies sont conservées
 */
const FORMULAIRE_VIDE = {
  nom: '', client_id: '', adresse: '', ville: '', codePostal: '', date_debut: '', date_fin: '',
  budget_estime: '', // prix de vente prévu
  budget_materiaux: '', // budget des coûts de matériaux
  heures_estimees: '', // heures de travail prévues
  notes: '', description: '',
};
const CLES_RECENTS = 'mallettico_recent_clients';
const MAX_RECENTS = 5;

const clientsRecents = () => {
  try { return JSON.parse(localStorage.getItem(CLES_RECENTS) || '[]'); } catch { return []; }
};
const retenirClient = (clientId) => {
  try {
    const recents = clientsRecents().filter((id) => id !== clientId);
    recents.unshift(clientId);
    localStorage.setItem(CLES_RECENTS, JSON.stringify(recents.slice(0, MAX_RECENTS)));
  } catch { /* préférence non enregistrée : quota plein ou navigation privée */ }
};

export default function QuickChantierModal({
  isOpen,
  onClose,
  onSubmit,
  clients = [],
  devis = [],
  editChantier = null,
  clientInitial = null,
  voitPrix = false,
}) {
  const isEditMode = !!editChantier;
  const [form, setForm] = useState(FORMULAIRE_VIDE);
  const [showDetails, setShowDetails] = useState(false);
  const [showClientDropdown, setShowClientDropdown] = useState(false);
  const [clientSearch, setClientSearch] = useState('');
  const [errors, setErrors] = useState({});
  const dropdownRef = useRef(null);

  // Le curseur arrive dans « Nom » à l'ouverture (la fenêtre met d'abord le focus sur son premier bouton)
  useEffect(() => {
    if (!isOpen) return undefined;
    const t = setTimeout(() => document.getElementById('chantier-nom')?.focus(), 120);
    return () => clearTimeout(t);
  }, [isOpen]);

  // Un toucher en dehors de la liste des clients la referme
  useEffect(() => {
    const dehors = (e) => { if (dropdownRef.current && !dropdownRef.current.contains(e.target)) setShowClientDropdown(false); };
    document.addEventListener('mousedown', dehors);
    return () => document.removeEventListener('mousedown', dehors);
  }, []);

  // Fermée : le formulaire repart à zéro ; ouverte pour modifier : il se remplit avec le chantier
  useEffect(() => {
    if (!isOpen) {
      setForm(FORMULAIRE_VIDE);
      setShowDetails(false);
      setClientSearch('');
      setErrors({});
    } else if (editChantier) {
      setForm({
        nom: editChantier.nom || '',
        client_id: editChantier.client_id || editChantier.clientId || '',
        adresse: editChantier.adresse || '',
        ville: editChantier.ville || '',
        codePostal: editChantier.codePostal || '',
        date_debut: editChantier.dateDebut || editChantier.date_debut || '',
        date_fin: editChantier.dateFin || editChantier.date_fin || '',
        budget_estime: (editChantier.budget_estime || editChantier.budgetPrevu) ? (editChantier.budget_estime || editChantier.budgetPrevu).toString() : '',
        budget_materiaux: editChantier.budget_materiaux ? editChantier.budget_materiaux.toString() : '',
        heures_estimees: editChantier.heures_estimees ? editChantier.heures_estimees.toString() : '',
        notes: editChantier.notes || '',
        description: editChantier.description || '',
      });
      setShowDetails(true); // en modification, tout est visible
    } else if (clientInitial) {
      const c = clients.find((x) => x.id === clientInitial);
      if (c) setForm((prev) => ({ ...prev, client_id: c.id, adresse: c.adresse || prev.adresse }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, editChantier, clientInitial]);

  const recents = clientsRecents().map((id) => clients.find((c) => c.id === id)).filter(Boolean);
  const q = clientSearch.toLowerCase();
  const clientsFiltres = clients.filter((c) => c.nom?.toLowerCase().includes(q) || c.prenom?.toLowerCase().includes(q) || c.entreprise?.toLowerCase().includes(q));
  const client = clients.find((c) => c.id === form.client_id);
  // Devis signés du client, sur place (« accepte ») ou par le lien (« signe ») : de quoi remplir le budget
  const devisDuClient = devis.filter((d) => d.client_id === form.client_id && d.type !== 'facture' && ['accepte', 'signe'].includes(d.statut));

  const handleSubmit = (e) => {
    e?.preventDefault();
    const net = Object.fromEntries(Object.entries(form).map(([k, v]) => [k, typeof v === 'string' ? v.trim() : v]));
    setForm(net);
    const nouvelles = validateForm(net, chantierSchema);
    if (hasErrors(nouvelles)) {
      setErrors(nouvelles);
      if (nouvelles.nom) document.getElementById('chantier-nom')?.focus();
      else if (nouvelles.client_id) setShowClientDropdown(true);
      return;
    }
    setErrors({});
    const donnees = {
      ...net,
      budget_estime: net.budget_estime ? parseFloat(net.budget_estime) : 0,
      budget_materiaux: net.budget_materiaux ? parseFloat(net.budget_materiaux) : 0,
      heures_estimees: net.heures_estimees ? parseFloat(net.heures_estimees) : 0,
    };
    if (isEditMode && editChantier?.id) donnees.id = editChantier.id;
    onSubmit(donnees);
  };

  const choisirClient = (c) => {
    setForm((prev) => {
      const suivant = { ...prev, client_id: c.id, adresse: c.adresse || prev.adresse };
      // Code postal et ville lus dans l'adresse du client
      if (c.adresse && !prev.codePostal && !prev.ville) {
        const cp = c.adresse.match(/(\d{5})\s+(.+)$/);
        if (cp) { suivant.codePostal = cp[1]; suivant.ville = cp[2].replace(/,\s*$/, '').trim(); }
      }
      return suivant;
    });
    retenirClient(c.id);
    setClientSearch('');
    setShowClientDropdown(false);
  };

  const ligneClient = (c, cle, avecHorloge = false) => (
    <button
      key={cle} type="button" onClick={() => choisirClient(c)}
      className={`w-full min-h-[48px] px-4 py-2 text-left flex items-center gap-3 transition-colors hover:bg-surface-2 ${form.client_id === c.id ? 'bg-surface-2' : ''}`}
    >
      <span className="w-8 h-8 rounded-full bg-surface-2 text-encre-2 flex items-center justify-center text-sm font-semibold flex-shrink-0" aria-hidden="true">{c.nom?.[0]?.toUpperCase()}</span>
      <span className="flex-1 min-w-0">
        <span className="block text-base text-encre truncate">{c.nom} {c.prenom}</span>
        {c.entreprise && <span className="block text-sm text-encre-3 truncate">{c.entreprise}</span>}
      </span>
      {avecHorloge && <Clock size={14} aria-hidden="true" className="flex-shrink-0 text-encre-3" />}
    </button>
  );

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="md">
      <ModalHeader>
        <ModalTitle>{isEditMode ? 'Modifier le chantier' : 'Nouveau chantier'}</ModalTitle>
        <ModalDescription>{isEditMode ? 'Modifier les informations' : 'Un nom et un client suffisent.'}</ModalDescription>
      </ModalHeader>
      <form onSubmit={handleSubmit} noValidate className="flex flex-col min-h-0 flex-1">
        <ModalBody className="space-y-4">
          <Champ
            id="chantier-nom" libelle="Nom du chantier" type="text" placeholder="Ex: Rénovation cuisine, Extension garage..." aria-required="true"
            erreur={errors.nom} value={form.nom}
            onChange={(e) => { setForm((p) => ({ ...p, nom: e.target.value })); if (errors.nom) setErrors((p) => ({ ...p, nom: null })); }}
          />

          {/* Client : le bouton ouvre une liste avec recherche et derniers clients choisis */}
          <div ref={dropdownRef} className="relative">
            <label htmlFor="chantier-client" className="block mb-1.5 text-sm font-medium text-encre-2">Client</label>
            <button
              id="chantier-client" type="button" onClick={() => setShowClientDropdown(!showClientDropdown)}
              aria-expanded={showClientDropdown} aria-invalid={errors.client_id ? true : undefined}
              className={`w-full h-12 px-3.5 rounded-xl border bg-surface text-base text-left flex items-center justify-between gap-2 ${errors.client_id ? 'border-red-500' : 'border-bord-fort'}`}
            >
              {client ? (
                <span className="flex items-center gap-2 min-w-0 text-encre">
                  <User size={16} aria-hidden="true" className="flex-shrink-0 text-encre-3" />
                  <span className="truncate">{client.nom} {client.prenom}{client.entreprise ? ` (${client.entreprise})` : ''}</span>
                </span>
              ) : (
                <span className="text-encre-3">Sélectionner un client</span>
              )}
              <ChevronDown size={16} aria-hidden="true" className="flex-shrink-0 text-encre-3" />
            </button>
            {errors.client_id && <p className="mt-1.5 text-sm font-medium text-danger-texte">{errors.client_id}</p>}

            {showClientDropdown && (
              <div className="absolute z-10 w-full mt-1 bg-surface border border-bord rounded-xl shadow-e3 overflow-hidden">
                <div className="p-2 relative">
                  <Search size={16} aria-hidden="true" className="absolute left-5 top-1/2 -translate-y-1/2 text-encre-3 pointer-events-none" />
                  <input
                    type="text" value={clientSearch} onChange={(e) => setClientSearch(e.target.value)} placeholder="Rechercher un client..." aria-label="Rechercher un client"
                    className="w-full h-11 pl-9 pr-3 rounded-lg border border-bord-fort bg-surface text-base sm:text-sm text-encre placeholder:text-encre-3" autoFocus
                  />
                </div>
                <div className="max-h-52 overflow-y-auto">
                  {!clientSearch && recents.length > 0 && (
                    <>
                      <p className="px-4 pt-1 pb-1 text-sm font-semibold text-encre-3">Récents</p>
                      {recents.map((c) => ligneClient(c, `recent-${c.id}`, true))}
                      <p className="px-4 pt-2 pb-1 text-sm font-semibold text-encre-3 border-t border-bord">Tous</p>
                    </>
                  )}
                  {clientsFiltres.length > 0 ? clientsFiltres.map((c) => ligneClient(c, c.id)) : <p className="px-4 py-3 text-sm text-encre-3">Aucun client trouvé</p>}
                </div>
              </div>
            )}
          </div>

          {/* Budget : réservé à qui voit les prix. Un encadré neutre : le vert est celui du statut « acquis », pas d'une saisie. */}
          {voitPrix && (
            <div className="p-4 rounded-xl bg-surface-2 space-y-3">
              <div className="relative">
                <Champ
                  id="chantier-budget" libelle="Budget du chantier (€ HT)" type="number" inputMode="decimal" placeholder="15000"
                  aide={!form.budget_estime ? 'Montant que vous allez facturer au client' : undefined}
                  value={form.budget_estime} onChange={(e) => setForm((p) => ({ ...p, budget_estime: e.target.value }))}
                />
              </div>
              {devisDuClient.length > 0 && (
                <div>
                  <p className="text-sm font-medium text-encre-2 mb-2">Remplir depuis un devis accepté</p>
                  <div className="flex flex-wrap gap-2">
                    {devisDuClient.slice(0, 3).map((d) => {
                      const choisi = form.budget_estime === d.total_ht?.toString();
                      return (
                        <button
                          key={d.id} type="button" aria-pressed={choisi}
                          onClick={() => setForm((p) => ({ ...p, budget_estime: d.total_ht?.toString() || '' }))}
                          className={`h-11 px-4 rounded-full text-sm font-semibold tabular-nums transition-colors ${choisi ? 'bg-encre text-surface' : 'bg-surface border border-bord-fort text-encre hover:bg-bord'}`}
                        >
                          {d.total_ht?.toLocaleString('fr-FR')} €
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}

          <button
            type="button" onClick={() => setShowDetails(!showDetails)} aria-expanded={showDetails}
            className="w-full min-h-[44px] text-sm font-medium flex items-center justify-center gap-2 text-encre-2 hover:text-encre transition-colors"
          >
            {showDetails ? <ChevronUp size={16} aria-hidden="true" /> : <ChevronDown size={16} aria-hidden="true" />}
            {showDetails ? 'Moins de détails' : 'Plus de détails'}
          </button>

          {showDetails && (
            <div className="space-y-4">
              <Champ id="chantier-description" as="textarea" libelle="Description" facultatif rows={2} placeholder="Description du chantier..." value={form.description} onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))} />
              <Champ
                id="chantier-adresse" libelle="Adresse du chantier" facultatif type="text" placeholder="12 rue des Lilas, 75011 Paris" value={form.adresse}
                onChange={(e) => {
                  const adresse = e.target.value;
                  setForm((p) => {
                    const suivant = { ...p, adresse };
                    // Code postal et ville lus dans l'adresse
                    const cp = adresse.match(/(\d{5})\s+(.+)$/);
                    if (cp) { suivant.codePostal = cp[1]; suivant.ville = cp[2].replace(/,\s*$/, '').trim(); }
                    return suivant;
                  });
                }}
              />
              <div className="grid grid-cols-2 gap-3">
                <Champ id="chantier-codepostal" libelle="Code postal" facultatif type="text" inputMode="numeric" placeholder="75011" value={form.codePostal} onChange={(e) => setForm((p) => ({ ...p, codePostal: e.target.value }))} />
                <Champ id="chantier-ville" libelle="Ville" facultatif type="text" placeholder="Paris" value={form.ville} onChange={(e) => setForm((p) => ({ ...p, ville: e.target.value }))} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Champ id="chantier-date-debut" libelle="Début" facultatif type="date" value={form.date_debut} onChange={(e) => setForm((p) => ({ ...p, date_debut: e.target.value }))} />
                <Champ id="chantier-date-fin" libelle="Fin prévue" facultatif type="date" value={form.date_fin} onChange={(e) => setForm((p) => ({ ...p, date_fin: e.target.value }))} />
              </div>

              {/* Objectifs : les heures pour tous ; les coûts de matériaux seulement pour qui voit les prix */}
              <div className="p-4 rounded-xl bg-surface-2">
                <p className="text-sm font-semibold text-encre-2 mb-3">{voitPrix ? 'Objectif de coûts (facultatif)' : 'Objectif (facultatif)'}</p>
                <div className="grid grid-cols-2 gap-3">
                  {voitPrix && (
                    <Champ id="chantier-budget-materiaux" libelle="Matériaux (€)" type="number" inputMode="decimal" placeholder="5000" value={form.budget_materiaux} onChange={(e) => setForm((p) => ({ ...p, budget_materiaux: e.target.value }))} />
                  )}
                  <Champ id="chantier-heures" libelle="Heures prévues" type="number" inputMode="decimal" placeholder="40" value={form.heures_estimees} onChange={(e) => setForm((p) => ({ ...p, heures_estimees: e.target.value }))} />
                </div>
              </div>

              <Champ id="chantier-notes" as="textarea" libelle="Notes" facultatif rows={2} placeholder="Détails importants, contraintes d'accès, matériaux spécifiques..." value={form.notes} onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))} />
            </div>
          )}
        </ModalBody>
        <ModalFooter className="flex-col items-stretch gap-2">
          <Bouton variante="principal" taille="grande" type="submit" icone={Check} disabled={!form.nom.trim()} pleineLargeur>
            {isEditMode ? 'Enregistrer les modifications' : 'Créer le chantier'}
          </Bouton>
          <p className="indication-clavier text-center text-sm text-encre-3">Entrée pour {isEditMode ? 'enregistrer' : 'créer rapidement'}</p>
        </ModalFooter>
      </form>
    </Modal>
  );
}
