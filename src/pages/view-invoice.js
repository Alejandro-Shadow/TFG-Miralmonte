// ============================================
// FacturApp - View Invoice Page
// ============================================

import { invoiceService } from '../services/invoice-service.js';
import { formatCurrency, formatDate, calculateInvoiceTotals } from '../utils/helpers.js';
import { INVOICE_STATUS } from '../utils/constants.js';
import { router } from '../utils/router.js';
import { showToast } from '../components/toast.js';
import { showModal } from '../components/modal.js';
import { exportToXML, exportToCSV, exportToExcel } from '../services/export-service.js';

export function renderViewInvoice(params) {
  const invoice = invoiceService.getById(params.id);
  if (!invoice) {
    showToast('Factura no encontrada', 'error');
    router.navigate('invoices');
    return;
  }

  const content = document.getElementById('content');
  const totals = calculateInvoiceTotals(invoice.lines);
  const isDraft = invoice.status === INVOICE_STATUS.DRAFT;
  const statusClass = invoice.status === 'emitida' ? 'badge-emitted' : invoice.status === 'anulada' ? 'badge-cancelled' : 'badge-draft';

  const linesRows = invoice.lines.map((line) => `
    <tr>
      <td>${line.description}</td>
      <td style="text-align:center">${line.quantity}</td>
      <td style="text-align:right">${formatCurrency(line.price)}</td>
      <td style="text-align:center">${line.ivaRate}%</td>
      <td style="text-align:right"><strong>${formatCurrency(line.quantity * line.price)}</strong></td>
    </tr>
  `).join('');

  content.innerHTML = `
    <div class="fade-in">
      <div class="page-header">
        <div>
          <button class="btn btn-ghost" id="view-back" style="margin-bottom:var(--space-2)">← Volver a Facturas</button>
          <h1>Factura ${invoice.number}</h1>
        </div>
        <div class="page-header-actions">
          ${isDraft ? `
            <button class="btn btn-primary" id="view-edit">✏️ Editar</button>
            <button class="btn btn-accent" id="view-emit">🚀 Emitir a Verifactu</button>
          ` : ''}
          <button class="btn btn-ghost" id="view-pdf">📥 PDF</button>
          <button class="btn btn-ghost" id="view-xml">📄 XML</button>
          <button class="btn btn-ghost" id="view-excel">📊 Excel</button>
          <button class="btn btn-ghost" id="view-csv">📋 CSV</button>
          ${isDraft ? `<button class="btn btn-danger btn-sm" id="view-delete">🗑️ Eliminar</button>` : ''}
        </div>
      </div>

      <div class="card invoice-detail-card">
        <!-- Header -->
        <div class="invoice-detail-header">
          <div>
            <div class="invoice-detail-number" style="color: var(--primary-400)">${invoice.number}</div>
            <span class="badge ${statusClass}" style="margin-top:var(--space-2);display:inline-block">${invoice.status.toUpperCase()}</span>
          </div>
          <div style="text-align:right">
            <p style="color:var(--text-secondary);font-size:var(--text-sm)">
              <strong>Fecha:</strong> ${formatDate(invoice.date)}<br/>
              ${invoice.dueDate ? `<strong>Vencimiento:</strong> ${formatDate(invoice.dueDate)}<br/>` : ''}
              ${invoice.emittedAt ? `<strong>Emitida:</strong> ${formatDate(invoice.emittedAt)}<br/>` : ''}
            </p>
          </div>
        </div>

        <!-- Parties -->
        <div class="invoice-detail-parties">
          <div class="party-info">
            <h3>EMISOR</h3>
            <p class="name">${invoice.emitter?.name || '-'}</p>
            <p>
              NIF: ${invoice.emitter?.nif || '-'}<br/>
              ${invoice.emitter?.address || ''}<br/>
              ${invoice.emitter?.postalCode || ''} ${invoice.emitter?.city || ''}<br/>
              ${invoice.emitter?.email || ''}
            </p>
          </div>
          <div class="party-info">
            <h3>RECEPTOR</h3>
            <p class="name">${invoice.receiver?.name || '-'}</p>
            <p>
              NIF: ${invoice.receiver?.nif || '-'}<br/>
              ${invoice.receiver?.address || ''}<br/>
              ${invoice.receiver?.postalCode || ''} ${invoice.receiver?.city || ''}<br/>
              ${invoice.receiver?.email || ''}
            </p>
          </div>
        </div>

        <!-- Lines Table -->
        <div class="table-wrapper" style="margin-bottom:var(--space-6)">
          <table class="data-table">
            <thead>
              <tr>
                <th>Descripción</th>
                <th style="text-align:center">Cantidad</th>
                <th style="text-align:right">Precio</th>
                <th style="text-align:center">IVA</th>
                <th style="text-align:right">Subtotal</th>
              </tr>
            </thead>
            <tbody>${linesRows}</tbody>
          </table>
        </div>

        <!-- Totals -->
        <div class="invoice-totals">
          <div class="total-row">
            <span>Base Imponible</span>
            <span>${formatCurrency(totals.subtotal)}</span>
          </div>
          <div class="total-row">
            <span>IVA</span>
            <span>${formatCurrency(totals.totalIva)}</span>
          </div>
          <div class="total-row grand-total">
            <span>TOTAL</span>
            <span>${formatCurrency(totals.total)}</span>
          </div>
        </div>

        ${invoice.notes ? `
          <div style="margin-top:var(--space-6);padding:var(--space-4);background:var(--bg-elevated);border-radius:var(--radius-md)">
            <h4 style="font-size:var(--text-sm);color:var(--text-muted);margin-bottom:var(--space-2)">NOTAS</h4>
            <p style="color:var(--text-secondary);font-size:var(--text-sm)">${invoice.notes}</p>
          </div>
        ` : ''}
      </div>
    </div>
  `;

  // Events
  document.getElementById('view-back').addEventListener('click', () => router.navigate('invoices'));

  document.getElementById('view-edit')?.addEventListener('click', () => {
    router.navigate('edit-invoice', { id: invoice.id });
  });

  document.getElementById('view-emit')?.addEventListener('click', () => {
    showModal({
      title: 'Emitir a Verifactu',
      message: 'Una vez emitida, la factura no podrá ser editada. ¿Deseas continuar?',
      confirmText: '🚀 Emitir',
      onConfirm: () => {
        invoiceService.emitToVerifactu(invoice.id);
        showToast('Factura emitida a Verifactu ✅', 'success');
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
      onConfirm: () => {
        invoiceService.delete(invoice.id);
        showToast('Factura eliminada', 'success');
        router.navigate('invoices');
      },
    });
  });

  document.getElementById('view-pdf').addEventListener('click', async () => {
    const { generatePDF } = await import('../services/pdf-service.js');
    await generatePDF(invoice, invoice.template || 'classic');
    showToast('PDF generado', 'success');
  });

  document.getElementById('view-xml').addEventListener('click', () => {
    exportToXML(invoice);
    showToast('XML exportado', 'success');
  });

  document.getElementById('view-excel').addEventListener('click', async () => {
    await exportToExcel(invoice);
    showToast('Excel exportado', 'success');
  });

  document.getElementById('view-csv').addEventListener('click', () => {
    exportToCSV(invoice);
    showToast('CSV exportado', 'success');
  });
}
