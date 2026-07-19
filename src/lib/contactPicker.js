/**
 * Contact Picker API — importer des clients depuis le répertoire du téléphone.
 * Disponible sur Chrome Android (contexte sécurisé). Absente sur desktop et iOS.
 */

export const isContactPickerSupported = () =>
  typeof navigator !== 'undefined' && 'contacts' in navigator && typeof window !== 'undefined' && 'ContactsManager' in window;

const formatAddress = (addr) => {
  if (!addr) return '';
  const line = Array.isArray(addr.addressLine) ? addr.addressLine.filter(Boolean).join(' ') : (addr.addressLine || '');
  const cityLine = [addr.postalCode, addr.city].filter(Boolean).join(' ');
  return [line, cityLine, addr.country].map(s => (s || '').trim()).filter(Boolean).join(', ');
};

// Le répertoire stocke en général « Prénom Nom » — on découpe au mieux.
const splitName = (full) => {
  const parts = (full || '').trim().split(/\s+/).filter(Boolean);
  if (parts.length <= 1) return { prenom: '', nom: full || '' };
  return { prenom: parts[0], nom: parts.slice(1).join(' ') };
};

/**
 * Ouvre le sélecteur de contacts natif et renvoie des fiches clients normalisées.
 * @param {{ multiple?: boolean }} opts
 * @returns {Promise<Array<{nom, prenom, telephone, email, adresse}>>}
 * @throws {Error} 'unsupported' si l'API n'est pas disponible.
 */
export async function pickContacts({ multiple = true } = {}) {
  if (!isContactPickerSupported()) throw new Error('unsupported');
  const available = await navigator.contacts.getProperties();
  const props = ['name', 'tel', 'email', 'address'].filter(p => available.includes(p));
  if (props.length === 0) throw new Error('unsupported');
  const selected = await navigator.contacts.select(props, { multiple });
  return (selected || []).map(c => {
    const { prenom, nom } = splitName((c.name && c.name[0]) || '');
    return {
      nom,
      prenom,
      telephone: (c.tel && c.tel[0]) || '',
      email: (c.email && c.email[0]) || '',
      adresse: formatAddress(c.address && c.address[0]),
    };
  }).filter(c => (c.nom || '').trim());
}
