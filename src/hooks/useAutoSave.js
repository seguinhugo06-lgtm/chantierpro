import { useState, useEffect, useRef, useCallback } from 'react';
import { useDebouncedCallback } from 'use-debounce';

/**
 * useAutoSave - Automatically saves data after changes with debouncing
 *
 * @param {Object} options
 * @param {any} options.data - Data to save (changes trigger save)
 * @param {Function} options.onSave - Async function to save data
 * @param {number} options.delay - Debounce delay in ms (default: 2000)
 * @param {boolean} options.enabled - Enable/disable auto-save (default: true)
 *
 * @returns {Object} - { isSaving, lastSaved, error, saveNow }
 *
 * @example
 * const { isSaving, lastSaved, error } = useAutoSave({
 *   data: formData,
 *   onSave: async (data) => await api.saveDevis(data),
 *   delay: 2000
 * });
 */
export default function useAutoSave({
  data,
  onSave,
  delay = 2000,
  enabled = true
}) {
  const [isSaving, setIsSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState(null);
  const [error, setError] = useState(null);
  const isFirstRender = useRef(true);
  const previousData = useRef(data);

  // Debounced save function
  const debouncedSave = useDebouncedCallback(
    async (dataToSave) => {
      if (!enabled || !onSave) return;

      setIsSaving(true);
      setError(null);

      try {
        await onSave(dataToSave);
        setLastSaved(new Date());
      } catch (err) {
        setError(err);
        console.error('AutoSave failed:', err);
      } finally {
        setIsSaving(false);
      }
    },
    delay
  );

  // Trigger save when data changes
  useEffect(() => {
    // Skip first render
    if (isFirstRender.current) {
      isFirstRender.current = false;
      previousData.current = data;
      return;
    }

    // Check if data actually changed
    const hasChanged = JSON.stringify(data) !== JSON.stringify(previousData.current);
    if (!hasChanged) return;

    previousData.current = data;
    debouncedSave(data);
  }, [data, debouncedSave]);

  // Manual save function (bypasses debounce)
  const saveNow = useCallback(async () => {
    if (!enabled || !onSave) return;

    setIsSaving(true);
    setError(null);

    try {
      await onSave(data);
      setLastSaved(new Date());
    } catch (err) {
      setError(err);
      throw err;
    } finally {
      setIsSaving(false);
    }
  }, [data, enabled, onSave]);

  // Cancel pending save on unmount
  useEffect(() => {
    return () => {
      debouncedSave.cancel();
    };
  }, [debouncedSave]);

  return {
    isSaving,
    lastSaved,
    error,
    saveNow
  };
}

/**
 * useAutoSaveIndicator - Hook for displaying save status
 *
 * @param {boolean} isSaving - Is currently saving
 * @param {Date|null} lastSaved - Last saved timestamp
 * @param {Error|null} error - Save error
 *
 * @returns {Object} - { status, message }
 */
export function useAutoSaveIndicator(isSaving, lastSaved, error) {
  if (error) {
    return {
      status: 'error',
      message: 'Erreur de sauvegarde'
    };
  }

  if (isSaving) {
    return {
      status: 'saving',
      message: 'Enregistrement...'
    };
  }

  if (lastSaved) {
    const now = new Date();
    const diff = Math.floor((now - lastSaved) / 1000);

    if (diff < 5) {
      return {
        status: 'saved',
        message: 'Sauvegarde'
      };
    }

    if (diff < 60) {
      return {
        status: 'saved',
        message: `Sauvegarde il y a ${diff}s`
      };
    }

    const mins = Math.floor(diff / 60);
    return {
      status: 'saved',
      message: `Sauvegarde il y a ${mins}min`
    };
  }

  return {
    status: 'idle',
    message: ''
  };
}
