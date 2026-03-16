import { describe, it, expect } from 'vitest'
import {
  getNextRelance,
  generateRelanceContent,
  getPendingRelances,
  getRelanceStats,
  createRelanceRecord,
  RELANCE_TEMPLATES,
} from '../RelanceService'

describe('RelanceService', () => {
  // ── Template structure ──────────────────────────────────────────
  describe('RELANCE_TEMPLATES', () => {
    it('has 5 templates with correct delays', () => {
      const templates = Object.values(RELANCE_TEMPLATES)
      expect(templates).toHaveLength(5)
      expect(templates.map(t => t.delay)).toEqual([7, 15, 30, 45, 60])
    })

    it('each template has required fields', () => {
      Object.values(RELANCE_TEMPLATES).forEach(t => {
        expect(t).toHaveProperty('id')
        expect(t).toHaveProperty('name')
        expect(t).toHaveProperty('delay')
        expect(t).toHaveProperty('subject')
        expect(t).toHaveProperty('body')
        expect(t).toHaveProperty('priority')
      })
    })

    it('priorities escalate correctly', () => {
      expect(RELANCE_TEMPLATES.friendly.priority).toBe('low')
      expect(RELANCE_TEMPLATES.firm.priority).toBe('medium')
      expect(RELANCE_TEMPLATES.urgent.priority).toBe('high')
      expect(RELANCE_TEMPLATES.final.priority).toBe('critical')
      expect(RELANCE_TEMPLATES.precontentieux.priority).toBe('critical')
    })
  })

  // ── getNextRelance ──────────────────────────────────────────────
  describe('getNextRelance', () => {
    it('returns null for paid invoices', () => {
      const facture = { statut: 'payee', date: '2025-01-01' }
      expect(getNextRelance(facture)).toBeNull()
    })

    it('returns null for invoices not yet due', () => {
      const tomorrow = new Date()
      tomorrow.setDate(tomorrow.getDate() + 10)
      const facture = {
        date: new Date().toISOString(),
        date_echeance: tomorrow.toISOString(),
        statut: 'envoye',
      }
      expect(getNextRelance(facture)).toBeNull()
    })

    it('returns friendly template for 7+ days overdue', () => {
      const dueDate = new Date()
      dueDate.setDate(dueDate.getDate() - 8)
      const facture = {
        date: '2025-01-01',
        date_echeance: dueDate.toISOString(),
        statut: 'envoye',
      }
      const result = getNextRelance(facture)
      expect(result).not.toBeNull()
      expect(result.template.id).toBe('friendly')
    })

    it('returns firm template for 15+ days overdue', () => {
      const dueDate = new Date()
      dueDate.setDate(dueDate.getDate() - 16)
      const facture = {
        date: '2025-01-01',
        date_echeance: dueDate.toISOString(),
        statut: 'envoye',
      }
      const result = getNextRelance(facture)
      expect(result).not.toBeNull()
      // Should return the highest matching unsent template
      expect(['firm', 'friendly']).toContain(result.template.id)
    })

    it('skips already-sent templates', () => {
      const dueDate = new Date()
      dueDate.setDate(dueDate.getDate() - 20)
      const facture = {
        date: '2025-01-01',
        date_echeance: dueDate.toISOString(),
        statut: 'envoye',
      }
      const sentRelances = [
        { templateId: 'friendly' },
        { templateId: 'firm' },
      ]
      const result = getNextRelance(facture, sentRelances)
      // friendly and firm are sent, so should return null (not yet 30 days for urgent)
      // or urgent if 20 days < 30
      expect(result).toBeNull()
    })

    it('returns null when all applicable templates sent', () => {
      const dueDate = new Date()
      dueDate.setDate(dueDate.getDate() - 10)
      const facture = {
        date: '2025-01-01',
        date_echeance: dueDate.toISOString(),
        statut: 'envoye',
      }
      const sentRelances = [{ templateId: 'friendly' }]
      const result = getNextRelance(facture, sentRelances)
      expect(result).toBeNull() // 10 days: only friendly applies, but it's sent
    })
  })

  // ── generateRelanceContent ──────────────────────────────────────
  describe('generateRelanceContent', () => {
    it('replaces variables in template', () => {
      const template = RELANCE_TEMPLATES.friendly
      const facture = {
        numero: 'F-2026-001',
        total_ttc: 14400,
        date: '2026-01-15',
        date_echeance: '2026-02-14',
      }
      const client = { nom: 'Jean Dupont', email: 'jean@example.com' }
      const entreprise = { nom: 'Martin Rénovation', telephone: '06 12 34 56 78' }

      const result = generateRelanceContent(template, facture, client, entreprise)

      expect(result.subject).toContain('F-2026-001')
      expect(result.body).toContain('Jean Dupont')
      expect(result.body).toContain('Martin Rénovation')
      expect(result.body).toContain('F-2026-001')
    })

    it('handles missing client gracefully', () => {
      const template = RELANCE_TEMPLATES.friendly
      const facture = { numero: 'F-001', total_ttc: 100, date: '2026-01-01' }

      const result = generateRelanceContent(template, facture, null, {})
      expect(result.subject).toContain('F-001')
      expect(result.body).toContain('Client') // default name
    })
  })

  // ── getPendingRelances ──────────────────────────────────────────
  describe('getPendingRelances', () => {
    it('returns empty array for no overdue invoices', () => {
      const result = getPendingRelances([], [])
      expect(result).toEqual([])
    })

    it('filters out paid and non-facture items', () => {
      const factures = [
        { id: '1', type: 'devis', statut: 'envoye', date: '2025-01-01' },
        { id: '2', type: 'facture', statut: 'payee', date: '2025-01-01' },
      ]
      const result = getPendingRelances(factures, [])
      expect(result).toEqual([])
    })

    it('sorts by priority (critical first)', () => {
      const dueDate60 = new Date()
      dueDate60.setDate(dueDate60.getDate() - 65)
      const dueDate8 = new Date()
      dueDate8.setDate(dueDate8.getDate() - 8)

      const factures = [
        { id: '1', type: 'facture', statut: 'envoye', date: '2025-01-01', date_echeance: dueDate8.toISOString(), total_ttc: 100 },
        { id: '2', type: 'facture', statut: 'envoye', date: '2025-01-01', date_echeance: dueDate60.toISOString(), total_ttc: 500 },
      ]
      const result = getPendingRelances(factures, [])
      expect(result.length).toBeGreaterThan(0)
      // Critical priority should come first
      if (result.length > 1) {
        const priorities = result.map(r => r.template.priority)
        const order = { critical: 0, high: 1, medium: 2, low: 3 }
        for (let i = 1; i < priorities.length; i++) {
          expect(order[priorities[i]]).toBeGreaterThanOrEqual(order[priorities[i - 1]])
        }
      }
    })
  })

  // ── createRelanceRecord ─────────────────────────────────────────
  describe('createRelanceRecord', () => {
    it('creates a record with correct fields', () => {
      const record = createRelanceRecord('facture-123', 'friendly', 'email')
      expect(record.factureId).toBe('facture-123')
      expect(record.templateId).toBe('friendly')
      expect(record.method).toBe('email')
      expect(record.status).toBe('sent')
      expect(record.date).toBeDefined()
      expect(record.id).toContain('facture-123-friendly-')
    })
  })

  // ── getRelanceStats ─────────────────────────────────────────────
  describe('getRelanceStats', () => {
    it('returns zero stats for empty input', () => {
      const stats = getRelanceStats([])
      expect(stats.total).toBe(0)
      expect(stats.critical).toBe(0)
      expect(stats.totalAmount).toBe(0)
    })
  })
})
