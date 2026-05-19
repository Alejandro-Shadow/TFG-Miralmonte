// ============================================
// FacturApp - Invoice Service (CRUD with Supabase)
// ============================================

import { supabase } from '../utils/supabase.js';

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
        .select('*, clientesEmisor(nombre, cif_nif_nie, correo_electronico, direccion_completa)')
        .eq('id_emisor', this.emisorId)
        .order('id', { ascending: false });

      if (error) throw error;
      return (data || []).map(inv => ({
        ...inv,
        receptor_nombre: inv.clientesEmisor?.nombre || inv.receptor_nombre || '-',
        receptor_cif_nif: inv.clientesEmisor?.cif_nif_nie || inv.receptor_cif_nif || '',
        receptor_email: inv.clientesEmisor?.correo_electronico || inv.receptor_email || '',
        receptor_direccion: inv.clientesEmisor?.direccion_completa || inv.receptor_direccion || '',
      }));
    } catch (error) {
      console.error('Error fetching invoices:', error);
      return [];
    }
  }

  async getById(id) {
    try {
      const { data, error } = await supabase
        .from('facturas')
        .select('*, clientesEmisor(nombre, cif_nif_nie, correo_electronico, direccion_completa)')
        .eq('id', id)
        .eq('id_emisor', this.emisorId)
        .single();

      if (error) throw error;
      if (!data) return null;
      return {
        ...data,
        receptor_nombre: data.clientesEmisor?.nombre || data.receptor_nombre || '-',
        receptor_cif_nif: data.clientesEmisor?.cif_nif_nie || data.receptor_cif_nif || '',
        receptor_email: data.clientesEmisor?.correo_electronico || data.receptor_email || '',
        receptor_direccion: data.clientesEmisor?.direccion_completa || data.receptor_direccion || '',
      };
    } catch (error) {
      console.error('Error fetching invoice:', error);
      return null;
    }
  }

  async create(invoiceData) {
    try {
      // Obtener la primera serie disponible del emisor
      const { data: serieData } = await supabase
        .from('serieFacturacion')
        .select('id, serie, numeroActual')
        .eq('idEmisor', this.emisorId)
        .order('id', { ascending: true })
        .limit(1)
        .single();

      const nextNum = serieData?.numeroActual || 1;
      const serie = serieData?.serie || 'FAC';

      const invoice = {
        id_emisor: this.emisorId,
        id_cliente: invoiceData.id_cliente || null,
        serie: serie,
        numero_factura: nextNum,
        fecha_emision: invoiceData.fecha_emision,
        tipo_factura: invoiceData.tipo_factura || 'factura',
        descripcion_general: invoiceData.descripcion_general,
        estado_pago: 'pendiente',
        subtotal_sin_iva: invoiceData.subtotal_sin_iva,
        porcentaje_iva: invoiceData.porcentaje_iva || 21,
        total_factura: invoiceData.total_factura,
        importe_iva: invoiceData.importe_iva,
        notas: invoiceData.notas || null,
      };

      const { data, error } = await supabase
        .from('facturas')
        .insert([invoice])
        .select()
        .single();

      if (error) throw error;

      // Incrementar el contador de la serie
      if (serieData) {
        await supabase
          .from('serieFacturacion')
          .update({ numeroActual: nextNum + 1 })
          .eq('id', serieData.id);
      }

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

  async revertToDraft(id) {
    try {
      const { data, error } = await supabase
        .from('facturas')
        .update({
          estado_verifactu: null,
          fecha_creacion_registro: null,
        })
        .eq('id', id)
        .eq('id_emisor', this.emisorId)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error reverting invoice:', error);
      throw error;
    }
  }

  async revertToDraft(id) {
    try {
      const { data, error } = await supabase
        .from('facturas')
        .update({ estado_verifactu: null })
        .eq('id', id)
        .eq('id_emisor', this.emisorId)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error reverting invoice:', error);
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
        .select('*, clientesEmisor(nombre, cif_nif_nie, correo_electronico, direccion_completa)')
        .eq('id_emisor', this.emisorId)
        .ilike('descripcion_general', `%${query}%`);

      if (error) throw error;
      return (data || []).map(inv => ({
        ...inv,
        receptor_nombre: inv.clientesEmisor?.nombre || '-',
        receptor_cif_nif: inv.clientesEmisor?.cif_nif_nie || '',
      }));
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
