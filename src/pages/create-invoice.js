// ============================================
// FacturApp - Create Invoice Page
// ============================================

import { invoiceService } from '../services/invoice-service.js';
import { DEFAULT_EMITTER, IVA_RATES, PDF_TEMPLATES, INVOICE_STATUS } from '../utils/constants.js';
import { createEmptyLine, calculateInvoiceTotals, formatCurrency, toInputDate, generateId } from '../utils/helpers.js';
import { router } from '../utils/router.js';
import { showToast } from '../components/toast.js';

let invoiceLines = [];
let selectedTemplate = 'classic';

export function renderCreateInvoice() {
  invoiceLines = [createEmptyLine()];
  selectedTemplate = 'classic';
  renderForm(null);
}

export function renderEditInvoice(params) {
  const invoice = invoiceService.getById(params.id);
  if (!invoice) {
    showToast('Factura no encontrada', 'error');
    router.navigate('invoices');
    return;
  }

  if (invoice.status === INVOICE_STATUS.EMITTED) {
    showToast('No se puede editar una factura emitida', 'warning');
    router.navigate('view-invoice', { id: params.id });
    return;
  }

  invoiceLines = invoice.lines?.length ? [...invoice.lines] : [createEmptyLine()];
  selectedTemplate = invoice.template || 'classic';
  renderForm(invoice);
}

function renderForm(existingInvoice) {
  const content = document.getElementById('content');
  const isEdit = !!existingInvoice;
  const emitter = existingInvoice?.emitter || { ...DEFAULT_EMITTER };
  const receiver = existingInvoice?.receiver || {};

  content.innerHTML = `
    <div class="fade-in invoice-form">
      <div class="page-header">
        <h1>${isEdit ? '✏️ Editar Factura' : '➕ Nueva Factura'}</h1>
        <button class="btn btn-ghost" id="form-back">← Volver</button>
      </div>

      <form id="invoice-form" autocomplete="off">
        <!-- Datos generales -->
        <div class="form-section card">
          <h3 class="form-section-title">📋 Datos de la Factura</h3>
          <div class="form-row">
            <div class="form-group">
              <label class="form-label">Fecha de Emisión *</label>
              <input type="date" class="form-input" id="inv-date" value="${existingInvoice?.date || toInputDate()}" required />
            </div>
            <div class="form-group">
              <label class="form-label">Fecha de Vencimiento</label>
              <input type="date" class="form-input" id="inv-due-date" value="${existingInvoice?.dueDate || ''}" />
            </div>
          </div>
        </div>

        <!-- Emisor -->
        <div class="form-section card">
          <h3 class="form-section-title">🏢 Datos del Emisor</h3>
          <div class="form-row">
            <div class="form-group">
              <label class="form-label">Nombre / Razón Social *</label>
              <input type="text" class="form-input" id="emitter-name" value="${emitter.name || ''}" required placeholder="Mi Empresa S.L." />
            </div>
            <div class="form-group">
              <label class="form-label">NIF / CIF *</label>
              <input type="text" class="form-input" id="emitter-nif" value="${emitter.nif || ''}" required placeholder="B12345678" />
            </div>
          </div>
          <div class="form-row">
            <div class="form-group">
              <label class="form-label">Dirección</label>
              <input type="text" class="form-input" id="emitter-address" value="${emitter.address || ''}" placeholder="Calle Principal 1" />
            </div>
            <div class="form-group">
              <label class="form-label">Ciudad</label>
              <input type="text" class="form-input" id="emitter-city" value="${emitter.city || ''}" placeholder="Madrid" />
            </div>
          </div>
          <div class="form-row">
            <div class="form-group">
              <label class="form-label">Código Postal</label>
              <input type="text" class="form-input" id="emitter-postal" value="${emitter.postalCode || ''}" placeholder="28001" />
            </div>
            <div class="form-group">
              <label class="form-label">Email</label>
              <input type="email" class="form-input" id="emitter-email" value="${emitter.email || ''}" placeholder="contacto@empresa.es" />
            </div>
          </div>
        </div>

        <!-- Receptor -->
        <div class="form-section card">
          <h3 class="form-section-title">👤 Datos del Receptor</h3>
          <div class="form-row">
            <div class="form-group">
              <label class="form-label">Nombre / Razón Social *</label>
              <input type="text" class="form-input" id="receiver-name" value="${receiver.name || ''}" required placeholder="Cliente S.A." />
            </div>
            <div class="form-group">
              <label class="form-label">NIF / CIF *</label>
              <input type="text" class="form-input" id="receiver-nif" value="${receiver.nif || ''}" required placeholder="A87654321" />
            </div>
          </div>
          <div class="form-row">
            <div class="form-group">
              <label class="form-label">Dirección</label>
              <input type="text" class="form-input" id="receiver-address" value="${receiver.address || ''}" placeholder="Av. del Cliente 42" />
            </div>
            <div class="form-group">
              <label class="form-label">Ciudad</label>
              <input type="text" class="form-input" id="receiver-city" value="${receiver.city || ''}" placeholder="Barcelona" />
            </div>
          </div>
          <div class="form-row">
            <div class="form-group">
              <label class="form-label">Código Postal</label>
              <input type="text" class="form-input" id="receiver-postal" value="${receiver.postalCode || ''}" placeholder="08001" />
            </div>
            <div class="form-group">
              <label class="form-label">Email</label>
              <input type="email" class="form-input" id="receiver-email" value="${receiver.email || ''}" placeholder="admin@cliente.es" />
            </div>
          </div>
        </div>

        <!-- Líneas de factura -->
        <div class="form-section card">
          <h3 class="form-section-title">📦 Líneas de Factura</h3>
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
            ➕ Añadir Línea
          </button>

          <div class="invoice-totals" id="invoice-totals"></div>
        </div>

        <!-- Plantilla PDF -->
        <div class="form-section card">
          <h3 class="form-section-title">🎨 Plantilla PDF</h3>
          <div class="template-grid" id="template-grid"></div>
        </div>

        <!-- Notas -->
        <div class="form-section card">
          <h3 class="form-section-title">📝 Notas</h3>
          <div class="form-group">
            <textarea class="form-input" id="inv-notes" rows="3" placeholder="Notas adicionales...">${existingInvoice?.notes || ''}</textarea>
          </div>
        </div>

        <!-- Actions -->
        <div class="form-footer">
          <button type="button" class="btn btn-ghost" id="form-cancel">Cancelar</button>
          <button type="button" class="btn btn-warning" id="form-draft">
            📝 Guardar Borrador
          </button>
          <button type="button" class="btn btn-accent" id="form-emit">
            🚀 Emitir a Verifactu
          </button>
        </div>
      </form>
    </div>
  `;

  // Render lines
  renderLines();
  renderTemplateSelector();
  updateTotals();

  // Events
  document.getElementById('form-back').addEventListener('click', () => router.navigate('invoices'));
  document.getElementById('form-cancel').addEventListener('click', () => router.navigate('invoices'));
  document.getElementById('add-line').addEventListener('click', () => {
    invoiceLines.push(createEmptyLine());
    renderLines();
    updateTotals();
  });

  document.getElementById('form-draft').addEventListener('click', () => {
    saveInvoice(existingInvoice, INVOICE_STATUS.DRAFT);
  });

  document.getElementById('form-emit').addEventListener('click', () => {
    saveInvoice(existingInvoice, INVOICE_STATUS.EMITTED);
  });
}

function renderLines() {
  const container = document.getElementById('invoice-lines');
  const ivaOptions = IVA_RATES.map((r) => `<option value="${r.value}">${r.label}</option>`).join('');

  container.innerHTML = invoiceLines.map((line, i) => `
    <div class="invoice-line" data-line-idx="${i}">
      <input type="text" class="form-input line-desc" value="${line.description}" placeholder="Descripción del servicio/producto" data-field="description" />
      <input type="number" class="form-input line-qty" value="${line.quantity}" min="0" step="1" data-field="quantity" />
      <input type="number" class="form-input line-price" value="${line.price}" min="0" step="0.01" data-field="price" />
      <select class="form-select line-iva" data-field="ivaRate">
        ${IVA_RATES.map((r) => `<option value="${r.value}" ${r.value === line.ivaRate ? 'selected' : ''}>${r.value}%</option>`).join('')}
      </select>
      <span class="line-subtotal" style="font-weight:600;text-align:right">${formatCurrency(line.quantity * line.price)}</span>
      <button type="button" class="btn-icon line-remove" data-idx="${i}" title="Eliminar línea" ${invoiceLines.length <= 1 ? 'disabled' : ''}>🗑️</button>
    </div>
  `).join('');

  // Line events
  container.querySelectorAll('.invoice-line').forEach((lineEl) => {
    const idx = parseInt(lineEl.dataset.lineIdx);

    lineEl.querySelectorAll('.form-input, .form-select').forEach((input) => {
      input.addEventListener('input', () => {
        const field = input.dataset.field;
        let val = input.value;
        if (['quantity', 'price', 'ivaRate'].includes(field)) val = parseFloat(val) || 0;
        invoiceLines[idx][field] = val;

        // Update subtotal display
        const sub = lineEl.querySelector('.line-subtotal');
        sub.textContent = formatCurrency(invoiceLines[idx].quantity * invoiceLines[idx].price);
        updateTotals();
      });
    });

    lineEl.querySelector('.line-remove')?.addEventListener('click', () => {
      if (invoiceLines.length > 1) {
        invoiceLines.splice(idx, 1);
        renderLines();
        updateTotals();
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
      <div class="icon">${t.icon}</div>
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

function collectFormData() {
  return {
    date: document.getElementById('inv-date').value,
    dueDate: document.getElementById('inv-due-date').value,
    emitter: {
      name: document.getElementById('emitter-name').value,
      nif: document.getElementById('emitter-nif').value,
      address: document.getElementById('emitter-address').value,
      city: document.getElementById('emitter-city').value,
      postalCode: document.getElementById('emitter-postal').value,
      email: document.getElementById('emitter-email').value,
    },
    receiver: {
      name: document.getElementById('receiver-name').value,
      nif: document.getElementById('receiver-nif').value,
      address: document.getElementById('receiver-address').value,
      city: document.getElementById('receiver-city').value,
      postalCode: document.getElementById('receiver-postal').value,
      email: document.getElementById('receiver-email').value,
    },
    lines: invoiceLines,
    notes: document.getElementById('inv-notes').value,
    template: selectedTemplate,
  };
}

function validateForm(data) {
  if (!data.emitter.name || !data.emitter.nif) {
    showToast('El nombre y NIF del emisor son obligatorios', 'warning');
    return false;
  }
  if (!data.receiver.name || !data.receiver.nif) {
    showToast('El nombre y NIF del receptor son obligatorios', 'warning');
    return false;
  }
  if (!data.lines.some((l) => l.description && l.quantity > 0 && l.price > 0)) {
    showToast('Debes añadir al menos una línea de factura válida', 'warning');
    return false;
  }
  return true;
}

function saveInvoice(existingInvoice, status) {
  const data = collectFormData();
  if (!validateForm(data)) return;

  data.status = status;

  try {
    if (existingInvoice) {
      invoiceService.update(existingInvoice.id, data);
      showToast(status === INVOICE_STATUS.EMITTED ? 'Factura emitida a Verifactu ✅' : 'Factura actualizada', 'success');
    } else {
      const created = invoiceService.create(data);
      if (status === INVOICE_STATUS.EMITTED) {
        invoiceService.emitToVerifactu(created.id);
      }
      showToast(status === INVOICE_STATUS.EMITTED ? 'Factura creada y emitida a Verifactu ✅' : 'Borrador guardado', 'success');
    }
    router.navigate('invoices');
  } catch (err) {
    showToast(err.message, 'error');
  }
}
