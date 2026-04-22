// ============================================
// FacturApp - Invoice Service (CRUD with localStorage)
// ============================================

import { STORAGE_KEYS, INVOICE_STATUS, DEFAULT_EMITTER } from '../utils/constants.js';
import { generateId, generateInvoiceNumber } from '../utils/helpers.js';

class InvoiceService {
  constructor() {
    this._ensureSampleData();
  }

  /**
   * Get all invoices
   */
  getAll() {
    const data = localStorage.getItem(STORAGE_KEYS.INVOICES);
    return data ? JSON.parse(data) : [];
  }

  /**
   * Get invoice by ID
   */
  getById(id) {
    return this.getAll().find((inv) => inv.id === id) || null;
  }

  /**
   * Create a new invoice
   */
  create(invoiceData) {
    const invoices = this.getAll();
    const nextNum = this._getNextNumber();
    const invoice = {
      ...invoiceData,
      id: generateId(),
      number: generateInvoiceNumber(nextNum),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    invoices.push(invoice);
    this._save(invoices);
    this._incrementNumber();
    return invoice;
  }

  /**
   * Update an existing invoice
   */
  update(id, data) {
    const invoices = this.getAll();
    const idx = invoices.findIndex((inv) => inv.id === id);
    if (idx === -1) return null;

    // Cannot edit emitted invoices
    if (invoices[idx].status === INVOICE_STATUS.EMITTED) {
      throw new Error('No se puede editar una factura emitida a Verifactu');
    }

    invoices[idx] = {
      ...invoices[idx],
      ...data,
      id, // preserve id
      number: invoices[idx].number, // preserve number
      updatedAt: new Date().toISOString(),
    };
    this._save(invoices);
    return invoices[idx];
  }

  /**
   * Delete an invoice
   */
  delete(id) {
    const invoices = this.getAll().filter((inv) => inv.id !== id);
    this._save(invoices);
  }

  /**
   * Emit invoice to Verifactu (changes status, blocks editing)
   */
  emitToVerifactu(id) {
    const invoices = this.getAll();
    const idx = invoices.findIndex((inv) => inv.id === id);
    if (idx === -1) return null;

    invoices[idx].status = INVOICE_STATUS.EMITTED;
    invoices[idx].emittedAt = new Date().toISOString();
    invoices[idx].updatedAt = new Date().toISOString();
    this._save(invoices);
    return invoices[idx];
  }

  /**
   * Cancel an invoice
   */
  cancel(id) {
    const invoices = this.getAll();
    const idx = invoices.findIndex((inv) => inv.id === id);
    if (idx === -1) return null;

    invoices[idx].status = INVOICE_STATUS.CANCELLED;
    invoices[idx].updatedAt = new Date().toISOString();
    this._save(invoices);
    return invoices[idx];
  }

  /**
   * Get statistics
   */
  getStats() {
    const invoices = this.getAll();
    const drafts = invoices.filter((i) => i.status === INVOICE_STATUS.DRAFT);
    const emitted = invoices.filter((i) => i.status === INVOICE_STATUS.EMITTED);
    const cancelled = invoices.filter((i) => i.status === INVOICE_STATUS.CANCELLED);

    const totalAmount = invoices.reduce((sum, inv) => {
      const lines = inv.lines || [];
      const invTotal = lines.reduce((s, l) => {
        const lineTotal = (parseFloat(l.quantity) || 0) * (parseFloat(l.price) || 0);
        return s + lineTotal + lineTotal * ((parseFloat(l.ivaRate) || 0) / 100);
      }, 0);
      return sum + invTotal;
    }, 0);

    return {
      total: invoices.length,
      drafts: drafts.length,
      emitted: emitted.length,
      cancelled: cancelled.length,
      totalAmount: Math.round(totalAmount * 100) / 100,
    };
  }

  /**
   * Search invoices
   */
  search(query) {
    if (!query) return this.getAll();
    const q = query.toLowerCase();
    return this.getAll().filter(
      (inv) =>
        inv.number.toLowerCase().includes(q) ||
        (inv.receiver?.name || '').toLowerCase().includes(q) ||
        (inv.emitter?.name || '').toLowerCase().includes(q)
    );
  }

  /**
   * Filter by status
   */
  filterByStatus(status) {
    if (!status || status === 'all') return this.getAll();
    return this.getAll().filter((inv) => inv.status === status);
  }

  // --- Private methods ---

  _save(invoices) {
    localStorage.setItem(STORAGE_KEYS.INVOICES, JSON.stringify(invoices));
  }

  _getNextNumber() {
    const num = localStorage.getItem(STORAGE_KEYS.NEXT_NUMBER);
    return num ? parseInt(num) : 1;
  }

  _incrementNumber() {
    const current = this._getNextNumber();
    localStorage.setItem(STORAGE_KEYS.NEXT_NUMBER, String(current + 1));
  }

  _ensureSampleData() {
    const existing = localStorage.getItem(STORAGE_KEYS.INVOICES);
    if (existing) return;

    const sampleInvoices = [
      {
        id: generateId(),
        number: 'FAC-2026-0001',
        date: '2026-03-01',
        dueDate: '2026-04-01',
        status: INVOICE_STATUS.EMITTED,
        emitter: { ...DEFAULT_EMITTER },
        receiver: {
          name: 'Tech Solutions S.A.',
          nif: 'A87654321',
          address: 'Av. de la Tecnología 42',
          city: 'Barcelona',
          postalCode: '08001',
          email: 'admin@techsolutions.es',
        },
        lines: [
          { id: generateId(), description: 'Desarrollo Web Frontend', quantity: 80, price: 45, ivaRate: 21 },
          { id: generateId(), description: 'Diseño UI/UX', quantity: 20, price: 55, ivaRate: 21 },
        ],
        notes: 'Proyecto Q1 2026',
        template: 'modern',
        createdAt: '2026-03-01T10:00:00Z',
        updatedAt: '2026-03-01T10:00:00Z',
        emittedAt: '2026-03-02T09:00:00Z',
      },
      {
        id: generateId(),
        number: 'FAC-2026-0002',
        date: '2026-03-05',
        dueDate: '2026-04-05',
        status: INVOICE_STATUS.DRAFT,
        emitter: { ...DEFAULT_EMITTER },
        receiver: {
          name: 'Innovatech Labs',
          nif: 'B11223344',
          address: 'Calle Innovación 15',
          city: 'Valencia',
          postalCode: '46001',
          email: 'contacto@innovatech.es',
        },
        lines: [
          { id: generateId(), description: 'Consultoría técnica', quantity: 40, price: 60, ivaRate: 21 },
          { id: generateId(), description: 'Soporte mensual', quantity: 1, price: 500, ivaRate: 21 },
        ],
        notes: 'Pendiente de revisión',
        template: 'classic',
        createdAt: '2026-03-05T14:00:00Z',
        updatedAt: '2026-03-05T14:00:00Z',
      },
      {
        id: generateId(),
        number: 'FAC-2026-0003',
        date: '2026-03-08',
        dueDate: '2026-04-08',
        status: INVOICE_STATUS.DRAFT,
        emitter: { ...DEFAULT_EMITTER },
        receiver: {
          name: 'Green Energy Corp.',
          nif: 'B99887766',
          address: 'Paseo de la Energía 8',
          city: 'Sevilla',
          postalCode: '41001',
          email: 'info@greenenergy.es',
        },
        lines: [
          { id: generateId(), description: 'Auditoría de sistemas', quantity: 16, price: 75, ivaRate: 21 },
        ],
        notes: '',
        template: 'minimal',
        createdAt: '2026-03-08T09:30:00Z',
        updatedAt: '2026-03-08T09:30:00Z',
      },
    ];

    this._save(sampleInvoices);
    localStorage.setItem(STORAGE_KEYS.NEXT_NUMBER, '4');
  }
}

export const invoiceService = new InvoiceService();
