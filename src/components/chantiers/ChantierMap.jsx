import React, { useState, useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import { MapPin, Navigation, ExternalLink, AlertTriangle } from 'lucide-react';

// Fix default Leaflet marker icons (broken with bundlers)
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

// Custom colored markers using SVG
const createColoredIcon = (color, isActive = false) => {
  const size = isActive ? 40 : 32;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 36" width="${size}" height="${Math.round(size * 1.5)}">
    <path d="M12 0C5.4 0 0 5.4 0 12c0 9 12 24 12 24s12-15 12-24C24 5.4 18.6 0 12 0z" fill="${color}" stroke="white" stroke-width="1.5"/>
    <circle cx="12" cy="12" r="5" fill="white" opacity="0.9"/>
  </svg>`;
  return L.divIcon({
    html: svg,
    className: 'custom-marker',
    iconSize: [size, Math.round(size * 1.5)],
    iconAnchor: [size / 2, Math.round(size * 1.5)],
    popupAnchor: [0, -Math.round(size * 1.2)],
  });
};

const STATUS_COLORS = {
  en_cours: '#f97316',
  prospect: '#3b82f6',
  termine: '#22c55e',
  abandonne: '#ef4444',
  archive: '#6b7280',
};

// Geocode an address using Nominatim (free, no API key)
const geocodeAddress = async (address) => {
  if (!address) return null;
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}&limit=1&countrycodes=fr`,
      { headers: { 'Accept-Language': 'fr' } }
    );
    const data = await res.json();
    if (data.length > 0) {
      return { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) };
    }
  } catch (e) {
    // Silently fail
  }
  return null;
};

// Auto-fit map bounds to markers
function FitBounds({ positions }) {
  const map = useMap();
  useEffect(() => {
    if (positions.length > 0) {
      const bounds = L.latLngBounds(positions.map(p => [p.lat, p.lng]));
      map.fitBounds(bounds, { padding: [40, 40], maxZoom: 14 });
    }
  }, [positions, map]);
  return null;
}

/**
 * ChantierMap - Interactive map displaying all chantiers
 */
export default function ChantierMap({ chantiers, clients, onSelectChantier, isDark, couleur, formatMoney, modeDiscret }) {
  const [positions, setPositions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [userPos, setUserPos] = useState(null);
  const [mapFilter, setMapFilter] = useState('all'); // 'all', 'en_cours', 'prospect'
  const geocacheRef = useRef({});

  // Geocode all chantiers with addresses
  useEffect(() => {
    let cancelled = false;
    const geocodeAll = async () => {
      setLoading(true);
      const results = [];

      for (const ch of chantiers) {
        if (cancelled) break;

        // Skip archived unless explicitly viewing
        if (ch.statut === 'archive') continue;

        // Priority: existing coordinates > geocode address
        if (ch.latitude && ch.longitude) {
          results.push({
            ...ch,
            lat: ch.latitude,
            lng: ch.longitude,
          });
          continue;
        }

        // Build full address
        const addrParts = [ch.adresse, ch.codePostal, ch.ville].filter(Boolean);
        const fullAddr = addrParts.join(' ');
        if (!fullAddr) continue;

        // Check cache
        if (geocacheRef.current[fullAddr]) {
          results.push({ ...ch, ...geocacheRef.current[fullAddr] });
          continue;
        }

        // Rate limit: 1 req/sec for Nominatim
        const coords = await geocodeAddress(fullAddr);
        if (coords) {
          geocacheRef.current[fullAddr] = coords;
          results.push({ ...ch, ...coords });
        }

        // Small delay to respect Nominatim rate limit
        await new Promise(r => setTimeout(r, 1100));
      }

      if (!cancelled) {
        setPositions(results);
        setLoading(false);
      }
    };

    geocodeAll();
    return () => { cancelled = true; };
  }, [chantiers]);

  // Get user position
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => setUserPos({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
        () => {},
        { enableHighAccuracy: false, timeout: 5000 }
      );
    }
  }, []);

  const textPrimary = isDark ? 'text-slate-100' : 'text-slate-900';
  const textMuted = isDark ? 'text-slate-400' : 'text-slate-600';
  const cardBg = isDark ? 'bg-slate-800' : 'bg-white';

  // Default center: France
  const defaultCenter = positions.length > 0
    ? [positions[0].lat, positions[0].lng]
    : userPos
      ? [userPos.lat, userPos.lng]
      : [46.6, 2.3]; // Center of France

  return (
    <div className="relative">
      {/* Leaflet CSS injected inline to avoid import issues */}
      <link
        rel="stylesheet"
        href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"
        integrity="sha256-p4NxAoJBhIIN+hmNHrzRCf9tD/miZyoHS5obTRR9BMY="
        crossOrigin=""
      />
      <style>{`
        .custom-marker { background: none !important; border: none !important; }
        .leaflet-popup-content-wrapper { border-radius: 12px !important; ${isDark ? 'background: #1e293b !important; color: #e2e8f0 !important;' : ''} }
        .leaflet-popup-tip { ${isDark ? 'background: #1e293b !important;' : ''} }
        .leaflet-popup-content { margin: 8px 12px !important; }
        .leaflet-control-zoom a { ${isDark ? 'background: #334155 !important; color: #e2e8f0 !important; border-color: #475569 !important;' : ''} }
        .leaflet-control-attribution { font-size: 9px !important; ${isDark ? 'background: #1e293b99 !important; color: #94a3b8 !important;' : ''} }
        .leaflet-control-attribution a { ${isDark ? 'color: #60a5fa !important;' : ''} }
      `}</style>

      {loading && (
        <div className={`absolute top-3 left-1/2 -translate-x-1/2 z-[1000] px-4 py-2 rounded-xl text-sm font-medium shadow-lg ${isDark ? 'bg-slate-700 text-slate-200' : 'bg-white text-slate-700'}`}>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: `${couleur} transparent ${couleur} ${couleur}` }} />
            Géolocalisation des chantiers...
          </div>
        </div>
      )}

      {/* Filter overlay buttons */}
      <div className={`absolute top-3 left-3 z-[1000] flex gap-1.5`}>
        {[
          { key: 'all', label: 'Tous', color: couleur },
          { key: 'en_cours', label: 'En cours', color: STATUS_COLORS.en_cours },
          { key: 'prospect', label: 'Prospects', color: STATUS_COLORS.prospect },
        ].map(f => (
          <button
            key={f.key}
            onClick={() => setMapFilter(f.key)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium shadow-md transition-all ${
              mapFilter === f.key
                ? 'text-white'
                : isDark
                  ? 'bg-slate-800/90 text-slate-300 hover:bg-slate-700'
                  : 'bg-white/90 text-slate-600 hover:bg-white'
            }`}
            style={mapFilter === f.key ? { backgroundColor: f.color } : {}}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Legend */}
      <div className={`absolute bottom-6 left-3 z-[1000] px-3 py-2 rounded-xl text-xs shadow-lg ${isDark ? 'bg-slate-800/95 text-slate-300' : 'bg-white/95 text-slate-600'}`}>
        <div className="flex flex-wrap gap-x-3 gap-y-1">
          {[
            { label: 'En cours', color: STATUS_COLORS.en_cours },
            { label: 'Prospect', color: STATUS_COLORS.prospect },
            { label: 'Terminé', color: STATUS_COLORS.termine },
          ].map(item => (
            <div key={item.label} className="flex items-center gap-1.5">
              <div className="w-2.5 h-2.5 rounded-full" style={{ background: item.color }} />
              <span>{item.label}</span>
            </div>
          ))}
        </div>
      </div>

      {positions.length === 0 && !loading && (
        <div className={`absolute inset-0 z-[1000] flex items-center justify-center ${isDark ? 'bg-slate-800/80' : 'bg-white/80'}`}>
          <div className="text-center p-6">
            <AlertTriangle size={32} className={textMuted + ' mx-auto mb-2'} />
            <p className={`font-medium ${textPrimary}`}>Aucun chantier géolocalisé</p>
            <p className={`text-sm ${textMuted} mt-1`}>Ajoutez des adresses à vos chantiers pour les voir sur la carte</p>
          </div>
        </div>
      )}

      <MapContainer
        center={defaultCenter}
        zoom={positions.length > 0 ? 10 : 6}
        scrollWheelZoom={true}
        style={{ height: '400px', width: '100%', borderRadius: '12px', zIndex: 1 }}
        className={isDark ? 'map-dark' : ''}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url={isDark
            ? 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png'
            : 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png'
          }
        />

        {positions.length > 0 && <FitBounds positions={positions} />}

        {/* User position marker */}
        {userPos && (
          <Marker
            position={[userPos.lat, userPos.lng]}
            icon={L.divIcon({
              html: `<div style="width:16px;height:16px;background:${couleur};border:3px solid white;border-radius:50%;box-shadow:0 0 8px ${couleur}88;"></div>`,
              className: 'custom-marker',
              iconSize: [16, 16],
              iconAnchor: [8, 8],
            })}
          >
            <Popup>
              <div className="text-center">
                <Navigation size={14} className="inline mr-1" />
                <span className="font-medium text-sm">Votre position</span>
              </div>
            </Popup>
          </Marker>
        )}

        {/* Chantier markers */}
        {positions
          .filter(ch => mapFilter === 'all' || ch.statut === mapFilter)
          .map(ch => {
          const client = clients?.find(c => c.id === ch.client_id);
          const color = STATUS_COLORS[ch.statut] || STATUS_COLORS.prospect;
          const statusLabel = ch.statut === 'en_cours' ? 'En cours' : ch.statut === 'termine' ? 'Terminé' : ch.statut === 'prospect' ? 'Prospect' : ch.statut;

          // Calculate avancement
          const allTasks = ch.taches || [];
          const tasksDone = allTasks.filter(t => t.done).length;
          const avancement = ch.statut === 'termine' ? 100 : allTasks.length > 0 ? Math.round((tasksDone / allTasks.length) * 100) : 0;

          // GPS URL
          const gpsAddr = [ch.adresse, ch.codePostal, ch.ville].filter(Boolean).join(' ');
          const gpsUrl = gpsAddr ? `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(gpsAddr)}` : null;

          return (
            <Marker
              key={ch.id}
              position={[ch.lat, ch.lng]}
              icon={createColoredIcon(color, ch.statut === 'en_cours')}
              eventHandlers={{
                click: () => {},
              }}
            >
              <Popup>
                <div style={{ minWidth: '200px' }}>
                  {/* Name + Status badge */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                    <p className="font-bold text-sm" style={{ color: isDark ? '#e2e8f0' : '#1e293b', margin: 0, flex: 1 }}>{ch.nom}</p>
                    <span
                      className="text-[10px] px-2 py-0.5 rounded-full font-medium whitespace-nowrap"
                      style={{ background: `${color}20`, color }}
                    >
                      {statusLabel}
                    </span>
                  </div>

                  {/* Client */}
                  {client && (
                    <p className="text-xs mb-1" style={{ color: isDark ? '#94a3b8' : '#64748b', margin: '0 0 4px 0' }}>
                      {client.nom} {client.prenom || ''}
                    </p>
                  )}

                  {/* Progress bar */}
                  {ch.statut === 'en_cours' && allTasks.length > 0 && (
                    <div style={{ marginBottom: '8px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '3px' }}>
                        <span className="text-[10px]" style={{ color: isDark ? '#94a3b8' : '#64748b' }}>Avancement</span>
                        <span className="text-[10px] font-semibold" style={{ color: couleur }}>{avancement}%</span>
                      </div>
                      <div style={{ height: '4px', borderRadius: '2px', background: isDark ? '#334155' : '#e2e8f0', overflow: 'hidden' }}>
                        <div style={{ height: '100%', borderRadius: '2px', width: `${Math.max(3, avancement)}%`, background: couleur, transition: 'width 0.3s' }} />
                      </div>
                    </div>
                  )}

                  {/* Action buttons: GPS + Open */}
                  <div style={{ display: 'flex', gap: '6px' }}>
                    {gpsUrl && (
                      <a
                        href={gpsUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        style={{
                          flex: 1,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '4px',
                          padding: '6px 8px',
                          borderRadius: '8px',
                          fontSize: '11px',
                          fontWeight: 600,
                          color: '#f97316',
                          background: isDark ? '#431407' : '#fff7ed',
                          border: `1px solid ${isDark ? '#9a3412' : '#fed7aa'}`,
                          textDecoration: 'none',
                          cursor: 'pointer',
                        }}
                      >
                        <Navigation size={12} />
                        GPS
                      </a>
                    )}
                    <button
                      onClick={() => onSelectChantier?.(ch.id)}
                      style={{
                        flex: 2,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '4px',
                        padding: '6px 8px',
                        borderRadius: '8px',
                        fontSize: '11px',
                        fontWeight: 600,
                        color: 'white',
                        background: couleur,
                        border: 'none',
                        cursor: 'pointer',
                      }}
                    >
                      <ExternalLink size={12} />
                      Ouvrir fiche
                    </button>
                  </div>
                </div>
              </Popup>
            </Marker>
          );
        })}
      </MapContainer>
    </div>
  );
}
