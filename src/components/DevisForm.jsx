import React, { memo } from 'react';

const DevisForm = memo(({
  devisForm,
  setDevisForm,
  currentLigne,
  setCurrentLigne,
  clients,
  onAddLigne,
  onDeleteLigne,
  onSubmit,
  calculerTotaux
}) => {

  const totaux = calculerTotaux(devisForm.lignes);
  const canSubmit = devisForm.clientId && devisForm.lignes.length > 0;

  const handleDevisChange = (field) => (e) => {
    setDevisForm(prev => ({ ...prev, [field]: e.target.value }));
  };

  const handleLigneChange = (field) => (e) => {
    const value = field === 'quantite' || field === 'prixUnitaire'
      ? parseFloat(e.target.value) || 0
      : e.target.value;
    setCurrentLigne(prev => ({ ...prev, [field]: value }));
  };

  return (
    <div className="bg-white p-8 rounded-xl border border-slate-200 max-w-[1000px]">
      <div className="grid grid-cols-2 gap-5 mb-8">
        <div className="flex flex-col">
          <label className="block text-sm font-medium mb-2 text-gray-700">Client *</label>
          <select
            value={devisForm.clientId}
            onChange={handleDevisChange('clientId')}
            required
            className="w-full p-3 border border-gray-300 rounded-lg text-base outline-none box-border"
          >
            <option value="">Sélectionner...</option>
            {clients.map(c => (
              <option key={c.id} value={c.id}>
                {c.nom} {c.prenom}
              </option>
            ))}
          </select>
        </div>
        <div className="flex flex-col">
          <label className="block text-sm font-medium mb-2 text-gray-700">Date</label>
          <input
            type="date"
            value={devisForm.date}
            onChange={handleDevisChange('date')}
            className="w-full p-3 border border-gray-300 rounded-lg text-base outline-none box-border"
          />
        </div>
      </div>

      <h3 className="text-lg font-bold mb-4 text-gray-900">Lignes du devis</h3>
      <div className="bg-gray-50 p-5 rounded-lg mb-5 grid grid-cols-[2fr_1fr_1fr_auto] gap-3 items-end">
        <input
          placeholder="Description"
          value={currentLigne.description}
          onChange={handleLigneChange('description')}
          className="w-full p-3 border border-gray-300 rounded-lg text-base outline-none box-border"
        />
        <input
          type="number"
          placeholder="Qté"
          value={currentLigne.quantite}
          onChange={handleLigneChange('quantite')}
          min="1"
          className="w-full p-3 border border-gray-300 rounded-lg text-base outline-none box-border"
        />
        <input
          type="number"
          placeholder="Prix HT"
          step="0.01"
          value={currentLigne.prixUnitaire}
          onChange={handleLigneChange('prixUnitaire')}
          min="0"
          className="w-full p-3 border border-gray-300 rounded-lg text-base outline-none box-border"
        />
        <button
          onClick={onAddLigne}
          type="button"
          className="px-5 py-2.5 bg-orange-500 text-white border-none rounded-md cursor-pointer font-semibold text-lg"
        >
          +
        </button>
      </div>

      {devisForm.lignes.length > 0 && (
        <div className="overflow-x-auto -mx-2 px-2">
          <table className="w-full border-collapse border border-slate-200 rounded-lg overflow-hidden mb-5 min-w-[480px]" aria-label="Lignes du devis en cours">
            <thead className="bg-gray-50">
              <tr>
                <th scope="col" className="p-3 text-left text-xs font-semibold text-gray-500">Description</th>
                <th scope="col" className="p-3 text-right text-xs font-semibold text-gray-500">Qté</th>
                <th scope="col" className="p-3 text-right text-xs font-semibold text-gray-500">Prix HT</th>
                <th scope="col" className="p-3 text-right text-xs font-semibold text-gray-500">Total</th>
                <th scope="col" className="p-3 text-left text-xs font-semibold text-gray-500 w-[50px]"></th>
              </tr>
            </thead>
            <tbody>
              {devisForm.lignes.map((ligne, index) => (
                <tr key={index}>
                  <td className="p-3 border-t border-slate-200">{ligne.description}</td>
                  <td className="p-3 border-t border-slate-200 text-right">{ligne.quantite}</td>
                  <td className="p-3 border-t border-slate-200 text-right">{ligne.prixUnitaire.toFixed(2)}€</td>
                  <td className="p-3 border-t border-slate-200 text-right font-semibold">
                    {ligne.montant.toFixed(2)}€
                  </td>
                  <td className="p-3 border-t border-slate-200 text-center">
                    <button
                      onClick={() => onDeleteLigne(index)}
                      type="button"
                      className="bg-transparent border-none cursor-pointer text-lg"
                    >

                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="bg-gray-50 p-5 border-t-2 border-slate-200 flex justify-end gap-10 text-base">
            <div>Total HT: <strong>{totaux.totalHT.toFixed(2)}€</strong></div>
            <div>TVA (20%): <strong>{totaux.tva.toFixed(2)}€</strong></div>
            <div className="text-xl text-orange-500 font-bold">
              Total TTC: <strong>{totaux.totalTTC.toFixed(2)}€</strong>
            </div>
          </div>
        </div>
      )}

      <button
        onClick={onSubmit}
        disabled={!canSubmit}
        className={`w-full p-4 text-white border-none rounded-lg text-base font-semibold ${
          canSubmit
            ? 'bg-gradient-to-br from-orange-500 to-red-600 cursor-pointer'
            : 'bg-gray-300 cursor-not-allowed'
        }`}
      >
        Créer le devis
      </button>
    </div>
  );
});

DevisForm.displayName = 'DevisForm';

export default DevisForm;
