/**
 * Ponts vers le téléphone : un seul endroit pour ce qui diffère entre le site et les apps.
 *
 * Dans l'app iOS / Android (Capacitor), un lien <a download> ne fait rien et window.open ouvre
 * la page DANS l'app (Stripe, liens externes) : il faut passer par les modules natifs. Sur le site,
 * ces fonctions gardent le comportement du navigateur — en mieux sur téléphone, où la feuille de
 * partage du système remplace le téléchargement (envoyer un devis par WhatsApp ou e-mail en 2 gestes).
 *
 * Les modules Capacitor ne sont chargés qu'en natif (import dynamique) : rien de plus pour le site.
 */
import { Capacitor } from '@capacitor/core';
import { captureException } from './sentry';

/** Vrai dans l'app iOS / Android, faux sur le site (y compris la PWA installée). */
export const estNatif = () => Capacitor.isNativePlatform();

/** Téléphone ou tablette tactile (site) : on y préfère la feuille de partage au téléchargement. */
export function estMobileWeb() {
  if (typeof window === 'undefined' || estNatif()) return false;
  const tactile = window.matchMedia?.('(pointer: coarse)')?.matches;
  return !!tactile && /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent || '');
}

const enBlob = (contenu, type) => (contenu instanceof Blob ? contenu : new Blob([contenu], { type }));

const blobEnBase64 = (blob) => new Promise((resolve, reject) => {
  const lecteur = new FileReader();
  lecteur.onload = () => resolve(String(lecteur.result).split(',')[1] || '');
  lecteur.onerror = () => reject(lecteur.error);
  lecteur.readAsDataURL(blob);
});

/** Téléchargement classique du navigateur (ordinateur). */
export function telecharger(blob, nomFichier) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = nomFichier;
  a.rel = 'noopener';
  document.body.appendChild(a);
  a.click();
  a.remove();
  // Révoquer tout de suite annule le téléchargement dans Safari : on laisse le temps de démarrer.
  setTimeout(() => URL.revokeObjectURL(url), 30_000);
}

/**
 * Remet un fichier généré (PDF, CSV, JSON, image) à l'utilisateur.
 * - App native : fichier écrit dans le cache, puis feuille de partage (Enregistrer, Mail, WhatsApp…).
 * - Site sur téléphone : feuille de partage si le navigateur sait partager des fichiers, sinon téléchargement.
 * - Site sur ordinateur : téléchargement.
 *
 * @param {Blob|string|ArrayBuffer|Uint8Array} contenu
 * @param {string} nomFichier - avec extension
 * @param {string} [type] - type MIME si `contenu` n'est pas déjà un Blob
 * @param {{ titre?: string }} [options]
 * @returns {Promise<'partage'|'telecharge'|'annule'>}
 */
export async function remettreFichier(contenu, nomFichier, type = 'application/octet-stream', { titre } = {}) {
  const blob = enBlob(contenu, type);

  if (estNatif()) {
    const [{ Filesystem, Directory }, { Share }] = await Promise.all([
      import('@capacitor/filesystem'),
      import('@capacitor/share'),
    ]);
    const ecrit = await Filesystem.writeFile({
      path: nomFichier,
      data: await blobEnBase64(blob),
      directory: Directory.Cache,
    });
    try {
      await Share.share({ title: titre || nomFichier, files: [ecrit.uri] });
      return 'partage';
    } catch (err) {
      if (/cancel/i.test(err?.message || '')) return 'annule';
      throw err;
    }
  }

  if (estMobileWeb() && typeof File !== 'undefined' && navigator.canShare) {
    const fichier = new File([blob], nomFichier, { type: blob.type || type });
    if (navigator.canShare({ files: [fichier] })) {
      try {
        await navigator.share({ files: [fichier], title: titre || nomFichier });
        return 'partage';
      } catch (err) {
        if (err?.name === 'AbortError') return 'annule';
        // NotAllowedError : le geste de l'utilisateur a « expiré » pendant la génération → téléchargement.
        if (err?.name !== 'NotAllowedError') captureException(err, { context: 'partage de fichier' });
      }
    }
  }

  telecharger(blob, nomFichier);
  return 'telecharge';
}

/**
 * Ouvre une page externe (Stripe, Google Maps, site d'un fournisseur).
 * - App native : navigateur système intégré (SFSafariViewController / Custom Tabs), l'app reste dessous.
 * - Site : `memeOnglet` (paiement, portail Stripe) ou nouvel onglet.
 * @param {string} url
 * @param {{ memeOnglet?: boolean }} [options]
 */
export async function ouvrirLienExterne(url, { memeOnglet = false } = {}) {
  if (estNatif()) {
    const { Browser } = await import('@capacitor/browser');
    await Browser.open({ url });
    return;
  }
  if (memeOnglet) window.location.href = url;
  else window.open(url, '_blank', 'noopener');
}
