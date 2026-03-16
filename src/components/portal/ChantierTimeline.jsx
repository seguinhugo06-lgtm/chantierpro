import React, { useState } from 'react';
import { Building2, Calendar, Camera, ChevronRight, Clock, CheckCircle, PlayCircle } from 'lucide-react';
import { Card, CardContent } from '../ui/Card';
import Badge from '../ui/Badge';
import Button from '../ui/Button';
import { Progress } from '../ui/Progress';

/**
 * Format date to French locale
 * @param {string} dateStr
 * @returns {string}
 */
const formatDate = (dateStr) => {
  if (!dateStr) return 'Non definie';
  return new Intl.DateTimeFormat('fr-FR', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(new Date(dateStr));
};

/**
 * Get status badge info
 * @param {string} statut
 * @returns {{ variant: string, label: string, icon: React.ComponentType }}
 */
const getStatusInfo = (statut) => {
  switch (statut) {
    case 'termine':
      return { variant: 'success', label: 'Termine', icon: CheckCircle };
    case 'en_cours':
      return { variant: 'primary', label: 'En cours', icon: PlayCircle };
    case 'planifie':
      return { variant: 'warning', label: 'Planifie', icon: Calendar };
    default:
      return { variant: 'secondary', label: 'Prevu', icon: Clock };
  }
};

/**
 * ChantierTimeline - Display chantier with timeline and photos
 * @param {Object} props
 * @param {Object} props.chantier - Chantier object with photos
 * @param {Function} props.onViewPhotos - Callback to view all photos
 */
export default function ChantierTimeline({ chantier, onViewPhotos }) {
  const statusInfo = getStatusInfo(chantier.statut);
  const StatusIcon = statusInfo.icon;
  const photos = chantier.photos || [];
  const latestPhoto = photos[0];
  const photoCount = photos.length;

  // Calculate progression if not set
  const progression = chantier.progression ?? (
    chantier.statut === 'termine' ? 100 :
    chantier.statut === 'en_cours' ? 50 :
    0
  );

  return (
    <Card className="overflow-hidden hover:shadow-md transition-shadow">
      <CardContent className="p-0">
        {/* Header */}
        <div className="p-4 border-b border-slate-100">
          <div className="flex items-start gap-4">
            {/* Icon */}
            <div className="flex-shrink-0">
              <div className="w-12 h-12 rounded-xl bg-blue-100 flex items-center justify-center">
                <Building2 className="w-6 h-6 text-blue-600" />
              </div>
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-2 flex-wrap">
                <div>
                  <h3 className="font-semibold text-slate-900 text-lg">
                    {chantier.nom}
                  </h3>
                  {chantier.adresse && (
                    <p className="text-sm text-slate-500 mt-0.5">
                      {chantier.adresse}
                    </p>
                  )}
                </div>
                <Badge variant={statusInfo.variant} className="flex items-center gap-1">
                  <StatusIcon className="w-3.5 h-3.5" />
                  {statusInfo.label}
                </Badge>
              </div>

              {/* Dates */}
              <div className="flex items-center gap-4 mt-3 text-sm text-slate-500">
                <div className="flex items-center gap-1.5">
                  <Calendar className="w-4 h-4" />
                  <span>Debut: {formatDate(chantier.date_debut)}</span>
                </div>
                {chantier.date_fin && (
                  <div className="flex items-center gap-1.5">
                    <span className="text-slate-300">→</span>
                    <span>Fin: {formatDate(chantier.date_fin)}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Progress bar */}
        {chantier.statut !== 'prospect' && (
          <div className="px-4 py-3 bg-slate-50">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-slate-700">Progression</span>
              <span className="text-sm font-semibold text-slate-900">{progression}%</span>
            </div>
            <Progress value={progression} className="h-2" />
          </div>
        )}

        {/* Timeline visualization */}
        <div className="px-4 py-3">
          <div className="flex items-center gap-2">
            {/* Step dots */}
            <div className="flex items-center gap-1 flex-1">
              <div className={`w-3 h-3 rounded-full ${
                progression >= 0 ? 'bg-orange-500' : 'bg-slate-200'
              }`} />
              <div className={`flex-1 h-1 ${
                progression >= 33 ? 'bg-orange-500' : 'bg-slate-200'
              }`} />
              <div className={`w-3 h-3 rounded-full ${
                progression >= 33 ? 'bg-orange-500' : 'bg-slate-200'
              }`} />
              <div className={`flex-1 h-1 ${
                progression >= 66 ? 'bg-orange-500' : 'bg-slate-200'
              }`} />
              <div className={`w-3 h-3 rounded-full ${
                progression >= 66 ? 'bg-orange-500' : 'bg-slate-200'
              }`} />
              <div className={`flex-1 h-1 ${
                progression >= 100 ? 'bg-orange-500' : 'bg-slate-200'
              }`} />
              <div className={`w-3 h-3 rounded-full ${
                progression >= 100 ? 'bg-green-500' : 'bg-slate-200'
              }`} />
            </div>
          </div>
          <div className="flex justify-between mt-1 text-xs text-slate-400">
            <span>Debut</span>
            <span>En cours</span>
            <span>Finitions</span>
            <span>Termine</span>
          </div>
        </div>

        {/* Photos section */}
        {photoCount > 0 && (
          <div className="p-4 border-t border-slate-100">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Camera className="w-4 h-4 text-slate-400" />
                <span className="text-sm font-medium text-slate-700">
                  {photoCount} photo{photoCount > 1 ? 's' : ''}
                </span>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onViewPhotos?.(chantier)}
                className="gap-1 text-orange-600 hover:text-orange-700"
              >
                Voir toutes les photos
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>

            {/* Latest photo thumbnail */}
            {latestPhoto && (
              <div
                className="relative rounded-lg overflow-hidden cursor-pointer group"
                onClick={() => onViewPhotos?.(chantier)}
              >
                <img
                  src={latestPhoto.thumbnail_url || latestPhoto.url}
                  alt={latestPhoto.description || 'Photo du chantier'}
                  className="w-full h-48 object-cover transition-transform group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                <div className="absolute bottom-3 left-3 right-3">
                  <p className="text-white text-sm font-medium line-clamp-1">
                    {latestPhoto.description || 'Derniere photo'}
                  </p>
                  <p className="text-white/70 text-xs">
                    {formatDate(latestPhoto.created_at)}
                  </p>
                </div>
                {photoCount > 1 && (
                  <div className="absolute top-3 right-3 bg-black/50 text-white text-xs px-2 py-1 rounded-full">
                    +{photoCount - 1}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Description */}
        {chantier.description && (
          <div className="px-4 pb-4">
            <p className="text-sm text-slate-600">{chantier.description}</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
