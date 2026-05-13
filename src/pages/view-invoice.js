// ============================================
// FacturApp - View Invoice Page
// ============================================

import { invoiceService } from '../services/invoice-service.js';
import { formatCurrency, formatDate } from '../utils/helpers.js';
import { router } from '../utils/router.js';
import { showToast } from '../components/toast.js';
import { showModal } from '../components/modal.js';
import { icons } from '../utils/icons.js';

export async function renderViewInvoice(params) {
  const content = document.getElementById('content');
  content.innerHTML = '<div class="loading">Cargando...</div>';

  const invoice = await invoiceService.getById(params.id);
  if (!invoice) {
    showToast('Factura no encontrada', 'error');
    router.navigate('invoices');
    return;
  }

  const isDraft = !invoice.estado_verifactu;
  const isEmitida = invoice.estado_verifactu === 'emitida';
  const isAnulada = invoice.estado_pago === 'anulada';

  const statusClass = isEmitida ? 'badge-emitted' : isAnulada ? 'badge-cancelled' : 'badge-draft';
  const statusText = isEmitida ? 'Emitida' : isAnulada ? 'Anulada' : 'Borrador';

  const total = parseFloat(invoice.total_factura) || 0;
  const subtotal = parseFloat(invoice.subtotal_sin_iva) || 0;
  const iva = parseFloat(invoice.importe_iva) || 0;

  content.innerHTML = `
    <div class="fade-in">
      <div class="page-header">
        <div>
          <button class="btn btn-ghost" id="view-back" style="margin-bottom:var(--space-2)">
            <span class="btn-icon-inline">${icons.arrowLeft}</span> Volver a Facturas
          </button>
          <h1>Factura FAC-${invoice.numero_factura}</h1>
        </div>
        <div class="page-header-actions">
          ${isDraft ? `
            <button class="btn btn-primary" id="view-edit"><span class="btn-icon-inline">${icons.edit}</span> Editar</button>
            <button class="btn btn-accent" id="view-emit"><span class="btn-icon-inline">${icons.send}</span> Emitir a Verifactu</button>
          ` : `
            <button class="btn btn-warning" id="view-revert"><span class="btn-icon-inline">${icons.refreshCw}</span> Revertir a Borrador</button>
          `}
          <button class="btn btn-ghost" id="view-pdf"><span class="btn-icon-inline">${icons.download}</span> PDF</button>
          ${isDraft ? `<button class="btn btn-danger btn-sm" id="view-delete"><span class="btn-icon-inline">${icons.trash}</span> Eliminar</button>` : ''}
        </div>
      </div>

      <div class="card invoice-detail-card">
        <!-- Header -->
        <div class="invoice-detail-header">
          <div>
            <div class="invoice-detail-number" style="color: var(--primary-400)">FAC-${invoice.numero_factura}</div>
            <span class="badge ${statusClass}" style="margin-top:var(--space-2);display:inline-block">${statusText}</span>
          </div>
          <div style="text-align:right">
            <p style="color:var(--text-secondary);font-size:var(--text-sm)">
              <strong>Fecha emisión:</strong> ${formatDate(invoice.fecha_emision)}<br/>
              <strong>Tipo:</strong> ${invoice.tipo_factura || 'factura'}
            </p>
          </div>
        </div>

        <!-- Receptor -->
        <div class="invoice-detail-parties">
          <div class="party-info">
            <h3>RECEPTOR</h3>
            <p class="name">${invoice.receptor_nombre || invoice.descripcion_general || '-'}</p>
            <p>
              ${invoice.receptor_cif_nif ? `NIF: ${invoice.receptor_cif_nif}<br/>` : ''}
              ${invoice.receptor_direccion ? `${invoice.receptor_direccion}<br/>` : ''}
              ${invoice.receptor_email ? invoice.receptor_email : ''}
            </p>
          </div>
          <div class="party-info">
            <h3>DETALLES</h3>
            <p>${invoice.descripcion_general || '-'}</p>
          </div>
        </div>

        <!-- Totals -->
        <div class="invoice-totals">
          <div class="total-row">
            <span>Base Imponible</span>
            <span>${formatCurrency(subtotal)}</span>
          </div>
          <div class="total-row">
            <span>IVA (${invoice.porcentaje_iva || 21}%)</span>
            <span>${formatCurrency(iva)}</span>
          </div>
          <div class="total-row grand-total">
            <span>TOTAL</span>
            <span>${formatCurrency(total)}</span>
          </div>
        </div>

        ${invoice.notas ? `
          <div style="margin-top:var(--space-6);padding:var(--space-4);background:var(--bg-elevated);border-radius:var(--radius-md)">
            <h4 style="font-size:var(--text-sm);color:var(--text-muted);margin-bottom:var(--space-2)">NOTAS</h4>
            <p style="color:var(--text-secondary);font-size:var(--text-sm)">${invoice.notas}</p>
          </div>
        ` : ''}
      </div>
    </div>
  `;

  document.getElementById('view-back').addEventListener('click', () => router.navigate('invoices'));

  document.getElementById('view-edit')?.addEventListener('click', () => {
    router.navigate('edit-invoice', { id: invoice.id });
  });

  document.getElementById('view-emit')?.addEventListener('click', () => {
    showModal({
      title: 'Emitir a Verifactu',
      message: 'Una vez emitida, la factura no podrá ser editada. ¿Deseas continuar?',
      confirmText: 'Emitir',
      onConfirm: async () => {
        await invoiceService.emitToVerifactu(invoice.id);
        showToast('Factura emitida a Verifactu', 'success');
        renderViewInvoice(params);
      },
    });
  });

  document.getElementById('view-delete')?.addEventListener('click', () => {
    showModal({
      title: 'Eliminar Factura',
      message: '¿Estás seguro de eliminar esta factura?',
      confirmText: 'Eliminar',
      type: 'danger',
      onConfirm: async () => {
        await invoiceService.delete(invoice.id);
        showToast('Factura eliminada', 'success');
        router.navigate('invoices');
      },
    });
  });

  document.getElementById('view-revert')?.addEventListener('click', () => {
    showModal({
      title: 'Revertir a Borrador',
      message: 'La factura volverá al estado de borrador y podrás editarla o eliminarla. ¿Continuar?',
      confirmText: 'Revertir',
      onConfirm: async () => {
        await invoiceService.revertToDraft(invoice.id);
        showToast('Factura revertida a borrador', 'success');
        renderViewInvoice(params);
      },
    });
  });

  document.getElementById('view-pdf')?.addEventListener('click', async () => {
    const { generatePDF } = await import('../services/pdf-service.js');
    await generatePDF(invoice, 'classic');
    showToast('PDF generado', 'success');
  });
}
