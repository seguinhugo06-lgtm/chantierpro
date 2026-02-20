/**
 * Form Validation Framework
 * Centralized validation rules and helpers
 */

// ============ VALIDATION RULES ============

/**
 * Required field validation
 */
export const required = (message = 'Ce champ est requis') => (value) => {
  if (value === undefined || value === null || value === '') {
    return message;
  }
  if (Array.isArray(value) && value.length === 0) {
    return message;
  }
  return null;
};

/**
 * Minimum length validation
 */
export const minLength = (min, message) => (value) => {
  if (!value) return null;
  const msg = message || `Minimum ${min} caractères`;
  return String(value).length < min ? msg : null;
};

/**
 * Maximum length validation
 */
export const maxLength = (max, message) => (value) => {
  if (!value) return null;
  const msg = message || `Maximum ${max} caractères`;
  return String(value).length > max ? msg : null;
};

/**
 * Email validation
 */
const TEST_EMAIL_DOMAINS = ['test.com', 'test.fr', 'example.com', 'foo.com', 'bar.com', 'mailinator.com'];

export const email = (message = 'Email invalide') => (value) => {
  if (!value) return null;
  const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!regex.test(value)) return message;
  // Reject test/disposable email domains
  const domain = value.split('@')[1]?.toLowerCase();
  if (domain && TEST_EMAIL_DOMAINS.includes(domain)) {
    return 'Domaine email non autorisé (test/jetable)';
  }
  return null;
};

/**
 * Phone number validation (French format)
 */
export const phone = (message = 'Numéro de téléphone invalide') => (value) => {
  if (!value) return null;
  // Remove spaces and dashes
  const cleaned = String(value).replace(/[\s.-]/g, '');
  // French phone: starts with 0 and has 10 digits, or international format
  const regex = /^(?:(?:\+|00)33|0)\s*[1-9](?:[\s.-]*\d{2}){4}$|^\d{10}$/;
  return regex.test(cleaned) ? null : message;
};

/**
 * Positive number validation
 */
export const positiveNumber = (message = 'Le nombre doit être positif') => (value) => {
  if (value === undefined || value === null || value === '') return null;
  const num = parseFloat(value);
  return isNaN(num) || num < 0 ? message : null;
};

/**
 * Integer validation
 */
export const integer = (message = 'Le nombre doit être entier') => (value) => {
  if (value === undefined || value === null || value === '') return null;
  const num = parseFloat(value);
  return isNaN(num) || !Number.isInteger(num) ? message : null;
};

/**
 * Range validation
 */
export const range = (min, max, message) => (value) => {
  if (value === undefined || value === null || value === '') return null;
  const num = parseFloat(value);
  const msg = message || `La valeur doit être entre ${min} et ${max}`;
  return isNaN(num) || num < min || num > max ? msg : null;
};

/**
 * SIRET validation (14 digits)
 */
export const siret = (message = 'SIRET invalide (14 chiffres)') => (value) => {
  if (!value) return null;
  const cleaned = String(value).replace(/\s/g, '');
  return /^\d{14}$/.test(cleaned) ? null : message;
};

/**
 * IBAN validation (basic format check)
 */
export const iban = (message = 'IBAN invalide') => (value) => {
  if (!value) return null;
  const cleaned = String(value).replace(/\s/g, '').toUpperCase();
  // Basic IBAN format: 2 letters + 2 digits + up to 30 alphanumeric
  return /^[A-Z]{2}\d{2}[A-Z0-9]{1,30}$/.test(cleaned) ? null : message;
};

/**
 * Date validation
 */
export const date = (message = 'Date invalide') => (value) => {
  if (!value) return null;
  const d = new Date(value);
  return isNaN(d.getTime()) ? message : null;
};

/**
 * Future date validation
 */
export const futureDate = (message = 'La date doit être dans le futur') => (value) => {
  if (!value) return null;
  const d = new Date(value);
  if (isNaN(d.getTime())) return 'Date invalide';
  return d > new Date() ? null : message;
};

/**
 * Pattern validation (regex)
 */
export const pattern = (regex, message = 'Format invalide') => (value) => {
  if (!value) return null;
  return regex.test(String(value)) ? null : message;
};

/**
 * Custom validation
 */
export const custom = (validator, message) => (value, allValues) => {
  return validator(value, allValues) ? null : message;
};

// ============ VALIDATION HELPERS ============

/**
 * Compose multiple validators
 */
export const compose = (...validators) => (value, allValues) => {
  for (const validator of validators) {
    const error = validator(value, allValues);
    if (error) return error;
  }
  return null;
};

/**
 * Validate a single field
 */
export const validateField = (value, validators, allValues = {}) => {
  if (!validators) return null;

  const validatorArray = Array.isArray(validators) ? validators : [validators];

  for (const validator of validatorArray) {
    const error = validator(value, allValues);
    if (error) return error;
  }

  return null;
};

/**
 * Validate entire form
 * @param {Object} values - Form values
 * @param {Object} schema - Validation schema { fieldName: [validators] }
 * @returns {Object} - Errors object { fieldName: errorMessage }
 */
export const validateForm = (values, schema) => {
  const errors = {};

  for (const [field, validators] of Object.entries(schema)) {
    const error = validateField(values[field], validators, values);
    if (error) {
      errors[field] = error;
    }
  }

  return errors;
};

/**
 * Check if form has errors
 */
export const hasErrors = (errors) => {
  return Object.keys(errors).length > 0;
};

// ============ PREDEFINED SCHEMAS ============

/**
 * Client validation schema
 */
export const clientSchema = {
  nom: [required('Le nom est requis'), minLength(2, 'Le nom doit contenir au moins 2 caractères')],
  telephone: [phone()],
  email: [email()]
};

/**
 * Devis ligne validation schema
 */
export const ligneSchema = {
  description: [required('La description est requise')],
  quantite: [required(), positiveNumber()],
  prixUnitaire: [required(), positiveNumber()]
};

/**
 * Chantier validation schema
 */
export const chantierSchema = {
  nom: [required('Le nom du chantier est requis')],
  client_id: [required('Le client est requis')]
};

/**
 * Depense validation schema
 */
export const depenseSchema = {
  description: [required('La description est requise')],
  montant: [required(), positiveNumber('Le montant doit être positif')]
};

/**
 * Employee validation schema
 */
export const employeeSchema = {
  nom: [required('Le nom est requis')],
  tauxHoraire: [positiveNumber()]
};

/**
 * Entreprise validation schema
 */
export const entrepriseSchema = {
  nom: [required('Le nom de l\'entreprise est requis')],
  email: [email()],
  telephone: [phone()],
  siret: [siret()],
  iban: [iban()]
};

// ============ REACT HOOK ============

import { useState, useCallback } from 'react';

/**
 * useFormValidation - React hook for form validation
 *
 * Usage:
 * const { errors, validate, validateAll, clearErrors, setFieldError } = useFormValidation(schema);
 *
 * // Validate single field on blur
 * onBlur={() => validate('email', form.email)}
 *
 * // Validate all on submit
 * const handleSubmit = () => {
 *   if (validateAll(form)) {
 *     // Form is valid
 *   }
 * };
 */
export function useFormValidation(schema) {
  const [errors, setErrors] = useState({});

  const validate = useCallback((field, value, allValues = {}) => {
    const validators = schema[field];
    if (!validators) return true;

    const error = validateField(value, validators, allValues);
    setErrors(prev => {
      if (error) {
        return { ...prev, [field]: error };
      }
      const { [field]: _, ...rest } = prev;
      return rest;
    });

    return !error;
  }, [schema]);

  const validateAll = useCallback((values) => {
    const newErrors = validateForm(values, schema);
    setErrors(newErrors);
    return !hasErrors(newErrors);
  }, [schema]);

  const clearErrors = useCallback(() => {
    setErrors({});
  }, []);

  const setFieldError = useCallback((field, error) => {
    setErrors(prev => error
      ? { ...prev, [field]: error }
      : (() => { const { [field]: _, ...rest } = prev; return rest; })()
    );
  }, []);

  const clearFieldError = useCallback((field) => {
    setErrors(prev => {
      const { [field]: _, ...rest } = prev;
      return rest;
    });
  }, []);

  return {
    errors,
    validate,
    validateAll,
    clearErrors,
    setFieldError,
    clearFieldError,
    hasErrors: hasErrors(errors)
  };
}

export default validateForm;
