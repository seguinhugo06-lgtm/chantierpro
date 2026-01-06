import React, { useState } from 'react';
import { Save } from 'lucide-react';

export default function SettingsPage({ entrepriseInfo, setEntrepriseInfo, showNotification }) {
  const [formData, setFormData] = useState(entrepriseInfo);

  const handleSubmit = (e) => {
    e.preventDefault();
    setEntrepriseInfo(formData);
    showNotification('Paramètres enregistrés avec succès');
  };

  return (
    <div>
      <h2 className="text-2xl font-bold text-gray-900 mb-6">Paramètres</h2>
      
      <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm max-w-2xl">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Nom de l'entreprise *
            </label>
            <input
              type="text"
              value={formData.nom}
              onChange={(e) => setFormData({...formData, nom: e.target.value})}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Adresse complète
            </label>
            <textarea
              value={formData.adresse}
              onChange={(e) => setFormData({...formData, adresse: e.target.value})}
              rows={2}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent resize-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                SIRET
              </label>
              <input
                type="text"
                value={formData.siret}
                onChange={(e) => setFormData({...formData, siret: e.target.value})}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                placeholder="123 456 789 00010"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Email
              </label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({...formData, email: e.target.value})}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Téléphone
              </label>
              <input
                type="tel"
                value={formData.telephone}
                onChange={(e) => setFormData({...formData, telephone: e.target.value})}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                TVA (%)
              </label>
              <input
                type="number"
                value={formData.tva}
                onChange={(e) => setFormData({...formData, tva: parseFloat(e.target.value)})}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                min="0"
                max="100"
                step="0.1"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Mentions légales (pour les devis)
            </label>
            <textarea
              value={formData.mentionsLegales}
              onChange={(e) => setFormData({...formData, mentionsLegales: e.target.value})}
              rows={3}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent resize-none"
              placeholder="Devis valable 30 jours..."
            />
          </div>

          <button
            type="submit"
            className="w-full px-4 py-3 bg-orange-500 text-white rounded-lg font-medium hover:bg-orange-600 transition flex items-center justify-center gap-2"
          >
            <Save size={20} />
            Enregistrer les paramètres
          </button>
        </form>
      </div>

      <div className="mt-8 bg-blue-50 border border-blue-200 rounded-xl p-6 max-w-2xl">
        <h3 className="text-lg font-bold text-blue-900 mb-2">🎉 Prochaines fonctionnalités</h3>
        <ul className="space-y-2 text-sm text-blue-800">
          <li>• Création et édition de devis détaillés</li>
          <li>• Génération automatique de PDF professionnels</li>
          <li>• Transformation devis → facture en 1 clic</li>
          <li>• Envoi par email aux clients</li>
          <li>• Suivi des paiements</li>
        </ul>
      </div>
    </div>
  );
}