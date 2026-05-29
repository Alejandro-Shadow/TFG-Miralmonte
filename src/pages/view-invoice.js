// ============================================
// Automalize - View Invoice Page
// ============================================

import { invoiceService } from '../services/invoice-service.js';
import { verifactuService } from '../services/verifactu-service.js';
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

  const VERIFACTU_EMITTED = ['emitida', 'Correcto', 'Duplicado', 'correcto', 'duplicado'];
  const isDraft      = !invoice.estado_verifactu;
  const isEmitida    = VERIFACTU_EMITTED.includes(invoice.estado_verifactu);
  const isAnulada    = invoice.estado_pago === 'anulada';
  const verifactuUrl = invoice.verifactu_url || null;
  const sentToAEAT   = !!invoice.verifactu_uuid || ['Correcto', 'Duplicado', 'correcto', 'duplicado'].includes(invoice.estado_verifactu);
  const verifactuQr  = invoice.verifactu_qr || null;
  const hasEmail     = !!invoice.receptor_email;

  const statusClass = isEmitida ? 'badge-emitted' : isAnulada ? 'badge-cancelled' : 'badge-draft';
  const statusText  = isEmitida ? 'Emitida' : isAnulada ? 'Anulada' : 'Borrador';

  const total   = parseFloat(invoice.total_factura)   || 0;
  const subtotal = parseFloat(invoice.subtotal_sin_iva) || 0;
  const iva      = parseFloat(invoice.importe_iva)     || 0;

  const template = localStorage.getItem(`invoice_template_${invoice.id}`) || 'classic';

  content.innerHTML = `
    <div class="fade-in">

      <!-- Top nav -->
      <div style="margin-bottom:var(--space-4)">
        <button class="btn btn-ghost" id="btn-back">
          <span class="btn-icon-inline">${icons.arrowLeft}</span> Volver a Facturas
        </button>
      </div>

      <!-- Title + badge -->
      <div style="display:flex;align-items:center;gap:var(--space-3);margin-bottom:var(--space-6)">
        <h1 style="font-size:var(--text-2xl);font-weight:800">Factura FAC-${invoice.numero_factura}</h1>
        <span class="badge ${statusClass}">${statusText}</span>
      </div>

      <!-- Invoice document -->
      <div class="invoice-preview-doc template-${template}" style="max-width:800px;margin:0">
        <div class="prev-header">
          <div class="prev-header-left">
            <div class="prev-title">FACTURA</div>
            <div class="prev-number">FAC-${invoice.numero_factura}</div>
          </div>
          <div class="prev-header-right" style="padding-top:30px">
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
            ${invoice.receptor_email    ? `<div class="prev-party-detail">${invoice.receptor_email}</div>`    : ''}
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

      <!-- ======= ACCIONES ======= -->
      <div class="card" style="margin-top:var(--space-6);padding:var(--space-5)">
        <p style="font-size:var(--text-xs);color:var(--text-muted);text-transform:uppercase;letter-spacing:.05em;margin-bottom:var(--space-4)">Acciones</p>
        <div style="display:flex;flex-wrap:wrap;gap:var(--space-3)">

          ${(isDraft && !isAnulada) ? `
            <button class="btn btn-accent" id="btn-emit" style="font-size:var(--text-base);padding:var(--space-3) var(--space-6)">
              <span class="btn-icon-inline">${icons.send}</span> Emitir Factura
            </button>
            <button class="btn btn-primary" id="btn-edit">
              <span class="btn-icon-inline">${icons.edit}</span> Editar
            </button>
          ` : ''}

          ${(isEmitida || isAnulada) ? `
            <button class="btn btn-warning" id="btn-revert">
              <span class="btn-icon-inline">${icons.refreshCw}</span> Revertir a Borrador
            </button>
          ` : ''}

          <button class="btn btn-ghost" id="btn-pdf">
            <span class="btn-icon-inline">${icons.download}</span> Descargar PDF
          </button>

          ${hasEmail ? `
            <button class="btn btn-ghost" id="btn-email">
              <span class="btn-icon-inline">${icons.send}</span> Enviar email
            </button>
          ` : ''}

          <button class="btn btn-ghost" id="btn-drive">
            <span class="btn-icon-inline">${icons.folder}</span> Guardar en Drive
          </button>

          <div style="margin-left:auto;display:flex;gap:var(--space-2)">
            ${!isAnulada && !isDraft ? `
              <button class="btn btn-danger btn-sm" id="btn-cancel-invoice">
                <span class="btn-icon-inline">${icons.xCircle}</span> Anular
              </button>
            ` : ''}
            ${(isDraft || isAnulada) ? `
              <button class="btn btn-danger btn-sm" id="btn-delete">
                <span class="btn-icon-inline">${icons.trash}</span> Eliminar
              </button>
            ` : ''}
          </div>
        </div>
      </div>

      <!-- Estado Verifactu (si emitida) -->
      ${isEmitida ? `
        <div class="card" style="margin-top:var(--space-4);border:1px solid ${sentToAEAT ? 'var(--success-400)' : 'var(--border-default)'}">
          <div style="display:flex;align-items:center;gap:var(--space-3);margin-bottom:var(--space-2)">
            <span style="color:${sentToAEAT ? 'var(--success-400)' : 'var(--text-muted)'}">${sentToAEAT ? icons.checkCircle : icons.info}</span>
            <strong>${sentToAEAT ? 'Registrada en Verifactu (AEAT)' : 'Emitida sin Verifactu'}</strong>
          </div>
          ${sentToAEAT ? `
            <p style="color:var(--text-secondary);font-size:var(--text-sm);margin-bottom:var(--space-4)">
              Estado: <strong>${invoice.estado_verifactu}</strong>
            </p>
            <div style="display:flex;align-items:flex-start;gap:var(--space-6);flex-wrap:wrap">
              ${verifactuQr ? `
                <div>
                  <p style="font-size:var(--text-xs);color:var(--text-muted);margin-bottom:var(--space-2)">CÓDIGO QR VERIFACTU</p>
                  <img src="data:image/png;base64,${verifactuQr}"
                       alt="QR Verifactu"
                       style="width:140px;height:140px;border:1px solid var(--border-default);border-radius:var(--radius-md);padding:6px;background:#fff" />
                </div>
              ` : ''}
              ${verifactuUrl ? `
                <div style="display:flex;flex-direction:column;justify-content:center;gap:var(--space-3)">
                  <a href="${verifactuUrl}" target="_blank" rel="noopener noreferrer"
                     class="btn btn-primary" style="display:inline-flex;align-items:center;gap:var(--space-2)">
                    ${icons.externalLink} Verificar en la AEAT
                  </a>
                </div>
              ` : ''}
            </div>
          ` : `
            <p style="color:var(--text-muted);font-size:var(--text-sm)">
              Esta factura no fue enviada a la Agencia Tributaria.
            </p>
          `}
        </div>
      ` : ''}

      <!-- Progreso emisión Verifactu -->
      <div id="verifactu-polling" style="display:none;margin-top:var(--space-4)" class="card">
        <div style="text-align:center;padding:var(--space-6)">
          <div class="processing-spinner"></div>
          <h3 style="margin-top:var(--space-4)">Enviando a Verifactu...</h3>
          <p id="verifactu-msg" style="color:var(--text-muted);font-size:var(--text-sm);margin-top:var(--space-2)">
            Conectando con la AEAT. Esto puede tardar hasta 2 minutos.
          </p>
          <div class="progress-bar-wrapper" style="margin-top:var(--space-4)">
            <div class="progress-bar" id="verifactu-progress" style="width:0%"></div>
          </div>
        </div>
      </div>

    </div>
  `;

  // ── Volver ──────────────────────────────────────────────────────────────
  document.getElementById('btn-back').addEventListener('click', () => router.navigate('invoices'));

  // ── Editar ───────────────────────────────────────────────────────────────
  document.getElementById('btn-edit')?.addEventListener('click', () => {
    router.navigate('edit-invoice', { id: invoice.id });
  });

  // ── Eliminar ─────────────────────────────────────────────────────────────
  document.getElementById('btn-delete')?.addEventListener('click', () => {
    showModal({
      title: 'Eliminar Factura',
      message: '¿Estás seguro de eliminar esta factura? Esta acción no se puede deshacer.',
      confirmText: 'Eliminar',
      type: 'danger',
      onConfirm: async () => {
        await invoiceService.delete(invoice.id);
        showToast('Factura eliminada', 'success');
        router.navigate('invoices');
      },
    });
  });

  // ── Anular ───────────────────────────────────────────────────────────────
  document.getElementById('btn-cancel-invoice')?.addEventListener('click', () => {
    showModal({
      title: 'Anular Factura',
      message: '¿Estás seguro de anular esta factura? Quedará invalidada para su cobro pero mantendrá su número para el registro contable.',
      confirmText: 'Anular',
      type: 'danger',
      onConfirm: async () => {
        await invoiceService.cancel(invoice.id);
        showToast('Factura anulada', 'success');
        renderViewInvoice(params);
      },
    });
  });

  // ── Revertir a borrador ───────────────────────────────────────────────────
  document.getElementById('btn-revert')?.addEventListener('click', () => {
    showModal({
      title: 'Revertir a Borrador',
      message: 'La factura volverá al estado de borrador y podrás editarla. ¿Continuar?',
      confirmText: 'Revertir',
      onConfirm: async () => {
        await invoiceService.revertToDraft(invoice.id);
        showToast('Factura revertida a borrador', 'success');
        renderViewInvoice(params);
      },
    });
  });

  // ── PDF ───────────────────────────────────────────────────────────────────
  document.getElementById('btn-pdf')?.addEventListener('click', async () => {
    const { generatePDF } = await import('../services/pdf-service.js');
    await generatePDF(invoice, template);
    showToast('PDF generado', 'success');
  });

  // ── Email ─────────────────────────────────────────────────────────────────
  document.getElementById('btn-email')?.addEventListener('click', async () => {
    const btn = document.getElementById('btn-email');
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

  // ── Drive ─────────────────────────────────────────────────────────────────
  document.getElementById('btn-drive')?.addEventListener('click', async () => {
    const btn = document.getElementById('btn-drive');
    btn.disabled = true;
    btn.innerHTML = `<span class="btn-icon-inline">${icons.folder}</span> Guardando...`;
    try {
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

  // ── Emitir Factura (modal con opciones) ──────────────────────────────────
  document.getElementById('btn-emit')?.addEventListener('click', () => {
    showModal({
      title: 'Emitir Factura',
      confirmText: 'Emitir',
      html: `
        <p style="color:var(--text-secondary);font-size:var(--text-sm);margin-bottom:var(--space-5);line-height:1.6">
          Una vez emitida no podrá editarse. Elige qué acciones realizar al emitir:
        </p>
        <div style="display:flex;flex-direction:column;gap:var(--space-3)">

          <label style="display:flex;align-items:flex-start;gap:var(--space-3);padding:var(--space-4);
                        border:1px solid var(--border-default);border-radius:var(--radius-md);cursor:pointer">
            <input type="checkbox" id="opt-verifactu" checked
                   style="margin-top:2px;width:16px;height:16px;accent-color:var(--primary-500);cursor:pointer" />
            <div>
              <div style="font-weight:600;font-size:var(--text-sm)">Enviar a Verifactu (AEAT)</div>
              <div style="color:var(--text-muted);font-size:var(--text-xs);margin-top:2px">
                Registra la factura en la Agencia Tributaria.
              </div>
            </div>
          </label>

          <label style="display:flex;align-items:flex-start;gap:var(--space-3);padding:var(--space-4);
                        border:1px solid var(--border-default);border-radius:var(--radius-md);
                        cursor:pointer;${!hasEmail ? 'opacity:.4;pointer-events:none' : ''}">
            <input type="checkbox" id="opt-email" ${!hasEmail ? 'disabled' : ''}
                   style="margin-top:2px;width:16px;height:16px;accent-color:var(--primary-500);cursor:pointer" />
            <div>
              <div style="font-weight:600;font-size:var(--text-sm)">Enviar email al cliente</div>
              <div style="color:var(--text-muted);font-size:var(--text-xs);margin-top:2px">
                ${hasEmail
                  ? `Se enviará la factura a <strong>${invoice.receptor_email}</strong>`
                  : 'El cliente no tiene email registrado'}
              </div>
            </div>
          </label>

        </div>
      `,
      onConfirm: async () => {
        const useVerifactu = document.getElementById('opt-verifactu')?.checked ?? false;
        const doEmail      = document.getElementById('opt-email')?.checked      ?? false;

        const pollingEl  = document.getElementById('verifactu-polling');
        const progressEl = document.getElementById('verifactu-progress');
        const msgEl      = document.getElementById('verifactu-msg');

        document.querySelectorAll('#btn-emit,#btn-edit,#btn-delete,#btn-pdf,#btn-email,#btn-drive')
          .forEach(b => b && (b.disabled = true));

        try {
          let uuid = null;
          let resolvedUrl = null;
          let resolvedQr = null;

          if (useVerifactu) {
            pollingEl.style.display = 'block';
            msgEl.textContent = 'Enviando factura a la AEAT...';

            const createRes = await verifactuService.create(invoice);
            uuid = createRes.uuid || createRes.id;
            resolvedQr = createRes.resolvedQr || null;
            if (!uuid) throw new Error('La API no devolvió un UUID válido');

            progressEl.style.width = '10%';
            msgEl.textContent = 'Esperando confirmación de la AEAT...';

            const statusRes = await verifactuService.pollStatus(uuid, (attempt, max) => {
              progressEl.style.width = Math.round(10 + (attempt / max) * 85) + '%';
              msgEl.textContent = `Verificando estado... (${attempt}/${max})`;
            });

            resolvedUrl = statusRes.resolvedUrl;
            progressEl.style.width = '100%';
            pollingEl.style.display = 'none';
          }

          await invoiceService.emitToVerifactu(invoice.id, uuid, resolvedUrl, resolvedQr);

          if (doEmail && hasEmail) {
            const emailRes = await sendInvoiceEmail(invoice);
            if (emailRes.success) {
              showToast('Email enviado a ' + invoice.receptor_email, 'success');
            } else {
              showToast('Email falló: ' + emailRes.error, 'warning');
            }
          }

          showToast(useVerifactu ? 'Factura registrada en la AEAT' : 'Factura emitida', 'success');
          renderViewInvoice(params);

        } catch (err) {
          pollingEl.style.display = 'none';
          document.querySelectorAll('#btn-emit,#btn-edit,#btn-delete,#btn-pdf,#btn-email,#btn-drive')
            .forEach(b => b && (b.disabled = false));
          showToast('Error al emitir: ' + err.message, 'error');
          console.error('Emit error:', err);
        }
      },
    });
  });
}
