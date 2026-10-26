import { useCallback, useEffect, useRef, useState } from 'react';
import { Camera, Check, FileText, Package, Plus, Search, Upload } from 'lucide-react';
import Modal, { ModalHeader, ModalTitle, ModalDescription, ModalBody, ModalFooter } from '../ui/Modal';
import { Bouton } from '../ui/Bouton';
import Champ from '../ui/Champ';
import EtatVide from '../ui/EtatVide';
import { useToast } from '../../context/AppContext';
import { formatMoney } from '../../lib/formatters';

/**
 * Les fenêtres du Catalogue qui ne sont ni un formulaire d'article ni un onglet de stock : l'import d'un fichier (association des
 * colonnes), le scanner de code-barres et « Ajouter au devis ». Toutes sur ui/Modal (rôle dialogue, focus, Échap, feuille du bas
 * au téléphone) : refonte du 26 oct. 2026 (Task 7 « ancien code »). Avant : six fenêtres faites main dans Catalogue.jsx, sans
 * rôle ni nom sur la croix.
 */

const CHAMPS_IMPORT = [
  { key: 'designation', label: 'Nom / Désignation' },
  { key: 'reference', label: 'Référence / SKU' },
  { key: 'description', label: 'Description' },
  { key: 'prix', label: 'Prix vente HT' },
  { key: 'prixAchat', label: 'Prix achat HT' },
  { key: 'unite', label: 'Unité' },
  { key: 'categorie', label: 'Catégorie' },
  { key: 'tva_rate', label: 'Taux TVA' },
  { key: 'stock', label: 'Stock' },
];

const SELECT = 'h-11 px-3 rounded-xl border border-bord-fort bg-surface text-base sm:text-sm text-encre cursor-pointer';

/** Import d'un fichier CSV : les colonnes du fichier, associées aux champs du catalogue. */
export function FenetreImportCsv({ donnees, mapping, setMapping, onFermer, onImporter, enCours }) {
  return (
    <Modal isOpen={!!donnees} onClose={onFermer} size="lg" closeOnBackdrop={!enCours} closeOnEscape={!enCours}>
      <ModalHeader>
        <ModalTitle>Import CSV : {donnees?.rows.length} ligne{donnees?.rows.length > 1 ? 's' : ''} détectée{donnees?.rows.length > 1 ? 's' : ''}</ModalTitle>
        <ModalDescription>Associez les colonnes de votre fichier aux champs du catalogue.</ModalDescription>
      </ModalHeader>
      <ModalBody className="space-y-4">
        <div className="space-y-3">
          {CHAMPS_IMPORT.map(({ key, label }) => (
            <div key={key} className="flex items-center gap-3">
              <label htmlFor={`import-${key}`} className={`text-sm w-40 flex-shrink-0 text-encre ${key === 'designation' ? 'font-semibold' : ''}`}>{label}</label>
              <select id={`import-${key}`} className={`flex-1 min-w-0 ${SELECT}`} value={mapping[key] || ''} onChange={(e) => setMapping((p) => ({ ...p, [key]: e.target.value }))}>
                <option value="">Ignorer</option>
                {donnees?.headers.map((h) => <option key={h} value={h}>{h}</option>)}
              </select>
            </div>
          ))}
        </div>
        <div className="rounded-xl p-3 bg-surface-2">
          <p className="text-sm font-semibold text-encre-2 mb-2">Aperçu (5 premières lignes)</p>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr>{donnees?.headers.slice(0, 6).map((h) => <th key={h} className="text-left p-1 text-encre-3 font-medium">{h}</th>)}</tr></thead>
              <tbody>
                {donnees?.rows.slice(0, 5).map((row, i) => (
                  <tr key={i} className="border-t border-bord">{donnees.headers.slice(0, 6).map((h) => <td key={h} className="p-1 text-encre">{row[h]}</td>)}</tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </ModalBody>
      <ModalFooter>
        <Bouton variante="secondaire" onClick={onFermer} disabled={enCours}>Annuler</Bouton>
        <Bouton variante="principal" icone={Upload} onClick={onImporter} disabled={!mapping.designation} chargement={enCours}>
          Importer {donnees?.rows.length} article{donnees?.rows.length > 1 ? 's' : ''}
        </Bouton>
      </ModalFooter>
    </Modal>
  );
}

/**
 * Scanner de code-barres : la caméra arrière, le code lu cherché d'abord dans le catalogue (référence, EAN), puis dans la
 * base ouverte Open Food Facts ; sans détecteur dans le navigateur, saisie du code à la main.
 */
export function FenetreScanner({ peutCreer = true, catalogue, onFermer, onVoirFiche, onCreer }) {
  const { showToast } = useToast();
  const videoRef = useRef(null);
  const fluxRef = useRef(null);
  const [resultat, setResultat] = useState(null);
  const [chargement, setChargement] = useState(false);

  const arreter = useCallback(() => {
    fluxRef.current?.getTracks().forEach((t) => t.stop());
    fluxRef.current = null;
  }, []);

  // La caméra s'ouvre avec la fenêtre et se coupe avec elle
  useEffect(() => {
    let annule = false;
    (async () => {
      try {
        const flux = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } } });
        if (annule) { flux.getTracks().forEach((t) => t.stop()); return; }
        fluxRef.current = flux;
        if (videoRef.current) { videoRef.current.srcObject = flux; videoRef.current.play?.()?.catch(() => { /* la vidéo a quitté l’écran avant de démarrer : rien à lancer */ }); }
      } catch {
        if (!annule) { showToast('Impossible d\'accéder à la caméra', 'error'); onFermer(); }
      }
    })();
    return () => { annule = true; arreter(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const chercher = useCallback(async (code) => {
    setChargement(true);
    // D'abord le catalogue (référence ou EAN)
    const local = catalogue.find((c) => (c.reference || '').toLowerCase() === code.toLowerCase() || (c.ean || c.barcode || '').toLowerCase() === code.toLowerCase());
    if (local) { setResultat({ trouve: true, local: true, article: local }); setChargement(false); return; }
    // Puis Open Food Facts (codes EAN)
    try {
      const reponse = await fetch(`https://world.openfoodfacts.org/api/v2/product/${code}.json`);
      if (reponse.ok) {
        const data = await reponse.json();
        if (data.status === 1 && data.product) {
          setResultat({
            trouve: true, local: false,
            produit: { nom: data.product.product_name || data.product.product_name_fr || code, marque: data.product.brands || '', code, image: data.product.image_front_small_url },
          });
          setChargement(false);
          return;
        }
      }
    } catch { /* base de codes-barres injoignable : on retombe sur « non trouvé » ci-dessous */ }
    setResultat({ trouve: false, code });
    setChargement(false);
  }, [catalogue]);

  // La vidéo revient à l'écran quand on rescanne : on lui redonne la caméra
  useEffect(() => {
    if (!resultat && videoRef.current && fluxRef.current) { videoRef.current.srcObject = fluxRef.current; videoRef.current.play?.()?.catch(() => { /* la vidéo a quitté l’écran avant de démarrer : rien à lancer */ }); }
  }, [resultat]);

  // Détection (API BarcodeDetector : Chrome, Edge) tant qu'aucun résultat n'est affiché
  useEffect(() => {
    if (resultat) return undefined;
    let actif = true;
    const demarrer = () => {
      if (!('BarcodeDetector' in window)) { setResultat({ sansDetecteur: true }); return; }
      try {
        const detecteur = new window.BarcodeDetector({ formats: ['ean_13', 'ean_8', 'code_128', 'code_39', 'qr_code'] });
        const boucle = async () => {
          if (!actif) return;
          if (!videoRef.current || videoRef.current.readyState < 2) { requestAnimationFrame(boucle); return; }
          try {
            const codes = await detecteur.detect(videoRef.current);
            if (codes.length > 0 && actif) { actif = false; chercher(codes[0].rawValue); } else if (actif) requestAnimationFrame(boucle);
          } catch {
            if (actif) setTimeout(boucle, 500);
          }
        };
        boucle();
      } catch { /* détecteur absent ou caméra refusée : la saisie manuelle reste disponible */ }
    };
    const t = setTimeout(demarrer, 500);
    return () => { actif = false; clearTimeout(t); };
  }, [resultat, chercher]);

  return (
    <Modal isOpen onClose={onFermer} size="md">
      <ModalHeader>
        <ModalTitle className="flex items-center gap-2"><Camera size={20} aria-hidden="true" className="text-encre-3" /> Scanner un code-barres</ModalTitle>
      </ModalHeader>
      {!resultat ? (
        <div className="relative">
          <video ref={videoRef} className="w-full aspect-video object-cover bg-black" autoPlay playsInline muted aria-label="Image de la caméra" />
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none" aria-hidden="true">
            <div className="relative w-64 h-32 border-2 border-white/60 rounded-xl" />
          </div>
          {chargement && (
            <div className="absolute inset-0 bg-black/50 flex items-center justify-center" role="status" aria-label="Recherche du produit">
              <div className="w-8 h-8 border-2 border-white border-t-transparent rounded-full animate-spin" />
            </div>
          )}
          <p className="absolute bottom-0 left-0 right-0 text-center text-white text-sm font-medium bg-black/50 py-2">Placez le code-barres dans le cadre</p>
        </div>
      ) : (
        <ModalBody>
          {resultat.sansDetecteur && (
            <form
              className="space-y-3 text-center"
              onSubmit={(e) => { e.preventDefault(); const v = e.target.elements.code.value.trim(); if (v) { setResultat(null); chercher(v); } }}
            >
              <p className="text-sm text-encre-2">Ce navigateur ne lit pas les codes-barres. Saisissez le code à la main :</p>
              <Champ id="scanner-code" name="code" libelle="Code-barres (EAN)" type="text" inputMode="numeric" autoFocus />
              <Bouton variante="principal" type="submit" pleineLargeur>Rechercher</Bouton>
            </form>
          )}
          {resultat.trouve && resultat.local && (
            <div className="text-center space-y-4">
              <span className="w-12 h-12 mx-auto rounded-full flex items-center justify-center bg-succes-fond text-succes-texte"><Check size={24} aria-hidden="true" /></span>
              <div>
                <p className="font-bold text-lg text-encre">{resultat.article.nom}</p>
                <p className="text-sm text-encre-2">Trouvé dans votre catalogue</p>
              </div>
              <div className="flex gap-2">
                <Bouton variante="principal" className="flex-1" onClick={() => onVoirFiche(resultat.article.id)}>Voir la fiche</Bouton>
                <Bouton variante="secondaire" className="flex-1" onClick={() => setResultat(null)}>Scanner encore</Bouton>
              </div>
            </div>
          )}
          {resultat.trouve && !resultat.local && resultat.produit && (
            <div className="text-center space-y-3">
              {resultat.produit.image ? <img src={resultat.produit.image} alt="" className="w-20 h-20 mx-auto object-contain rounded-lg" /> : <span className="w-12 h-12 mx-auto rounded-full flex items-center justify-center bg-info-fond text-info-texte"><Package size={24} aria-hidden="true" /></span>}
              <div>
                <p className="font-bold text-lg text-encre">{resultat.produit.nom}</p>
                {resultat.produit.marque && <p className="text-sm text-encre-2">{resultat.produit.marque}</p>}
                <p className="text-sm text-encre-3">Code : {resultat.produit.code}</p>
              </div>
              {peutCreer
                ? <Bouton variante="principal" icone={Plus} pleineLargeur onClick={() => onCreer({ nom: resultat.produit.nom, reference: resultat.produit.code })}>Ajouter au catalogue</Bouton>
                : <Bouton variante="secondaire" pleineLargeur onClick={() => setResultat(null)}>Scanner encore</Bouton>}
            </div>
          )}
          {!resultat.trouve && !resultat.sansDetecteur && (
            <div className="text-center space-y-4">
              <span className="w-12 h-12 mx-auto rounded-full flex items-center justify-center bg-alerte-fond text-alerte-texte"><Search size={24} aria-hidden="true" /></span>
              <div>
                <p className="font-bold text-lg text-encre">Produit non trouvé</p>
                <p className="text-sm text-encre-3">Code : {resultat.code}</p>
              </div>
              <div className="flex gap-2">
                {peutCreer && <Bouton variante="principal" className="flex-1" onClick={() => onCreer({ reference: resultat.code })}>Créer l'article</Bouton>}
                <Bouton variante={peutCreer ? 'secondaire' : 'principal'} className="flex-1" onClick={() => setResultat(null)}>Réessayer</Bouton>
              </div>
            </div>
          )}
        </ModalBody>
      )}
    </Modal>
  );
}

/** « Ajouter au devis » : un article, une quantité, dans un devis en brouillon (jamais dans un devis envoyé ou signé). */
export function FenetreAjoutDevis({ article, brouillons, clients, quantite, setQuantite, devisChoisi, setDevisChoisi, onFermer, onAjouter, onCreerDevis, enCours }) {
  return (
    <Modal isOpen={!!article} onClose={onFermer} size="sm" closeOnBackdrop={!enCours} closeOnEscape={!enCours}>
      <ModalHeader>
        <ModalTitle>Ajouter au devis</ModalTitle>
        <ModalDescription>
          <span className="font-semibold text-accent-texte">{article?.nom}</span> — {formatMoney(parseFloat(article?.prix) || 0)} / {article?.unite || 'u'}
        </ModalDescription>
      </ModalHeader>
      {brouillons.length === 0 ? (
        <ModalBody>
          <EtatVide
            icone={FileText} titre="Aucun devis brouillon" texte="Créez d'abord un devis pour y ajouter des articles."
            action={<Bouton variante="principal" onClick={onCreerDevis}>Créer un devis</Bouton>}
          />
        </ModalBody>
      ) : (
        <>
          <ModalBody className="space-y-4">
            <Champ id="ajout-devis-cible" as="select" libelle="Devis cible" value={devisChoisi || ''} onChange={(e) => setDevisChoisi(e.target.value)}>
              {brouillons.map((d) => {
                const client = clients.find((c) => c.id === (d.clientId || d.client_id));
                const nomClient = client?.nom || client?.name || d.clientNom || '';
                return <option key={d.id} value={d.id}>{d.numero || d.reference || `DEV-${d.id?.slice(0, 6)}`}{nomClient ? ` — ${nomClient}` : ''}</option>;
              })}
            </Champ>
            <Champ id="ajout-devis-quantite" libelle="Quantité" type="number" inputMode="decimal" min="1" value={quantite} onChange={(e) => setQuantite(Math.max(1, parseInt(e.target.value, 10) || 1))} />
            <div className="p-3 rounded-xl bg-surface-2 flex items-center justify-between">
              <span className="text-sm text-encre-2">Sous-total HT</span>
              <span className="text-lg font-bold tabular-nums text-encre">{formatMoney((parseFloat(article?.prix) || 0) * quantite, 2)}</span>
            </div>
          </ModalBody>
          <ModalFooter>
            <Bouton variante="secondaire" onClick={onFermer} disabled={enCours}>Annuler</Bouton>
            <Bouton variante="principal" icone={Plus} onClick={onAjouter} disabled={!devisChoisi} chargement={enCours}>Ajouter</Bouton>
          </ModalFooter>
        </>
      )}
    </Modal>
  );
}
