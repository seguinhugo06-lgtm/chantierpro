import { useState } from 'react';
import { ArrowLeft, Edit3, FileText, History, PackagePlus, Plus, Truck, ArrowRightLeft } from 'lucide-react';
import { Bouton, BoutonIcone } from '../ui/Bouton';
import Carte from '../ui/Carte';
import Champ from '../ui/Champ';
import LigneListe, { GroupeListe } from '../ui/LigneListe';
import Modal, { ModalHeader, ModalTitle, ModalDescription, ModalBody, ModalFooter } from '../ui/Modal';
import MenuActions from '../ui/MenuActions';
import Pastille from '../ui/Pastille';
import TuileChiffre from '../ui/TuileChiffre';
import { achatConnu, margeBrute, niveauMarge } from '../../lib/margeArticle';
import { formatMoney } from '../../lib/formatters';
import { dateLue } from '../../lib/dates';

const LIBELLE_MOUVEMENT = { in: 'Entrée', out: 'Sortie', return: 'Retour', adjustment: 'Ajustement' };

/**
 * La fiche d'un article du catalogue : qui il est, ce qu'il rapporte, ce qu'il en reste, où l'acheter. Refonte du 26 oct. 2026
 * (Task 7 « ancien code »). Chaque action passe par les droits de la page ; sans le droit de voir les prix (chef de chantier,
 * ouvrier : canViewPrices de usePermissions, une seule règle), aucun prix de vente, d'achat, aucune marge, aucun fournisseur
 * ni historique de prix : l'article, sa référence, son unité et son stock restent.
 * « Lier un fournisseur » ne passe plus par une boîte `prompt()` du navigateur : une fenêtre avec la liste des fournisseurs.
 */
export default function ArticleDetail({
  item, fournisseurs, liens, mouvements, historique, nbDevis, voitPrix, modeDiscret, franchiseTva = false, peutModifier, peutCreer, peutAjouterAuDevis,
  onRetour, onModifier, onDupliquer, onAjouterAuDevis, onLier, onVoirFournisseurs,
}) {
  const [lierOuvert, setLierOuvert] = useState(false);
  const [fournisseurId, setFournisseurId] = useState('');
  const [prix, setPrix] = useState('');

  const achat = achatConnu(item.prixAchat); // null = inconnu : jamais « Achat 0 € / Marge 100 % »
  const marge = margeBrute(item.prix, item.prixAchat);
  const niveau = niveauMarge(marge);
  const stock = item.stock_actuel ?? item.stock;
  const seuil = item.stock_seuil_alerte ?? item.stockMin;
  const stockBas = stock != null && seuil != null && seuil > 0 && stock < seuil;
  const masque = (valeur) => (modeDiscret ? '·····' : valeur);
  const liensDeLArticle = liens
    .filter((l) => l.articleId === item.id)
    .map((l) => ({ ...l, fournisseur: fournisseurs.find((f) => f.id === l.fournisseurId) }))
    .filter((l) => l.fournisseur)
    .sort((a, b) => (achatConnu(a.prixAchat) ?? Infinity) - (achatConnu(b.prixAchat) ?? Infinity));
  const dejaLies = liensDeLArticle.map((l) => l.fournisseurId);
  const fournisseursLibres = fournisseurs.filter((f) => !dejaLies.includes(f.id));
  const mouvementsDeLArticle = mouvements.filter((m) => m.articleId === item.id).slice(0, 15);

  const ouvrirLier = () => { setFournisseurId(fournisseursLibres[0]?.id || ''); setPrix(item.prixAchat?.toString() || ''); setLierOuvert(true); };

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-start gap-1">
        <BoutonIcone icone={ArrowLeft} libelle="Retour au catalogue" onClick={onRetour} className="-ml-2" />
        <div className="flex-1 min-w-0 pt-1">
          <h1 className="text-2xl font-bold text-encre leading-tight break-words">{item.nom}</h1>
          <p className="mt-1 text-sm text-encre-2">
            {item.reference && <span className="font-mono mr-1">{item.reference} ·</span>}
            {item.categorie} · {item.unite}{voitPrix && ` · TVA ${item.tva_rate || item.tva || 20} %`}
          </p>
          {item.description && <p className="mt-1 text-sm text-encre-3 line-clamp-3">{item.description}</p>}
          {nbDevis > 0 && <div className="mt-2"><Pastille ton="info" icone={FileText}>{nbDevis} devis</Pastille></div>}
        </div>
        <MenuActions
          titre="Actions sur l'article"
          actions={[
            { libelle: 'Modifier l\'article', icone: Edit3, onClick: onModifier, masque: !peutModifier },
            { libelle: 'Dupliquer', icone: PackagePlus, onClick: onDupliquer, masque: !peutCreer },
          ]}
        />
      </div>

      {peutAjouterAuDevis && voitPrix && (
        <Bouton variante="principal" taille="grande" icone={FileText} onClick={onAjouterAuDevis} className="w-full sm:w-auto">Ajouter au devis</Bouton>
      )}

      {/* Les chiffres : les prix seulement pour qui les voit ; le stock pour tous */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {voitPrix && <TuileChiffre libelle="Prix de vente" valeur={masque(formatMoney(item.prix))} contexte={`/ ${item.unite}`} />}
        {voitPrix && <TuileChiffre libelle="Prix d'achat" valeur={masque(achat !== null ? formatMoney(achat) : '—')} contexte={achat !== null ? `/ ${item.unite}` : 'Non renseigné'} />}
        {voitPrix && (
          <TuileChiffre
            libelle="Marge" valeur={masque(marge !== null ? `${marge.toFixed(0)} %` : '—')}
            contexte={marge === null ? 'Marge non calculée' : niveau.ton !== 'alerte' ? `${masque(formatMoney(item.prix - achat))} / ${item.unite} · ${niveau.libelle}` : undefined}
            alerte={marge !== null && niveau.ton === 'alerte' ? `${niveau.libelle} : ${masque(formatMoney(item.prix - achat))} / ${item.unite}` : undefined} tonAlerte="alerte"
          />
        )}
        <TuileChiffre
          libelle="Stock" valeur={stock != null ? String(stock) : '—'}
          contexte={!stockBas ? (stock != null && seuil ? 'En stock' : seuil ? `Minimum : ${seuil}` : 'Non suivi') : undefined}
          alerte={stockBas ? `Stock bas (minimum ${seuil})` : undefined} tonAlerte="alerte"
        />
      </div>

      {/* Où l'acheter : les fournisseurs et leurs prix d'achat */}
      {voitPrix && (
        <Carte>
          <div className="flex items-center justify-between gap-3 mb-3">
            <h2 className="flex items-center gap-2 text-lg font-semibold text-encre"><Truck size={18} aria-hidden="true" className="text-encre-3" /> Fournisseurs <span className="text-sm font-medium text-encre-3 tabular-nums">{liensDeLArticle.length}</span></h2>
            {peutModifier && fournisseurs.length > 0 && fournisseursLibres.length > 0 && <Bouton variante="discret" taille="compacte" icone={Plus} onClick={ouvrirLier}>Lier un fournisseur</Bouton>}
          </div>
          {liensDeLArticle.length === 0 ? (
            <p className="text-sm text-encre-2 py-2">
              {fournisseurs.length === 0
                ? <>Aucun fournisseur pour l'instant. <button type="button" onClick={onVoirFournisseurs} className="font-semibold text-accent-texte hover:underline">Ajouter un fournisseur</button></>
                : 'Aucun fournisseur lié à cet article.'}
            </p>
          ) : (
            <GroupeListe>
              {liensDeLArticle.map((l, i) => (
                <LigneListe
                  key={l.id} titre={l.fournisseur.nom}
                  meta={`${l.fournisseur.telephone || l.fournisseur.email || '—'} · délai ${l.fournisseur.delaiLivraison || '?'} j`}
                  montant={masque(achatConnu(l.prixAchat) !== null ? formatMoney(l.prixAchat) : '—')} pastille={i === 0 && liensDeLArticle.length > 1 && achatConnu(l.prixAchat) !== null ? <Pastille ton="succes">Meilleur prix</Pastille> : undefined}
                />
              ))}
            </GroupeListe>
          )}
        </Carte>
      )}

      {voitPrix && historique.length > 0 && (
        <Carte>
          <h2 className="flex items-center gap-2 text-lg font-semibold text-encre mb-3"><History size={18} aria-hidden="true" className="text-encre-3" /> Historique des prix</h2>
          <ul className="divide-y divide-bord">
            {historique.map((h) => (
              <li key={h.id} className="flex items-center justify-between gap-3 py-2 text-sm">
                <span className="text-encre-3">{dateLue(h.date).toLocaleDateString('fr-FR')}</span>
                <span className="text-encre tabular-nums">Vente : {masque(formatMoney(h.prixVente))} · Achat : {masque(achatConnu(h.prixAchat) !== null ? formatMoney(h.prixAchat) : '—')}</span>
              </li>
            ))}
          </ul>
        </Carte>
      )}

      <Carte>
        <h2 className="flex items-center gap-2 text-lg font-semibold text-encre mb-3"><ArrowRightLeft size={18} aria-hidden="true" className="text-encre-3" /> Mouvements récents</h2>
        {mouvementsDeLArticle.length === 0 ? (
          <p className="text-sm text-encre-2 py-2">Aucun mouvement enregistré.</p>
        ) : (
          <GroupeListe>
            {mouvementsDeLArticle.map((m) => (
              <LigneListe
                key={m.id} titre={`${LIBELLE_MOUVEMENT[m.type] || 'Ajustement'} : ${m.quantite} ${item.unite}`}
                meta={`${m.raison || '—'} · ${dateLue(m.date).toLocaleDateString('fr-FR')}`}
              />
            ))}
          </GroupeListe>
        )}
      </Carte>

      <Modal isOpen={lierOuvert} onClose={() => setLierOuvert(false)} size="sm">
        <ModalHeader>
          <ModalTitle>Lier un fournisseur</ModalTitle>
          <ModalDescription>{item.nom}</ModalDescription>
        </ModalHeader>
        <ModalBody className="space-y-4">
          <Champ id="lier-fournisseur" as="select" libelle="Fournisseur" value={fournisseurId} onChange={(e) => setFournisseurId(e.target.value)}>
            {fournisseursLibres.map((f) => <option key={f.id} value={f.id}>{f.nom}</option>)}
          </Champ>
          <Champ id="lier-prix-achat" libelle={franchiseTva ? "Prix d'achat chez ce fournisseur (€, TVA comprise)" : "Prix d'achat chez ce fournisseur (€ HT)"} type="number" inputMode="decimal" min="0" step="0.01" value={prix} onChange={(e) => setPrix(e.target.value)} />
        </ModalBody>
        <ModalFooter>
          <Bouton variante="secondaire" onClick={() => setLierOuvert(false)}>Annuler</Bouton>
          <Bouton variante="principal" disabled={!fournisseurId} onClick={() => { onLier(item.id, fournisseurId, prix); setLierOuvert(false); }}>Lier</Bouton>
        </ModalFooter>
      </Modal>
    </div>
  );
}
