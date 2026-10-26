import { AlertTriangle, ArrowLeft, Check, Download, Package, Plus, Sparkles, Upload } from 'lucide-react';
import { Bouton, BoutonIcone } from '../ui/Bouton';
import Carte from '../ui/Carte';
import EtatVide from '../ui/EtatVide';
import { CATEGORIES_METIERS, getSousCategories } from '../../lib/data';

const nbArticles = (metierId) => getSousCategories(metierId).reduce((s, sc) => s + sc.articlesCount, 0);

/**
 * Le premier usage du Catalogue vide : importer le référentiel BTP des métiers choisis, ajouter un article, ou importer un
 * fichier CSV. Une seule action pleine par étape. Refonte du 26 oct. 2026 (Task 7 « ancien code ») : avant, un dégradé de la
 * couleur de l'entreprise, trois boutons de poids égal et des marques de fournisseurs citées en exemple.
 *
 * @param {null|'metiers'|'importing'|'done'} etape
 */
export default function Demarrage({ peutCreer = true, etape, setEtape, metiersChoisis, setMetiersChoisis, progression, resultat, onImporter, onNouveau, onPasser, onCsv, onRetour }) {
  const total = metiersChoisis.reduce((s, id) => s + nbArticles(id), 0);
  return (
    <div className="space-y-5 max-w-3xl">
      <div className="flex items-center gap-2">
        {onRetour && <BoutonIcone icone={ArrowLeft} libelle="Retour à l'accueil" onClick={onRetour} className="-ml-2" />}
        <h1 className="text-2xl font-bold text-encre">Catalogue</h1>
      </div>

      {/* Sans le droit de créer un article : un état vide qui le dit, sans action ni promesse de tarifs ou de marges */}
      {!etape && !peutCreer && (
        <Carte marge="aucun">
          <EtatVide icone={Package} titre="Le catalogue est vide" texte="Aucun article n'a encore été ajouté." />
        </Carte>
      )}

      {!etape && peutCreer && (
        <>
          <Carte marge="aucun">
            <EtatVide
              icone={Package} titre="Votre catalogue est vide"
              texte="Centralisez vos matériaux, vos tarifs et vos marges. Commencez avec les articles du référentiel BTP, ou ajoutez les vôtres."
              action={(
                <div className="flex flex-col items-center gap-2">
                  <Bouton variante="principal" taille="grande" icone={Sparkles} onClick={() => setEtape('metiers')}>Importer le référentiel BTP</Bouton>
                  <Bouton variante="secondaire" icone={Plus} onClick={onNouveau}>Ajouter un article</Bouton>
                  <Bouton variante="discret" onClick={onPasser}>Passer</Bouton>
                </div>
              )}
            />
          </Carte>
          <Carte className="flex items-center gap-3 flex-wrap">
            <div className="flex-1 min-w-[12rem]">
              <p className="text-base font-semibold text-encre">Importez vos tarifs fournisseurs</p>
              <p className="text-sm text-encre-2">Un fichier CSV : vous associez ensuite ses colonnes aux champs du catalogue.</p>
            </div>
            <Bouton variante="secondaire" icone={Upload} onClick={onCsv}>Importer un fichier CSV</Bouton>
          </Carte>
        </>
      )}

      {etape === 'metiers' && (
        <Carte marge="large">
          <div className="flex items-center gap-2 mb-1">
            <BoutonIcone icone={ArrowLeft} libelle="Retour" onClick={() => setEtape(null)} className="-ml-2" />
            <h2 className="text-xl font-bold text-encre">Choisissez vos métiers</h2>
          </div>
          <p className="text-sm text-encre-2 mb-5">Sélectionnez un ou plusieurs métiers pour importer les articles correspondants.</p>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 mb-6">
            {CATEGORIES_METIERS.map((cat) => {
              const choisi = metiersChoisis.includes(cat.id);
              return (
                <button
                  key={cat.id} type="button" aria-pressed={choisi}
                  onClick={() => setMetiersChoisis((prev) => (choisi ? prev.filter((id) => id !== cat.id) : [...prev, cat.id]))}
                  className={`relative min-h-[96px] p-4 rounded-xl border-2 text-center transition-colors ${choisi ? 'border-accent bg-accent/10' : 'border-bord hover:border-bord-fort hover:bg-surface-2'}`}
                >
                  {choisi && <span className="absolute top-2 right-2 w-5 h-5 rounded-full flex items-center justify-center bg-accent text-sur-accent" aria-hidden="true"><Check size={12} /></span>}
                  <span className="block text-3xl mb-1" aria-hidden="true">{cat.icon}</span>
                  <span className="block font-semibold text-sm text-encre">{cat.nom}</span>
                  <span className="block text-sm text-encre-3 tabular-nums">{nbArticles(cat.id)} articles</span>
                </button>
              );
            })}
          </div>
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <p className="text-sm text-encre-2">{metiersChoisis.length > 0 ? `${metiersChoisis.length} métier${metiersChoisis.length > 1 ? 's' : ''} sélectionné${metiersChoisis.length > 1 ? 's' : ''}` : 'Aucun métier sélectionné'}</p>
            <Bouton variante="principal" icone={Download} disabled={metiersChoisis.length === 0} onClick={() => onImporter(metiersChoisis)}>
              Importer{metiersChoisis.length > 0 ? ` (${total} articles)` : ''}
            </Bouton>
          </div>
        </Carte>
      )}

      {etape === 'importing' && (
        <Carte marge="large" className="text-center">
          <div role="status">
            <Download size={32} aria-hidden="true" className="mx-auto mb-4 text-encre-3 animate-pulse" />
            <h2 className="text-xl font-bold text-encre mb-1">Import en cours…</h2>
            <p className="text-sm text-encre-2 mb-5">Ajout des articles depuis le référentiel BTP. Gardez cette page ouverte.</p>
            <div className="w-full max-w-md mx-auto h-3 rounded-full bg-bord overflow-hidden" role="progressbar" aria-valuenow={progression} aria-valuemin={0} aria-valuemax={100}>
              <div className="h-full rounded-full bg-accent transition-all" style={{ width: `${progression}%` }} />
            </div>
            <p className="text-sm font-semibold mt-3 text-encre tabular-nums">{progression} %</p>
          </div>
        </Carte>
      )}

      {etape === 'done' && (
        <Carte marge="large" className="text-center">
          <div role="status">
            {resultat && resultat.importes < resultat.total ? (
              <>
                <span className="w-14 h-14 mx-auto mb-4 rounded-full flex items-center justify-center bg-alerte-fond text-alerte-texte"><AlertTriangle size={28} aria-hidden="true" /></span>
                <h2 className="text-xl font-bold text-encre mb-1">Import incomplet</h2>
                <p className="text-sm text-encre-2">{resultat.importes} article{resultat.importes > 1 ? 's' : ''} importé{resultat.importes > 1 ? 's' : ''} sur {resultat.total} : l'import s'est arrêté.</p>
              </>
            ) : (
              <>
                <span className="w-14 h-14 mx-auto mb-4 rounded-full flex items-center justify-center bg-succes-fond text-succes-texte"><Check size={28} aria-hidden="true" /></span>
                <h2 className="text-xl font-bold text-encre mb-1">Import terminé</h2>
                <p className="text-sm text-encre-2">Votre catalogue est prêt. Vous pouvez maintenant ajuster les prix et les marges.</p>
              </>
            )}
          </div>
        </Carte>
      )}
    </div>
  );
}
