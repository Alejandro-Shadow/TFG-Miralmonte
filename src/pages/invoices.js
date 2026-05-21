// ============================================
// Automalize - Invoices List Page
// ============================================

import { invoiceService } from '../services/invoice-service.js';
import { formatCurrency, formatDate, calculateInvoiceTotals, debounce } from '../utils/helpers.js';
import { router } from '../utils/router.js';
import { showToast } from '../components/toast.js';
import { showModal } from '../components/modal.js';
import { exportToXML, exportToCSV, exportToExcel } from '../services/export-service.js';
import { icons } from '../utils/icons.js';

let currentFilter = 'all';
let currentSearch = '';

export async function renderInvoices(params) {
  console.log('[DEBUG] renderInvoices called with params:', params);
  const content = document.getElementById('content');

  // Sync state with params
  const filterMap = { all: 'all', drafts: '', emitted: 'emitida', cancelled: 'anulada' };
  
  if (params?.filter && params.filter in filterMap) {
    currentFilter = filterMap[params.filter];
  } else {
    currentFilter = sessionStorage.getItem('lastInvoiceFilter') ?? 'all';
  }
  
  currentSearch = params?.search || '';

  content.innerHTML = `
    <div class="fade-in">
      <div class="page-header">
        <h1>Facturas</h1>
        <div class="page-header-actions">
          <button class="btn btn-ghost" id="inv-export"><span class="btn-icon-inline">${icons.download}</span> Exportar</button>
          <button class="btn btn-primary" id="inv-new"><span class="btn-icon-inline">${icons.plus}</span> Nueva Factura</button>
        </div>
      </div>

      <div class="invoice-list-controls">
        <div class="filter-group">
          <button class="filter-btn ${currentFilter === 'all' ? 'active' : ''}" data-filter="all">Todas</button>
          <button class="filter-btn ${currentFilter === '' ? 'active' : ''}" data-filter="">Borrador</button>
          <button class="filter-btn ${currentFilter === 'emitida' ? 'active' : ''}" data-filter="emitida">Emitidas</button>
          <button class="filter-btn ${currentFilter === 'anulada' ? 'active' : ''}" data-filter="anulada">Anuladas</button>
        </div>
        <div class="search-input-wrapper">
          <span class="search-icon-wrapper">${icons.search}</span>
          <input type="text" placeholder="Buscar por nº, descripción..." id="inv-search" value="${currentSearch}" />
        </div>
      </div>

      <div id="invoices-table-container"></div>
    </div>
  `;

  // Events
  document.getElementById('inv-new').addEventListener('click', () => router.navigate('create-invoice'));
  document.getElementById('inv-export').addEventListener('click', async () => {
    try {
      const { showExportOptionsModal } = await import('../components/export-modal.js');
      await showExportOptionsModal();
    } catch (e) {
      console.error('Error al abrir el modal de exportación:', e);
      const { showToast } = await import('../components/toast.js');
      showToast('Error al abrir las opciones de exportación', 'error');
    }
  });

  // Filters
  content.querySelectorAll('.filter-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      content.querySelectorAll('.filter-btn').forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');
      currentFilter = btn.dataset.filter;
      sessionStorage.setItem('lastInvoiceFilter', currentFilter);
      renderTable();
    });
  });

  // Search local
  const searchInput = document.getElementById('inv-search');
  searchInput.addEventListener('input', debounce((e) => {
    currentSearch = e.target.value;
    renderTable();
  }, 250));

  // Also support Enter in local search
  searchInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      currentSearch = e.target.value;
      renderTable();
    }
  });

  renderTable();
}

async function renderTable() {
  const container = document.getElementById('invoices-table-container');
  if (!container) return;

  container.innerHTML = '<div class="loading">Cargando...</div>';
  let invoices = await invoiceService.getAll();

  console.log('[DEBUG] Facturas totales:', invoices.length);
  console.log('[DEBUG] Filtro actual:', currentFilter);
  console.log('[DEBUG] Búsqueda actual:', currentSearch);

  // 1. Filter by status
  if (currentFilter !== 'all') {
    invoices = invoices.filter((inv) => {
      if (currentFilter === 'emitida') return inv.estado_verifactu === 'emitida';
      if (currentFilter === 'anulada') return inv.estado_pago === 'anulada';
      return !inv.estado_verifactu; // borrador
    });
  }

  // 2. Filter by search text
  if (currentSearch) {
    const query = currentSearch.toLowerCase().trim();
    invoices = invoices.filter((inv) => {
      const num = `FAC-${inv.numero_factura}`.toLowerCase();
      const numShort = String(inv.numero_factura).toLowerCase();
      const desc = (inv.descripcion_general || '').toLowerCase();
      const client = (inv.receptor_nombre || '').toLowerCase();
      const nif = (inv.receptor_cif_nif || '').toLowerCase();
      
      return num.includes(query) || 
             numShort.includes(query) ||
             desc.includes(query) || 
             client.includes(query) || 
             nif.includes(query);
    });
  }

  console.log('[DEBUG] Facturas tras filtrar:', invoices.length);

  if (invoices.length === 0) {
    container.innerHTML = `
      <div class="card empty-state">
        <div class="empty-state-icon">${icons.search}</div>
        <h3>No se encontraron facturas</h3>
        <p>Intenta con otros filtros o crea una nueva factura</p>
      </div>
    `;
    return;
  }

  const VERIFACTU_EMITTED = ['emitida', 'Correcto', 'Duplicado', 'correcto', 'duplicado'];
  const rows = invoices.map((inv) => {
    const total = parseFloat(inv.total_factura) || 0;
    const isEmitida   = VERIFACTU_EMITTED.includes(inv.estado_verifactu);
    const sentToAEAT  = !!inv.verifactu_uuid || ['Correcto', 'Duplicado', 'correcto', 'duplicado'].includes(inv.estado_verifactu);
    const statusClass = isEmitida ? 'badge-emitted' : inv.estado_pago === 'anulada' ? 'badge-cancelled' : 'badge-draft';
    const statusText  = isEmitida ? 'Emitida' : inv.estado_pago === 'anulada' ? 'Anulada' : 'Borrador';
    const canEdit     = !inv.estado_verifactu;

    const verifactuBadge = isEmitida
      ? sentToAEAT
        ? `<span title="Registrada en Verifactu (AEAT)" style="color:var(--success-400);display:inline-flex">${icons.checkCircle}</span>`
        : `<span title="Emitida sin Verifactu" style="color:var(--text-muted);display:inline-flex">${icons.xCircle}</span>`
      : '';

    return `
      <tr>
        <td><strong style="color: var(--primary-400)">FAC-${inv.numero_factura}</strong></td>
        <td>${inv.receptor_nombre || '-'}</td>
        <td>${formatDate(inv.fecha_emision)}</td>
        <td>${formatDate(inv.fecha_vencimiento || inv.fecha_emision)}</td>
        <td>
          <div style="display:flex;align-items:center;gap:var(--space-2)">
            <span class="badge ${statusClass}">${statusText}</span>
            ${verifactuBadge}
          </div>
        </td>
        <td style="text-align:right"><strong>${formatCurrency(total)}</strong></td>
        <td>
          <div class="table-actions">
            <button class="btn-icon" title="Ver" data-view="${inv.id}">${icons.eye}</button>
            ${canEdit ? `<button class="btn-icon" title="Editar" data-edit="${inv.id}">${icons.edit}</button>` : ''}
            <button class="btn-icon" title="PDF" data-pdf="${inv.id}">${icons.download}</button>
            ${!canEdit ? `<button class="btn-icon" title="Revertir a Borrador" data-revert="${inv.id}">${icons.refreshCw}</button>` : ''}
            ${canEdit ? `<button class="btn-icon" title="Eliminar" data-delete="${inv.id}">${icons.trash}</button>` : ''}
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
        onConfirm: async () => {
          await invoiceService.delete(btn.dataset.delete);
          showToast('Factura eliminada', 'success');
          renderTable();
        },
      });
    });
  });

  container.querySelectorAll('[data-revert]').forEach((btn) => {
    btn.addEventListener('click', () => {
      showModal({
        title: 'Revertir a Borrador',
        message: 'La factura volverá al estado de borrador y podrás editarla o eliminarla. ¿Continuar?',
        confirmText: 'Revertir',
        onConfirm: async () => {
          await invoiceService.revertToDraft(btn.dataset.revert);
          showToast('Factura revertida a borrador', 'success');
          renderTable();
        },
      });
    });
  });

  container.querySelectorAll('[data-pdf]').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const inv = await invoiceService.getById(btn.dataset.pdf);
      if (inv) {
        const { generatePDF } = await import('../services/pdf-service.js');
        await generatePDF(inv, 'classic');
        showToast('PDF generado', 'success');
      }
    });
  });
}
