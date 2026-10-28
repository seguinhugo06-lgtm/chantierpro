import { ArrowRight } from 'lucide-react';
import { formatMoney } from '../../lib/formatters';
import { FIELD_LABELS } from '../../lib/auditService';
import { statut as statutDe } from '../../lib/statuts';
import Modal, { ModalHeader, ModalTitle, ModalBody, ModalFooter } from '../ui/Modal';
import { Bouton } from '../ui/Bouton';

/**
 * DiffViewer — Side-by-side comparison of two document versions
 *
 * Fenêtre `ui/Modal` (portail, role="dialog", Échap, feuille du bas au téléphone) ; couleurs : jetons du thème.
 *
 * Props:
 *  - snapshotA: Older version (left side)
 *  - snapshotB: Newer version (right side)
 *  - entityType: 'devis' | 'facture' | etc.
 *  - isDark, couleur: acceptés, plus nécessaires
 *  - modeDiscret
 *  - onClose: () => void
 */
export default function DiffViewer({
  snapshotA,
  snapshotB,
  entityType = 'devis',
  isDark: _isDark,
  couleur: _couleur,
  modeDiscret,
  onClose,
}) {
  const textPrimary = 'text-encre';
  const textSecondary = 'text-encre-2';
  const textMuted = 'text-encre-3';
  const borderColor = 'border-bord';

  if (!snapshotA || !snapshotB) return null;

  const dataA = snapshotA.data || {};
  const dataB = snapshotB.data || {};
  const fmt = (n) => modeDiscret ? '•••' : formatMoney(n);

  // Fields to compare
  const fieldsToCompare = ['objet', 'statut', 'client_nom', 'notes', 'conditions', 'validite', 'remise_globale'];
  const changedFields = fieldsToCompare.filter(f => {
    return JSON.stringify(dataA[f] ?? null) !== JSON.stringify(dataB[f] ?? null);
  });

  // Lines diff
  const lignesA = dataA.lignes || [];
  const lignesB = dataB.lignes || [];
  const linesDiff = computeLinesDiff(lignesA, lignesB);

  return (
    <Modal isOpen onClose={onClose} size="xl">
      <ModalHeader>
        <div className="flex items-center gap-3 flex-wrap">
          <ModalTitle>Comparaison</ModalTitle>
          <div className="flex items-center gap-2 text-sm">
            <span className="px-2 py-0.5 rounded-lg bg-danger-fond text-danger-texte">
              V{snapshotA.version}
            </span>
            <ArrowRight size={14} className={textMuted} aria-hidden="true" />
            <span className="px-2 py-0.5 rounded-lg bg-succes-fond text-succes-texte">
              V{snapshotB.version}
            </span>
          </div>
        </div>
      </ModalHeader>

      <ModalBody className="space-y-4">
        {/* No changes */}
        {changedFields.length === 0 && linesDiff.length === 0 && (
          <div className="text-center py-8">
            <p className={`text-sm ${textMuted}`}>Aucune différence détectée entre les deux versions.</p>
          </div>
        )}

        {/* Changed fields */}
        {changedFields.length > 0 && (
          <div>
            <p className={`text-xs font-medium mb-3 ${textMuted}`}>Champs modifiés</p>
            <div className={`rounded-lg border ${borderColor} divide-y divide-bord`}>
              {changedFields.map(field => (
                <div key={field} className="p-3">
                  <p className={`text-xs font-medium mb-1.5 ${textSecondary}`}>{FIELD_LABELS[field] || field}</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="text-sm p-2 rounded-lg bg-danger-fond">
                      <span className={`text-xs ${textMuted} block mb-0.5`}>V{snapshotA.version}</span>
                      <span className="text-danger-texte">
                        {formatFieldValue(field, dataA[field], modeDiscret, entityType)}
                      </span>
                    </div>
                    <div className="text-sm p-2 rounded-lg bg-succes-fond">
                      <span className={`text-xs ${textMuted} block mb-0.5`}>V{snapshotB.version}</span>
                      <span className="text-succes-texte">
                        {formatFieldValue(field, dataB[field], modeDiscret, entityType)}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Lines diff */}
        {linesDiff.length > 0 && (
          <div>
            <p className={`text-xs font-medium mb-3 ${textMuted}`}>Modifications des lignes</p>
            <div className={`rounded-lg border ${borderColor} overflow-hidden overflow-x-auto`}>
              <table className="w-full text-sm min-w-[420px]">
                <thead>
                  <tr className="bg-fond">
                    <th className={`text-left px-3 py-2 text-xs font-medium ${textMuted} w-8`}><span className="sr-only">Modification</span></th>
                    <th className={`text-left px-3 py-2 text-xs font-medium ${textMuted}`}>Description</th>
                    <th className={`text-right px-3 py-2 text-xs font-medium ${textMuted}`}>Qté</th>
                    <th className={`text-right px-3 py-2 text-xs font-medium ${textMuted}`}>P.U.</th>
                    <th className={`text-right px-3 py-2 text-xs font-medium ${textMuted}`}>Total</th>
                  </tr>
                </thead>
                <tbody>
                  {linesDiff.map((diff, idx) => {
                    const bgClass = diff.type === 'added'
                      ? 'bg-succes-fond'
                      : diff.type === 'removed'
                      ? 'bg-danger-fond'
                      : 'bg-alerte-fond';

                    const textClass = diff.type === 'added'
                      ? 'text-succes-texte'
                      : diff.type === 'removed'
                      ? 'text-danger-texte'
                      : 'text-alerte-texte';

                    const symbol = diff.type === 'added' ? '+' : diff.type === 'removed' ? '−' : '~';
                    const ligne = diff.ligne;

                    return (
                      <tr key={idx} className={`border-t ${borderColor} ${bgClass}`}>
                        <td className={`px-3 py-2 font-mono text-xs font-bold ${textClass}`}>{symbol}</td>
                        <td className={`px-3 py-2 ${textClass} ${diff.type === 'removed' ? 'line-through' : ''}`}>{ligne.description}</td>
                        <td className={`px-3 py-2 text-right ${textClass}`}>{ligne.quantite} {ligne.unite}</td>
                        <td className={`px-3 py-2 text-right ${textClass}`}>{fmt(ligne.prixUnitaire)}</td>
                        <td className={`px-3 py-2 text-right font-medium ${textClass}`}>{fmt((ligne.quantite || 0) * (ligne.prixUnitaire || 0))}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Totals comparison */}
        {(changedFields.length > 0 || linesDiff.length > 0) && (
          <div className={`rounded-lg border ${borderColor} p-4`}>
            <p className={`text-xs font-medium mb-2 ${textMuted}`}>Totaux</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <p className={`text-xs ${textMuted}`}>V{snapshotA.version}</p>
                <p className={`text-lg font-bold ${textPrimary}`}>
                  {fmt(lignesA.reduce((s, l) => s + ((l.quantite || 0) * (l.prixUnitaire || 0)), 0))} HT
                </p>
              </div>
              <div>
                <p className={`text-xs ${textMuted}`}>V{snapshotB.version}</p>
                <p className="text-lg font-bold text-accent-texte">
                  {fmt(lignesB.reduce((s, l) => s + ((l.quantite || 0) * (l.prixUnitaire || 0)), 0))} HT
                </p>
              </div>
            </div>
          </div>
        )}
      </ModalBody>

      <ModalFooter>
        <Bouton variante="secondaire" onClick={onClose}>Fermer</Bouton>
      </ModalFooter>
    </Modal>
  );
}

// ── Helpers ──

function computeLinesDiff(lignesA, lignesB) {
  const diffs = [];

  // Simple approach: match by description, then compare values
  const mapA = new Map();
  lignesA.forEach((l, i) => mapA.set(`${l.description}-${i}`, l));

  const mapB = new Map();
  lignesB.forEach((l, i) => mapB.set(`${l.description}-${i}`, l));

  // Find removed and modified
  lignesA.forEach((lineA, i) => {
    const key = `${lineA.description}-${i}`;
    if (i < lignesB.length) {
      const lineB = lignesB[i];
      if (lineA.description !== lineB.description ||
          lineA.quantite !== lineB.quantite ||
          lineA.prixUnitaire !== lineB.prixUnitaire) {
        if (lineA.description === lineB.description) {
          // Modified — show both
          diffs.push({ type: 'removed', ligne: lineA });
          diffs.push({ type: 'added', ligne: lineB });
        } else {
          diffs.push({ type: 'removed', ligne: lineA });
        }
      }
      // Unchanged — skip
    } else {
      diffs.push({ type: 'removed', ligne: lineA });
    }
  });

  // Find added (lines in B that aren't matched)
  lignesB.forEach((lineB, i) => {
    if (i >= lignesA.length) {
      diffs.push({ type: 'added', ligne: lineB });
    } else {
      const lineA = lignesA[i];
      if (lineA.description !== lineB.description) {
        diffs.push({ type: 'added', ligne: lineB });
      }
    }
  });

  return diffs;
}

function formatFieldValue(field, value, modeDiscret, entityType = 'devis') {
  if (value === null || value === undefined) return '—';
  if (field === 'statut') return statutDe(entityType === 'facture' ? 'facture' : 'devis', value).libelle;
  const moneyFields = ['total_ht', 'total_ttc', 'totalHt', 'totalTtc', 'montant', 'remise_globale', 'remiseGlobale'];
  if (modeDiscret && moneyFields.includes(field)) return '•••';
  if (moneyFields.includes(field)) return formatMoney(value);
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
}
