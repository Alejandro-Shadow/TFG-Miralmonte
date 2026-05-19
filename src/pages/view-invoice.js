// ============================================
// FacturApp - View Invoice Page
// ============================================

import { invoiceService } from '../services/invoice-service.js';
import { formatCurrency, formatDate } from '../utils/helpers.js';
import { router } from '../utils/router.js';
import { showToast } from '../components/toast.js';
import { showModal } from '../components/modal.js';
import { icons } from '../utils/icons.js';
import { sendInvoiceEmail } from '../services/email-service.js';
import { saveInvoiceToDrive } from '../services/drive-service.js';

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

  const template = localStorage.getItem(`invoice_template_${invoice.id}`) || 'classic';

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
          ${invoice.receptor_email ? `<button class="btn btn-ghost" id="view-email"><span class="btn-icon-inline">${icons.send}</span> Enviar email</button>` : ''}
          <button class="btn btn-ghost" id="view-drive"><span class="btn-icon-inline">${icons.folder}</span> Guardar en Drive</button>
          ${isDraft ? `<button class="btn btn-danger btn-sm" id="view-delete"><span class="btn-icon-inline">${icons.trash}</span> Eliminar</button>` : ''}
        </div>
      </div>

      <div class="invoice-preview-doc template-${template}" style="max-width: 800px; margin: 0; position: relative;">
        <span class="badge ${statusClass}" style="position: absolute; top: var(--space-6); right: var(--space-6);">${statusText}</span>
        
        <div class="prev-header">
          <div class="prev-header-left">
            <div class="prev-title">FACTURA</div>
            <div class="prev-number">FAC-${invoice.numero_factura}</div>
          </div>
          <div class="prev-header-right" style="padding-top: 30px;">
            <div class="prev-meta">Fecha: ${formatDate(invoice.fecha_emision)}</div>
            <div class="prev-meta">Tipo: ${invoice.tipo_factura || 'factura'}</div>
          </div>
        </div>

        <div class="prev-parties">
          <div class="prev-party">
            <div class="prev-party-label">EMISOR</div>
            <div class="prev-party-name">Mi Empresa S.L.</div>
            <div class="prev-party-detail">B12345678</div>
          </div>
          <div class="prev-party">
            <div class="prev-party-label">RECEPTOR</div>
            <div class="prev-party-name">${invoice.receptor_nombre || invoice.descripcion_general || '-'}</div>
            <div class="prev-party-detail">${invoice.receptor_cif_nif || ''}</div>
            ${invoice.receptor_direccion ? `<div class="prev-party-detail">${invoice.receptor_direccion}</div>` : ''}
            ${invoice.receptor_email ? `<div class="prev-party-detail">${invoice.receptor_email}</div>` : ''}
          </div>
        </div>

        <table class="prev-table">
          <thead>
            <tr><th>Descripción</th><th class="num">Uds.</th><th class="num">Precio</th><th class="num">IVA</th><th class="num">Subtotal</th></tr>
          </thead>
          <tbody>
            <tr>
              <td>${invoice.descripcion_general || '-'}</td>
              <td class="num">1</td>
              <td class="num">${formatCurrency(subtotal)}</td>
              <td class="num">${invoice.porcentaje_iva || 21}%</td>
              <td class="num">${formatCurrency(subtotal)}</td>
            </tr>
          </tbody>
        </table>

        <div class="prev-totals">
          <div class="prev-total-row"><span>Base Imponible</span><span>${formatCurrency(subtotal)}</span></div>
          <div class="prev-total-row"><span>IVA</span><span>${formatCurrency(iva)}</span></div>
          <div class="prev-total-row prev-grand-total"><span>TOTAL</span><span>${formatCurrency(total)}</span></div>
        </div>

        ${invoice.notas ? `<div class="prev-notes"><strong>Notas:</strong> ${invoice.notas}</div>` : ''}
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
    await generatePDF(invoice, template);
    showToast('PDF generado', 'success');
  });

  document.getElementById('view-email')?.addEventListener('click', async () => {
    const btn = document.getElementById('view-email');
    btn.disabled = true;
    btn.innerHTML = `<span class="btn-icon-inline">${icons.send}</span> Enviando...`;

    const result = await sendInvoiceEmail(invoice);
    if (result.success) {
      showToast('Email enviado a ' + invoice.receptor_email, 'success');
    } else {
      showToast('Error al enviar: ' + result.error, 'error');
    }

    btn.disabled = false;
    btn.innerHTML = `<span class="btn-icon-inline">${icons.send}</span> Enviar email`;
  });

  document.getElementById('view-drive')?.addEventListener('click', async () => {
    const btn = document.getElementById('view-drive');
    btn.disabled = true;
    btn.innerHTML = `<span class="btn-icon-inline">${icons.folder}</span> Guardando...`;

    try {
      // Generar el PDF como blob
      const { generatePDFBlob } = await import('../services/pdf-service.js');
      const pdfBlob = await generatePDFBlob(invoice, template);

      const result = await saveInvoiceToDrive(invoice, pdfBlob);
      if (result.success) {
        showToast('Guardado en Drive: ' + result.fileName, 'success');
      } else {
        showToast('Error al guardar en Drive: ' + result.error, 'error');
      }
    } catch (err) {
      showToast('Error: ' + err.message, 'error');
    }

    btn.disabled = false;
    btn.innerHTML = `<span class="btn-icon-inline">${icons.folder}</span> Guardar en Drive`;
  });
}
