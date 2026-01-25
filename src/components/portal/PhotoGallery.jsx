import React, { useState, useEffect, useCallback } from 'react';
import { X, ChevronLeft, ChevronRight, Download, Calendar, ZoomIn } from 'lucide-react';
import Button from '../ui/Button';

/**
 * Format date to French locale
 * @param {string} dateStr
 * @returns {string}
 */
const formatDate = (dateStr) => {
  if (!dateStr) return '';
  return new Intl.DateTimeFormat('fr-FR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(new Date(dateStr));
};

/**
 * Group photos by date
 * @param {Array} photos
 * @returns {Object}
 */
const groupPhotosByDate = (photos) => {
  return photos.reduce((groups, photo) => {
    const date = photo.created_at ? new Date(photo.created_at).toDateString() : 'Sans date';
    if (!groups[date]) groups[date] = [];
    groups[date].push(photo);
    return groups;
  }, {});
};

/**
 * PhotoGallery - Full screen photo gallery with lightbox
 * @param {Object} props
 * @param {boolean} props.isOpen - Whether gallery is open
 * @param {Function} props.onClose - Callback to close gallery
 * @param {Array} props.photos - Array of photos
 * @param {string} props.chantierName - Name of the chantier
 */
export default function PhotoGallery({ isOpen, onClose, photos = [], chantierName }) {
  const [selectedIndex, setSelectedIndex] = useState(null);
  const [filter, setFilter] = useState('all');

  // Filter photos by date
  const filteredPhotos = filter === 'all'
    ? photos
    : photos.filter(p => {
        const photoDate = new Date(p.created_at);
        const now = new Date();
        if (filter === 'week') {
          const weekAgo = new Date(now.setDate(now.getDate() - 7));
          return photoDate >= weekAgo;
        }
        if (filter === 'month') {
          const monthAgo = new Date(now.setMonth(now.getMonth() - 1));
          return photoDate >= monthAgo;
        }
        return true;
      });

  const groupedPhotos = groupPhotosByDate(filteredPhotos);
  const sortedDates = Object.keys(groupedPhotos).sort((a, b) =>
    new Date(b) - new Date(a)
  );

  // Keyboard navigation
  const handleKeyDown = useCallback((e) => {
    if (selectedIndex === null) return;

    if (e.key === 'Escape') {
      setSelectedIndex(null);
    } else if (e.key === 'ArrowLeft') {
      setSelectedIndex(i => i > 0 ? i - 1 : filteredPhotos.length - 1);
    } else if (e.key === 'ArrowRight') {
      setSelectedIndex(i => i < filteredPhotos.length - 1 ? i + 1 : 0);
    }
  }, [selectedIndex, filteredPhotos.length]);

  useEffect(() => {
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'hidden';
    }
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [isOpen, handleKeyDown]);

  // Download photo
  const handleDownload = async (photo) => {
    try {
      const response = await fetch(photo.url);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `chantier-photo-${photo.id}.jpg`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Download failed:', error);
    }
  };

  if (!isOpen) return null;

  const selectedPhoto = selectedIndex !== null ? filteredPhotos[selectedIndex] : null;

  return (
    <div className="fixed inset-0 z-50 bg-black/95 overflow-hidden">
      {/* Header */}
      <div className="absolute top-0 left-0 right-0 z-10 bg-gradient-to-b from-black/80 to-transparent p-4">
        <div className="flex items-center justify-between max-w-7xl mx-auto">
          <div>
            <h2 className="text-white text-xl font-semibold">{chantierName}</h2>
            <p className="text-white/60 text-sm">{filteredPhotos.length} photos</p>
          </div>

          <div className="flex items-center gap-3">
            {/* Date filters */}
            <div className="hidden sm:flex items-center gap-1 bg-white/10 rounded-lg p-1">
              {[
                { value: 'all', label: 'Toutes' },
                { value: 'week', label: '7 jours' },
                { value: 'month', label: '30 jours' },
              ].map(({ value, label }) => (
                <button
                  key={value}
                  onClick={() => setFilter(value)}
                  className={`px-3 py-1.5 text-sm rounded-md transition-colors ${
                    filter === value
                      ? 'bg-white text-black'
                      : 'text-white/70 hover:text-white'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>

            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="text-white hover:bg-white/10"
            >
              <X className="w-5 h-5" />
            </Button>
          </div>
        </div>
      </div>

      {/* Gallery Grid */}
      <div className="h-full overflow-y-auto pt-24 pb-8 px-4">
        <div className="max-w-7xl mx-auto space-y-8">
          {sortedDates.map(date => (
            <div key={date}>
              <div className="flex items-center gap-2 mb-4 sticky top-0 bg-black/80 py-2 -mx-2 px-2">
                <Calendar className="w-4 h-4 text-orange-400" />
                <h3 className="text-white font-medium">
                  {date !== 'Sans date' ? formatDate(date) : date}
                </h3>
                <span className="text-white/40 text-sm">
                  ({groupedPhotos[date].length})
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                {groupedPhotos[date].map((photo, idx) => {
                  const globalIndex = filteredPhotos.findIndex(p => p.id === photo.id);
                  return (
                    <div
                      key={photo.id}
                      className="group relative aspect-square rounded-lg overflow-hidden cursor-pointer bg-slate-800"
                      onClick={() => setSelectedIndex(globalIndex)}
                    >
                      <img
                        src={photo.thumbnail_url || photo.url}
                        alt={photo.description || 'Photo'}
                        className="w-full h-full object-cover transition-transform group-hover:scale-110"
                        loading="lazy"
                      />
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center">
                        <ZoomIn className="w-8 h-8 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                      </div>
                      {photo.description && (
                        <div className="absolute bottom-0 left-0 right-0 p-2 bg-gradient-to-t from-black/80 to-transparent">
                          <p className="text-white text-xs line-clamp-2">{photo.description}</p>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}

          {filteredPhotos.length === 0 && (
            <div className="text-center py-20">
              <p className="text-white/60 text-lg">Aucune photo pour cette periode</p>
            </div>
          )}
        </div>
      </div>

      {/* Lightbox */}
      {selectedPhoto && (
        <div
          className="fixed inset-0 z-50 bg-black flex items-center justify-center"
          onClick={() => setSelectedIndex(null)}
        >
          {/* Navigation buttons */}
          <button
            className="absolute left-4 top-1/2 -translate-y-1/2 p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
            onClick={(e) => {
              e.stopPropagation();
              setSelectedIndex(i => i > 0 ? i - 1 : filteredPhotos.length - 1);
            }}
          >
            <ChevronLeft className="w-8 h-8" />
          </button>

          <button
            className="absolute right-4 top-1/2 -translate-y-1/2 p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
            onClick={(e) => {
              e.stopPropagation();
              setSelectedIndex(i => i < filteredPhotos.length - 1 ? i + 1 : 0);
            }}
          >
            <ChevronRight className="w-8 h-8" />
          </button>

          {/* Close button */}
          <button
            className="absolute top-4 right-4 p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
            onClick={() => setSelectedIndex(null)}
          >
            <X className="w-6 h-6" />
          </button>

          {/* Download button */}
          <button
            className="absolute top-4 left-4 p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors flex items-center gap-2"
            onClick={(e) => {
              e.stopPropagation();
              handleDownload(selectedPhoto);
            }}
          >
            <Download className="w-5 h-5" />
            <span className="text-sm hidden sm:inline">Telecharger</span>
          </button>

          {/* Image */}
          <img
            src={selectedPhoto.url}
            alt={selectedPhoto.description || 'Photo'}
            className="max-w-[90vw] max-h-[85vh] object-contain"
            onClick={(e) => e.stopPropagation()}
          />

          {/* Caption */}
          {selectedPhoto.description && (
            <div className="absolute bottom-8 left-1/2 -translate-x-1/2 bg-black/80 text-white px-4 py-2 rounded-lg max-w-md text-center">
              <p>{selectedPhoto.description}</p>
              <p className="text-white/60 text-sm mt-1">
                {formatDate(selectedPhoto.created_at)}
              </p>
            </div>
          )}

          {/* Counter */}
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 text-white/60 text-sm">
            {selectedIndex + 1} / {filteredPhotos.length}
          </div>
        </div>
      )}
    </div>
  );
}
