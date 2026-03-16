import { useState, useEffect, useRef, useCallback } from 'react';

/**
 * useDuplicateCheck — Real-time duplicate detection for client creation/editing
 *
 * Checks telephone and email against existing clients list with 300ms debounce.
 * Returns field-specific matches and a combined list for confirmation modals.
 *
 * Usage:
 *   const { phoneDuplicates, emailDuplicates, allDuplicates, checkField, clearAll } = useDuplicateCheck(clients, editId);
 *
 *   // In onChange handlers:
 *   checkField('telephone', value);
 *   checkField('email', value);
 */

const normalizePhone = (p) => (p || '').replace(/[\s.\-+()]/g, '');
const normalizeEmail = (e) => (e || '').toLowerCase().trim();

export function useDuplicateCheck(clients = [], editId = null, delay = 300) {
  const [phoneDuplicates, setPhoneDuplicates] = useState([]);
  const [emailDuplicates, setEmailDuplicates] = useState([]);
  const [nameDuplicates, setNameDuplicates] = useState([]);
  const phoneTimerRef = useRef(null);
  const emailTimerRef = useRef(null);
  const nameTimerRef = useRef(null);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      clearTimeout(phoneTimerRef.current);
      clearTimeout(emailTimerRef.current);
      clearTimeout(nameTimerRef.current);
    };
  }, []);

  const findPhoneDuplicates = useCallback((value) => {
    if (!value) { setPhoneDuplicates([]); return; }
    const cleanVal = normalizePhone(value);
    if (cleanVal.length < 6) { setPhoneDuplicates([]); return; }

    const matches = clients.filter(c => {
      if (editId && c.id === editId) return false; // Exclude current client in edit mode
      return c.telephone && normalizePhone(c.telephone) === cleanVal;
    }).map(c => ({ ...c, matchField: 'telephone', matchReason: 'Même téléphone' }));

    setPhoneDuplicates(matches.slice(0, 3));
  }, [clients, editId]);

  const findEmailDuplicates = useCallback((value) => {
    if (!value || !value.includes('@')) { setEmailDuplicates([]); return; }
    const cleanVal = normalizeEmail(value);
    if (cleanVal.length < 5) { setEmailDuplicates([]); return; }

    const matches = clients.filter(c => {
      if (editId && c.id === editId) return false;
      return c.email && normalizeEmail(c.email) === cleanVal;
    }).map(c => ({ ...c, matchField: 'email', matchReason: 'Même email' }));

    setEmailDuplicates(matches.slice(0, 3));
  }, [clients, editId]);

  const findNameDuplicates = useCallback((value) => {
    if (!value) { setNameDuplicates([]); return; }
    const q = value.toLowerCase().trim();
    if (q.length < 3) { setNameDuplicates([]); return; }

    const matches = clients.filter(c => {
      if (editId && c.id === editId) return false;
      const fullName = `${c.nom || ''} ${c.prenom || ''}`.toLowerCase().trim();
      const reverseName = `${c.prenom || ''} ${c.nom || ''}`.toLowerCase().trim();
      return fullName.includes(q) || reverseName.includes(q) || q.includes((c.nom || '').toLowerCase());
    }).map(c => ({ ...c, matchField: 'nom', matchReason: 'Nom similaire' }));

    setNameDuplicates(matches.slice(0, 3));
  }, [clients, editId]);

  const checkField = useCallback((field, value) => {
    if (field === 'telephone') {
      clearTimeout(phoneTimerRef.current);
      phoneTimerRef.current = setTimeout(() => findPhoneDuplicates(value), delay);
    } else if (field === 'email') {
      clearTimeout(emailTimerRef.current);
      emailTimerRef.current = setTimeout(() => findEmailDuplicates(value), delay);
    } else if (field === 'nom') {
      clearTimeout(nameTimerRef.current);
      nameTimerRef.current = setTimeout(() => findNameDuplicates(value), delay);
    }
  }, [findPhoneDuplicates, findEmailDuplicates, findNameDuplicates, delay]);

  const clearAll = useCallback(() => {
    setPhoneDuplicates([]);
    setEmailDuplicates([]);
    setNameDuplicates([]);
    clearTimeout(phoneTimerRef.current);
    clearTimeout(emailTimerRef.current);
    clearTimeout(nameTimerRef.current);
  }, []);

  // Combine all duplicates, deduplicated by id
  const allDuplicates = (() => {
    const seen = new Set();
    const combined = [];
    [...phoneDuplicates, ...emailDuplicates, ...nameDuplicates].forEach(d => {
      if (!seen.has(d.id)) {
        seen.add(d.id);
        combined.push(d);
      }
    });
    return combined;
  })();

  // Strong duplicates = phone or email match (not just name)
  const strongDuplicates = [...phoneDuplicates, ...emailDuplicates].filter((d, i, arr) =>
    arr.findIndex(x => x.id === d.id) === i
  );

  return {
    phoneDuplicates,
    emailDuplicates,
    nameDuplicates,
    allDuplicates,
    strongDuplicates,
    checkField,
    clearAll,
  };
}

export default useDuplicateCheck;
