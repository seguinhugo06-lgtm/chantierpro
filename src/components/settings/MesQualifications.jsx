import { useState } from 'react';
import { AlertTriangle, Check, Plus, Trash2 } from 'lucide-react';
import { Bouton } from '../ui/Bouton';
import ChampChoix from '../ui/ChampChoix';
import { ChampParam, DebouncedInput, CLASSE_CHAMP, EtatEnregistrement } from './champsParametres';
import {
  TYPES_QUALIFICATION, ORGANISMES_RGE, qualificationsDe, raisonNonImprimee, ligneImprimee, champsRgeDeLaListe, nouvelleQualification,
} from '../../lib/qualifications';
import { qualificationsDes } from '../../lib/metiers';

/**
 * « Mes qualifications » (lot 1, docs/metiers/synthese.md § 3.7) : la liste qui remplace le champ RGE unique.
 * Chaque qualification : type, intitulé, organisme, numéro, date de fin, et où l'imprimer. L'écran montre la ligne
 * telle qu'elle sera imprimée, ou pourquoi elle ne l'est pas (src/lib/qualifications.js). Enregistrée dans
 * `settings_json.reglages.qualifications` ; le premier RGE est recopié dans les champs rge* (page de signature d'avant
 * la migration 110).
 */
const typeDe = (id) => TYPES_QUALIFICATION.find((t) => t.id === id) || TYPES_QUALIFICATION[TYPES_QUALIFICATION.length - 1];
const nouvelId = () => `q-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;

export default function MesQualifications({ entreprise, updateEntreprise }) {
  const liste = qualificationsDe(entreprise);
  const proposes = qualificationsDes(entreprise?.metiers);
  const typesOrdonnes = [...TYPES_QUALIFICATION.filter((t) => proposes.includes(t.id)), ...TYPES_QUALIFICATION.filter((t) => !proposes.includes(t.id))];
  const [typeAjout, setTypeAjout] = useState(typesOrdonnes[0].id);

  // Chaque modification part de la fiche la plus récente (deux champs saisis d'affilée ne s'écrasent pas)
  const enregistrer = (transformer, cle) => updateEntreprise((p) => {
    const suivante = transformer(qualificationsDe(p));
    return { ...p, qualifications: suivante, ...champsRgeDeLaListe(suivante) };
  }, cle);
  const modifier = (id, champs, cle) => enregistrer((l) => l.map((q) => (q.id === id ? { ...q, ...champs } : q)), cle);
  const ajouter = () => {
    const t = typeDe(typeAjout);
    // Services à la personne : ajoutée en « Seulement si une ligne contient… » avec une liste de mots vide, donc sans rien
    // imprimer tant que l'artisan n'a pas mis ses mots (D-41, 5 nov. 2026 ; avis juriste-btp du 4 nov.)
    enregistrer((l) => [...l, nouvelleQualification(t.id, nouvelId())], 'qualifications');
  };
  const retirer = (id) => enregistrer((l) => l.filter((q) => q.id !== id), 'qualifications');

  return (
    <div className="space-y-3" data-testid="mes-qualifications">
      <p className="text-sm text-encre-2">
        {/* Page de signature : seulement après les migrations 108 (RGE) et 110 (liste) ; ajouter alors « et sur la page de
            signature » (docs/cloud/metier-qualifications.md) */}
        Imprimées en pied de vos devis et factures en PDF. Jamais sans numéro ; une date de fin passée retire la
        qualification des nouveaux documents.
      </p>
      {liste.length === 0 && <p className="text-sm text-encre-3">Aucune qualification enregistrée.</p>}
      {liste.map((q) => {
        const t = typeDe(q.type);
        const raison = raisonNonImprimee(q);
        const pref = `qualif-${q.id}`;
        // Le choix « où » est gardé à part des mots (src/lib/qualifications.js) : « seulement si » reste coché sans mot
        return (
          <div key={q.id} className="rounded-2xl border border-bord bg-surface p-4 space-y-3" data-testid="qualification">
            <div className="flex items-start justify-between gap-2">
              <p className="font-semibold text-encre">{t.nom}</p>
              <button type="button" onClick={() => retirer(q.id)} aria-label={`Retirer ${t.nom}`}
                className="w-11 h-11 -mt-2 -mr-2 flex items-center justify-center rounded-xl text-encre-2 hover:bg-surface-2">
                <Trash2 size={18} aria-hidden="true" />
              </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {q.type !== 'sap' && (
                <ChampParam id={`${pref}-intitule`} cle={`${pref}-intitule`} libelle="Intitulé" aide={t.aideIntitule || 'Tel qu’il figure sur votre certificat.'}>
                  <DebouncedInput id={`${pref}-intitule`} placeholder={t.exemple} value={q.intitule}
                    onChange={(v) => modifier(q.id, { intitule: v }, `${pref}-intitule`)} />
                </ChampParam>
              )}
              {q.type !== 'sap' && (
                <ChampParam id={`${pref}-organisme`} idLibelle={`${pref}-organisme-libelle`} cle={`${pref}-organisme`} libelle="Organisme qui l’a délivrée">
                  {q.type === 'rge' ? (
                    <ChampChoix id={`${pref}-organisme`} idLibelle={`${pref}-organisme-libelle`} titre="Organisme RGE" vide="Choisir l’organisme"
                      options={ORGANISMES_RGE.map((o) => ({ valeur: o, libelle: o }))} valeur={ORGANISMES_RGE.includes(q.organisme) ? q.organisme : ''}
                      onChange={(v) => modifier(q.id, { organisme: v }, `${pref}-organisme`)} />
                  ) : (
                    <>
                      <DebouncedInput id={`${pref}-organisme`} list={t.organismes ? `${pref}-organismes` : undefined} value={q.organisme}
                        onChange={(v) => modifier(q.id, { organisme: v }, `${pref}-organisme`)} />
                      {t.organismes && <datalist id={`${pref}-organismes`}>{t.organismes.map((o) => <option key={o} value={o} />)}</datalist>}
                    </>
                  )}
                </ChampParam>
              )}
              <ChampParam id={`${pref}-numero`} cle={`${pref}-numero`} libelle={q.type === 'sap' ? 'Numéro de déclaration' : 'Numéro'}>
                <DebouncedInput id={`${pref}-numero`} value={q.numero} onChange={(v) => modifier(q.id, { numero: v }, `${pref}-numero`)} />
              </ChampParam>
              {(
                <ChampParam id={`${pref}-fin`} cle={`${pref}-fin`} libelle={t.dateDeclaration ? 'Date d’enregistrement de la déclaration' : 'Fin de validité'}
                  aide={t.dateDeclaration ? 'Obligatoire avec le numéro sur vos factures de services à la personne (code du travail, art. D7233-1, 2°).' : 'Date indiquée sur votre certificat. En cas de suspension, retirez la qualification.'}>
                  <input id={`${pref}-fin`} type="date" className={CLASSE_CHAMP} value={q.fin}
                    onChange={(e) => modifier(q.id, { fin: e.target.value }, `${pref}-fin`)} />
                </ChampParam>
              )}
            </div>

            <fieldset className="space-y-2">
              <legend className="text-sm font-medium text-encre-2 mb-1 flex items-center gap-2">Où l’imprimer <EtatEnregistrement cle={`${pref}-ou`} /></legend>
              <label className="flex items-center gap-3 min-h-11 cursor-pointer">
                <input type="radio" name={`${pref}-ou`} className="w-5 h-5 accent-accent" checked={q.ou === 'tous'}
                  onChange={() => modifier(q.id, { imprimer: true, ou: 'tous', motsCles: '' }, `${pref}-ou`)} />
                <span className="text-sm text-encre">Sur tous mes documents</span>
              </label>
              {q.type !== 'rge' && (
                <label className="flex items-center gap-3 min-h-11 cursor-pointer">
                  <input type="radio" name={`${pref}-ou`} className="w-5 h-5 accent-accent" checked={q.ou === 'si'}
                    onChange={() => modifier(q.id, { imprimer: true, ou: 'si', motsCles: q.motsCles || t.motsCles }, `${pref}-ou`)} />
                  <span className="text-sm text-encre">Seulement si une ligne contient…</span>
                </label>
              )}
              {q.ou === 'si' && (
                <ChampParam id={`${pref}-mots`} cle={`${pref}-mots`} libelle="Mots cherchés dans les lignes" aide="Séparés par des virgules. Ex. : borne, recharge.">
                  <DebouncedInput id={`${pref}-mots`} value={q.motsCles} onChange={(v) => modifier(q.id, { motsCles: v }, `${pref}-mots`)} />
                </ChampParam>
              )}
              <label className="flex items-center gap-3 min-h-11 cursor-pointer">
                <input type="radio" name={`${pref}-ou`} className="w-5 h-5 accent-accent" checked={q.ou === 'non'}
                  onChange={() => modifier(q.id, { imprimer: false, ou: 'non' }, `${pref}-ou`)} />
                <span className="text-sm text-encre">Ne pas l’imprimer</span>
              </label>
              {q.type === 'rge' && <p className="text-sm text-encre-3">Imprimé, le RGE figure sur tous vos documents : l’Anah exige la mention sur les devis et factures des travaux aidés.</p>}
              {q.type === 'sap' && <p className="text-sm text-alerte-texte">À imprimer sur vos factures de services à la personne, où elle est obligatoire (code du travail, art. D7233-1, 2°) ; sur d’autres travaux, elle laisserait croire à un crédit d’impôt.</p>}
            </fieldset>

            {raison ? (
              <p className="text-sm text-alerte-texte flex items-start gap-1.5" data-testid="qualification-raison">
                <AlertTriangle size={14} className="mt-0.5 shrink-0" aria-hidden="true" /> {raison}
              </p>
            ) : (
              <div className="rounded-xl bg-surface-2 p-3" data-testid="qualification-apercu">
                <p className="text-xs font-semibold text-encre-2 mb-1 flex items-center gap-1"><Check size={12} aria-hidden="true" /> Imprimé ainsi</p>
                <p className="text-sm text-encre break-words">{ligneImprimee(q)}</p>
              </div>
            )}
          </div>
        );
      })}

      <div className="flex flex-col sm:flex-row gap-2 sm:items-end">
        <div className="flex-1">
          <p id="qualif-type-ajout-libelle" className="block text-sm font-medium text-encre-2 mb-1.5">Ajouter une qualification</p>
          <ChampChoix id="qualif-type-ajout" idLibelle="qualif-type-ajout-libelle" titre="Type de qualification"
            options={typesOrdonnes.map((t) => ({ valeur: t.id, libelle: t.nom }))} valeur={typeAjout} onChange={setTypeAjout} />
        </div>
        <Bouton variante="secondaire" icone={Plus} onClick={ajouter}>Ajouter</Bouton>
      </div>
      {/* Ajouter et Retirer : état visible de l'enregistrement de la liste */}
      <p className="min-h-5" data-testid="qualifications-etat"><EtatEnregistrement cle="qualifications" /></p>
    </div>
  );
}
