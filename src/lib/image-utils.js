/**
 * Image Utilities
 * Compression, metadata extraction, and processing utilities for photos
 */

/**
 * @typedef {Object} ImageMetadata
 * @property {number} [lat] - Latitude from EXIF/Geolocation
 * @property {number} [lng] - Longitude from EXIF/Geolocation
 * @property {string} timestamp - ISO timestamp
 * @property {string} device - User agent / device info
 * @property {number} [width] - Image width
 * @property {number} [height] - Image height
 * @property {number} [fileSize] - File size in bytes
 * @property {string} [chantier_phase] - Optional phase label
 */

/**
 * @typedef {Object} CompressOptions
 * @property {number} [maxWidth] - Max width in pixels (default: 1920)
 * @property {number} [maxHeight] - Max height in pixels (default: 1920)
 * @property {number} [quality] - JPEG quality 0-1 (default: 0.8)
 * @property {number} [maxSizeBytes] - Max file size in bytes (default: 2MB)
 * @property {string} [format] - Output format (default: 'image/jpeg')
 */

const DEFAULT_COMPRESS_OPTIONS = {
  maxWidth: 1920,
  maxHeight: 1920,
  quality: 0.8,
  maxSizeBytes: 2 * 1024 * 1024, // 2MB
  format: 'image/jpeg',
};

/**
 * Compress an image file
 * @param {File | Blob} file - Input image file
 * @param {CompressOptions} [options] - Compression options
 * @returns {Promise<Blob>} Compressed image blob
 */
export async function compressImage(file, options = {}) {
  const opts = { ...DEFAULT_COMPRESS_OPTIONS, ...options };

  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(url);

      // Calculate new dimensions
      let { width, height } = img;
      const aspectRatio = width / height;

      if (width > opts.maxWidth) {
        width = opts.maxWidth;
        height = width / aspectRatio;
      }

      if (height > opts.maxHeight) {
        height = opts.maxHeight;
        width = height * aspectRatio;
      }

      // Create canvas and draw
      const canvas = document.createElement('canvas');
      canvas.width = Math.round(width);
      canvas.height = Math.round(height);

      const ctx = canvas.getContext('2d');
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

      // Try different quality levels if needed
      const tryCompress = (quality) => {
        return new Promise((res) => {
          canvas.toBlob(
            (blob) => res(blob),
            opts.format,
            quality
          );
        });
      };

      const compress = async () => {
        let quality = opts.quality;
        let blob = await tryCompress(quality);

        // Reduce quality if still too large
        while (blob && blob.size > opts.maxSizeBytes && quality > 0.3) {
          quality -= 0.1;
          blob = await tryCompress(quality);
        }

        if (blob) {
          resolve(blob);
        } else {
          reject(new Error('Failed to compress image'));
        }
      };

      compress();
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Failed to load image'));
    };

    img.src = url;
  });
}

/**
 * Get current geolocation
 * @param {number} [timeout] - Timeout in ms (default: 10000)
 * @returns {Promise<{lat: number, lng: number} | null>}
 */
export async function getGeolocation(timeout = 10000) {
  if (!navigator.geolocation) {
    console.warn('Geolocation not supported');
    return null;
  }

  return new Promise((resolve) => {
    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        });
      },
      (error) => {
        console.warn('Geolocation error:', error.message);
        resolve(null);
      },
      {
        enableHighAccuracy: true,
        timeout,
        maximumAge: 60000, // 1 minute cache
      }
    );
  });
}

/**
 * Extract metadata from image and environment
 * @param {File | Blob} file - Image file
 * @param {Object} [additionalMeta] - Additional metadata to include
 * @returns {Promise<ImageMetadata>}
 */
export async function extractMetadata(file, additionalMeta = {}) {
  // Get geolocation
  const geo = await getGeolocation();

  // Get image dimensions
  const dimensions = await getImageDimensions(file);

  /** @type {ImageMetadata} */
  const metadata = {
    timestamp: new Date().toISOString(),
    device: navigator.userAgent,
    fileSize: file.size,
    ...dimensions,
    ...additionalMeta,
  };

  if (geo) {
    metadata.lat = geo.lat;
    metadata.lng = geo.lng;
  }

  return metadata;
}

/**
 * Get image dimensions
 * @param {File | Blob} file - Image file
 * @returns {Promise<{width: number, height: number}>}
 */
export function getImageDimensions(file) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve({
        width: img.naturalWidth,
        height: img.naturalHeight,
      });
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Failed to get image dimensions'));
    };

    img.src = url;
  });
}

/**
 * Create a thumbnail from an image
 * @param {File | Blob} file - Image file
 * @param {number} [size] - Thumbnail size (default: 150)
 * @returns {Promise<string>} Data URL of thumbnail
 */
export async function createThumbnail(file, size = 150) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(url);

      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');

      // Calculate crop dimensions (center crop to square)
      const minDim = Math.min(img.width, img.height);
      const sx = (img.width - minDim) / 2;
      const sy = (img.height - minDim) / 2;

      canvas.width = size;
      canvas.height = size;

      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(img, sx, sy, minDim, minDim, 0, 0, size, size);

      resolve(canvas.toDataURL('image/jpeg', 0.7));
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Failed to create thumbnail'));
    };

    img.src = url;
  });
}

/**
 * Convert data URL to Blob
 * @param {string} dataUrl - Data URL string
 * @returns {Blob}
 */
export function dataUrlToBlob(dataUrl) {
  const arr = dataUrl.split(',');
  const mime = arr[0].match(/:(.*?);/)[1];
  const bstr = atob(arr[1]);
  let n = bstr.length;
  const u8arr = new Uint8Array(n);

  while (n--) {
    u8arr[n] = bstr.charCodeAt(n);
  }

  return new Blob([u8arr], { type: mime });
}

/**
 * Generate a unique filename for upload
 * @param {string} chantierId - Chantier ID
 * @param {string} [extension] - File extension (default: 'jpg')
 * @returns {string}
 */
export function generatePhotoFilename(chantierId, extension = 'jpg') {
  const timestamp = Date.now();
  const uuid = Math.random().toString(36).substring(2, 11);
  return `${timestamp}-${uuid}.${extension}`;
}

/**
 * Format file size for display
 * @param {number} bytes - Size in bytes
 * @returns {string}
 */
export function formatFileSize(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/**
 * Validate image file
 * @param {File} file - File to validate
 * @param {Object} [options] - Validation options
 * @param {number} [options.maxSize] - Max size in bytes (default: 10MB)
 * @param {string[]} [options.allowedTypes] - Allowed MIME types
 * @returns {{ valid: boolean, error?: string }}
 */
export function validateImageFile(file, options = {}) {
  const {
    maxSize = 10 * 1024 * 1024, // 10MB
    allowedTypes = ['image/jpeg', 'image/png', 'image/webp'],
  } = options;

  if (!file) {
    return { valid: false, error: 'Aucun fichier selectionne' };
  }

  if (!allowedTypes.includes(file.type)) {
    return {
      valid: false,
      error: `Type de fichier non supporte. Types acceptes: ${allowedTypes.map(t => t.split('/')[1]).join(', ')}`,
    };
  }

  if (file.size > maxSize) {
    return {
      valid: false,
      error: `Fichier trop volumineux. Taille max: ${formatFileSize(maxSize)}`,
    };
  }

  return { valid: true };
}
