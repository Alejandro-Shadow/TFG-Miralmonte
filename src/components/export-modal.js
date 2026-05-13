
import { showModal } from './modal.js';
import { supabase } from '../utils/supabase.js';
import { invoiceService } from '../services/invoice-service.js';
import { exportAllToExcel } from '../services/export-service.js';
import { showToast } from './toast.js';
import { icons } from '../utils/icons.js';

export async function showExportOptionsModal() {
  try {
    // Fetch clients for the dropdown
    const { data: clients, error: clientsError } = await supabase
      .from('clientesEmisor')
      .select('id, nombre')
      .order('nombre');

    if (clientsError) throw clientsError;

  const clientOptions = (clients || []).map(c => `<option value="${c.id}">${c.nombre}</option>`).join('');

  const modalContent = `
    <div class="export-modal-form">
      <p style="margin-bottom: var(--space-4); color: var(--text-secondary);">
        Selecciona los filtros para la exportación a Excel. Deja en blanco para exportar todo.
      </p>
      
      <div class="form-group">
        <label class="form-label">Cliente</label>
        <select class="form-input" id="export-client">
          <option value="">Todos los clientes</option>
          ${clientOptions}
        </select>
      </div>

      <div class="form-row">
        <div class="form-group">
          <label class="form-label">Fecha Inicio</label>
          <input type="date" class="form-input" id="export-date-start" />
        </div>
        <div class="form-group">
          <label class="form-label">Fecha Fin</label>
          <input type="date" class="form-input" id="export-date-end" />
        </div>
      </div>
    </div>
  `;

  showModal({
    title: 'Exportar Facturas',
    message: modalContent,
    confirmText: 'Exportar Excel',
    onConfirm: async () => {
      const clientId = document.getElementById('export-client').value;
      const dateStart = document.getElementById('export-date-start').value;
      const dateEnd = document.getElementById('export-date-end').value;

      try {
        let invoices = await invoiceService.getAll();
        const totalTotal = invoices.length;

        // Apply filters
        if (clientId) {
          const selectedClient = clients.find(c => String(c.id) === String(clientId));
          const clientName = selectedClient?.nombre.toLowerCase() || '';
          
          invoices = invoices.filter(inv => {
            // Match by ID OR by name (in case the invoice doesn't have id_cliente linked yet)
            const matchId = inv.id_cliente && String(inv.id_cliente) === String(clientId);
            const matchName = (inv.receptor_nombre || '').toLowerCase().includes(clientName);
            return matchId || matchName;
          });
        }

        if (dateStart) {
          invoices = invoices.filter(inv => {
            if (!inv.fecha_emision) return false;
            return inv.fecha_emision >= dateStart;
          });
        }

        if (dateEnd) {
          invoices = invoices.filter(inv => {
            if (!inv.fecha_emision) return false;
            return inv.fecha_emision <= dateEnd;
          });
        }

        if (invoices.length === 0) {
          let reason = 'No hay facturas con esos filtros.';
          if (totalTotal > 0) {
            reason += ` (Encontradas ${totalTotal} en total, pero ninguna coincide con el cliente o las fechas elegidas).`;
          }
          showToast(reason, 'warning');
          return;
        }

        await exportAllToExcel(invoices);
        showToast(`Se han exportado ${invoices.length} facturas`, 'success');
      } catch (error) {
        console.error('Export error:', error);
        showToast('Error al exportar las facturas', 'error');
      }
    }
  });
  } catch (error) {
    console.error('Error opening export modal:', error);
    showToast('No se pudieron cargar los clientes para la exportación', 'error');
  }
}
