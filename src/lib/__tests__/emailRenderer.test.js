import { describe, it, expect } from 'vitest'
import {
  replaceVariables,
  renderSubject,
  validateVariables,
  formatCurrency,
  formatDate,
  htmlToPlainText,
  EMAIL_TEMPLATES,
} from '../emailRenderer'

describe('emailRenderer', () => {
  // ── EMAIL_TEMPLATES ─────────────────────────────────────────────
  describe('EMAIL_TEMPLATES', () => {
    it('has all 7 template types', () => {
      const keys = Object.keys(EMAIL_TEMPLATES)
      expect(keys).toContain('devis-envoye')
      expect(keys).toContain('devis-accepte')
      expect(keys).toContain('facture-envoyee')
      expect(keys).toContain('paiement-recu')
      expect(keys).toContain('chantier-demarre')
      expect(keys).toContain('chantier-termine')
      expect(keys).toContain('photos-update')
    })

    it('each template has subject and variables', () => {
      Object.values(EMAIL_TEMPLATES).forEach(t => {
        expect(t.subject).toBeDefined()
        expect(Array.isArray(t.variables)).toBe(true)
        expect(t.variables.length).toBeGreaterThan(0)
      })
    })
  })

  // ── replaceVariables ────────────────────────────────────────────
  describe('replaceVariables', () => {
    it('replaces {{variable}} placeholders', () => {
      const result = replaceVariables('Bonjour {{name}}', { name: 'Jean' })
      expect(result).toBe('Bonjour Jean')
    })

    it('replaces multiple occurrences', () => {
      const result = replaceVariables('{{a}} et {{a}}', { a: 'X' })
      expect(result).toBe('X et X')
    })

    it('removes unreplaced variables', () => {
      const result = replaceVariables('Hello {{unknown}}', {})
      expect(result).toBe('Hello ')
    })

    it('adds current year if not provided', () => {
      const vars = {}
      replaceVariables('{{year}}', vars)
      expect(vars.year).toBe(new Date().getFullYear().toString())
    })

    it('handles null/undefined values gracefully', () => {
      const result = replaceVariables('Value: {{val}}', { val: null })
      expect(result).toBe('Value: ')
    })
  })

  // ── renderSubject ───────────────────────────────────────────────
  describe('renderSubject', () => {
    it('renders devis-envoye subject', () => {
      const result = renderSubject('devis-envoye', { devis_number: 'D-001' })
      expect(result).toContain('D-001')
    })

    it('throws for unknown template', () => {
      expect(() => renderSubject('nonexistent', {})).toThrow('Unknown email template')
    })
  })

  // ── validateVariables ───────────────────────────────────────────
  describe('validateVariables', () => {
    it('returns valid:true when all variables provided', () => {
      const vars = {}
      EMAIL_TEMPLATES['devis-envoye'].variables.forEach(v => { vars[v] = 'test' })
      const result = validateVariables('devis-envoye', vars)
      expect(result.valid).toBe(true)
      expect(result.missing).toEqual([])
    })

    it('reports missing variables', () => {
      const result = validateVariables('devis-envoye', {})
      expect(result.valid).toBe(false)
      expect(result.missing.length).toBeGreaterThan(0)
      expect(result.missing).toContain('client_name')
    })
  })

  // ── formatCurrency ──────────────────────────────────────────────
  describe('formatCurrency', () => {
    it('formats euros in French locale', () => {
      const result = formatCurrency(14400)
      // Should contain the amount and EUR symbol
      expect(result).toMatch(/14[\s\u202f]?400/)
    })

    it('handles zero', () => {
      const result = formatCurrency(0)
      expect(result).toMatch(/0/)
    })

    it('handles null/undefined', () => {
      const result = formatCurrency(null)
      expect(result).toMatch(/0/)
    })
  })

  // ── formatDate ──────────────────────────────────────────────────
  describe('formatDate', () => {
    it('formats date in French long format', () => {
      const result = formatDate('2026-02-17')
      expect(result).toMatch(/17/)
      expect(result).toMatch(/vrier|février/) // février
      expect(result).toMatch(/2026/)
    })
  })

  // ── htmlToPlainText ─────────────────────────────────────────────
  describe('htmlToPlainText', () => {
    it('strips HTML tags', () => {
      const result = htmlToPlainText('<p>Hello <strong>World</strong></p>')
      expect(result).toContain('Hello')
      expect(result).toContain('World')
      expect(result).not.toContain('<')
    })

    it('converts br to newlines', () => {
      const result = htmlToPlainText('Line1<br>Line2')
      expect(result).toContain('Line1\nLine2')
    })

    it('converts links to text + URL', () => {
      const result = htmlToPlainText('<a href="https://example.com">Click here</a>')
      expect(result).toContain('Click here')
      expect(result).toContain('https://example.com')
    })

    it('decodes HTML entities', () => {
      const result = htmlToPlainText('&amp; &lt; &gt; &quot;')
      expect(result).toContain('&')
      expect(result).toContain('<')
      expect(result).toContain('>')
    })
  })
})
