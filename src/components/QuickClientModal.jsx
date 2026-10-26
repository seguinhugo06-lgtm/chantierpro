import { useState, useEffect, useRef } from 'react';
import { ChevronDown, AlertTriangle, Smartphone } from 'lucide-react';
import Modal, { ModalHeader, ModalTitle, ModalDescription, ModalBody, ModalFooter } from './ui/Modal';
import Champ from './ui/Champ';
import { Bouton } from './ui/Bouton';
import { Segmente } from './ui/Onglets';
import { useDuplicateCheck } from '../hooks/useDuplicateCheck';
import { pickContacts, isContactPickerSupported } from '../lib/contactPicker';

/**
 * QuickClientModal — création rapide d'un client : un nom et un téléphone ou un e-mail, le reste dans « Adresse,
 * entreprise… », avec détection de doublon en direct. Sur ui/Modal (portail, focus, Échap, feuille du bas au téléphone) et
 * `Champ` (libellé au-dessus, 48 px) : refonte du 26 oct. 2026 (Task 7 « ancien code »). Avant : en-tête en dégradé de la
 * couleur de l'entreprise (blanc sur orange ≈ 2,9:1), champs faits main, deux fenêtres empilées pour le doublon.
 */
const FORMULAIRE_VIDE = { nom: '', prenom: '', telephone: '', email: '', entreprise: '', adresse: '', categorie: 'Particulier', siret: '' };
const DOMAINES_DE_TEST = ['test.com', 'test.fr', 'example.com', 'foo.com', 'bar.com', 'mailinator.com'];

const emailValide = (email) => {
  if (!email) return true; // facultatif
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return false;
  const domaine = email.split('@')[1]?.toLowerCase();
  return !(domaine && DOMAINES_DE_TEST.includes(domaine));
};
const estDomaineDeTest = (email) => {
  if (!email) return false;
  const domaine = email.split('@')[1]?.toLowerCase();
  return !!domaine && DOMAINES_DE_TEST.includes(domaine);
};
// Numéro français : 10 chiffres, espaces, points et tirets permis
const telephoneValide = (tel) => {
  if (!tel) return true; // facultatif
  return /^(0[1-9])\d{8}$/.test(tel.replace(/[\s.\-]/g, ''));
};

export default function QuickClientModal({
  isOpen,
  onClose,
  onSubmit,
  existingClients = [],
  onViewClient,
}) {
  const [form, setForm] = useState(FORMULAIRE_VIDE);
  const [showDetails, setShowDetails] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const envoiEnCoursRef = useRef(false);
  const [pickingContact, setPickingContact] = useState(false);
  const contactPickerOk = isContactPickerSupported();
  const [errors, setErrors] = useState({});
  const [duplicates, setDuplicates] = useState([]);
  const [showDupeConfirm, setShowDupeConfirm] = useState(false);
  const dupeTimeoutRef = useRef(null);

  // Doublon d'e-mail : la détection commune
  const { emailDuplicates, checkField: checkDupeField, clearAll: clearDupeChecks } = useDuplicateCheck(existingClients, null, 300);

  // Doublon de téléphone ou de nom : cherché dans la liste des clients
  const checkDuplicates = (field, value) => {
    if (!value || !existingClients.length) { setDuplicates([]); return; }
    const found = [];
    const normaliser = (p) => (p || '').replace(/[\s.\-+]/g, '');
    if (field === 'telephone') {
      const propre = normaliser(value);
      if (propre.length >= 6) {
        existingClients.forEach((c) => { if (normaliser(c.telephone) === propre) found.push({ ...c, reason: 'Même téléphone' }); });
      }
    }
    if (field === 'nom') {
      const q = value.toLowerCase().trim();
      if (q.length >= 3) {
        existingClients.forEach((c) => {
          const complet = `${c.nom || ''} ${c.prenom || ''}`.toLowerCase().trim();
          const inverse = `${c.prenom || ''} ${c.nom || ''}`.toLowerCase().trim();
          if ((complet.includes(q) || inverse.includes(q) || q.includes((c.nom || '').toLowerCase())) && !found.some((f) => f.id === c.id)) {
            found.push({ ...c, reason: 'Nom similaire' });
          }
        });
      }
    }
    setDuplicates(found.slice(0, 3));
  };

  // Remplir le formulaire depuis un contact du répertoire téléphone (Chrome Android)
  const fillFromContact = async () => {
    setPickingContact(true);
    try {
      const [c] = await pickContacts({ multiple: false });
      if (c) {
        setForm((p) => ({
          ...p,
          nom: c.nom || p.nom,
          prenom: c.prenom || p.prenom,
          telephone: c.telephone || p.telephone,
          email: c.email || p.email,
          adresse: c.adresse || p.adresse,
        }));
        if (c.adresse || c.email) setShowDetails(true);
        setErrors({});
        if (c.telephone) setTimeout(() => checkDuplicates('telephone', c.telephone), 0);
      }
    } catch {
      // Annulation utilisateur (AbortError) → silencieux
    } finally {
      setPickingContact(false);
    }
  };

  // Le curseur arrive dans « Nom » à l'ouverture (la fenêtre met le focus sur son premier bouton, on le déplace ensuite)
  useEffect(() => {
    if (!isOpen) return undefined;
    const essayer = (tentative = 0) => {
      const champ = document.getElementById('qc-nom');
      if (champ) {
        champ.focus();
        if (document.activeElement !== champ && tentative < 3) setTimeout(() => essayer(tentative + 1), 150);
      } else if (tentative < 5) {
        setTimeout(() => essayer(tentative + 1), 100);
      }
    };
    const t = setTimeout(() => essayer(), 100);
    return () => clearTimeout(t);
  }, [isOpen]);

  // Fermée : le formulaire repart à zéro
  useEffect(() => {
    if (!isOpen) {
      setForm(FORMULAIRE_VIDE);
      setShowDetails(false);
      setIsSubmitting(false);
      setErrors({});
      setDuplicates([]);
      setShowDupeConfirm(false);
      clearDupeChecks();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  const doFinalSubmit = async () => {
    // Un seul envoi à la fois : plusieurs appuis sur Entrée créaient plusieurs clients.
    if (envoiEnCoursRef.current) return;
    envoiEnCoursRef.current = true;
    setErrors({});
    setIsSubmitting(true);
    const resultat = await onSubmit({
      nom: form.nom.trim(),
      prenom: form.prenom.trim(),
      telephone: form.telephone.trim(),
      email: form.email.trim(),
      entreprise: form.entreprise.trim(),
      adresse: form.adresse.trim(),
      categorie: form.categorie || '',
      siret: form.siret?.trim() || '',
    });
    envoiEnCoursRef.current = false;
    // Refusé par la base ou par la limite du plan : la fenêtre reste ouverte, la saisie n'est pas perdue.
    if (resultat === null || resultat === false) {
      setIsSubmitting(false);
      return;
    }
    onClose();
  };

  const handleSubmit = async (e) => {
    e?.preventDefault();
    const nouvelles = {};
    if (!form.nom.trim()) nouvelles.nom = 'Le nom est requis';
    // Il faut au moins un téléphone ou un e-mail
    if (!form.telephone.trim() && !form.email.trim()) nouvelles.telephone = 'Téléphone ou email requis';
    if (form.email && !emailValide(form.email)) {
      nouvelles.email = estDomaineDeTest(form.email) ? 'Domaine email non autorisé (@test.com, @example.com…)' : 'Format email invalide (ex: nom@email.fr)';
    }
    if (form.telephone && !telephoneValide(form.telephone)) nouvelles.telephone = 'Format téléphone invalide (ex: 06 12 34 56 78)';
    if (Object.keys(nouvelles).length > 0) {
      setErrors(nouvelles);
      if (nouvelles.nom) document.getElementById('qc-nom')?.focus();
      return;
    }
    // Doublon fort (téléphone ou e-mail) : on demande avant de créer
    if (duplicates.some((d) => d.reason === 'Même téléphone') || emailDuplicates.length > 0) {
      setShowDupeConfirm(true);
      return;
    }
    await doFinalSubmit();
  };

  const canSubmit = form.nom.trim().length > 0;
  const allerA = (id) => { setShowDupeConfirm(false); onClose(); setTimeout(() => onViewClient?.(id), 100); };

  // Les doublons forts, réunis pour la confirmation
  const doublonsForts = (() => {
    const vus = new Set();
    const reunis = [];
    [...duplicates.filter((d) => d.reason === 'Même téléphone'), ...emailDuplicates].forEach((d) => {
      if (!vus.has(d.id)) { vus.add(d.id); reunis.push(d); }
    });
    return reunis;
  })();

  // Étape de confirmation : la même fenêtre change de contenu (plus de fenêtres empilées)
  if (showDupeConfirm && doublonsForts.length > 0) {
    return (
      <Modal isOpen={isOpen} onClose={onClose} size="sm">
        <ModalHeader>
          <ModalTitle>Doublon potentiel</ModalTitle>
          <ModalDescription>Ce client semble être un doublon de :</ModalDescription>
        </ModalHeader>
        <ModalBody className="space-y-2">
          {doublonsForts.map((dup) => (
            <div key={dup.id} className="flex items-center justify-between gap-3 p-3 rounded-xl border border-bord bg-surface-2">
              <div className="min-w-0">
                <p className="font-semibold text-base text-encre truncate">{dup.nom} {dup.prenom || ''}</p>
                <p className="text-sm text-encre-2">
                  {dup.matchReason || dup.reason}
                  {dup.telephone && ` · ${dup.telephone}`}
                  {dup.email && ` · ${dup.email}`}
                </p>
              </div>
              {onViewClient && <Bouton variante="secondaire" taille="compacte" onClick={() => allerA(dup.id)}>Voir</Bouton>}
            </div>
          ))}
        </ModalBody>
        <ModalFooter>
          <Bouton variante="secondaire" onClick={() => setShowDupeConfirm(false)}>Annuler</Bouton>
          <Bouton variante="principal" onClick={async () => { setShowDupeConfirm(false); await doFinalSubmit(); }}>Créer quand même</Bouton>
        </ModalFooter>
      </Modal>
    );
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="md">
      <ModalHeader>
        <ModalTitle>Nouveau client</ModalTitle>
        <ModalDescription>Un nom et un téléphone ou un e‑mail suffisent.</ModalDescription>
      </ModalHeader>
      <form onSubmit={handleSubmit} noValidate className="flex flex-col min-h-0 flex-1">
        <ModalBody className="space-y-4">
          {/* Import depuis le répertoire téléphone (Chrome Android uniquement) */}
          {contactPickerOk && (
            <Bouton variante="secondaire" pleineLargeur icone={Smartphone} onClick={fillFromContact} disabled={pickingContact}>
              {pickingContact ? 'Ouverture du répertoire…' : 'Remplir depuis mes contacts'}
            </Bouton>
          )}

          <Champ
            id="qc-nom" libelle="Nom" type="text" placeholder="ex. Dupont" aria-required="true" erreur={errors.nom} value={form.nom}
            onChange={(e) => {
              const val = e.target.value;
              setForm((p) => ({ ...p, nom: val }));
              if (errors.nom) setErrors((p) => ({ ...p, nom: null }));
              clearTimeout(dupeTimeoutRef.current);
              dupeTimeoutRef.current = setTimeout(() => checkDuplicates('nom', val), 500);
            }}
            onBlur={() => { if (form.nom.trim() && form.nom.trim().length < 2) setErrors((p) => ({ ...p, nom: 'Le nom doit contenir au moins 2 caractères' })); }}
          />
          <Champ id="qc-prenom" libelle="Prénom" facultatif type="text" placeholder="ex. Jean" value={form.prenom} onChange={(e) => setForm((p) => ({ ...p, prenom: e.target.value }))} />
          <Champ
            id="qc-telephone" libelle="Téléphone" type="tel" placeholder="06 12 34 56 78" erreur={errors.telephone} value={form.telephone}
            onChange={(e) => {
              const val = e.target.value;
              setForm((p) => ({ ...p, telephone: val }));
              if (errors.telephone) setErrors((p) => ({ ...p, telephone: null }));
              clearTimeout(dupeTimeoutRef.current);
              dupeTimeoutRef.current = setTimeout(() => checkDuplicates('telephone', val), 500);
            }}
            onBlur={() => { if (form.telephone && !telephoneValide(form.telephone)) setErrors((p) => ({ ...p, telephone: 'Format invalide (ex: 06 12 34 56 78)' })); }}
          />

          <Segmente
            ariaLabel="Type de client" pleineLargeur valeur={form.categorie} onChange={(categorie) => setForm((p) => ({ ...p, categorie }))}
            options={[{ valeur: 'Particulier', libelle: 'Particulier' }, { valeur: 'Professionnel', libelle: 'Professionnel' }]}
          />

          <div>
            <Champ
              id="qc-email" libelle="Email" type="email" placeholder="ex. nom@email.fr" erreur={errors.email} value={form.email}
              onChange={(e) => {
                setForm((p) => ({ ...p, email: e.target.value }));
                if (errors.email) setErrors((p) => ({ ...p, email: null }));
                checkDupeField('email', e.target.value);
              }}
              onBlur={() => { if (form.email && !emailValide(form.email)) setErrors((p) => ({ ...p, email: estDomaineDeTest(form.email) ? 'Domaine email non autorisé' : 'Format email invalide (ex: nom@email.fr)' })); }}
            />
            {emailDuplicates.length > 0 && (
              <p className="mt-1.5 flex items-start gap-1.5 text-sm text-alerte-texte">
                <AlertTriangle size={15} aria-hidden="true" className="shrink-0 mt-0.5" />
                <span>
                  Un client avec cet email existe déjà : <strong>{emailDuplicates[0].nom} {emailDuplicates[0].prenom || ''}</strong>
                  {onViewClient && <button type="button" onClick={() => allerA(emailDuplicates[0].id)} className="ml-1 underline font-semibold">Voir la fiche</button>}
                </span>
              </p>
            )}
          </div>

          {/* Client déjà connu : par le nom ou le téléphone */}
          {duplicates.length > 0 && (
            <div className="rounded-xl p-3 bg-alerte-fond text-alerte-texte">
              <p className="flex items-center gap-2 text-sm font-semibold mb-1">
                <AlertTriangle size={15} aria-hidden="true" /> Client(s) similaire(s) détecté(s)
              </p>
              {duplicates.map((dup) => (
                <div key={dup.id} className="flex items-center gap-2 py-1">
                  <span className="flex-1 min-w-0 text-sm">
                    <span className="font-semibold">{dup.nom} {dup.prenom}</span>
                    {dup.telephone && <span> · {dup.telephone}</span>}
                    <span> ({dup.reason})</span>
                  </span>
                  {onViewClient && <button type="button" onClick={() => allerA(dup.id)} className="h-11 px-2 text-sm font-semibold underline">Voir</button>}
                </div>
              ))}
            </div>
          )}

          {/* Le reste : adresse, entreprise, SIRET */}
          <div className="border border-bord rounded-xl overflow-hidden">
            <button
              type="button" onClick={() => setShowDetails(!showDetails)} aria-expanded={showDetails}
              className="w-full min-h-[48px] px-4 flex items-center justify-between text-sm font-medium text-encre-2 hover:bg-surface-2 transition-colors"
            >
              {form.categorie === 'Professionnel' ? 'Entreprise, adresse…' : 'Adresse, entreprise…'}
              <ChevronDown size={18} aria-hidden="true" className={`text-encre-3 transition-transform ${showDetails ? 'rotate-180' : ''}`} />
            </button>
            {showDetails && (
              <div className="px-4 pb-4 pt-3 space-y-4 border-t border-bord">
                <Champ
                  id="qc-entreprise" libelle={form.categorie === 'Professionnel' ? 'Raison sociale' : 'Entreprise'} facultatif type="text"
                  placeholder={form.categorie === 'Professionnel' ? 'ex. SCI Martin' : ''} value={form.entreprise} onChange={(e) => setForm((p) => ({ ...p, entreprise: e.target.value }))}
                />
                {/* Facturation électronique : à partir de septembre 2026, une facture adressée à un professionnel doit porter son
                    SIRET. On le demande au moment où l'artisan déclare un pro, pas au moment où la facture part et où il est trop tard. */}
                {form.categorie === 'Professionnel' && (
                  <Champ
                    id="qc-siret" libelle="SIRET" facultatif type="text" inputMode="numeric" maxLength={17} placeholder="123 456 789 00012"
                    aide="Nécessaire pour lui adresser une facture électronique." value={form.siret} onChange={(e) => setForm((p) => ({ ...p, siret: e.target.value }))}
                  />
                )}
                <Champ
                  id="qc-adresse" as="textarea" libelle="Adresse" facultatif rows={2} placeholder="12 rue des Lilas, 75011 Paris"
                  value={form.adresse} onChange={(e) => setForm((p) => ({ ...p, adresse: e.target.value }))}
                />
              </div>
            )}
          </div>
        </ModalBody>
        <ModalFooter className="flex-col-reverse sm:flex-row">
          <Bouton variante="secondaire" onClick={onClose} className="w-full sm:w-auto">Annuler</Bouton>
          <Bouton variante="principal" type="submit" disabled={!canSubmit} chargement={isSubmitting} className="w-full sm:w-auto">
            {isSubmitting ? 'Ajout…' : 'Ajouter'}
          </Bouton>
        </ModalFooter>
      </form>
    </Modal>
  );
}
