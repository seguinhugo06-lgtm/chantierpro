/**
 * Report Generator
 * Generates PDF photo reports for chantiers using jsPDF
 */

import jsPDF from 'jspdf';
import supabase, { isDemo } from '../supabaseClient';

/**
 * @typedef {Object} ChantierData
 * @property {string} id - Chantier ID
 * @property {string} nom - Chantier name
 * @property {string} [adresse] - Address
 * @property {string} [date_debut] - Start date
 * @property {string} [date_fin] - End date
 * @property {string} [client_id] - Client ID
 */

/**
 * @typedef {Object} ClientData
 * @property {string} id - Client ID
 * @property {string} nom - Client name
 * @property {string} [email] - Client email
 */

/**
 * @typedef {Object} PhotoData
 * @property {string} id - Photo ID
 * @property {string} url - Photo URL
 * @property {string} [thumbnail_url] - Thumbnail URL
 * @property {number} [lat] - Latitude
 * @property {number} [lng] - Longitude
 * @property {string} timestamp - ISO timestamp
 * @property {string} [phase] - Chantier phase
 * @property {string} [caption] - Photo caption
 * @property {string} created_at - Created timestamp
 */

/**
 * @typedef {Object} ReportOptions
 * @property {boolean} [includeLocation] - Include GPS coordinates (default: true)
 * @property {boolean} [includePhase] - Include phase labels (default: true)
 * @property {string} [title] - Custom report title
 * @property {(progress: number, message: string) => void} [onProgress] - Progress callback
 */

/**
 * @typedef {Object} ReportResult
 * @property {Blob} blob - PDF blob
 * @property {string} filename - Suggested filename
 * @property {number} pageCount - Total pages
 * @property {number} photoCount - Total photos
 */

// PDF Configuration
const PDF_CONFIG = {
  pageWidth: 210, // A4 width in mm
  pageHeight: 297, // A4 height in mm
  margin: 15,
  photoWidth: 180,
  photoHeight: 110,
  photosPerPage: 2,
  fontSize: {
    title: 24,
    subtitle: 14,
    body: 11,
    caption: 9,
    footer: 8,
  },
  colors: {
    primary: [249, 115, 22], // Orange #f97316
    text: [15, 23, 42], // Slate-900
    lightText: [100, 116, 139], // Slate-500
  },
};

// Demo data for testing
const DEMO_CHANTIER = {
  id: 'demo-chantier-1',
  nom: 'Renovation Appartement Paris 11',
  adresse: '45 Rue de la Roquette, 75011 Paris',
  date_debut: '2024-01-15',
  date_fin: '2024-03-30',
  client_id: 'demo-client-1',
};

const DEMO_CLIENT = {
  id: 'demo-client-1',
  nom: 'M. Jean Dupont',
  email: 'j.dupont@exemple.fr',
};

const DEMO_PHOTOS = [
  {
    id: 'photo-1',
    url: 'https://images.unsplash.com/photo-1504307651254-35680f356dfd?w=800',
    timestamp: '2024-01-15T09:30:00Z',
    phase: 'Demolition',
    lat: 48.8566,
    lng: 2.3522,
  },
  {
    id: 'photo-2',
    url: 'https://images.unsplash.com/photo-1503387762-592deb58ef4e?w=800',
    timestamp: '2024-01-20T14:15:00Z',
    phase: 'Gros oeuvre',
    lat: 48.8566,
    lng: 2.3522,
  },
  {
    id: 'photo-3',
    url: 'https://images.unsplash.com/photo-1541123603104-512919d6a96c?w=800',
    timestamp: '2024-02-05T11:00:00Z',
    phase: 'Electricite',
  },
  {
    id: 'photo-4',
    url: 'https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=800',
    timestamp: '2024-02-15T16:45:00Z',
    phase: 'Plomberie',
    lat: 48.8566,
    lng: 2.3522,
  },
  {
    id: 'photo-5',
    url: 'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=800',
    timestamp: '2024-03-01T10:30:00Z',
    phase: 'Finitions',
  },
];

/**
 * Fetch chantier data
 * @param {string} chantierId
 * @returns {Promise<ChantierData>}
 */
async function fetchChantier(chantierId) {
  if (isDemo || !supabase) {
    return DEMO_CHANTIER;
  }

  const { data, error } = await supabase
    .from('chantiers')
    .select('*')
    .eq('id', chantierId)
    .single();

  if (error) throw new Error(`Erreur chargement chantier: ${error.message}`);
  return data;
}

/**
 * Fetch client data
 * @param {string} clientId
 * @returns {Promise<ClientData | null>}
 */
async function fetchClient(clientId) {
  if (!clientId) return null;

  if (isDemo || !supabase) {
    return DEMO_CLIENT;
  }

  const { data, error } = await supabase
    .from('clients')
    .select('*')
    .eq('id', clientId)
    .single();

  if (error) {
    console.warn('Could not fetch client:', error.message);
    return null;
  }
  return data;
}

/**
 * Fetch photos for chantier
 * @param {string} chantierId
 * @returns {Promise<PhotoData[]>}
 */
async function fetchPhotos(chantierId) {
  if (isDemo || !supabase) {
    return DEMO_PHOTOS;
  }

  const { data, error } = await supabase
    .from('chantier_photos')
    .select('*')
    .eq('chantier_id', chantierId)
    .order('timestamp', { ascending: true });

  if (error) throw new Error(`Erreur chargement photos: ${error.message}`);
  return data || [];
}

/**
 * Load image as base64 data URL
 * @param {string} url - Image URL
 * @returns {Promise<string>} Base64 data URL
 */
async function loadImageAsBase64(url) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';

    img.onload = () => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');

      // Calculate dimensions (max 1200px width for reasonable file size)
      const maxWidth = 1200;
      let width = img.naturalWidth;
      let height = img.naturalHeight;

      if (width > maxWidth) {
        height = (height * maxWidth) / width;
        width = maxWidth;
      }

      canvas.width = width;
      canvas.height = height;
      ctx.drawImage(img, 0, 0, width, height);

      try {
        const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
        resolve(dataUrl);
      } catch (e) {
        reject(new Error('Failed to convert image to base64'));
      }
    };

    img.onerror = () => {
      reject(new Error(`Failed to load image: ${url}`));
    };

    img.src = url;
  });
}

/**
 * Format date for display
 * @param {string} isoDate - ISO date string
 * @returns {string}
 */
function formatDate(isoDate) {
  if (!isoDate) return '';
  const date = new Date(isoDate);
  return date.toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

/**
 * Format datetime for display
 * @param {string} isoDate - ISO datetime string
 * @returns {string}
 */
function formatDateTime(isoDate) {
  if (!isoDate) return '';
  const date = new Date(isoDate);
  return date.toLocaleString('fr-FR', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/**
 * Format GPS coordinates
 * @param {number} lat
 * @param {number} lng
 * @returns {string}
 */
function formatCoordinates(lat, lng) {
  if (!lat || !lng) return '';
  return `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
}

/**
 * Add footer to current page
 * @param {jsPDF} doc - jsPDF instance
 * @param {number} pageNum - Current page number
 * @param {number} totalPages - Total pages
 */
function addFooter(doc, pageNum, totalPages) {
  const { pageWidth, pageHeight, margin, fontSize, colors } = PDF_CONFIG;

  doc.setFontSize(fontSize.footer);
  doc.setTextColor(...colors.lightText);

  // Page number (right)
  doc.text(
    `Page ${pageNum}/${totalPages}`,
    pageWidth - margin,
    pageHeight - 10,
    { align: 'right' }
  );

  // Generated by (left)
  const generatedDate = new Date().toLocaleDateString('fr-FR');
  doc.text(
    `Genere par ChantierPro le ${generatedDate}`,
    margin,
    pageHeight - 10
  );
}

/**
 * Generate cover page
 * @param {jsPDF} doc - jsPDF instance
 * @param {ChantierData} chantier
 * @param {ClientData | null} client
 * @param {number} photoCount
 */
function generateCoverPage(doc, chantier, client, photoCount) {
  const { pageWidth, margin, fontSize, colors } = PDF_CONFIG;
  const centerX = pageWidth / 2;

  // Background gradient effect (simplified with rectangles)
  doc.setFillColor(249, 115, 22); // Orange
  doc.rect(0, 0, pageWidth, 80, 'F');

  // Logo / Brand
  doc.setFontSize(28);
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.text('ChantierPro', centerX, 35, { align: 'center' });

  doc.setFontSize(12);
  doc.setFont('helvetica', 'normal');
  doc.text('Gestion de chantiers BTP', centerX, 48, { align: 'center' });

  // Main title
  doc.setFontSize(fontSize.title);
  doc.setTextColor(...colors.text);
  doc.setFont('helvetica', 'bold');
  doc.text('Rapport Photos', centerX, 110, { align: 'center' });

  // Chantier name
  doc.setFontSize(18);
  doc.setTextColor(...colors.primary);
  doc.text(chantier.nom || 'Chantier sans nom', centerX, 130, { align: 'center' });

  // Divider line
  doc.setDrawColor(...colors.primary);
  doc.setLineWidth(0.5);
  doc.line(margin + 40, 145, pageWidth - margin - 40, 145);

  // Info section
  let y = 165;
  const lineHeight = 12;

  doc.setFontSize(fontSize.body);
  doc.setTextColor(...colors.text);
  doc.setFont('helvetica', 'normal');

  // Client
  if (client?.nom) {
    doc.setFont('helvetica', 'bold');
    doc.text('Client :', margin + 20, y);
    doc.setFont('helvetica', 'normal');
    doc.text(client.nom, margin + 50, y);
    y += lineHeight;
  }

  // Address
  if (chantier.adresse) {
    doc.setFont('helvetica', 'bold');
    doc.text('Adresse :', margin + 20, y);
    doc.setFont('helvetica', 'normal');
    doc.text(chantier.adresse, margin + 50, y);
    y += lineHeight;
  }

  // Dates
  if (chantier.date_debut || chantier.date_fin) {
    doc.setFont('helvetica', 'bold');
    doc.text('Periode :', margin + 20, y);
    doc.setFont('helvetica', 'normal');
    const dateRange = [
      chantier.date_debut ? formatDate(chantier.date_debut) : '',
      chantier.date_fin ? formatDate(chantier.date_fin) : '',
    ].filter(Boolean).join(' - ');
    doc.text(dateRange || 'Non definie', margin + 50, y);
    y += lineHeight;
  }

  // Report date
  doc.setFont('helvetica', 'bold');
  doc.text('Date rapport :', margin + 20, y);
  doc.setFont('helvetica', 'normal');
  doc.text(formatDate(new Date().toISOString()), margin + 50, y);
  y += lineHeight;

  // Photo count
  doc.setFont('helvetica', 'bold');
  doc.text('Nb photos :', margin + 20, y);
  doc.setFont('helvetica', 'normal');
  doc.text(String(photoCount), margin + 50, y);

  // Bottom decoration
  doc.setFillColor(249, 115, 22);
  doc.rect(0, 280, pageWidth, 17, 'F');

  doc.setFontSize(10);
  doc.setTextColor(255, 255, 255);
  doc.text('www.chantierpro.fr', centerX, 290, { align: 'center' });
}

/**
 * Generate photo pages
 * @param {jsPDF} doc - jsPDF instance
 * @param {PhotoData[]} photos
 * @param {ReportOptions} options
 * @returns {Promise<number>} Number of pages generated
 */
async function generatePhotoPages(doc, photos, options) {
  const {
    pageWidth,
    pageHeight,
    margin,
    photoWidth,
    photoHeight,
    photosPerPage,
    fontSize,
    colors,
  } = PDF_CONFIG;

  const { includeLocation = true, includePhase = true, onProgress } = options;

  let pagesGenerated = 0;
  const totalPhotos = photos.length;

  for (let i = 0; i < photos.length; i++) {
    const photo = photos[i];
    const positionOnPage = i % photosPerPage;

    // Add new page for each pair
    if (positionOnPage === 0) {
      doc.addPage();
      pagesGenerated++;
    }

    // Report progress
    if (onProgress) {
      const progress = Math.round(((i + 1) / totalPhotos) * 100);
      onProgress(progress, `Chargement photo ${i + 1}/${totalPhotos}`);
    }

    // Calculate Y position
    const yOffset = positionOnPage === 0 ? 20 : 155;

    try {
      // Load and add image
      const imageData = await loadImageAsBase64(photo.url);

      // Center the image
      const imageX = (pageWidth - photoWidth) / 2;

      doc.addImage(
        imageData,
        'JPEG',
        imageX,
        yOffset,
        photoWidth,
        photoHeight,
        undefined,
        'MEDIUM'
      );

      // Add border around image
      doc.setDrawColor(200, 200, 200);
      doc.setLineWidth(0.3);
      doc.rect(imageX, yOffset, photoWidth, photoHeight, 'S');

      // Caption
      let captionY = yOffset + photoHeight + 6;
      doc.setFontSize(fontSize.caption);
      doc.setTextColor(...colors.text);

      // Date/time
      const dateTime = formatDateTime(photo.timestamp);
      doc.setFont('helvetica', 'bold');
      doc.text(dateTime, pageWidth / 2, captionY, { align: 'center' });

      // Phase
      if (includePhase && photo.phase) {
        captionY += 5;
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(...colors.primary);
        doc.text(`Phase: ${photo.phase}`, pageWidth / 2, captionY, { align: 'center' });
      }

      // Geolocation
      if (includeLocation && photo.lat && photo.lng) {
        captionY += 5;
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(...colors.lightText);
        const coords = formatCoordinates(photo.lat, photo.lng);
        doc.text(`GPS: ${coords}`, pageWidth / 2, captionY, { align: 'center' });
      }

    } catch (error) {
      console.warn(`Failed to load photo ${photo.id}:`, error);

      // Show placeholder for failed image
      const imageX = (pageWidth - photoWidth) / 2;
      doc.setFillColor(240, 240, 240);
      doc.rect(imageX, yOffset, photoWidth, photoHeight, 'F');

      doc.setFontSize(12);
      doc.setTextColor(150, 150, 150);
      doc.text(
        'Image non disponible',
        pageWidth / 2,
        yOffset + photoHeight / 2,
        { align: 'center' }
      );
    }
  }

  return pagesGenerated;
}

/**
 * Generate photo report PDF
 * @param {string} chantierId - Chantier ID
 * @param {ReportOptions} [options] - Report options
 * @returns {Promise<ReportResult>}
 */
export async function generatePhotoReport(chantierId, options = {}) {
  const { onProgress } = options;

  // Report progress: fetching data
  if (onProgress) {
    onProgress(5, 'Chargement des donnees...');
  }

  // Fetch all data
  const [chantier, photos] = await Promise.all([
    fetchChantier(chantierId),
    fetchPhotos(chantierId),
  ]);

  const client = await fetchClient(chantier.client_id);

  if (photos.length === 0) {
    throw new Error('Aucune photo trouvee pour ce chantier');
  }

  if (onProgress) {
    onProgress(10, 'Generation du PDF...');
  }

  // Calculate total pages
  const photoPages = Math.ceil(photos.length / PDF_CONFIG.photosPerPage);
  const totalPages = 1 + photoPages; // Cover + photo pages

  // Create PDF
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  // Generate cover page
  generateCoverPage(doc, chantier, client, photos.length);

  // Generate photo pages
  await generatePhotoPages(doc, photos, {
    ...options,
    onProgress: (photoProgress, message) => {
      // Scale photo progress to 10-95%
      const scaledProgress = 10 + Math.round(photoProgress * 0.85);
      if (onProgress) {
        onProgress(scaledProgress, message);
      }
    },
  });

  // Add footers to all pages
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    addFooter(doc, i, pageCount);
  }

  if (onProgress) {
    onProgress(100, 'Rapport genere!');
  }

  // Generate blob
  const blob = doc.output('blob');

  // Generate filename
  const sanitizedName = (chantier.nom || 'chantier')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
  const dateStr = new Date().toISOString().split('T')[0];
  const filename = `rapport-photos-${sanitizedName}-${dateStr}.pdf`;

  return {
    blob,
    filename,
    pageCount,
    photoCount: photos.length,
  };
}

/**
 * Download PDF blob as file
 * @param {Blob} blob - PDF blob
 * @param {string} filename - Filename
 */
export function downloadPDF(blob, filename) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Open PDF in new tab for preview
 * @param {Blob} blob - PDF blob
 */
export function previewPDF(blob) {
  const url = URL.createObjectURL(blob);
  window.open(url, '_blank');
  // Note: URL will be revoked when tab is closed
}

/**
 * Send report via email (mock for demo)
 * @param {string} chantierId - Chantier ID
 * @param {string} recipientEmail - Recipient email
 * @param {Blob} pdfBlob - PDF blob
 * @param {Object} [options] - Email options
 * @param {string} [options.subject] - Email subject
 * @param {string} [options.message] - Email body
 * @returns {Promise<{ success: boolean, message: string }>}
 */
export async function sendReportByEmail(chantierId, recipientEmail, pdfBlob, options = {}) {
  if (isDemo) {
    // Simulate sending in demo mode
    await new Promise(resolve => setTimeout(resolve, 1500));
    return {
      success: true,
      message: `Email envoye a ${recipientEmail} (mode demo)`,
    };
  }

  // In production, this would call a backend API to send the email
  // with the PDF as attachment
  if (!supabase) {
    throw new Error('Supabase non configure');
  }

  // Example: Call edge function to send email
  // const { data, error } = await supabase.functions.invoke('send-report-email', {
  //   body: {
  //     chantierId,
  //     recipientEmail,
  //     subject: options.subject || 'Rapport photos chantier',
  //     message: options.message || '',
  //     // Note: In practice, we'd upload the PDF to storage first
  //     // and pass the URL to the edge function
  //   },
  // });

  // For now, return mock response
  return {
    success: true,
    message: `Email envoye a ${recipientEmail}`,
  };
}

export default {
  generatePhotoReport,
  downloadPDF,
  previewPDF,
  sendReportByEmail,
};
