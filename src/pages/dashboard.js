// ============================================
// FacturApp - Dashboard Page
// ============================================

import { invoiceService } from '../services/invoice-service.js';
import { formatCurrency, formatDate, calculateInvoiceTotals } from '../utils/helpers.js';
import { router } from '../utils/router.js';
import { icons } from '../utils/icons.js';

export async function renderDashboard() {
  const content = document.getElementById('content');
  content.innerHTML = '<div class="loading">Cargando...</div>';

  const stats = await invoiceService.getStats();
  const invoices = await invoiceService.getAll();
  const recent = invoices.slice(-5).reverse();

  content.innerHTML = `
    <div class="fade-in">
      <div class="page-header">
        <h1>Dashboard</h1>
        <div class="page-header-actions">
          <button class="btn btn-primary btn-lg" id="dash-new-invoice">
            <span class="btn-icon-inline">${icons.plus}</span> Nueva Factura
          </button>
        </div>
      </div>

      <!-- Stats -->
      <div class="stats-grid">
        <div class="card card-hover stat-card slide-up" style="animation-delay: 0ms;cursor:pointer" data-stat-filter="all">
          <div class="stat-icon purple">${icons.fileText}</div>
          <div class="stat-info">
            <h3>${stats.total}</h3>
            <p>Total Facturas</p>
          </div>
        </div>

        <div class="card card-hover stat-card slide-up" style="animation-delay: 80ms;cursor:pointer" data-stat-filter="drafts">
          <div class="stat-icon yellow">${icons.fileEdit}</div>
          <div class="stat-info">
            <h3>${stats.drafts}</h3>
            <p>Borradores</p>
          </div>
        </div>

        <div class="card card-hover stat-card slide-up" style="animation-delay: 160ms;cursor:pointer" data-stat-filter="emitted">
          <div class="stat-icon green">${icons.checkCircle}</div>
          <div class="stat-info">
            <h3>${stats.emitted}</h3>
            <p>Emitidas</p>
          </div>
        </div>

        <div class="card card-hover stat-card slide-up" style="animation-delay: 240ms;cursor:pointer" data-stat-filter="all">
          <div class="stat-icon blue">${icons.euro}</div>
          <div class="stat-info">
            <h3>${formatCurrency(stats.totalAmount)}</h3>
            <p>Importe Total</p>
          </div>
        </div>
      </div>

      <!-- Quick Actions -->
      <div class="card" style="margin-bottom: var(--space-8);">
        <h2 style="font-size: var(--text-lg); font-weight: 700; margin-bottom: var(--space-4); display:flex; align-items:center; gap:var(--space-2);">
          <span class="btn-icon-inline">${icons.zap}</span> Acciones Rápidas
        </h2>
        <div style="display: flex; gap: var(--space-3); flex-wrap: wrap;">
          <button class="btn btn-primary" id="dash-quick-create"><span class="btn-icon-inline">${icons.plus}</span> Crear Factura</button>
          <button class="btn btn-accent" id="dash-quick-scan"><span class="btn-icon-inline">${icons.scan}</span> Escanear QR</button>
          <button class="btn btn-ghost" id="dash-quick-export"><span class="btn-icon-inline">${icons.download}</span> Exportar Todo</button>
        </div>
      </div>

      <!-- Recent Invoices -->
      <div class="recent-section">
        <h2 style="display:flex;align-items:center;gap:var(--space-2)">
          <span class="btn-icon-inline">${icons.clock}</span> Facturas Recientes
        </h2>
        ${recent.length > 0 ? renderRecentTable(recent) : renderEmptyState()}
      </div>
    </div>
  `;

  // Stat card clicks
  content.querySelectorAll('[data-stat-filter]').forEach((card) => {
    card.addEventListener('click', () => {
      router.navigate('invoices', { filter: card.dataset.statFilter });
    });
  });

  // Events
  document.getElementById('dash-new-invoice')?.addEventListener('click', () => router.navigate('create-invoice'));
  document.getElementById('dash-quick-create')?.addEventListener('click', () => router.navigate('create-invoice'));
  document.getElementById('dash-quick-scan')?.addEventListener('click', () => router.navigate('scan-qr'));
  document.getElementById('dash-quick-export')?.addEventListener('click', async () => {
    try {
      const { showExportOptionsModal } = await import('../components/export-modal.js');
      await showExportOptionsModal();
    } catch (e) {
      console.error('Error al abrir el modal de exportación:', e);
      const { showToast } = await import('../components/toast.js');
      showToast('Error al abrir las opciones de exportación', 'error');
    }
  });

  // Row clicks
  content.querySelectorAll('.recent-row').forEach((row) => {
    row.addEventListener('click', () => {
      router.navigate('view-invoice', { id: row.dataset.id });
    });
  });
}

function renderRecentTable(invoices) {
  const rows = invoices.map((inv) => {
    const total = parseFloat(inv.total_factura) || 0;
    const statusClass = inv.estado_verifactu === 'emitida' ? 'badge-emitted' : inv.estado_pago === 'anulada' ? 'badge-cancelled' : 'badge-draft';
    const statusText = inv.estado_verifactu === 'emitida' ? 'Emitida' : inv.estado_pago === 'anulada' ? 'Anulada' : 'Borrador';
    return `
      <tr class="recent-row" data-id="${inv.id}" style="cursor:pointer">
        <td><strong>FAC-${inv.numero_factura}</strong></td>
        <td>${inv.descripcion_general || '-'}</td>
        <td>${formatDate(inv.fecha_emision)}</td>
        <td><span class="badge ${statusClass}">${statusText}</span></td>
        <td style="text-align:right"><strong>${formatCurrency(total)}</strong></td>
      </tr>
    `;
  }).join('');

  return `
    <div class="table-wrapper card" style="margin-top: var(--space-4);">
      <table class="data-table">
        <thead>
          <tr>
            <th>Nº Factura</th>
            <th>Receptor</th>
            <th>Fecha</th>
            <th>Estado</th>
            <th style="text-align:right">Total</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
    </div>
  `;
}

function renderEmptyState() {
  return `
    <div class="card empty-state">
      <div class="empty-state-icon">${icons.fileText}</div>
      <h3>No hay facturas todavía</h3>
      <p>Crea tu primera factura para empezar a gestionar tu facturación</p>
      <button class="btn btn-primary" onclick="window.location.hash='#/create-invoice'">
        <span class="btn-icon-inline">${icons.plus}</span> Crear Factura
      </button>
    </div>
  `;
}
