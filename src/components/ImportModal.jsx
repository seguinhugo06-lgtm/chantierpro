import { useState, useEffect, useRef, useCallback } from 'react';
import { Upload, FileSpreadsheet, Check, AlertCircle, ArrowRight, ChevronDown, Loader2 } from 'lucide-react';
import Modal, { ModalHeader, ModalTitle, ModalDescription, ModalBody } from './ui/Modal';
import { Bouton } from './ui/Bouton';
import { lireCsv } from '../lib/csvImport';

/**
 * ImportModal — import d'un fichier CSV avec association des colonnes (glisser-déposer, aperçu, champs à associer).
 * Sur ui/Modal (rôle dialogue, focus, Échap, feuille du bas au téléphone) : refonte du 26 oct. 2026 (Task 7 « ancien code »).
 * Avant : en-tête en dégradé de la couleur de l'entreprise, fenêtre faite main sans rôle ni nom sur la croix, pourcentage
 * d'avancement calculé avant l'écriture (100 % pendant que les clients s'enregistraient encore), « Importation réussie »
 * même quand l'import s'était arrêté en route, textes sans accents. `isDark` et `couleur` sont encore passés par
 * l'appelant et ignorés ici.
 *
 * `onImport(lignes)` doit rendre `{ importes, total }` : ce qui a VRAIMENT été enregistré. La fenêtre le dit tel quel.
 */

// ── Champs à associer, par type ─────────────────────────────────
const FIELD_DEFINITIONS = {
  clients: [
    { key: 'nom', label: 'Nom' },
    { key: 'prenom', label: 'Prénom' },
    { key: 'email', label: 'Email' },
    { key: 'telephone', label: 'Téléphone' },
    { key: 'adresse', label: 'Adresse' },
    { key: 'entreprise', label: 'Entreprise' },
    { key: 'notes', label: 'Notes' },
  ],
  articles: [
    { key: 'designation', label: 'Désignation' },
    { key: 'unite', label: 'Unité' },
    { key: 'prixUnitaire', label: 'Prix unitaire' },
    { key: 'tva', label: 'TVA (%)' },
    { key: 'categorie', label: 'Catégorie' },
  ],
  ouvrages: [
    { key: 'designation', label: 'Désignation' },
    { key: 'description', label: 'Description' },
    { key: 'unite', label: 'Unité' },
    { key: 'prixUnitaire', label: 'Prix unitaire' },
    { key: 'tva', label: 'TVA (%)' },
    { key: 'categorie', label: 'Catégorie' },
  ],
};

const TYPE_LABELS = { clients: 'Clients', articles: 'Articles', ouvrages: 'Ouvrages' };

// ── Lecture du fichier ───────────────────────────────────────────
// Lecteur CSV commun (src/lib/csvImport.js) : un seul séparateur, détecté sur la ligne d'en-tête. Avant (recette du
// 9 oct. 2026), « , » et « ; » séparaient tous deux : l'adresse « 3 rue Neuve, 31000 Toulouse » d'un export Excel
// français était coupée et la fin glissait dans la colonne suivante.
function parseCSV(text) {
  const { entetes, lignes } = lireCsv(text);
  return entetes.length ? [entetes, ...lignes.map((o) => entetes.map((h) => o[h] ?? ''))] : [];
}

// ── Association automatique des colonnes ─────────────────────────
// Égalité d'abord (« Prénom » → prénom), puis inclusion et synonymes ; un champ ne sert qu'une fois. Avant :
// « prenom » contient « nom », et le champ nom passait avant prénom (les clients s'appelaient « Anne », « Paul »).
const normaliser = (t) => String(t || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]/g, '');

function autoMapColumns(csvHeaders, fields) {
  const mapping = {};
  const pris = new Set();
  const egal = (n, f) => n === normaliser(f.key) || n === normaliser(f.label);
  const proche = (n, f) => {
    const k = normaliser(f.key);
    return (n.length > 2 && (n.includes(k) || k.includes(n)))
      || (k === 'prixunitaire' && /prix|price|tarif/.test(n))
      || (k === 'telephone' && /tel|phone|portable|mobile/.test(n))
      || (k === 'designation' && /libelle|name|^nom$/.test(n))
      || (k === 'entreprise' && /societe|company|raisonsociale/.test(n))
      || (k === 'email' && /mail|courriel/.test(n));
  };
  const normes = csvHeaders.map(normaliser);
  for (const test of [egal, proche]) {
    normes.forEach((n, index) => {
      if (mapping[index]) return;
      // « Prénom » ne doit jamais devenir « Nom » par inclusion
      const f = fields.find((x) => !pris.has(x.key) && test(n, x) && !(x.key === 'nom' && n.includes('prenom')));
      if (f) { mapping[index] = f.key; pris.add(f.key); }
    });
  }
  csvHeaders.forEach((_, index) => { if (!mapping[index]) mapping[index] = ''; });
  return mapping;
}

export { parseCSV, autoMapColumns };

const ETAPES = { upload: [1, 'Choisir le fichier'], mapping: [2, 'Associer les colonnes'], importing: [3, 'Importation'], done: [3, 'Terminé'] };

export default function ImportModal({ isOpen, onClose, type = 'clients', onImport }) {
  const [step, setStep] = useState('upload'); // 'upload' | 'mapping' | 'importing' | 'done'
  const [fileName, setFileName] = useState('');
  const [csvHeaders, setCsvHeaders] = useState([]);
  const [csvRows, setCsvRows] = useState([]);
  const [mapping, setMapping] = useState({});
  const [dragOver, setDragOver] = useState(false);
  const [error, setError] = useState('');
  const [importResult, setImportResult] = useState(null);
  const fileInputRef = useRef(null);

  const fields = FIELD_DEFINITIONS[type] || FIELD_DEFINITIONS.clients;
  const nomDuType = (TYPE_LABELS[type] || type).toLowerCase();

  // Fermée : tout repart à zéro
  useEffect(() => {
    if (!isOpen) {
      setStep('upload');
      setFileName('');
      setCsvHeaders([]);
      setCsvRows([]);
      setMapping({});
      setDragOver(false);
      setError('');
      setImportResult(null);
    }
  }, [isOpen]);

  const processFile = useCallback((file) => {
    setError('');
    const ext = file.name.split('.').pop().toLowerCase();
    if (!['csv', 'txt'].includes(ext)) {
      setError('Format non pris en charge. Utilisez un fichier .csv.');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setError('Fichier trop volumineux (5 Mo au plus).');
      return;
    }
    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const parsed = parseCSV(e.target.result);
        if (parsed.length < 2) {
          setError('Le fichier doit contenir au moins un en-tête et une ligne de données.');
          return;
        }
        const headers = parsed[0];
        setCsvHeaders(headers);
        setCsvRows(parsed.slice(1));
        setMapping(autoMapColumns(headers, fields));
        setStep('mapping');
      } catch (err) {
        setError(`Le fichier n'a pas pu être lu : ${err.message}`);
      }
    };
    reader.onerror = () => setError('Le fichier n\'a pas pu être lu.');
    reader.readAsText(file, 'UTF-8');
  }, [fields]);

  const surGlisse = useCallback((e) => { e.preventDefault(); e.stopPropagation(); setDragOver(true); }, []);
  const surSortie = useCallback((e) => { e.preventDefault(); e.stopPropagation(); setDragOver(false); }, []);
  const surDepot = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(false);
    const fichier = e.dataTransfer?.files?.[0];
    if (fichier) processFile(fichier);
  }, [processFile]);
  const surChoix = useCallback((e) => {
    const fichier = e.target.files?.[0];
    if (fichier) processFile(fichier);
  }, [processFile]);

  const mappedCount = Object.values(mapping).filter((v) => v !== '').length;

  const handleImport = async () => {
    setStep('importing');
    const lignes = [];
    for (const row of csvRows) {
      const obj = {};
      let aDesDonnees = false;
      Object.entries(mapping).forEach(([colIndex, fieldKey]) => {
        if (fieldKey && row[parseInt(colIndex, 10)] !== undefined) {
          let value = row[parseInt(colIndex, 10)];
          if (['prixUnitaire', 'tva'].includes(fieldKey)) {
            const lu = parseFloat(value.replace(',', '.'));
            value = Number.isNaN(lu) ? 0 : lu;
          }
          if (value !== '' && value !== undefined) { obj[fieldKey] = value; aDesDonnees = true; }
        }
      });
      if (aDesDonnees) lignes.push(obj);
    }
    // Le résultat dit ce qui a VRAIMENT été enregistré : un import arrêté en route (limite de l'offre, refus de la base) n'est pas un succès
    try {
      const res = await onImport(lignes);
      const importes = typeof res?.importes === 'number' ? res.importes : lignes.length;
      const total = typeof res?.total === 'number' ? res.total : lignes.length;
      setImportResult({ ok: importes === total, importes, total });
    } catch (err) {
      setImportResult({ ok: false, importes: 0, total: lignes.length, erreur: err.message || 'Erreur lors de l\'importation' });
    }
    setStep('done');
  };

  const [numero, etiquette] = ETAPES[step];
  const apercu = csvRows.slice(0, 5);
  const resume = importResult
    ? importResult.erreur
      ? importResult.erreur
      : importResult.ok
        ? `${importResult.importes} ${nomDuType} importé${importResult.importes > 1 ? 's' : ''}.`
        : `${importResult.importes} ${nomDuType} importé${importResult.importes > 1 ? 's' : ''} sur ${importResult.total} : l'import s'est arrêté. Les autres lignes n'ont pas été enregistrées.`
    : '';

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="lg" closeOnBackdrop={step !== 'importing'} closeOnEscape={step !== 'importing'}>
      <ModalHeader>
        <ModalTitle className="flex items-center gap-2"><FileSpreadsheet size={20} aria-hidden="true" className="text-encre-3" /> Importer des {nomDuType}</ModalTitle>
        <ModalDescription>
          Étape {numero} sur 3 · {etiquette}{step === 'mapping' ? ` · ${csvRows.length} ligne${csvRows.length > 1 ? 's' : ''} détectée${csvRows.length > 1 ? 's' : ''}` : ''}
        </ModalDescription>
      </ModalHeader>
      <ModalBody className="space-y-5">
        {/* ── Étape 1 : choisir le fichier ── */}
        {step === 'upload' && (
          <>
            <button
              type="button" onClick={() => fileInputRef.current?.click()}
              onDragOver={surGlisse} onDragLeave={surSortie} onDrop={surDepot}
              className={`w-full border-2 border-dashed rounded-2xl p-8 text-center transition-colors ${dragOver ? 'border-accent bg-accent/10' : 'border-bord-fort bg-fond hover:bg-surface-2'}`}
            >
              <span className="w-14 h-14 rounded-2xl bg-surface-2 text-encre-2 flex items-center justify-center mx-auto mb-4"><Upload size={28} aria-hidden="true" /></span>
              <span className="block text-base font-semibold text-encre mb-1">Glissez votre fichier ici</span>
              <span className="block text-sm text-encre-2">ou touchez pour le choisir</span>
              <span className="block text-sm mt-3 text-encre-3">Fichier .csv, 5 Mo au plus</span>
            </button>
            <input ref={fileInputRef} type="file" accept=".csv,.txt" onChange={surChoix} className="hidden" aria-label="Fichier à importer" />

            {error && (
              <p role="alert" className="flex items-center gap-2 p-3 rounded-xl text-sm font-medium bg-danger-fond text-danger-texte">
                <AlertCircle size={16} aria-hidden="true" className="shrink-0" /> {error}
              </p>
            )}

            <div className="rounded-xl p-4 bg-fond">
              <p className="text-sm font-semibold text-encre mb-2">Colonnes attendues pour les {nomDuType} :</p>
              <div className="flex flex-wrap gap-1.5">
                {fields.map((f) => <span key={f.key} className="px-2.5 py-1 rounded-lg text-sm font-medium bg-surface border border-bord text-encre-2">{f.label}</span>)}
              </div>
            </div>
          </>
        )}

        {/* ── Étape 2 : associer les colonnes ── */}
        {step === 'mapping' && (
          <>
            <div className="flex items-center gap-3 p-3 rounded-xl bg-fond">
              <FileSpreadsheet size={18} aria-hidden="true" className="text-encre-3" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold truncate text-encre">{fileName}</p>
                <p className="text-sm text-encre-3">{csvRows.length} lignes, {csvHeaders.length} colonnes</p>
              </div>
              <Bouton variante="secondaire" taille="compacte" onClick={() => { setStep('upload'); setError(''); }}>Changer</Bouton>
            </div>

            <div>
              <p className="text-sm font-semibold mb-3 text-encre">Associer les colonnes ({mappedCount}/{csvHeaders.length} associées)</p>
              <div className="space-y-2">
                {csvHeaders.map((header, colIndex) => (
                  <div key={colIndex} className={`flex items-center gap-3 p-3 rounded-xl border border-bord ${mapping[colIndex] ? '' : 'opacity-70'}`}>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold truncate text-encre">{header}</p>
                      {apercu[0] && apercu[0][colIndex] && <p className="text-sm truncate text-encre-3">ex : {apercu[0][colIndex]}</p>}
                    </div>
                    <ArrowRight size={16} aria-hidden="true" className="text-encre-3 flex-shrink-0" />
                    <div className="relative">
                      <select
                        value={mapping[colIndex] || ''} aria-label={`Colonne « ${header} »`}
                        onChange={(e) => setMapping((prev) => ({ ...prev, [colIndex]: e.target.value }))}
                        className="appearance-none h-11 pl-3 pr-8 rounded-xl border border-bord-fort bg-surface text-base sm:text-sm text-encre cursor-pointer min-w-[150px]"
                      >
                        <option value="">Ignorer</option>
                        {fields.map((f) => <option key={f.key} value={f.key}>{f.label}</option>)}
                      </select>
                      <ChevronDown size={14} aria-hidden="true" className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none text-encre-3" />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <p className="text-sm font-semibold mb-3 text-encre">Aperçu (5 premières lignes)</p>
              <div className="overflow-x-auto rounded-xl border border-bord">
                <table className="w-full text-sm" aria-label="Aperçu des données importées">
                  <thead>
                    <tr className="bg-fond">
                      {csvHeaders.map((h, i) => (
                        <th key={i} scope="col" className="px-3 py-2 text-left font-semibold whitespace-nowrap text-encre-2">
                          {mapping[i] ? <span className="text-accent-texte">{fields.find((f) => f.key === mapping[i])?.label || h}</span> : <span className="line-through text-encre-3">{h}</span>}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {apercu.map((row, r) => (
                      <tr key={r} className="even:bg-fond">
                        {csvHeaders.map((_, c) => <td key={c} className={`px-3 py-2 whitespace-nowrap ${mapping[c] ? 'text-encre' : 'text-encre-3 line-through'}`}>{row[c] || ''}</td>)}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="flex flex-col-reverse sm:flex-row gap-2 sm:gap-3 sm:justify-end pt-1">
              <Bouton variante="secondaire" onClick={onClose} className="w-full sm:w-auto">Annuler</Bouton>
              <Bouton variante="principal" icone={Upload} onClick={handleImport} disabled={mappedCount === 0} className="w-full sm:w-auto">
                Importer {csvRows.length} ligne{csvRows.length > 1 ? 's' : ''}
              </Bouton>
            </div>
          </>
        )}

        {/* ── Étape 3 : importation en cours ── (pas de pourcentage : on ne le connaît pas, et un faux 100 % mentirait) */}
        {step === 'importing' && (
          <div role="status" className="py-10 text-center">
            <Loader2 size={40} aria-hidden="true" className="animate-spin mx-auto mb-4 text-accent-texte" />
            <p className="text-base font-semibold text-encre">Importation en cours…</p>
            <p className="text-sm mt-1 text-encre-3">{csvRows.length} ligne{csvRows.length > 1 ? 's' : ''} à enregistrer. Gardez cette fenêtre ouverte.</p>
          </div>
        )}

        {/* ── Terminé ── */}
        {step === 'done' && importResult && (
          <div className="py-6 space-y-6">
            <div role="status" className="text-center">
              <span className={`w-16 h-16 mx-auto mb-4 rounded-full flex items-center justify-center ${importResult.ok ? 'bg-succes-fond text-succes-texte' : 'bg-alerte-fond text-alerte-texte'}`}>
                {importResult.ok ? <Check size={32} aria-hidden="true" /> : <AlertCircle size={32} aria-hidden="true" />}
              </span>
              <p className="text-lg font-bold text-encre">{importResult.ok ? 'Importation terminée' : 'Importation incomplète'}</p>
              <p className="text-sm mt-1 text-encre-2">{resume}</p>
            </div>
            <Bouton variante="principal" icone={Check} pleineLargeur onClick={onClose}>Fermer</Bouton>
          </div>
        )}
      </ModalBody>
    </Modal>
  );
}
