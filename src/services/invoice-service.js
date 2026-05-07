// ============================================
// FacturApp - Invoice Service (CRUD with Supabase)
// ============================================

import { supabase, getCurrentUserId } from '../utils/supabase.js';
import { STORAGE_KEYS, INVOICE_STATUS, DEFAULT_EMITTER } from '../utils/constants.js';
import { generateId, generateInvoiceNumber } from '../utils/helpers.js';

class InvoiceService {
  constructor() {
    this.clienteId = null;
    this.emisorId = null;
  }

  setContext(clienteId, emisorId) {
    this.clienteId = clienteId;
    this.emisorId = emisorId;
  }

  async getAll() {
    try {
      const { data, error } = await supabase
        .from('facturas')
        .select('*')
        .eq('id_emisor', this.emisorId)
        .order('fecha_creacion_registro', { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching invoices:', error);
      return [];
    }
  }

  async getById(id) {
    try {
      const { data, error } = await supabase
        .from('facturas')
        .select('*')
        .eq('id', id)
        .eq('id_emisor', this.emisorId)
        .single();

      if (error) throw error;
      return data || null;
    } catch (error) {
      console.error('Error fetching invoice:', error);
      return null;
    }
  }

  async create(invoiceData) {
    try {
      const { data: serieData } = await supabase
        .from('serieFacturacion')
        .select('numeroActual')
        .eq('idEmisor', this.emisorId)
        .single();

      const nextNum = serieData?.numeroActual || 1;
      const invoice = {
        id_emisor: this.emisorId,
        id_cliente: invoiceData.id_cliente,
        numero_factura: nextNum,
        fecha_emision: invoiceData.fecha_emision,
        tipo_factura: invoiceData.tipo_factura || 'factura',
        descripcion_general: invoiceData.descripcion_general,
        estado_pago: 'pendiente',
        subtotal_sin_iva: invoiceData.subtotal_sin_iva,
        porcentaje_iva: invoiceData.porcentaje_iva || 21,
        total_factura: invoiceData.total_factura,
        importe_iva: invoiceData.importe_iva,
        notas: invoiceData.notas,
      };

      const { data, error } = await supabase
        .from('facturas')
        .insert([invoice])
        .select()
        .single();

      if (error) throw error;

      await supabase
        .from('serieFacturacion')
        .update({ numeroActual: nextNum + 1 })
        .eq('idEmisor', this.emisorId);

      return data;
    } catch (error) {
      console.error('Error creating invoice:', error);
      throw error;
    }
  }

  async update(id, data) {
    try {
      const invoice = await this.getById(id);
      if (!invoice) return null;

      if (invoice.estado_verifactu === 'emitida') {
        throw new Error('No se puede editar una factura emitida a Verifactu');
      }

      const { data: updated, error } = await supabase
        .from('facturas')
        .update(data)
        .eq('id', id)
        .eq('id_emisor', this.emisorId)
        .select()
        .single();

      if (error) throw error;
      return updated;
    } catch (error) {
      console.error('Error updating invoice:', error);
      throw error;
    }
  }

  async delete(id) {
    try {
      const { error } = await supabase
        .from('facturas')
        .delete()
        .eq('id', id)
        .eq('id_emisor', this.emisorId);

      if (error) throw error;
    } catch (error) {
      console.error('Error deleting invoice:', error);
      throw error;
    }
  }

  async emitToVerifactu(id) {
    try {
      const { data, error } = await supabase
        .from('facturas')
        .update({
          estado_verifactu: 'emitida',
          fecha_creacion_registro: new Date().toISOString(),
        })
        .eq('id', id)
        .eq('id_emisor', this.emisorId)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error emitting invoice:', error);
      throw error;
    }
  }

  async cancel(id) {
    try {
      const { data, error } = await supabase
        .from('facturas')
        .update({ estado_pago: 'anulada' })
        .eq('id', id)
        .eq('id_emisor', this.emisorId)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error cancelling invoice:', error);
      throw error;
    }
  }

  async getStats() {
    try {
      const invoices = await this.getAll();

      const totalAmount = invoices.reduce((sum, inv) => {
        return sum + (parseFloat(inv.total_factura) || 0);
      }, 0);

      return {
        total: invoices.length,
        drafts: invoices.filter(i => !i.estado_verifactu).length,
        emitted: invoices.filter(i => i.estado_verifactu === 'emitida').length,
        cancelled: invoices.filter(i => i.estado_pago === 'anulada').length,
        totalAmount: Math.round(totalAmount * 100) / 100,
      };
    } catch (error) {
      console.error('Error getting stats:', error);
      return { total: 0, drafts: 0, emitted: 0, cancelled: 0, totalAmount: 0 };
    }
  }

  async search(query) {
    try {
      if (!query) return this.getAll();

      const { data, error } = await supabase
        .from('facturas')
        .select('*')
        .eq('id_emisor', this.emisorId)
        .or(`numero_factura.ilike.%${query}%,descripcion_general.ilike.%${query}%`);

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error searching invoices:', error);
      return [];
    }
  }

  async filterByStatus(status) {
    try {
      if (!status || status === 'all') return this.getAll();

      const { data, error } = await supabase
        .from('facturas')
        .select('*')
        .eq('id_emisor', this.emisorId)
        .eq('estado_verifactu', status);

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error filtering invoices:', error);
      return [];
    }
  }
}

export const invoiceService = new InvoiceService();
