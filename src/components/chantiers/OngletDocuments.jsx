import { useState } from 'react';
import { FileText, FolderOpen, Download, X, Plus } from 'lucide-react';
import Carte from '../ui/Carte';
import EtatVide from '../ui/EtatVide';
import Champ from '../ui/Champ';
import { Bouton, BoutonIcone } from '../ui/Bouton';
import { PastilleStatut } from '../ui/Pastille';
import LigneListe, { GroupeListe } from '../ui/LigneListe';
import { TitreSection } from '../ui/EnTete';
import RapportChantier from './RapportChantier';
import { formatDevisNumber } from '../../lib/formatters';
import { statutFacture } from '../../lib/paiementsFacture';
import { estExpire } from '../../lib/validiteDevis';
import { dateLue } from '../../lib/dates';

const CATEGORIES_FICHIER = ['Plan', 'Permis', 'Attestation', 'Contrat', 'Autre'];
const TAILLE_MAX = 5 * 1024 * 1024;

const typeDuDocument = (d) => {
  if (d.facture_type === 'avoir') return 'Avoir';
  if (d.facture_type === 'acompte') return `Acompte${d.acompte_pct ? ` ${d.acompte_pct} %` : ''}`;
  if (d.facture_type === 'solde') return 'Solde';
  if (d.facture_type === 'situation') return `Situation${d.situation_numero ? ` n° ${d.situation_numero}` : ''}`;
  if (d.is_avenant) return `Avenant ${d.avenant_numero || ''}`.trim();
  return d.type === 'facture' ? 'Facture' : 'Devis';
};

/**
 * Onglet « Documents » de la fiche chantier : les devis et factures du chantier d'abord (avant : un onglet tout en bas,
 * qui ne montrait que les plans et les permis), puis les fichiers déposés (plans, permis, attestations) et les rapports.
 */
export default function OngletDocuments({
  chantier: ch, documents = [], paiements = [], entreprise, franchiseTva, modeDiscret, formatMoney, voitPrix = true, peutModifier, peutDevis,
  equipe, isDark, couleur, onOuvrirDocument, onCreerDevis, onAjouterFichier, onSupprimerFichier,
}) {
  const [nom, setNom] = useState('');
  const [categorie, setCategorie] = useState('Plan');
  const [fichier, setFichier] = useState(null);
  const [erreur, setErreur] = useState('');
  const [erreurFichier, setErreurFichier] = useState('');
  const fichiers = ch.documents || [];
  const tries = [...documents].sort((a, b) => String(b.date || '').localeCompare(String(a.date || '')));

  const ajouter = async () => {
    if (!nom.trim()) { setErreur('Donnez un nom au document.'); return; }
    if (fichier && fichier.size > TAILLE_MAX) { setErreurFichier('Fichier trop volumineux (5 Mo au plus).'); return; }
    setErreur('');
    setErreurFichier('');
    const ok = await onAjouterFichier({ nom: nom.trim(), categorie, fichier });
    if (ok) { setNom(''); setFichier(null); setCategorie('Plan'); setErreur(''); setErreurFichier(''); }
  };

  return (
    <div className="space-y-8">
      <section>
        <TitreSection titre="Devis et factures" compte={tries.length || undefined} />
        {tries.length === 0 ? (
          <Carte marge="aucun">
            <EtatVide
              icone={FileText} titre="Aucun devis ni facture"
              texte="Les devis et les factures liés à ce chantier apparaissent ici."
              action={peutDevis ? <Bouton variante="secondaire" icone={Plus} onClick={onCreerDevis}>Créer le devis</Bouton> : null}
              className="py-8"
            />
          </Carte>
        ) : (
          <GroupeListe>
            {tries.map((d) => {
              const facture = d.type === 'facture' && d.facture_type !== 'avoir';
              const statut = facture ? statutFacture(d, paiements) : (d.type === 'devis' && ['envoye', 'vu'].includes(d.statut) && estExpire(d, undefined, entreprise) ? 'expire' : d.statut);
              const jour = d.date ? dateLue(d.date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' }) : '';
              return (
                <LigneListe
                  key={d.id} onClick={() => onOuvrirDocument(d.id)}
                  aria-label={`Ouvrir ${d.numero || (d.type === 'facture' ? 'la facture' : 'le devis')}`}
                  titre={typeDuDocument(d)}
                  meta={[formatDevisNumber(d), jour, d.objet].filter(Boolean).join(' · ')}
                  montant={!voitPrix ? undefined : modeDiscret ? '···' : `${d.facture_type === 'avoir' ? '-' : ''}${formatMoney(Math.abs(Number(d.total_ht) || 0))}${franchiseTva ? '' : ' HT'}`}
                  pastille={<PastilleStatut genre={facture ? 'facture' : 'devis'} statut={statut} />}
                />
              );
            })}
          </GroupeListe>
        )}
      </section>

      <section>
        <TitreSection titre="Plans, permis, attestations" compte={fichiers.length || undefined} />
        {fichiers.length === 0 ? (
          <Carte marge="aucun">
            <EtatVide icone={FolderOpen} titre="Aucun fichier" texte="Ajoutez vos plans, permis et attestations." className="py-8" />
          </Carte>
        ) : (
          <Carte marge="aucun">
            <ul className="divide-y divide-bord">
              {fichiers.map((doc) => (
                <li key={doc.id} className="flex items-center gap-3 px-4 py-3">
                  <span className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 bg-accent/10 text-accent-texte" aria-hidden="true">
                    <FileText size={18} />
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-base font-semibold truncate text-encre">{doc.nom}</p>
                    <p className="text-sm text-encre-3">{doc.categorie} · {dateLue(doc.date).toLocaleDateString('fr-FR')}</p>
                  </div>
                  {doc.data && (
                    <a href={doc.data} download={doc.nom} aria-label={`Télécharger ${doc.nom}`} title="Télécharger" className="w-11 h-11 flex items-center justify-center rounded-xl text-encre-3 hover:bg-surface-2">
                      <Download size={18} aria-hidden="true" />
                    </a>
                  )}
                  {peutModifier && <BoutonIcone icone={X} libelle={`Supprimer ${doc.nom}`} taille={18} onClick={() => onSupprimerFichier(doc.id)} />}
                </li>
              ))}
            </ul>
          </Carte>
        )}

        {peutModifier && (
          <Carte className="mt-3">
            <p className="text-base font-semibold text-encre mb-3">Ajouter un fichier</p>
            <div className="grid gap-3 sm:grid-cols-2">
              <Champ libelle="Nom du document" placeholder="Ex: Plan RDC, Permis de construire..." value={nom} onChange={(e) => setNom(e.target.value)} erreur={erreur} />
              <Champ as="select" libelle="Catégorie" value={categorie} onChange={(e) => setCategorie(e.target.value)}>
                {CATEGORIES_FICHIER.map((c) => <option key={c} value={c}>{c}</option>)}
              </Champ>
            </div>
            <div className="mt-3">
              <label htmlFor="fichier-chantier" className="block mb-1.5 text-sm font-medium text-encre-2">Fichier <span className="font-normal text-encre-3">(facultatif)</span></label>
              <input
                id="fichier-chantier" type="file" accept=".pdf,.jpg,.jpeg,.png,.doc,.docx,.xls,.xlsx"
                onChange={(e) => { setFichier(e.target.files?.[0] || null); setErreurFichier(''); }}
                aria-invalid={erreurFichier ? 'true' : undefined} aria-describedby={erreurFichier ? 'fichier-chantier-erreur' : undefined}
                className="block w-full text-sm text-encre-2 file:mr-3 file:h-11 file:px-4 file:rounded-full file:border-0 file:bg-surface-2 file:text-encre file:font-semibold file:cursor-pointer"
              />
              {erreurFichier && <p id="fichier-chantier-erreur" role="alert" className="mt-1.5 text-sm font-medium text-danger-texte">{erreurFichier}</p>}
            </div>
            <Bouton variante="secondaire" icone={Plus} className="mt-4" onClick={ajouter}>Ajouter</Bouton>
          </Carte>
        )}
      </section>

      <section aria-label="Rapports de chantier">
        <RapportChantier chantier={ch} equipe={equipe} isDark={isDark} couleur={couleur} />
      </section>
    </div>
  );
}
