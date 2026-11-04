import { useState } from 'react';
import { AlertTriangle, Check, Plus, Trash2 } from 'lucide-react';
import { Bouton } from '../ui/Bouton';
import { ChampParam, DebouncedInput, CLASSE_CHAMP } from './champsParametres';
import {
  TYPES_QUALIFICATION, ORGANISMES_RGE, qualificationsDe, raisonNonImprimee, ligneImprimee, champsRgeDeLaListe, motsDe,
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
    // Services à la personne : ajoutée sans impression, l'artisan choisit où (avis juriste-btp du 4 nov. 2026)
    enregistrer((l) => [...l, { id: nouvelId(), type: t.id, intitule: '', organisme: '', numero: '', fin: '', imprimer: t.id !== 'sap', motsCles: '' }], 'qualifications');
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
        const surCertaines = q.type !== 'rge' && motsDe(q.motsCles).length > 0;
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
                <ChampParam id={`${pref}-organisme`} cle={`${pref}-organisme`} libelle="Organisme qui l’a délivrée">
                  {q.type === 'rge' ? (
                    <select id={`${pref}-organisme`} className={CLASSE_CHAMP} value={ORGANISMES_RGE.includes(q.organisme) ? q.organisme : ''}
                      onChange={(e) => modifier(q.id, { organisme: e.target.value }, `${pref}-organisme`)}>
                      <option value="">Choisir l’organisme</option>
                      {ORGANISMES_RGE.map((o) => <option key={o} value={o}>{o}</option>)}
                    </select>
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
                <ChampParam id={`${pref}-fin`} cle={`${pref}-fin`} libelle={t.dateDeclaration ? 'Date de la déclaration' : 'Fin de validité'}
                  aide={t.dateDeclaration ? 'Imprimée avec le numéro de déclaration.' : 'Date indiquée sur votre certificat. En cas de suspension, retirez la qualification.'}>
                  <input id={`${pref}-fin`} type="date" className={CLASSE_CHAMP} value={q.fin}
                    onChange={(e) => modifier(q.id, { fin: e.target.value }, `${pref}-fin`)} />
                </ChampParam>
              )}
            </div>

            <fieldset className="space-y-2">
              <legend className="text-sm font-medium text-encre-2 mb-1">Où l’imprimer</legend>
              <label className="flex items-center gap-3 min-h-11 cursor-pointer">
                <input type="radio" name={`${pref}-ou`} className="w-5 h-5 accent-accent" checked={q.imprimer && !surCertaines}
                  onChange={() => modifier(q.id, { imprimer: true, motsCles: '' }, `${pref}-ou`)} />
                <span className="text-sm text-encre">Sur tous mes documents</span>
              </label>
              {q.type !== 'rge' && (
                <label className="flex items-center gap-3 min-h-11 cursor-pointer">
                  <input type="radio" name={`${pref}-ou`} className="w-5 h-5 accent-accent" checked={q.imprimer && surCertaines}
                    onChange={() => modifier(q.id, { imprimer: true, motsCles: q.motsCles || t.motsCles || q.intitule }, `${pref}-ou`)} />
                  <span className="text-sm text-encre">Seulement si une ligne contient…</span>
                </label>
              )}
              {q.imprimer && surCertaines && (
                <ChampParam id={`${pref}-mots`} cle={`${pref}-mots`} libelle="Mots cherchés dans les lignes" aide="Séparés par des virgules. Ex. : borne, recharge.">
                  <DebouncedInput id={`${pref}-mots`} value={q.motsCles} onChange={(v) => modifier(q.id, { motsCles: v }, `${pref}-mots`)} />
                </ChampParam>
              )}
              <label className="flex items-center gap-3 min-h-11 cursor-pointer">
                <input type="radio" name={`${pref}-ou`} className="w-5 h-5 accent-accent" checked={!q.imprimer}
                  onChange={() => modifier(q.id, { imprimer: false }, `${pref}-ou`)} />
                <span className="text-sm text-encre">Ne pas l’imprimer</span>
              </label>
              {q.type === 'rge' && <p className="text-sm text-encre-3">Imprimé, le RGE figure sur tous vos documents : l’Anah exige la mention sur les devis et factures des travaux aidés.</p>}
              {q.type === 'sap' && <p className="text-sm text-alerte-texte">À n’imprimer que sur les prestations de services à la personne : sur d’autres travaux, elle laisserait croire à un crédit d’impôt.</p>}
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
          <label htmlFor="qualif-type-ajout" className="block text-sm font-medium text-encre-2 mb-1.5">Ajouter une qualification</label>
          <select id="qualif-type-ajout" className={CLASSE_CHAMP} value={typeAjout} onChange={(e) => setTypeAjout(e.target.value)}>
            {typesOrdonnes.map((t) => <option key={t.id} value={t.id}>{t.nom}</option>)}
          </select>
        </div>
        <Bouton variante="secondaire" icone={Plus} onClick={ajouter}>Ajouter</Bouton>
      </div>
    </div>
  );
}
