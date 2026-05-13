// ============================================
// FacturApp - Create Invoice Page
// ============================================

import { invoiceService } from '../services/invoice-service.js';
import { supabase } from '../utils/supabase.js';
import { IVA_RATES, PDF_TEMPLATES, INVOICE_STATUS } from '../utils/constants.js';
import { createEmptyLine, calculateInvoiceTotals, formatCurrency, toInputDate } from '../utils/helpers.js';
import { router } from '../utils/router.js';
import { showToast } from '../components/toast.js';
import { icons } from '../utils/icons.js';

let invoiceLines = [];
let selectedTemplate = 'classic';

export function renderCreateInvoice() {
  invoiceLines = [createEmptyLine()];
  selectedTemplate = 'classic';
  renderForm(null);
}

export async function renderEditInvoice(params) {
  const invoice = await invoiceService.getById(params.id);
  if (!invoice) {
    showToast('Factura no encontrada', 'error');
    router.navigate('invoices');
    return;
  }

  if (invoice.estado_verifactu === 'emitida') {
    showToast('No se puede editar una factura emitida', 'warning');
    router.navigate('view-invoice', { id: params.id });
    return;
  }

  // Reconstruct lines from the saved invoice data
  invoiceLines = [{
    id: createEmptyLine().id,
    description: invoice.descripcion_general || '',
    quantity: 1,
    price: parseFloat(invoice.subtotal_sin_iva) || 0,
    ivaRate: parseFloat(invoice.porcentaje_iva) || 21,
  }];
  selectedTemplate = 'classic';
  renderForm(invoice);
}

async function renderForm(existingInvoice) {
  const content = document.getElementById('content');
  const isEdit = !!existingInvoice;

  content.innerHTML = '<div class="loading">Cargando...</div>';
  const { data: clientes } = await supabase
    .from('clientesEmisor')
    .select('*')
    .order('nombre');

  const existingClienteId = existingInvoice?.id_cliente ? String(existingInvoice.id_cliente) : '';
  const clientesOptions = (clientes || [])
    .map(c => `<option value="${c.id}" ${String(c.id) === existingClienteId ? 'selected' : ''}>${c.nombre} - ${c.cif_nif_nie || ''}</option>`)
    .join('');

  content.innerHTML = `
    <div class="fade-in invoice-form-wrapper">
      <div class="page-header">
        <h1>${isEdit ? 'Editar Factura' : 'Nueva Factura'}</h1>
        <button class="btn btn-ghost" id="form-back"><span class="btn-icon-inline">${icons.arrowLeft}</span> Volver</button>
      </div>

      <div class="invoice-split-layout">
        <!-- LEFT: Form -->
        <div class="invoice-form-col">
          <form id="invoice-form" autocomplete="off">
            <!-- Datos generales -->
            <div class="form-section card">
              <h3 class="form-section-title"><span class="section-icon">${icons.clipboard}</span> Datos de la Factura</h3>
              <div class="form-row">
                <div class="form-group">
                  <label class="form-label">Fecha de Emisión *</label>
                  <input type="date" class="form-input" id="inv-date" value="${existingInvoice?.fecha_emision || toInputDate()}" required />
                </div>
                <div class="form-group">
                  <label class="form-label">Tipo de Factura</label>
                  <select class="form-select" id="inv-tipo">
                    <option value="factura" ${existingInvoice?.tipo_factura === 'factura' ? 'selected' : ''}>Factura</option>
                    <option value="factura_simplificada" ${existingInvoice?.tipo_factura === 'factura_simplificada' ? 'selected' : ''}>Factura Simplificada</option>
                    <option value="factura_rectificativa" ${existingInvoice?.tipo_factura === 'factura_rectificativa' ? 'selected' : ''}>Factura Rectificativa</option>
                  </select>
                </div>
              </div>
            </div>

            <!-- Receptor -->
            <div class="form-section card">
              <h3 class="form-section-title"><span class="section-icon">${icons.user}</span> Datos del Receptor</h3>
              <div class="form-group" style="margin-bottom: var(--space-4)">
                <label class="form-label">Seleccionar Cliente Existente</label>
                <select class="form-select" id="cliente-select">
                  <option value="">-- Introducir manualmente --</option>
                  ${clientesOptions}
                </select>
              </div>
              <div id="receptor-fields">
                <div class="form-row">
                  <div class="form-group">
                    <label class="form-label">Nombre / Razón Social *</label>
                    <input type="text" class="form-input" id="receiver-name" value="${existingInvoice?.receptor_nombre || ''}" required placeholder="Cliente S.A." />
                  </div>
                  <div class="form-group">
                    <label class="form-label">NIF / CIF *</label>
                    <input type="text" class="form-input" id="receiver-nif" value="${existingInvoice?.receptor_cif_nif || ''}" placeholder="A87654321" />
                  </div>
                </div>
                <div class="form-row">
                  <div class="form-group">
                    <label class="form-label">Dirección</label>
                    <input type="text" class="form-input" id="receiver-address" value="${existingInvoice?.receptor_direccion || ''}" placeholder="Av. del Cliente 42" />
                  </div>
                  <div class="form-group">
                    <label class="form-label">Email</label>
                    <input type="email" class="form-input" id="receiver-email" value="${existingInvoice?.receptor_email || ''}" placeholder="admin@cliente.es" />
                  </div>
                </div>
              </div>
            </div>

            <!-- Líneas de factura -->
            <div class="form-section card">
              <h3 class="form-section-title"><span class="section-icon">${icons.package}</span> Líneas de Factura</h3>
              <div class="invoice-lines-header">
                <span>Descripción</span>
                <span>Cantidad</span>
                <span>Precio</span>
                <span>IVA</span>
                <span>Subtotal</span>
                <span></span>
              </div>
              <div id="invoice-lines"></div>
              <button type="button" class="btn btn-ghost add-line-btn" id="add-line">
                <span class="btn-icon-inline">${icons.plus}</span> Añadir Línea
              </button>
              <div class="invoice-totals" id="invoice-totals"></div>
            </div>

            <!-- Plantilla PDF -->
            <div class="form-section card">
              <h3 class="form-section-title"><span class="section-icon">${icons.palette}</span> Plantilla PDF</h3>
              <div class="template-grid" id="template-grid"></div>
            </div>

            <!-- Notas -->
            <div class="form-section card">
              <h3 class="form-section-title"><span class="section-icon">${icons.fileEdit}</span> Notas</h3>
              <div class="form-group">
                <textarea class="form-input" id="inv-notes" rows="3" placeholder="Notas adicionales...">${existingInvoice?.notas || ''}</textarea>
              </div>
            </div>

            <!-- Actions -->
            <div class="form-footer">
              <button type="button" class="btn btn-ghost" id="form-cancel">Cancelar</button>
              <button type="button" class="btn btn-warning" id="form-draft">
                <span class="btn-icon-inline">${icons.save}</span> Guardar Borrador
              </button>
              <button type="button" class="btn btn-accent" id="form-emit">
                <span class="btn-icon-inline">${icons.send}</span> Emitir a Verifactu
              </button>
            </div>
          </form>
        </div>

        <!-- RIGHT: Live Preview -->
        <div class="invoice-preview-col">
          <div class="invoice-preview-sticky">
            <h3 class="preview-title"><span class="section-icon">${icons.eye}</span> Previsualización</h3>
            <div class="invoice-preview-doc" id="invoice-preview"></div>
          </div>
        </div>
      </div>
    </div>
  `;

  renderLines();
  renderTemplateSelector();
  updateTotals();
  updatePreview();

  // Autorellenar datos del cliente al seleccionar
  document.getElementById('cliente-select').addEventListener('change', (e) => {
    const clienteId = e.target.value;
    if (!clienteId) {
      document.getElementById('receptor-fields').style.display = 'block';
      return;
    }
    const cliente = (clientes || []).find(c => String(c.id) === String(clienteId));
    if (!cliente) return;
    document.getElementById('receiver-name').value = cliente.nombre || '';
    document.getElementById('receiver-nif').value = cliente.cif_nif_nie || '';
    document.getElementById('receiver-address').value = cliente.direccion_completa || '';
    document.getElementById('receiver-email').value = cliente.correo_electronico || '';
    updatePreview();
  });

  document.getElementById('form-back').addEventListener('click', () => router.navigate('invoices'));
  document.getElementById('form-cancel').addEventListener('click', () => router.navigate('invoices'));
  document.getElementById('add-line').addEventListener('click', () => {
    invoiceLines.push(createEmptyLine());
    renderLines();
    updateTotals();
    updatePreview();
  });

  document.getElementById('form-draft').addEventListener('click', () => saveInvoice(existingInvoice, false));
  document.getElementById('form-emit').addEventListener('click', () => saveInvoice(existingInvoice, true));

  // Listen for form changes to update preview
  document.getElementById('invoice-form').addEventListener('input', () => {
    updatePreview();
  });
}

function renderLines() {
  const container = document.getElementById('invoice-lines');

  container.innerHTML = invoiceLines.map((line, i) => `
    <div class="invoice-line" data-line-idx="${i}">
      <input type="text" class="form-input line-desc" value="${line.description}" placeholder="Descripción del servicio/producto" data-field="description" />
      <input type="number" class="form-input line-qty" value="${line.quantity}" min="0" step="1" data-field="quantity" />
      <input type="number" class="form-input line-price" value="${line.price}" min="0" step="0.01" data-field="price" />
      <select class="form-select line-iva" data-field="ivaRate">
        ${IVA_RATES.map((r) => `<option value="${r.value}" ${r.value === line.ivaRate ? 'selected' : ''}>${r.value}%</option>`).join('')}
      </select>
      <span class="line-subtotal" style="font-weight:600;text-align:right">${formatCurrency(line.quantity * line.price)}</span>
      <button type="button" class="btn-icon line-remove" data-idx="${i}" title="Eliminar línea" ${invoiceLines.length <= 1 ? 'disabled' : ''}>${icons.trash}</button>
    </div>
  `).join('');

  container.querySelectorAll('.invoice-line').forEach((lineEl) => {
    const idx = parseInt(lineEl.dataset.lineIdx);

    lineEl.querySelectorAll('.form-input, .form-select').forEach((input) => {
      input.addEventListener('input', () => {
        const field = input.dataset.field;
        let val = input.value;
        if (['quantity', 'price', 'ivaRate'].includes(field)) val = parseFloat(val) || 0;
        invoiceLines[idx][field] = val;

        const sub = lineEl.querySelector('.line-subtotal');
        sub.textContent = formatCurrency(invoiceLines[idx].quantity * invoiceLines[idx].price);
        updateTotals();
        updatePreview();
      });
    });

    lineEl.querySelector('.line-remove')?.addEventListener('click', () => {
      if (invoiceLines.length > 1) {
        invoiceLines.splice(idx, 1);
        renderLines();
        updateTotals();
        updatePreview();
      }
    });
  });
}

function updateTotals() {
  const totals = calculateInvoiceTotals(invoiceLines);
  const container = document.getElementById('invoice-totals');
  container.innerHTML = `
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
  `;
}

function renderTemplateSelector() {
  const container = document.getElementById('template-grid');
  container.innerHTML = PDF_TEMPLATES.map((t) => `
    <div class="template-option ${t.id === selectedTemplate ? 'selected' : ''}" data-template="${t.id}">
      <div class="icon">${icons[t.icon] || ''}</div>
      <h4>${t.name}</h4>
      <p>${t.description}</p>
    </div>
  `).join('');

  container.querySelectorAll('.template-option').forEach((opt) => {
    opt.addEventListener('click', () => {
      selectedTemplate = opt.dataset.template;
      container.querySelectorAll('.template-option').forEach((o) => o.classList.remove('selected'));
      opt.classList.add('selected');
    });
  });
}

function updatePreview() {
  const preview = document.getElementById('invoice-preview');
  if (!preview) return;

  const receiverName = document.getElementById('receiver-name')?.value || 'Receptor';
  const receiverNif = document.getElementById('receiver-nif')?.value || '';
  const receiverAddress = document.getElementById('receiver-address')?.value || '';
  const receiverEmail = document.getElementById('receiver-email')?.value || '';
  const fecha = document.getElementById('inv-date')?.value || toInputDate();
  const tipo = document.getElementById('inv-tipo')?.value || 'factura';
  const notas = document.getElementById('inv-notes')?.value || '';

  const totals = calculateInvoiceTotals(invoiceLines);

  const linesHtml = invoiceLines
    .filter(l => l.description || l.price > 0)
    .map(l => `
      <tr>
        <td>${l.description || '—'}</td>
        <td class="num">${l.quantity}</td>
        <td class="num">${formatCurrency(l.price)}</td>
        <td class="num">${l.ivaRate}%</td>
        <td class="num">${formatCurrency(l.quantity * l.price)}</td>
      </tr>
    `).join('');

  const emptyLines = invoiceLines.every(l => !l.description && l.price === 0);

  preview.innerHTML = `
    <div class="prev-header">
      <div class="prev-header-left">
        <div class="prev-title">FACTURA</div>
        <div class="prev-number">FAC-XXXX</div>
      </div>
      <div class="prev-header-right">
        <div class="prev-meta">Fecha: ${fecha}</div>
        <div class="prev-meta">Tipo: ${tipo}</div>
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
        <div class="prev-party-name">${receiverName || '—'}</div>
        <div class="prev-party-detail">${receiverNif || '—'}</div>
        ${receiverAddress ? `<div class="prev-party-detail">${receiverAddress}</div>` : ''}
        ${receiverEmail ? `<div class="prev-party-detail">${receiverEmail}</div>` : ''}
      </div>
    </div>

    ${emptyLines ? `
      <div class="prev-empty">Añade líneas a la factura para ver la previsualización</div>
    ` : `
      <table class="prev-table">
        <thead>
          <tr><th>Descripción</th><th class="num">Uds.</th><th class="num">Precio</th><th class="num">IVA</th><th class="num">Subtotal</th></tr>
        </thead>
        <tbody>${linesHtml}</tbody>
      </table>
    `}

    <div class="prev-totals">
      <div class="prev-total-row"><span>Base Imponible</span><span>${formatCurrency(totals.subtotal)}</span></div>
      <div class="prev-total-row"><span>IVA</span><span>${formatCurrency(totals.totalIva)}</span></div>
      <div class="prev-total-row prev-grand-total"><span>TOTAL</span><span>${formatCurrency(totals.total)}</span></div>
    </div>

    ${notas ? `<div class="prev-notes"><strong>Notas:</strong> ${notas}</div>` : ''}
  `;
}

async function saveInvoice(existingInvoice, emit) {
  const fecha_emision = document.getElementById('inv-date').value;
  const tipo_factura = document.getElementById('inv-tipo').value;
  const receptor_nombre = document.getElementById('receiver-name').value;
  const receptor_nif = document.getElementById('receiver-nif').value;
  const receptor_direccion = document.getElementById('receiver-address').value;
  const receptor_email = document.getElementById('receiver-email').value;
  const notas = document.getElementById('inv-notes').value;
  let id_cliente = document.getElementById('cliente-select').value || null;

  if (!receptor_nombre) {
    showToast('El nombre del receptor es obligatorio', 'warning');
    return;
  }
  if (!invoiceLines.some(l => l.description && l.quantity > 0 && l.price > 0)) {
    showToast('Debes añadir al menos una línea válida', 'warning');
    return;
  }

  try {
    // Si no hay id_cliente, intentamos buscarlo por NIF o crearlo
    if (!id_cliente && receptor_nif) {
      const { data: existingClient } = await supabase
        .from('clientesEmisor')
        .select('id')
        .eq('cif_nif_nie', receptor_nif)
        .limit(1)
        .single();

      if (existingClient) {
        id_cliente = existingClient.id;
      } else {
        const { data: newClient, error: createError } = await supabase
          .from('clientesEmisor')
          .insert([{
            nombre: receptor_nombre,
            cif_nif_nie: receptor_nif,
            direccion_completa: receptor_direccion,
            correo_electronico: receptor_email
          }])
          .select()
          .single();

        if (!createError && newClient) {
          id_cliente = newClient.id;
        }
      }
    }

    const totals = calculateInvoiceTotals(invoiceLines);
    const descripcion_general = invoiceLines.map(l => l.description).filter(Boolean).join(', ');

    const invoiceData = {
      fecha_emision,
      tipo_factura,
      descripcion_general,
      id_cliente: id_cliente ? parseInt(id_cliente) : null,
      notas,
      subtotal_sin_iva: totals.subtotal,
      porcentaje_iva: invoiceLines[0]?.ivaRate || 21,
      importe_iva: totals.totalIva,
      total_factura: totals.total,
    };

    if (existingInvoice) {
      await invoiceService.update(existingInvoice.id, invoiceData);
      if (emit) {
        await invoiceService.emitToVerifactu(existingInvoice.id);
        showToast('Factura actualizada y emitida a Verifactu', 'success');
      } else {
        showToast('Factura actualizada', 'success');
      }
    } else {
      const created = await invoiceService.create(invoiceData);
      if (emit && created) {
        await invoiceService.emitToVerifactu(created.id);
        showToast('Factura creada y emitida a Verifactu', 'success');
      } else {
        showToast('Borrador guardado', 'success');
      }
    }
    router.navigate('invoices');
  } catch (err) {
    showToast('Error: ' + err.message, 'error');
  }
}
