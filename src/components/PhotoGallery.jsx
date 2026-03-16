import React, { useState, useRef, useCallback } from 'react';
import { Camera, Upload, X, Image, ArrowLeft, ArrowRight, Trash2, Download, Plus, CheckCircle, Clock, Eye, Grid3X3, Columns, ZoomIn, Share2, Calendar, MapPin, Tag } from 'lucide-react';
import { useConfirm } from '../context/AppContext';
import { generateId } from '../lib/utils';

/**
 * Composant de galerie photos avant/apres pour chantiers
 * Permet de documenter l'avancement des travaux
 */
export default function PhotoGallery({
  photos = [],
  setPhotos,
  chantierId,
  chantierNom,
  isDark = false,
  couleur = '#f97316'
}) {
  const { confirm } = useConfirm();

  const [view, setView] = useState('gallery'); // gallery, compare, add, detail
  const [selectedPhoto, setSelectedPhoto] = useState(null);
  const [compareMode, setCompareMode] = useState(null); // { before: photo, after: photo }
  const [filter, setFilter] = useState('all'); // all, avant, apres, en_cours
  const [layout, setLayout] = useState('grid'); // grid, list
  const fileInputRef = useRef(null);
  const cameraInputRef = useRef(null);
  const [form, setForm] = useState({
    type: 'avant', // avant, apres, en_cours
    description: '',
    zone: '',
    date: new Date().toISOString().split('T')[0]
  });

  // Theme classes
  const cardBg = isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200';
  const textPrimary = isDark ? 'text-slate-100' : 'text-slate-900';
  const textSecondary = isDark ? 'text-slate-300' : 'text-slate-600';
  const textMuted = isDark ? 'text-slate-400' : 'text-slate-600';
  const inputBg = isDark ? 'bg-slate-700 border-slate-600 text-white' : 'bg-white border-slate-300';
  const hoverBg = isDark ? 'hover:bg-slate-700' : 'hover:bg-slate-50';

  // Filter photos for current chantier
  const chantierPhotos = photos.filter(p => p.chantierId === chantierId);
  const filteredPhotos = filter === 'all'
    ? chantierPhotos
    : chantierPhotos.filter(p => p.type === filter);

  // Group by zone
  const zones = [...new Set(chantierPhotos.map(p => p.zone).filter(Boolean))];

  // Photo type config
  const photoTypes = {
    avant: { label: 'Avant', color: '#ef4444', icon: Clock },
    en_cours: { label: 'En cours', color: '#f59e0b', icon: Camera },
    apres: { label: 'Apres', color: '#10b981', icon: CheckCircle }
  };

  // Handle file selection
  const handleFileSelect = useCallback((e) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    files.forEach(file => {
      if (!file.type.startsWith('image/')) return;
      if (file.size > 10 * 1024 * 1024) return; // Max 10MB

      const reader = new FileReader();
      reader.onload = (event) => {
        const newPhoto = {
          id: generateId(),
          chantierId,
          imageData: event.target.result,
          type: form.type,
          description: form.description,
          zone: form.zone,
          date: form.date,
          createdAt: new Date().toISOString()
        };
        setPhotos(prev => [...prev, newPhoto]);
      };
      reader.readAsDataURL(file);
    });

    // Reset form
    setForm(prev => ({ ...prev, description: '' }));
    setView('gallery');
    if (fileInputRef.current) fileInputRef.current.value = '';
    if (cameraInputRef.current) cameraInputRef.current.value = '';
  }, [chantierId, form, setPhotos]);

  // Delete photo
  const handleDelete = async (photoId) => {
    const confirmed = await confirm({ title: 'Supprimer', message: 'Supprimer cette photo ?' });
    if (confirmed) {
      setPhotos(prev => prev.filter(p => p.id !== photoId));
      if (selectedPhoto?.id === photoId) {
        setSelectedPhoto(null);
        setView('gallery');
      }
    }
  };

  // Download photo
  const handleDownload = (photo) => {
    const link = document.createElement('a');
    link.href = photo.imageData;
    link.download = `${chantierNom}_${photo.type}_${photo.date}.jpg`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Start compare mode
  const startCompare = () => {
    const avantPhotos = chantierPhotos.filter(p => p.type === 'avant');
    const apresPhotos = chantierPhotos.filter(p => p.type === 'apres');

    if (avantPhotos.length > 0 && apresPhotos.length > 0) {
      setCompareMode({
        before: avantPhotos[0],
        after: apresPhotos[apresPhotos.length - 1]
      });
      setView('compare');
    }
  };

  // Add view
  if (view === 'add') {
    return (
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <button onClick={() => setView('gallery')} className={`p-2 rounded-xl ${hoverBg}`}>
            <ArrowLeft size={20} className={textPrimary} />
          </button>
          <h2 className={`text-xl font-bold ${textPrimary}`}>Ajouter des photos</h2>
        </div>

        {/* Hidden inputs */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={handleFileSelect}
        />
        <input
          ref={cameraInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          className="hidden"
          onChange={handleFileSelect}
        />

        {/* Photo type selection */}
        <div className={`${cardBg} rounded-xl border p-5`}>
          <label className={`block text-sm font-medium mb-3 ${textPrimary}`}>Type de photo *</label>
          <div className="grid grid-cols-3 gap-3">
            {Object.entries(photoTypes).map(([key, config]) => {
              const Icon = config.icon;
              return (
                <button
                  key={key}
                  onClick={() => setForm(p => ({ ...p, type: key }))}
                  className={`p-4 rounded-xl border-2 transition-all ${
                    form.type === key
                      ? 'border-current'
                      : isDark ? 'border-slate-600' : 'border-slate-200'
                  }`}
                  style={form.type === key ? { borderColor: config.color, background: `${config.color}10` } : {}}
                >
                  <Icon size={24} style={{ color: config.color }} className="mx-auto mb-2" />
                  <p className={`text-sm font-medium ${textPrimary}`}>{config.label}</p>
                </button>
              );
            })}
          </div>
        </div>

        {/* Zone and description */}
        <div className={`${cardBg} rounded-xl border p-5 space-y-4`}>
          <div>
            <label className={`block text-sm font-medium mb-1 ${textPrimary}`}>Zone / Piece</label>
            <input
              type="text"
              value={form.zone}
              onChange={e => setForm(p => ({ ...p, zone: e.target.value }))}
              className={`w-full px-4 py-2.5 border rounded-xl ${inputBg}`}
              placeholder="Ex: Salle de bain, Cuisine, Facade..."
              list="zones-list"
            />
            <datalist id="zones-list">
              {zones.map(z => <option key={z} value={z} />)}
            </datalist>
          </div>

          <div>
            <label className={`block text-sm font-medium mb-1 ${textPrimary}`}>Description</label>
            <input
              type="text"
              value={form.description}
              onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
              className={`w-full px-4 py-2.5 border rounded-xl ${inputBg}`}
              placeholder="Description de la photo..."
            />
          </div>

          <div>
            <label className={`block text-sm font-medium mb-1 ${textPrimary}`}>Date</label>
            <input
              type="date"
              value={form.date}
              onChange={e => setForm(p => ({ ...p, date: e.target.value }))}
              className={`w-full px-4 py-2.5 border rounded-xl ${inputBg}`}
            />
          </div>
        </div>

        {/* Capture buttons */}
        <div className="grid sm:grid-cols-2 gap-4">
          <button
            onClick={() => cameraInputRef.current?.click()}
            className={`${cardBg} rounded-xl border p-6 text-center hover:shadow-lg transition-all`}
          >
            <div className="w-16 h-16 mx-auto mb-4 rounded-2xl flex items-center justify-center" style={{ background: `${couleur}20` }}>
              <Camera size={32} style={{ color: couleur }} />
            </div>
            <h3 className={`font-semibold mb-1 ${textPrimary}`}>Prendre une photo</h3>
            <p className={`text-sm ${textMuted}`}>Utiliser l'appareil photo</p>
          </button>

          <button
            onClick={() => fileInputRef.current?.click()}
            className={`${cardBg} rounded-xl border p-6 text-center hover:shadow-lg transition-all`}
          >
            <div className="w-16 h-16 mx-auto mb-4 rounded-2xl flex items-center justify-center bg-blue-100 dark:bg-blue-900/30">
              <Upload size={32} className="text-blue-600 dark:text-blue-400" />
            </div>
            <h3 className={`font-semibold mb-1 ${textPrimary}`}>Importer</h3>
            <p className={`text-sm ${textMuted}`}>Depuis la galerie</p>
          </button>
        </div>
      </div>
    );
  }

  // Detail view
  if (view === 'detail' && selectedPhoto) {
    const typeConfig = photoTypes[selectedPhoto.type] || photoTypes.avant;
    const photoIndex = filteredPhotos.findIndex(p => p.id === selectedPhoto.id);

    return (
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <button onClick={() => { setView('gallery'); setSelectedPhoto(null); }} className={`p-2 rounded-xl ${hoverBg}`}>
            <ArrowLeft size={20} className={textPrimary} />
          </button>
          <div className="flex gap-2">
            <button onClick={() => handleDownload(selectedPhoto)} className={`p-2 rounded-xl ${isDark ? 'bg-slate-700' : 'bg-slate-100'}`}>
              <Download size={18} className={textSecondary} />
            </button>
            <button onClick={() => handleDelete(selectedPhoto.id)} className={`p-2 rounded-xl ${isDark ? 'bg-red-900/30' : 'bg-red-100'}`}>
              <Trash2 size={18} className="text-red-500" />
            </button>
          </div>
        </div>

        {/* Image */}
        <div className={`${cardBg} rounded-2xl border overflow-hidden`}>
          <img
            src={selectedPhoto.imageData}
            alt={selectedPhoto.description || 'Photo chantier'}
            className="w-full max-h-[60vh] object-contain bg-slate-100 dark:bg-slate-900"
          />
        </div>

        {/* Info */}
        <div className={`${cardBg} rounded-xl border p-5`}>
          <div className="flex items-center gap-3 mb-4">
            <span
              className="px-3 py-1.5 rounded-full text-sm font-medium text-white"
              style={{ background: typeConfig.color }}
            >
              {typeConfig.label}
            </span>
            {selectedPhoto.zone && (
              <span className={`px-3 py-1.5 rounded-full text-sm ${isDark ? 'bg-slate-700 text-slate-300' : 'bg-slate-100 text-slate-600'}`}>
                <MapPin size={14} className="inline mr-1" />
                {selectedPhoto.zone}
              </span>
            )}
          </div>

          {selectedPhoto.description && (
            <p className={`mb-3 ${textPrimary}`}>{selectedPhoto.description}</p>
          )}

          <p className={`text-sm ${textMuted}`}>
            <Calendar size={14} className="inline mr-1" />
            {new Date(selectedPhoto.date).toLocaleDateString('fr-FR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </p>
        </div>

        {/* Navigation */}
        {filteredPhotos.length > 1 && (
          <div className="flex justify-between">
            <button
              onClick={() => {
                const prevIndex = photoIndex > 0 ? photoIndex - 1 : filteredPhotos.length - 1;
                setSelectedPhoto(filteredPhotos[prevIndex]);
              }}
              className={`px-4 py-2 rounded-xl flex items-center gap-2 ${isDark ? 'bg-slate-700 text-slate-300' : 'bg-slate-100 text-slate-600'}`}
            >
              <ArrowLeft size={18} />
              Précédente
            </button>
            <span className={textMuted}>{photoIndex + 1} / {filteredPhotos.length}</span>
            <button
              onClick={() => {
                const nextIndex = photoIndex < filteredPhotos.length - 1 ? photoIndex + 1 : 0;
                setSelectedPhoto(filteredPhotos[nextIndex]);
              }}
              className={`px-4 py-2 rounded-xl flex items-center gap-2 ${isDark ? 'bg-slate-700 text-slate-300' : 'bg-slate-100 text-slate-600'}`}
            >
              Suivante
              <ArrowRight size={18} />
            </button>
          </div>
        )}
      </div>
    );
  }

  // Compare view
  if (view === 'compare' && compareMode) {
    return (
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <button onClick={() => { setView('gallery'); setCompareMode(null); }} className={`p-2 rounded-xl ${hoverBg}`}>
            <ArrowLeft size={20} className={textPrimary} />
          </button>
          <h2 className={`text-xl font-bold ${textPrimary}`}>Comparaison avant/apres</h2>
          <div />
        </div>

        {/* Side by side comparison */}
        <div className="grid md:grid-cols-2 gap-4">
          {/* Before */}
          <div className={`${cardBg} rounded-xl border overflow-hidden`}>
            <div className="px-4 py-2 bg-red-500 text-white font-medium flex items-center gap-2">
              <Clock size={16} />
              AVANT
            </div>
            <img
              src={compareMode.before.imageData}
              alt="Avant"
              className="w-full h-64 object-cover"
            />
            <div className="p-4">
              <p className={`text-sm ${textMuted}`}>{new Date(compareMode.before.date).toLocaleDateString('fr-FR')}</p>
              {compareMode.before.zone && <p className={textSecondary}>{compareMode.before.zone}</p>}
            </div>
            {/* Photo selector */}
            <div className="px-4 pb-4">
              <select
                value={compareMode.before.id}
                onChange={e => {
                  const photo = chantierPhotos.find(p => p.id === e.target.value);
                  if (photo) setCompareMode(prev => ({ ...prev, before: photo }));
                }}
                className={`w-full px-3 py-2 border rounded-lg text-sm ${inputBg}`}
              >
                {chantierPhotos.filter(p => p.type === 'avant').map(p => (
                  <option key={p.id} value={p.id}>
                    {p.zone || 'Photo'} - {new Date(p.date).toLocaleDateString('fr-FR')}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* After */}
          <div className={`${cardBg} rounded-xl border overflow-hidden`}>
            <div className="px-4 py-2 bg-emerald-500 text-white font-medium flex items-center gap-2">
              <CheckCircle size={16} />
              APRES
            </div>
            <img
              src={compareMode.after.imageData}
              alt="Apres"
              className="w-full h-64 object-cover"
            />
            <div className="p-4">
              <p className={`text-sm ${textMuted}`}>{new Date(compareMode.after.date).toLocaleDateString('fr-FR')}</p>
              {compareMode.after.zone && <p className={textSecondary}>{compareMode.after.zone}</p>}
            </div>
            {/* Photo selector */}
            <div className="px-4 pb-4">
              <select
                value={compareMode.after.id}
                onChange={e => {
                  const photo = chantierPhotos.find(p => p.id === e.target.value);
                  if (photo) setCompareMode(prev => ({ ...prev, after: photo }));
                }}
                className={`w-full px-3 py-2 border rounded-lg text-sm ${inputBg}`}
              >
                {chantierPhotos.filter(p => p.type === 'apres').map(p => (
                  <option key={p.id} value={p.id}>
                    {p.zone || 'Photo'} - {new Date(p.date).toLocaleDateString('fr-FR')}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Gallery view
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h2 className={`text-xl font-bold ${textPrimary}`}>
          Photos <span className={textMuted}>({chantierPhotos.length})</span>
        </h2>
        <div className="flex gap-2">
          {chantierPhotos.filter(p => p.type === 'avant').length > 0 &&
           chantierPhotos.filter(p => p.type === 'apres').length > 0 && (
            <button
              onClick={startCompare}
              className={`px-4 py-2 rounded-xl font-medium flex items-center gap-2 ${isDark ? 'bg-slate-700 text-slate-300' : 'bg-slate-100 text-slate-600'}`}
            >
              <Columns size={18} />
              Comparer
            </button>
          )}
          <button
            onClick={() => setView('add')}
            className="px-4 py-2 text-white rounded-xl font-medium flex items-center gap-2"
            style={{ background: couleur }}
          >
            <Plus size={18} />
            Ajouter
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        {Object.entries(photoTypes).map(([key, config]) => {
          const count = chantierPhotos.filter(p => p.type === key).length;
          const Icon = config.icon;
          return (
            <div
              key={key}
              onClick={() => setFilter(filter === key ? 'all' : key)}
              className={`${cardBg} rounded-xl border p-4 cursor-pointer transition-all ${
                filter === key ? 'ring-2' : ''
              }`}
              style={filter === key ? { borderColor: config.color, ringColor: config.color } : {}}
            >
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 rounded-lg" style={{ background: `${config.color}20` }}>
                  <Icon size={18} style={{ color: config.color }} />
                </div>
                <span className={textMuted}>{config.label}</span>
              </div>
              <p className={`text-2xl font-bold ${textPrimary}`}>{count}</p>
            </div>
          );
        })}
      </div>

      {/* Filter and layout */}
      <div className="flex justify-between items-center">
        <div className="flex gap-2">
          {['all', 'avant', 'en_cours', 'apres'].map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium ${
                filter === f
                  ? 'text-white'
                  : isDark ? 'bg-slate-700 text-slate-300' : 'bg-slate-100 text-slate-600'
              }`}
              style={filter === f ? { background: couleur } : {}}
            >
              {f === 'all' ? 'Toutes' : photoTypes[f]?.label || f}
            </button>
          ))}
        </div>
        <div className="flex gap-1">
          <button
            onClick={() => setLayout('grid')}
            className={`p-2 rounded-lg ${layout === 'grid' ? (isDark ? 'bg-slate-600' : 'bg-slate-200') : ''}`}
          >
            <Grid3X3 size={18} className={textSecondary} />
          </button>
          <button
            onClick={() => setLayout('list')}
            className={`p-2 rounded-lg ${layout === 'list' ? (isDark ? 'bg-slate-600' : 'bg-slate-200') : ''}`}
          >
            <Columns size={18} className={textSecondary} />
          </button>
        </div>
      </div>

      {/* Photos grid/list */}
      {filteredPhotos.length === 0 ? (
        <div className={`${cardBg} rounded-2xl border p-12 text-center`}>
          <Image size={48} className={`mx-auto mb-4 ${textMuted}`} />
          <h3 className={`text-lg font-semibold mb-2 ${textPrimary}`}>
            {chantierPhotos.length === 0 ? 'Aucune photo' : 'Aucune photo dans cette categorie'}
          </h3>
          <p className={textMuted}>
            {chantierPhotos.length === 0 ? 'Documentez votre chantier en ajoutant des photos' : 'Changez le filtre pour voir d\'autres photos'}
          </p>
        </div>
      ) : layout === 'grid' ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {filteredPhotos.map(photo => {
            const typeConfig = photoTypes[photo.type] || photoTypes.avant;
            return (
              <div
                key={photo.id}
                onClick={() => { setSelectedPhoto(photo); setView('detail'); }}
                className={`${cardBg} rounded-xl border overflow-hidden cursor-pointer hover:shadow-lg transition-all group`}
              >
                <div className="relative">
                  <img
                    src={photo.imageData}
                    alt={photo.description || 'Photo'}
                    className="w-full h-40 object-cover"
                  />
                  <span
                    className="absolute top-2 left-2 px-2 py-1 rounded-full text-xs font-medium text-white"
                    style={{ background: typeConfig.color }}
                  >
                    {typeConfig.label}
                  </span>
                  <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <ZoomIn size={24} className="text-white" />
                  </div>
                </div>
                <div className="p-3">
                  {photo.zone && <p className={`text-sm font-medium truncate ${textPrimary}`}>{photo.zone}</p>}
                  <p className={`text-xs ${textMuted}`}>
                    {new Date(photo.date).toLocaleDateString('fr-FR')}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className={`${cardBg} rounded-xl border overflow-hidden divide-y ${isDark ? 'divide-slate-700' : 'divide-slate-100'}`}>
          {filteredPhotos.map(photo => {
            const typeConfig = photoTypes[photo.type] || photoTypes.avant;
            return (
              <div
                key={photo.id}
                onClick={() => { setSelectedPhoto(photo); setView('detail'); }}
                className={`flex items-center gap-4 p-4 cursor-pointer ${hoverBg}`}
              >
                <img
                  src={photo.imageData}
                  alt={photo.description || 'Photo'}
                  className="w-20 h-20 object-cover rounded-lg"
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span
                      className="px-2 py-0.5 rounded-full text-xs font-medium text-white"
                      style={{ background: typeConfig.color }}
                    >
                      {typeConfig.label}
                    </span>
                    {photo.zone && (
                      <span className={`text-sm ${textSecondary}`}>{photo.zone}</span>
                    )}
                  </div>
                  {photo.description && (
                    <p className={`truncate ${textPrimary}`}>{photo.description}</p>
                  )}
                  <p className={`text-sm ${textMuted}`}>
                    {new Date(photo.date).toLocaleDateString('fr-FR')}
                  </p>
                </div>
                <ArrowRight size={18} className={textMuted} />
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
