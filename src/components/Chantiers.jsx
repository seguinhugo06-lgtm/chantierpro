import React, { useState } from 'react';
import { Card, Badge, Button, ProgressBar } from './Dashboard';

// ============================================
// CONSTANTES
// ============================================
const STATUTS_CHANTIER = {
  prospect: { label: 'Prospect', color: 'slate', icon: '🎯' },
  devis: { label: 'Devis', color: 'blue', icon: '📄' },
  en_cours: { label: 'En cours', color: 'green', icon: '🔨' },
  pause: { label: 'Pause', color: 'yellow', icon: '⏸️' },
  termine: { label: 'Terminé', color: 'green', icon: '✅' },
  annule: { label: 'Annulé', color: 'red', icon: '❌' },
};

const PRIORITES = {
  basse: { label: 'Basse', color: 'slate' },
  normale: { label: 'Normale', color: 'blue' },
  haute: { label: 'Haute', color: 'yellow' },
  urgente: { label: 'Urgente', color: 'red' },
};

// ============================================
// PAGE CHANTIERS
// ============================================
export function ChantiersPage({ 
  chantiers = [], 
  clients = [], 
  onCreateChantier, 
  onUpdateChantier,
  onDeleteChantier 
}) {
  const [view, setView] = useState('list'); // 'list' | 'kanban' | 'calendar'
  const [showForm, setShowForm] = useState(false);
  const [editingChantier, setEditingChantier] = useState(null);
  const [filterStatut, setFilterStatut] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Filtrer les chantiers
  const filteredChantiers = chantiers.filter(c => {
    const matchStatut = filterStatut === 'all' || c.statut === filterStatut;
    const matchSearch = !searchQuery || 
      c.nom.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.adresse?.toLowerCase().includes(searchQuery.toLowerCase());
    return matchStatut && matchSearch;
  });

  // Stats
  const stats = {
    total: chantiers.length,
    enCours: chantiers.filter(c => c.statut === 'en_cours').length,
    termines: chantiers.filter(c => c.statut === 'termine').length,
    caTotal: chantiers.reduce((sum, c) => sum + (c.budget_prevu || 0), 0),
  };

  if (showForm) {
    return (
      <ChantierForm
        chantier={editingChantier}
        clients={clients}
        onSubmit={(data) => {
          if (editingChantier) {
            onUpdateChantier(editingChantier.id, data);
          } else {
            onCreateChantier(data);
          }
          setShowForm(false);
          setEditingChantier(null);
        }}
        onCancel={() => {
          setShowForm(false);
          setEditingChantier(null);
        }}
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Chantiers</h1>
          <p className="text-slate-500 mt-1">
            {stats.total} chantiers • {stats.enCours} en cours • {stats.caTotal.toLocaleString('fr-FR')} € total
          </p>
        </div>
        <Button onClick={() => setShowForm(true)}>
          + Nouveau chantier
        </Button>
      </div>

      {/* Filters & View Toggle */}
      <div className="flex flex-col sm:flex-row gap-4">
        {/* Search */}
        <div className="flex-1">
          <input
            type="text"
            placeholder="Rechercher un chantier..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          />
        </div>

        {/* Statut Filter */}
        <select
          value={filterStatut}
          onChange={(e) => setFilterStatut(e.target.value)}
          className="px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-primary-500"
        >
          <option value="all">Tous les statuts</option>
          {Object.entries(STATUTS_CHANTIER).map(([key, { label }]) => (
            <option key={key} value={key}>{label}</option>
          ))}
        </select>

        {/* View Toggle */}
        <div className="flex bg-slate-100 rounded-xl p-1">
          {[
            { id: 'list', icon: '☰', label: 'Liste' },
            { id: 'kanban', icon: '▦', label: 'Kanban' },
          ].map((v) => (
            <button
              key={v.id}
              onClick={() => setView(v.id)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                view === v.id 
                  ? 'bg-white shadow text-slate-900' 
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {v.icon} {v.label}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      {filteredChantiers.length === 0 ? (
        <Card className="text-center py-16">
          <p className="text-5xl mb-4">🏗️</p>
          <h3 className="text-lg font-semibold text-slate-900">Aucun chantier</h3>
          <p className="text-slate-500 mt-1">Créez votre premier chantier pour commencer</p>
          <Button className="mt-6" onClick={() => setShowForm(true)}>
            + Créer un chantier
          </Button>
        </Card>
      ) : view === 'list' ? (
        <ChantiersList 
          chantiers={filteredChantiers} 
          clients={clients}
          onEdit={(c) => { setEditingChantier(c); setShowForm(true); }}
          onDelete={onDeleteChantier}
          onUpdateStatut={(id, statut) => onUpdateChantier(id, { statut })}
        />
      ) : (
        <ChantiersKanban 
          chantiers={filteredChantiers} 
          clients={clients}
          onEdit={(c) => { setEditingChantier(c); setShowForm(true); }}
          onUpdateStatut={(id, statut) => onUpdateChantier(id, { statut })}
        />
      )}
    </div>
  );
}

// ============================================
// LISTE DES CHANTIERS
// ============================================
function ChantiersList({ chantiers, clients, onEdit, onDelete, onUpdateStatut }) {
  return (
    <div className="space-y-4">
      {chantiers.map((chantier) => {
        const client = clients.find(c => c.id === chantier.client_id);
        const statut = STATUTS_CHANTIER[chantier.statut] || STATUTS_CHANTIER.prospect;
        const priorite = PRIORITES[chantier.priorite] || PRIORITES.normale;
        
        return (
          <Card key={chantier.id} className="hover:shadow-md transition-shadow">
            <div className="flex flex-col lg:flex-row lg:items-center gap-4">
              {/* Main Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-3 mb-2">
                  <span className="text-2xl">{statut.icon}</span>
                  <h3 className="text-lg font-semibold text-slate-900 truncate">
                    {chantier.nom}
                  </h3>
                  <Badge color={statut.color}>{statut.label}</Badge>
                  <Badge color={priorite.color} size="sm">{priorite.label}</Badge>
                </div>
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-slate-500">
                  <span>👤 {client?.nom} {client?.prenom || ''}</span>
                  <span>📍 {chantier.adresse || 'Adresse non renseignée'}</span>
                  <span>📅 {new Date(chantier.date_debut).toLocaleDateString('fr-FR')} → {new Date(chantier.date_fin_prevue).toLocaleDateString('fr-FR')}</span>
                </div>
              </div>

              {/* Progress */}
              <div className="w-full lg:w-48">
                <div className="flex items-center justify-between text-sm mb-1">
                  <span className="text-slate-500">Progression</span>
                  <span className="font-medium text-slate-900">{chantier.progression || 0}%</span>
                </div>
                <ProgressBar 
                  value={chantier.progression || 0} 
                  showLabel={false}
                  color={chantier.progression >= 80 ? 'green' : 'primary'}
                />
              </div>

              {/* Budget */}
              <div className="text-right">
                <p className="text-xl font-bold text-slate-900">
                  {(chantier.budget_prevu || 0).toLocaleString('fr-FR')} €
                </p>
                <p className="text-sm text-slate-500">Budget prévu</p>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2">
                <button
                  onClick={() => onEdit(chantier)}
                  className="p-2 rounded-lg hover:bg-slate-100 text-slate-600"
                  title="Modifier"
                >
                  ✏️
                </button>
                <button
                  onClick={() => {
                    if (confirm('Supprimer ce chantier ?')) onDelete(chantier.id);
                  }}
                  className="p-2 rounded-lg hover:bg-red-50 text-red-500"
                  title="Supprimer"
                >
                  🗑️
                </button>
              </div>
            </div>
          </Card>
        );
      })}
    </div>
  );
}

// ============================================
// VUE KANBAN
// ============================================
function ChantiersKanban({ chantiers, clients, onEdit, onUpdateStatut }) {
  const columns = ['prospect', 'devis', 'en_cours', 'pause', 'termine'];
  
  const handleDragStart = (e, chantier) => {
    e.dataTransfer.setData('chantierId', chantier.id);
  };

  const handleDrop = (e, newStatut) => {
    e.preventDefault();
    const chantierId = e.dataTransfer.getData('chantierId');
    if (chantierId) {
      onUpdateStatut(chantierId, newStatut);
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
  };

  return (
    <div className="flex gap-4 overflow-x-auto pb-4">
      {columns.map((statut) => {
        const config = STATUTS_CHANTIER[statut];
        const columnChantiers = chantiers.filter(c => c.statut === statut);
        
        return (
          <div
            key={statut}
            className="flex-shrink-0 w-80"
            onDrop={(e) => handleDrop(e, statut)}
            onDragOver={handleDragOver}
          >
            {/* Column Header */}
            <div className="flex items-center gap-2 mb-3 px-2">
              <span>{config.icon}</span>
              <h3 className="font-semibold text-slate-900">{config.label}</h3>
              <span className="ml-auto bg-slate-200 text-slate-600 text-xs font-bold px-2 py-0.5 rounded-full">
                {columnChantiers.length}
              </span>
            </div>

            {/* Column Content */}
            <div className="bg-slate-100 rounded-xl p-3 min-h-[500px] space-y-3">
              {columnChantiers.map((chantier) => {
                const client = clients.find(c => c.id === chantier.client_id);
                const priorite = PRIORITES[chantier.priorite];
                
                return (
                  <div
                    key={chantier.id}
                    draggable
                    onDragStart={(e) => handleDragStart(e, chantier)}
                    onClick={() => onEdit(chantier)}
                    className="bg-white rounded-xl p-4 shadow-sm cursor-pointer hover:shadow-md transition-all border border-slate-200"
                  >
                    <div className="flex items-start justify-between mb-2">
                      <h4 className="font-medium text-slate-900 text-sm truncate flex-1">
                        {chantier.nom}
                      </h4>
                      <Badge color={priorite?.color || 'slate'} size="sm">
                        {priorite?.label || 'Normal'}
                      </Badge>
                    </div>
                    
                    <p className="text-xs text-slate-500 mb-3">
                      👤 {client?.nom || 'Client inconnu'}
                    </p>

                    <ProgressBar 
                      value={chantier.progression || 0} 
                      size="sm"
                      showLabel={false}
                    />

                    <div className="flex items-center justify-between mt-3 text-xs text-slate-500">
                      <span>📅 {new Date(chantier.date_fin_prevue).toLocaleDateString('fr-FR')}</span>
                      <span className="font-semibold text-slate-900">
                        {(chantier.budget_prevu || 0).toLocaleString('fr-FR')} €
                      </span>
                    </div>
                  </div>
                );
              })}

              {columnChantiers.length === 0 && (
                <div className="text-center py-8 text-slate-400 text-sm">
                  Glissez un chantier ici
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ============================================
// FORMULAIRE CHANTIER
// ============================================
function ChantierForm({ chantier, clients, onSubmit, onCancel }) {
  const [form, setForm] = useState({
    nom: chantier?.nom || '',
    client_id: chantier?.client_id || '',
    adresse: chantier?.adresse || '',
    description: chantier?.description || '',
    date_debut: chantier?.date_debut || new Date().toISOString().split('T')[0],
    date_fin_prevue: chantier?.date_fin_prevue || '',
    budget_prevu: chantier?.budget_prevu || '',
    statut: chantier?.statut || 'prospect',
    priorite: chantier?.priorite || 'normale',
    progression: chantier?.progression || 0,
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit({
      ...form,
      budget_prevu: parseFloat(form.budget_prevu) || 0,
      progression: parseInt(form.progression) || 0,
    });
  };

  const updateField = (field, value) => {
    setForm(prev => ({ ...prev, [field]: value }));
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <button 
          onClick={onCancel}
          className="p-2 rounded-lg hover:bg-slate-100"
        >
          ← Retour
        </button>
        <h1 className="text-2xl font-bold text-slate-900">
          {chantier ? 'Modifier le chantier' : 'Nouveau chantier'}
        </h1>
      </div>

      <Card>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Infos principales */}
          <div>
            <h3 className="font-semibold text-slate-900 mb-4">Informations générales</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Nom du chantier *
                </label>
                <input
                  type="text"
                  value={form.nom}
                  onChange={(e) => updateField('nom', e.target.value)}
                  required
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  placeholder="Ex: Rénovation cuisine M. Dupont"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Client *
                </label>
                <select
                  value={form.client_id}
                  onChange={(e) => updateField('client_id', e.target.value)}
                  required
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary-500"
                >
                  <option value="">Sélectionner un client</option>
                  {clients.map(c => (
                    <option key={c.id} value={c.id}>{c.nom} {c.prenom}</option>
                  ))}
                </select>
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Adresse du chantier
                </label>
                <input
                  type="text"
                  value={form.adresse}
                  onChange={(e) => updateField('adresse', e.target.value)}
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary-500"
                  placeholder="123 rue de la Construction, 75000 Paris"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Description
                </label>
                <textarea
                  value={form.description}
                  onChange={(e) => updateField('description', e.target.value)}
                  rows={3}
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary-500"
                  placeholder="Détails du chantier..."
                />
              </div>
            </div>
          </div>

          {/* Planning & Budget */}
          <div>
            <h3 className="font-semibold text-slate-900 mb-4">Planning & Budget</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Date de début *
                </label>
                <input
                  type="date"
                  value={form.date_debut}
                  onChange={(e) => updateField('date_debut', e.target.value)}
                  required
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Date de fin prévue *
                </label>
                <input
                  type="date"
                  value={form.date_fin_prevue}
                  onChange={(e) => updateField('date_fin_prevue', e.target.value)}
                  required
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Budget prévu (€)
                </label>
                <input
                  type="number"
                  value={form.budget_prevu}
                  onChange={(e) => updateField('budget_prevu', e.target.value)}
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary-500"
                  placeholder="15000"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Progression (%)
                </label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={form.progression}
                  onChange={(e) => updateField('progression', e.target.value)}
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary-500"
                />
              </div>
            </div>
          </div>

          {/* Statut & Priorité */}
          <div>
            <h3 className="font-semibold text-slate-900 mb-4">Statut & Priorité</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Statut
                </label>
                <select
                  value={form.statut}
                  onChange={(e) => updateField('statut', e.target.value)}
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary-500"
                >
                  {Object.entries(STATUTS_CHANTIER).map(([key, { label, icon }]) => (
                    <option key={key} value={key}>{icon} {label}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Priorité
                </label>
                <select
                  value={form.priorite}
                  onChange={(e) => updateField('priorite', e.target.value)}
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary-500"
                >
                  {Object.entries(PRIORITES).map(([key, { label }]) => (
                    <option key={key} value={key}>{label}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-4 border-t border-slate-200">
            <Button variant="secondary" type="button" onClick={onCancel}>
              Annuler
            </Button>
            <Button type="submit">
              {chantier ? 'Enregistrer' : 'Créer le chantier'}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}

export { ChantierForm, ChantiersList, ChantiersKanban };
