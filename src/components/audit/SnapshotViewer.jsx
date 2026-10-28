import { RotateCcw, FileText, Calendar, Tag, Hash } from 'lucide-react';
import { formatMoney } from '../../lib/formatters';
import { TRIGGER_LABELS } from '../../lib/snapshotService';
import { dateLue } from '../../lib/dates';
import { statut as statutDe } from '../../lib/statuts';
import Modal, { ModalHeader, ModalTitle, ModalDescription, ModalBody, ModalFooter } from '../ui/Modal';
import { Bouton } from '../ui/Bouton';

/**
 * SnapshotViewer — Display a full document snapshot with restore option
 *
 * Fenêtre `ui/Modal` (portail, role="dialog", Échap, feuille du bas au téléphone) ; couleurs : jetons du thème.
 *
 * Props:
 *  - snapshot: document_snapshot object with .data (full document JSON)
 *  - entityType: 'devis' | 'facture' | etc.
 *  - isDark, couleur: acceptés, plus nécessaires
 *  - modeDiscret
 *  - onRestore: (snapshot) => void — callback to restore this version
 *  - onClose: () => void
 *  - onCompare: (snapshot) => void — callback to open DiffViewer
 */
export default function SnapshotViewer({
  snapshot,
  entityType = 'devis',
  isDark: _isDark,
  couleur: _couleur,
  modeDiscret,
  onRestore,
  onClose,
  onCompare,
}) {
  const textPrimary = 'text-encre';
  const textSecondary = 'text-encre-2';
  const textMuted = 'text-encre-3';
  const borderColor = 'border-bord';

  if (!snapshot) return null;

  const data = snapshot.data || {};
  const lignes = data.lignes || [];
  const totalHt = lignes.reduce((sum, l) => sum + ((l.quantite || 0) * (l.prixUnitaire || 0)), 0);
  const fmt = (n) => modeDiscret ? '•••' : formatMoney(n);
  const triggerLabel = TRIGGER_LABELS[snapshot.trigger] || snapshot.trigger;

  return (
    <Modal isOpen onClose={onClose} size="lg">
      <ModalHeader>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-accent/10">
            <FileText size={20} className="text-accent-texte" aria-hidden="true" />
          </div>
          <div className="min-w-0">
            <ModalTitle>{snapshot.label || `Version ${snapshot.version}`}</ModalTitle>
            <ModalDescription>
              {triggerLabel} · {dateLue(snapshot.created_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
            </ModalDescription>
          </div>
        </div>
      </ModalHeader>

      <ModalBody className="space-y-4">
        {/* Summary badges */}
        <div className="flex flex-wrap gap-2">
          <span className="flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-lg bg-surface-2 text-encre-2">
            <Hash size={12} aria-hidden="true" />
            Version {snapshot.version}
          </span>
          {data.numero && (
            <span className="flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-lg bg-surface-2 text-encre-2">
              <FileText size={12} aria-hidden="true" />
              {data.numero}
            </span>
          )}
          {data.statut && (
            <span className="flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-lg font-medium text-accent-texte bg-accent/10">
              <Tag size={12} aria-hidden="true" />
              {statutDe(entityType === 'facture' ? 'facture' : 'devis', data.statut).libelle}
            </span>
          )}
          {data.client_nom && (
            <span className="flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-lg bg-surface-2 text-encre-2">
              {data.client_nom}
            </span>
          )}
          <span className="flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-lg bg-surface-2 text-encre-2">
            <Calendar size={12} aria-hidden="true" />
            {data.date ? dateLue(data.date).toLocaleDateString('fr-FR') : '—'}
          </span>
        </div>

        {/* Object */}
        {data.objet && (
          <div>
            <p className={`text-xs font-medium mb-1 ${textMuted}`}>Objet</p>
            <p className={`text-sm ${textPrimary}`}>{data.objet}</p>
          </div>
        )}

        {/* Lines table */}
        {lignes.length > 0 && (
          <div>
            <p className={`text-xs font-medium mb-2 ${textMuted}`}>Lignes ({lignes.length})</p>
            <div className={`rounded-lg border ${borderColor} overflow-hidden overflow-x-auto`}>
              <table className="w-full text-sm min-w-[400px]">
                <thead>
                  <tr className="bg-fond">
                    <th className={`text-left px-3 py-2 text-xs font-medium ${textMuted}`}>Description</th>
                    <th className={`text-right px-3 py-2 text-xs font-medium ${textMuted}`}>Qté</th>
                    <th className={`text-right px-3 py-2 text-xs font-medium ${textMuted}`}>P.U.</th>
                    <th className={`text-right px-3 py-2 text-xs font-medium ${textMuted}`}>Total</th>
                  </tr>
                </thead>
                <tbody>
                  {lignes.map((l, idx) => (
                    <tr key={idx} className={`border-t ${borderColor}`}>
                      <td className={`px-3 py-2 ${textPrimary}`}>{l.description}</td>
                      <td className={`px-3 py-2 text-right ${textSecondary}`}>{l.quantite} {l.unite}</td>
                      <td className={`px-3 py-2 text-right ${textSecondary}`}>{fmt(l.prixUnitaire)}</td>
                      <td className={`px-3 py-2 text-right font-medium ${textPrimary}`}>{fmt((l.quantite || 0) * (l.prixUnitaire || 0))}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className={`border-t-2 ${borderColor}`}>
                    <td colSpan={3} className={`px-3 py-2 text-right font-medium ${textSecondary}`}>Total HT</td>
                    <td className={`px-3 py-2 text-right font-bold ${textPrimary}`}>{fmt(totalHt)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        )}

        {/* Notes */}
        {data.notes && (
          <div>
            <p className={`text-xs font-medium mb-1 ${textMuted}`}>Notes</p>
            <p className={`text-sm ${textSecondary} whitespace-pre-wrap`}>{data.notes}</p>
          </div>
        )}
      </ModalBody>

      {(onCompare || onRestore) && (
        <ModalFooter>
          {onCompare && (
            <Bouton variante="secondaire" onClick={() => onCompare(snapshot)}>
              Comparer avec l'actuel
            </Bouton>
          )}
          {onRestore && (
            <Bouton variante="principal" icone={RotateCcw} onClick={() => onRestore(snapshot)}>
              Restaurer cette version
            </Bouton>
          )}
        </ModalFooter>
      )}
    </Modal>
  );
}
