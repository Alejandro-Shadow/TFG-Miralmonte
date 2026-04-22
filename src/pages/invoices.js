// ============================================
// FacturApp - Invoices List Page
// ============================================

import { invoiceService } from '../services/invoice-service.js';
import { formatCurrency, formatDate, calculateInvoiceTotals, debounce } from '../utils/helpers.js';
import { router } from '../utils/router.js';
import { showToast } from '../components/toast.js';
import { showModal } from '../components/modal.js';
import { exportToXML, exportToCSV, exportToExcel } from '../services/export-service.js';

let currentFilter = 'all';
let currentSearch = '';

export function renderInvoices() {
  const content = document.getElementById('content');

  content.innerHTML = `
    <div class="fade-in">
      <div class="page-header">
        <h1>📋 Facturas</h1>
        <div class="page-header-actions">
          <button class="btn btn-primary" id="inv-new">➕ Nueva Factura</button>
        </div>
      </div>

      <div class="invoice-list-controls">
        <div class="filter-group">
          <button class="filter-btn active" data-filter="all">Todas</button>
          <button class="filter-btn" data-filter="borrador">📝 Borrador</button>
          <button class="filter-btn" data-filter="emitida">✅ Emitidas</button>
          <button class="filter-btn" data-filter="anulada">❌ Anuladas</button>
        </div>
        <div class="search-input-wrapper">
          <span>🔍</span>
          <input type="text" placeholder="Buscar por nº, receptor..." id="inv-search" />
        </div>
      </div>

      <div id="invoices-table-container"></div>
    </div>
  `;

  // Events
  document.getElementById('inv-new').addEventListener('click', () => router.navigate('create-invoice'));

  // Filters
  content.querySelectorAll('.filter-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      content.querySelectorAll('.filter-btn').forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');
      currentFilter = btn.dataset.filter;
      renderTable();
    });
  });

  // Search
  document.getElementById('inv-search').addEventListener('input', debounce((e) => {
    currentSearch = e.target.value;
    renderTable();
  }, 250));

  renderTable();
}

function renderTable() {
  const container = document.getElementById('invoices-table-container');
  let invoices = invoiceService.getAll();

  // Filter
  if (currentFilter !== 'all') {
    invoices = invoices.filter((inv) => inv.status === currentFilter);
  }

  // Search
  if (currentSearch) {
    const q = currentSearch.toLowerCase();
    invoices = invoices.filter(
      (inv) =>
        inv.number.toLowerCase().includes(q) ||
        (inv.receiver?.name || '').toLowerCase().includes(q)
    );
  }

  if (invoices.length === 0) {
    container.innerHTML = `
      <div class="card empty-state">
        <div class="empty-state-icon">🔍</div>
        <h3>No se encontraron facturas</h3>
        <p>Intenta con otros filtros o crea una nueva factura</p>
      </div>
    `;
    return;
  }

  const rows = invoices.map((inv) => {
    const totals = calculateInvoiceTotals(inv.lines);
    const statusClass = inv.status === 'emitida' ? 'badge-emitted' : inv.status === 'anulada' ? 'badge-cancelled' : 'badge-draft';
    const canEdit = inv.status === 'borrador';

    return `
      <tr>
        <td><strong style="color: var(--primary-400)">${inv.number}</strong></td>
        <td>${inv.receiver?.name || '-'}</td>
        <td>${formatDate(inv.date)}</td>
        <td>${formatDate(inv.dueDate)}</td>
        <td><span class="badge ${statusClass}">${inv.status}</span></td>
        <td style="text-align:right"><strong>${formatCurrency(totals.total)}</strong></td>
        <td>
          <div class="table-actions">
            <button class="btn-icon" title="Ver" data-view="${inv.id}">👁️</button>
            ${canEdit ? `<button class="btn-icon" title="Editar" data-edit="${inv.id}">✏️</button>` : ''}
            <button class="btn-icon" title="PDF" data-pdf="${inv.id}">📥</button>
            <button class="btn-icon" title="XML" data-xml="${inv.id}">📄</button>
            <button class="btn-icon" title="Excel" data-excel="${inv.id}">📊</button>
            <button class="btn-icon" title="CSV" data-csv="${inv.id}">📋</button>
            ${canEdit ? `<button class="btn-icon" title="Eliminar" data-delete="${inv.id}">🗑️</button>` : ''}
          </div>
        </td>
      </tr>
    `;
  }).join('');

  container.innerHTML = `
    <div class="table-wrapper card slide-up">
      <table class="data-table">
        <thead>
          <tr>
            <th>Nº Factura</th>
            <th>Receptor</th>
            <th>Fecha</th>
            <th>Vencimiento</th>
            <th>Estado</th>
            <th style="text-align:right">Total</th>
            <th>Acciones</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
    </div>
  `;

  // Row actions
  container.querySelectorAll('[data-view]').forEach((btn) => {
    btn.addEventListener('click', () => router.navigate('view-invoice', { id: btn.dataset.view }));
  });

  container.querySelectorAll('[data-edit]').forEach((btn) => {
    btn.addEventListener('click', () => router.navigate('edit-invoice', { id: btn.dataset.edit }));
  });

  container.querySelectorAll('[data-delete]').forEach((btn) => {
    btn.addEventListener('click', () => {
      showModal({
        title: 'Eliminar Factura',
        message: '¿Estás seguro de que deseas eliminar esta factura? Esta acción no se puede deshacer.',
        confirmText: 'Eliminar',
        type: 'danger',
        onConfirm: () => {
          invoiceService.delete(btn.dataset.delete);
          showToast('Factura eliminada', 'success');
          renderTable();
        },
      });
    });
  });

  container.querySelectorAll('[data-pdf]').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const inv = invoiceService.getById(btn.dataset.pdf);
      if (inv) {
        const { generatePDF } = await import('../services/pdf-service.js');
        await generatePDF(inv, inv.template || 'classic');
        showToast('PDF generado', 'success');
      }
    });
  });

  container.querySelectorAll('[data-xml]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const inv = invoiceService.getById(btn.dataset.xml);
      if (inv) {
        exportToXML(inv);
        showToast('XML exportado', 'success');
      }
    });
  });

  container.querySelectorAll('[data-excel]').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const inv = invoiceService.getById(btn.dataset.excel);
      if (inv) {
        await exportToExcel(inv);
        showToast('Excel exportado', 'success');
      }
    });
  });

  container.querySelectorAll('[data-csv]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const inv = invoiceService.getById(btn.dataset.csv);
      if (inv) {
        exportToCSV(inv);
        showToast('CSV exportado', 'success');
      }
    });
  });
}
