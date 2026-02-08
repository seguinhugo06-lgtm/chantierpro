/**
 * PhotoUpload Component
 * Camera capture and file upload for chantier documentation
 * Supports offline sync with background upload
 */

import * as React from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  Camera,
  Upload,
  X,
  Check,
  AlertCircle,
  RefreshCw,
  Image as ImageIcon,
  MapPin,
  Clock,
  Maximize2,
  Trash2,
  WifiOff,
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { generateId } from '../../lib/utils';
import {
  compressImage,
  extractMetadata,
  createThumbnail,
  validateImageFile,
  formatFileSize,
  generatePhotoFilename,
  dataUrlToBlob,
} from '../../lib/image-utils';
import { addToSyncQueue, getSyncQueue } from '../../registerSW';
import supabase, { isDemo } from '../../supabaseClient';
import { Button } from '../ui/Button';

/**
 * @typedef {Object} ChantierPhoto
 * @property {string} id - Photo ID
 * @property {string} chantier_id - Chantier ID
 * @property {string} url - Storage URL
 * @property {string} [thumbnail_url] - Thumbnail URL
 * @property {number} [lat] - Latitude
 * @property {number} [lng] - Longitude
 * @property {string} timestamp - ISO timestamp
 * @property {string} device - Device info
 * @property {string} [phase] - Chantier phase
 * @property {string} [caption] - Photo caption
 * @property {string} created_at - Created timestamp
 */

/**
 * @typedef {Object} PhotoUploadProps
 * @property {string} chantierId - Chantier ID
 * @property {string} [userId] - User ID for storage path
 * @property {(photo: ChantierPhoto) => void} [onUploadSuccess] - Called after successful upload
 * @property {(error: Error) => void} [onUploadError] - Called on upload error
 * @property {string} [phase] - Current chantier phase
 * @property {string} [className] - Additional CSS classes
 */

/**
 * @typedef {Object} PendingPhoto
 * @property {string} id - Temporary ID
 * @property {Blob} file - Compressed image blob
 * @property {string} thumbnail - Data URL thumbnail
 * @property {Object} metadata - Photo metadata
 * @property {'pending' | 'uploading' | 'success' | 'error'} status
 * @property {number} progress - Upload progress 0-100
 * @property {string} [error] - Error message
 * @property {number} retries - Retry count
 */

// Max concurrent uploads
const MAX_CONCURRENT_UPLOADS = 3;

// Storage bucket name
const STORAGE_BUCKET = 'chantier-photos';

// Local storage key for offline queue
const OFFLINE_QUEUE_KEY = 'chantierpro_photo_queue';

/**
 * PhotoUpload - Capture and upload photos for chantier documentation
 * @param {PhotoUploadProps} props
 */
export default function PhotoUpload({
  chantierId,
  userId = 'demo-user',
  onUploadSuccess,
  onUploadError,
  phase,
  className,
}) {
  const [pendingPhotos, setPendingPhotos] = React.useState(
    /** @type {PendingPhoto[]} */ ([])
  );
  const [isCapturing, setIsCapturing] = React.useState(false);
  const [cameraError, setCameraError] = React.useState(null);
  const [lightboxPhoto, setLightboxPhoto] = React.useState(null);
  const [isOffline, setIsOffline] = React.useState(!navigator.onLine);

  const videoRef = React.useRef(null);
  const canvasRef = React.useRef(null);
  const streamRef = React.useRef(null);
  const fileInputRef = React.useRef(null);
  const uploadQueueRef = React.useRef([]);
  const isUploadingRef = React.useRef(false);

  // Handle online/offline status
  React.useEffect(() => {
    const handleOnline = () => {
      setIsOffline(false);
      // Try to process offline queue
      processOfflineQueue();
    };
    const handleOffline = () => setIsOffline(true);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Cleanup camera on unmount
  React.useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  /**
   * Start camera capture
   */
  const startCamera = async () => {
    setCameraError(null);

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'environment', // Rear camera
          width: { ideal: 1920 },
          height: { ideal: 1080 },
        },
        audio: false,
      });

      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }

      setIsCapturing(true);
    } catch (error) {
      console.error('Camera error:', error);
      setCameraError(
        error.name === 'NotAllowedError'
          ? 'Acces a la camera refuse. Veuillez autoriser l\'acces dans les parametres.'
          : 'Impossible d\'acceder a la camera.'
      );
    }
  };

  /**
   * Stop camera capture
   */
  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    setIsCapturing(false);
  };

  /**
   * Capture photo from camera
   */
  const capturePhoto = async () => {
    if (!videoRef.current || !canvasRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;

    // Set canvas size to video size
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    // Draw video frame to canvas
    const ctx = canvas.getContext('2d');
    ctx.drawImage(video, 0, 0);

    // Get image data
    const dataUrl = canvas.toDataURL('image/jpeg', 0.9);
    const blob = dataUrlToBlob(dataUrl);

    // Process the captured image
    await processImage(blob);

    // Stop camera after capture
    stopCamera();
  };

  /**
   * Handle file input change
   */
  const handleFileSelect = async (event) => {
    const files = Array.from(event.target.files || []);

    for (const file of files) {
      await processImage(file);
    }

    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  /**
   * Process and add image to pending queue
   * @param {File | Blob} file
   */
  const processImage = async (file) => {
    // Validate
    const validation = validateImageFile(file);
    if (!validation.valid) {
      console.error('Invalid file:', validation.error);
      return;
    }

    const id = generateId('photo');

    // Add placeholder immediately
    setPendingPhotos(prev => [
      ...prev,
      {
        id,
        file: null,
        thumbnail: null,
        metadata: null,
        status: 'pending',
        progress: 0,
        retries: 0,
      },
    ]);

    try {
      // Compress image
      const compressed = await compressImage(file, {
        maxWidth: 1920,
        maxHeight: 1920,
        quality: 0.8,
        maxSizeBytes: 2 * 1024 * 1024,
      });

      // Create thumbnail
      const thumbnail = await createThumbnail(compressed, 150);

      // Extract metadata
      const metadata = await extractMetadata(compressed, {
        chantier_phase: phase,
      });

      // Update pending photo
      setPendingPhotos(prev =>
        prev.map(p =>
          p.id === id
            ? { ...p, file: compressed, thumbnail, metadata }
            : p
        )
      );

      // Start upload
      queueUpload(id);
    } catch (error) {
      console.error('Error processing image:', error);
      setPendingPhotos(prev =>
        prev.map(p =>
          p.id === id
            ? { ...p, status: 'error', error: 'Erreur de traitement' }
            : p
        )
      );
    }
  };

  /**
   * Queue photo for upload
   * @param {string} photoId
   */
  const queueUpload = (photoId) => {
    uploadQueueRef.current.push(photoId);
    processUploadQueue();
  };

  /**
   * Process upload queue
   */
  const processUploadQueue = async () => {
    if (isUploadingRef.current) return;

    const queue = uploadQueueRef.current;
    if (queue.length === 0) return;

    isUploadingRef.current = true;

    // Get next batch
    const batch = queue.splice(0, MAX_CONCURRENT_UPLOADS);

    await Promise.all(
      batch.map(photoId => uploadPhoto(photoId))
    );

    isUploadingRef.current = false;

    // Continue processing if more in queue
    if (uploadQueueRef.current.length > 0) {
      processUploadQueue();
    }
  };

  /**
   * Upload a single photo
   * @param {string} photoId
   */
  const uploadPhoto = async (photoId) => {
    const photo = pendingPhotos.find(p => p.id === photoId);
    if (!photo || !photo.file) return;

    // If offline, save to queue
    if (!navigator.onLine) {
      saveToOfflineQueue(photo);
      setPendingPhotos(prev =>
        prev.map(p =>
          p.id === photoId
            ? { ...p, status: 'pending', error: 'En attente de connexion' }
            : p
        )
      );
      return;
    }

    // Update status to uploading
    setPendingPhotos(prev =>
      prev.map(p =>
        p.id === photoId
          ? { ...p, status: 'uploading', progress: 0 }
          : p
      )
    );

    try {
      // Generate filename and path
      const filename = generatePhotoFilename(chantierId);
      const storagePath = `${userId}/${chantierId}/${filename}`;

      let publicUrl = '';

      // Demo mode: simulate upload
      if (isDemo || !supabase) {
        // Simulate progress
        for (let i = 0; i <= 100; i += 20) {
          await new Promise(r => setTimeout(r, 100));
          setPendingPhotos(prev =>
            prev.map(p =>
              p.id === photoId ? { ...p, progress: i } : p
            )
          );
        }
        publicUrl = URL.createObjectURL(photo.file);
      } else {
        // Real upload to Supabase Storage
        const { data, error } = await supabase.storage
          .from(STORAGE_BUCKET)
          .upload(storagePath, photo.file, {
            contentType: 'image/jpeg',
            upsert: false,
          });

        if (error) throw error;

        // Get public URL
        const { data: urlData } = supabase.storage
          .from(STORAGE_BUCKET)
          .getPublicUrl(storagePath);

        publicUrl = urlData.publicUrl;

        // Save metadata to database
        const { data: photoRecord, error: dbError } = await supabase
          .from('chantier_photos')
          .insert([{
            chantier_id: chantierId,
            user_id: userId,
            url: publicUrl,
            thumbnail_url: photo.thumbnail,
            lat: photo.metadata.lat,
            lng: photo.metadata.lng,
            timestamp: photo.metadata.timestamp,
            device: photo.metadata.device,
            phase: photo.metadata.chantier_phase,
            file_size: photo.file.size,
          }])
          .select()
          .single();

        if (dbError) throw dbError;

        // Call success callback
        if (onUploadSuccess && photoRecord) {
          onUploadSuccess(photoRecord);
        }
      }

      // Update status to success
      setPendingPhotos(prev =>
        prev.map(p =>
          p.id === photoId
            ? { ...p, status: 'success', progress: 100 }
            : p
        )
      );

      // Remove from list after delay
      setTimeout(() => {
        setPendingPhotos(prev => prev.filter(p => p.id !== photoId));
      }, 2000);
    } catch (error) {
      console.error('Upload error:', error);

      const photo = pendingPhotos.find(p => p.id === photoId);
      const retries = (photo?.retries || 0) + 1;

      if (retries < 3) {
        // Retry
        setPendingPhotos(prev =>
          prev.map(p =>
            p.id === photoId
              ? { ...p, status: 'pending', retries, error: 'Nouvelle tentative...' }
              : p
          )
        );
        setTimeout(() => queueUpload(photoId), 2000 * retries);
      } else {
        // Max retries reached
        setPendingPhotos(prev =>
          prev.map(p =>
            p.id === photoId
              ? { ...p, status: 'error', error: 'Echec de l\'upload' }
              : p
          )
        );

        if (onUploadError) {
          onUploadError(new Error('Upload failed after 3 attempts'));
        }
      }
    }
  };

  /**
   * Save photo to offline queue
   * @param {PendingPhoto} photo
   */
  const saveToOfflineQueue = (photo) => {
    // Convert blob to base64 for localStorage
    const reader = new FileReader();
    reader.onload = () => {
      const queue = JSON.parse(localStorage.getItem(OFFLINE_QUEUE_KEY) || '[]');
      queue.push({
        id: photo.id,
        chantierId,
        userId,
        imageData: reader.result,
        thumbnail: photo.thumbnail,
        metadata: photo.metadata,
        timestamp: Date.now(),
      });
      localStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(queue));

      // Also add to SW sync queue
      addToSyncQueue('photo_upload', {
        id: photo.id,
        chantierId,
        userId,
      });
    };
    reader.readAsDataURL(photo.file);
  };

  /**
   * Process offline queue when back online
   */
  const processOfflineQueue = async () => {
    const queue = JSON.parse(localStorage.getItem(OFFLINE_QUEUE_KEY) || '[]');
    if (queue.length === 0) return;

    console.log(`Processing ${queue.length} offline photos`);

    for (const item of queue) {
      // Convert base64 back to blob
      const blob = dataUrlToBlob(item.imageData);

      // Add to pending photos
      const photo = {
        id: item.id,
        file: blob,
        thumbnail: item.thumbnail,
        metadata: item.metadata,
        status: 'pending',
        progress: 0,
        retries: 0,
      };

      setPendingPhotos(prev => [...prev, photo]);
      queueUpload(item.id);
    }

    // Clear offline queue
    localStorage.removeItem(OFFLINE_QUEUE_KEY);
  };

  /**
   * Remove pending photo
   * @param {string} photoId
   */
  const removePhoto = (photoId) => {
    setPendingPhotos(prev => prev.filter(p => p.id !== photoId));
    uploadQueueRef.current = uploadQueueRef.current.filter(id => id !== photoId);
  };

  /**
   * Retry failed upload
   * @param {string} photoId
   */
  const retryUpload = (photoId) => {
    setPendingPhotos(prev =>
      prev.map(p =>
        p.id === photoId
          ? { ...p, status: 'pending', error: null, retries: 0 }
          : p
      )
    );
    queueUpload(photoId);
  };

  // Count offline queue
  const offlineCount = React.useMemo(() => {
    const queue = JSON.parse(localStorage.getItem(OFFLINE_QUEUE_KEY) || '[]');
    return queue.length;
  }, [isOffline]);

  return (
    <div className={cn('space-y-4', className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/30">
            <Camera className="w-5 h-5 text-blue-600 dark:text-blue-400" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
              Documenter le chantier
            </h3>
            {isOffline && (
              <p className="text-xs text-yellow-600 dark:text-yellow-400 flex items-center gap-1">
                <WifiOff className="w-3 h-3" />
                Mode hors ligne
                {offlineCount > 0 && ` (${offlineCount} en attente)`}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Camera capture UI */}
      {isCapturing ? (
        <div className="relative rounded-xl overflow-hidden bg-black">
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="w-full aspect-[4/3] object-cover"
          />
          <canvas ref={canvasRef} className="hidden" />

          {/* Camera controls */}
          <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/80 to-transparent">
            <div className="flex items-center justify-center gap-4">
              <Button
                variant="ghost"
                size="icon"
                onClick={stopCamera}
                className="text-white hover:bg-white/20"
              >
                <X className="w-6 h-6" />
              </Button>

              <button
                type="button"
                onClick={capturePhoto}
                className="w-16 h-16 rounded-full bg-white border-4 border-white/50 hover:scale-105 transition-transform"
                aria-label="Prendre la photo"
              >
                <div className="w-full h-full rounded-full bg-white" />
              </button>

              <div className="w-10" /> {/* Spacer */}
            </div>
          </div>
        </div>
      ) : (
        <>
          {/* Action buttons */}
          <div className="grid grid-cols-2 gap-3">
            <Button
              variant="outline"
              onClick={startCamera}
              className="h-auto py-4 flex-col gap-2"
              disabled={cameraError !== null}
            >
              <Camera className="w-6 h-6" />
              <span>Prendre photo</span>
            </Button>

            <Button
              variant="outline"
              onClick={() => fileInputRef.current?.click()}
              className="h-auto py-4 flex-col gap-2"
            >
              <Upload className="w-6 h-6" />
              <span>Choisir fichier</span>
            </Button>
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            multiple
            onChange={handleFileSelect}
            className="hidden"
          />

          {/* Camera error */}
          {cameraError && (
            <div className="p-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
              <p className="text-sm text-red-700 dark:text-red-300 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                {cameraError}
              </p>
            </div>
          )}
        </>
      )}

      {/* Pending photos grid */}
      {pendingPhotos.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300">
            Photos recentes :
          </h4>

          <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-5">
            <AnimatePresence mode="popLayout">
              {pendingPhotos.map((photo) => (
                <PhotoThumbnail
                  key={photo.id}
                  photo={photo}
                  onRemove={() => removePhoto(photo.id)}
                  onRetry={() => retryUpload(photo.id)}
                  onClick={() => setLightboxPhoto(photo)}
                />
              ))}
            </AnimatePresence>
          </div>
        </div>
      )}

      {/* Lightbox */}
      <AnimatePresence>
        {lightboxPhoto && (
          <PhotoLightbox
            photo={lightboxPhoto}
            onClose={() => setLightboxPhoto(null)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

/**
 * PhotoThumbnail - Individual photo thumbnail with status
 */
function PhotoThumbnail({ photo, onRemove, onRetry, onClick }) {
  const statusIcons = {
    pending: <RefreshCw className="w-4 h-4 animate-spin" />,
    uploading: null,
    success: <Check className="w-4 h-4" />,
    error: <AlertCircle className="w-4 h-4" />,
  };

  const statusColors = {
    pending: 'bg-yellow-500',
    uploading: 'bg-blue-500',
    success: 'bg-green-500',
    error: 'bg-red-500',
  };

  const timestamp = photo.metadata?.timestamp
    ? new Date(photo.metadata.timestamp).toLocaleTimeString('fr-FR', {
        hour: '2-digit',
        minute: '2-digit',
      })
    : '--:--';

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.8 }}
      className="relative group"
    >
      <button
        type="button"
        onClick={onClick}
        className="block w-full aspect-square rounded-lg overflow-hidden bg-gray-100 dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
      >
        {photo.thumbnail ? (
          <img
            src={photo.thumbnail}
            alt="Photo chantier"
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <ImageIcon className="w-8 h-8 text-gray-400" />
          </div>
        )}

        {/* Progress overlay */}
        {photo.status === 'uploading' && (
          <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
            <div className="w-12 h-12 relative">
              <svg className="w-full h-full -rotate-90">
                <circle
                  cx="24"
                  cy="24"
                  r="20"
                  fill="none"
                  stroke="rgba(255,255,255,0.3)"
                  strokeWidth="4"
                />
                <circle
                  cx="24"
                  cy="24"
                  r="20"
                  fill="none"
                  stroke="white"
                  strokeWidth="4"
                  strokeLinecap="round"
                  strokeDasharray={126}
                  strokeDashoffset={126 - (126 * photo.progress) / 100}
                  className="transition-all duration-300"
                />
              </svg>
              <span className="absolute inset-0 flex items-center justify-center text-xs font-medium text-white">
                {photo.progress}%
              </span>
            </div>
          </div>
        )}
      </button>

      {/* Status badge */}
      <div
        className={cn(
          'absolute top-1 right-1 w-5 h-5 rounded-full flex items-center justify-center text-white',
          statusColors[photo.status]
        )}
      >
        {statusIcons[photo.status]}
      </div>

      {/* Timestamp */}
      <div className="absolute bottom-0 left-0 right-0 px-1 py-0.5 bg-black/60 text-[10px] text-white text-center">
        {timestamp}
      </div>

      {/* Geolocation indicator */}
      {photo.metadata?.lat && (
        <div className="absolute top-1 left-1 w-5 h-5 rounded-full bg-blue-500 flex items-center justify-center">
          <MapPin className="w-3 h-3 text-white" />
        </div>
      )}

      {/* Action buttons (on hover) */}
      <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
        {photo.status === 'error' ? (
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onRetry(); }}
            className="p-2 rounded-full bg-white/20 hover:bg-white/30 text-white"
            aria-label="Réessayer"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        ) : (
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onClick(); }}
            className="p-2 rounded-full bg-white/20 hover:bg-white/30 text-white"
            aria-label="Agrandir"
          >
            <Maximize2 className="w-4 h-4" />
          </button>
        )}

        {photo.status !== 'uploading' && (
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onRemove(); }}
            className="p-2 rounded-full bg-white/20 hover:bg-red-500/80 text-white"
            aria-label="Supprimer"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        )}
      </div>
    </motion.div>
  );
}

/**
 * PhotoLightbox - Fullscreen photo viewer
 */
function PhotoLightbox({ photo, onClose }) {
  // Close on escape key
  React.useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  // Prevent body scroll
  React.useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = '';
    };
  }, []);

  const timestamp = photo.metadata?.timestamp
    ? new Date(photo.metadata.timestamp).toLocaleString('fr-FR', {
        dateStyle: 'medium',
        timeStyle: 'short',
      })
    : 'Date inconnue';

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 bg-black/95 flex flex-col"
      onClick={onClose}
    >
      {/* Header */}
      <div className="flex items-center justify-between p-4 text-white">
        <div className="flex items-center gap-4 text-sm">
          <span className="flex items-center gap-1.5">
            <Clock className="w-4 h-4" />
            {timestamp}
          </span>
          {photo.metadata?.lat && (
            <span className="flex items-center gap-1.5">
              <MapPin className="w-4 h-4" />
              {photo.metadata.lat.toFixed(5)}, {photo.metadata.lng.toFixed(5)}
            </span>
          )}
        </div>

        <button
          type="button"
          onClick={onClose}
          className="p-2 rounded-lg hover:bg-white/10 transition-colors"
          aria-label="Fermer"
        >
          <X className="w-6 h-6" />
        </button>
      </div>

      {/* Image */}
      <div
        className="flex-1 flex items-center justify-center p-4"
        onClick={(e) => e.stopPropagation()}
      >
        {photo.thumbnail && (
          <img
            src={photo.file ? URL.createObjectURL(photo.file) : photo.thumbnail}
            alt="Photo chantier"
            className="max-w-full max-h-full object-contain rounded-lg"
          />
        )}
      </div>

      {/* Footer with metadata */}
      {photo.metadata && (
        <div className="p-4 text-white/70 text-xs">
          <div className="flex flex-wrap gap-4">
            {photo.metadata.chantier_phase && (
              <span>Phase: {photo.metadata.chantier_phase}</span>
            )}
            {photo.metadata.fileSize && (
              <span>Taille: {formatFileSize(photo.metadata.fileSize)}</span>
            )}
            {photo.metadata.width && (
              <span>
                Resolution: {photo.metadata.width}x{photo.metadata.height}
              </span>
            )}
          </div>
        </div>
      )}
    </motion.div>
  );
}

/**
 * PhotoUploadSkeleton - Loading skeleton
 */
export function PhotoUploadSkeleton() {
  return (
    <div className="space-y-4 animate-pulse">
      <div className="flex items-center gap-2">
        <div className="w-9 h-9 rounded-lg bg-gray-200 dark:bg-slate-700" />
        <div className="w-40 h-5 rounded bg-gray-200 dark:bg-slate-700" />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="h-20 rounded-lg bg-gray-200 dark:bg-slate-700" />
        <div className="h-20 rounded-lg bg-gray-200 dark:bg-slate-700" />
      </div>

      <div className="grid grid-cols-3 gap-2">
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className="aspect-square rounded-lg bg-gray-200 dark:bg-slate-700"
          />
        ))}
      </div>
    </div>
  );
}
