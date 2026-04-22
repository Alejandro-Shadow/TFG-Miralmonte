// ============================================
// FacturApp - Dashboard Page
// ============================================

import { invoiceService } from '../services/invoice-service.js';
import { formatCurrency, formatDate, calculateInvoiceTotals } from '../utils/helpers.js';
import { router } from '../utils/router.js';

export function renderDashboard() {
  const content = document.getElementById('content');
  const stats = invoiceService.getStats();
  const invoices = invoiceService.getAll();
  const recent = invoices.slice(-5).reverse();

  content.innerHTML = `
    <div class="fade-in">
      <div class="page-header">
        <h1>Dashboard</h1>
        <div class="page-header-actions">
          <button class="btn btn-primary btn-lg" id="dash-new-invoice">
            <span>➕</span> Nueva Factura
          </button>
        </div>
      </div>

      <!-- Stats -->
      <div class="stats-grid">
        <div class="card card-hover stat-card slide-up" style="animation-delay: 0ms">
          <div class="stat-icon purple">📋</div>
          <div class="stat-info">
            <h3>${stats.total}</h3>
            <p>Total Facturas</p>
          </div>
        </div>

        <div class="card card-hover stat-card slide-up" style="animation-delay: 80ms">
          <div class="stat-icon yellow">📝</div>
          <div class="stat-info">
            <h3>${stats.drafts}</h3>
            <p>Borradores</p>
          </div>
        </div>

        <div class="card card-hover stat-card slide-up" style="animation-delay: 160ms">
          <div class="stat-icon green">✅</div>
          <div class="stat-info">
            <h3>${stats.emitted}</h3>
            <p>Emitidas</p>
          </div>
        </div>

        <div class="card card-hover stat-card slide-up" style="animation-delay: 240ms">
          <div class="stat-icon blue">💰</div>
          <div class="stat-info">
            <h3>${formatCurrency(stats.totalAmount)}</h3>
            <p>Importe Total</p>
          </div>
        </div>
      </div>

      <!-- Quick Actions -->
      <div class="card" style="margin-bottom: var(--space-8);">
        <h2 style="font-size: var(--text-lg); font-weight: 700; margin-bottom: var(--space-4);">⚡ Acciones Rápidas</h2>
        <div style="display: flex; gap: var(--space-3); flex-wrap: wrap;">
          <button class="btn btn-primary" id="dash-quick-create">➕ Crear Factura</button>
          <button class="btn btn-accent" id="dash-quick-scan">📷 Escanear QR</button>
          <button class="btn btn-ghost" id="dash-quick-export">📥 Exportar Todo</button>
        </div>
      </div>

      <!-- Recent Invoices -->
      <div class="recent-section">
        <h2>📄 Facturas Recientes</h2>
        ${recent.length > 0 ? renderRecentTable(recent) : renderEmptyState()}
      </div>
    </div>
  `;

  // Events
  document.getElementById('dash-new-invoice')?.addEventListener('click', () => router.navigate('create-invoice'));
  document.getElementById('dash-quick-create')?.addEventListener('click', () => router.navigate('create-invoice'));
  document.getElementById('dash-quick-scan')?.addEventListener('click', () => router.navigate('scan-qr'));
  document.getElementById('dash-quick-export')?.addEventListener('click', async () => {
    const { exportAllToExcel } = await import('../services/export-service.js');
    const { showToast } = await import('../components/toast.js');
    try {
      await exportAllToExcel(invoiceService.getAll());
      showToast('Exportación completada', 'success');
    } catch (e) {
      showToast('Error al exportar', 'error');
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
    const totals = calculateInvoiceTotals(inv.lines);
    const statusClass = inv.status === 'emitida' ? 'badge-emitted' : inv.status === 'anulada' ? 'badge-cancelled' : 'badge-draft';
    return `
      <tr class="recent-row" data-id="${inv.id}" style="cursor:pointer">
        <td><strong>${inv.number}</strong></td>
        <td>${inv.receiver?.name || '-'}</td>
        <td>${formatDate(inv.date)}</td>
        <td><span class="badge ${statusClass}">${inv.status}</span></td>
        <td style="text-align:right"><strong>${formatCurrency(totals.total)}</strong></td>
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
      <div class="empty-state-icon">📋</div>
      <h3>No hay facturas todavía</h3>
      <p>Crea tu primera factura para empezar a gestionar tu facturación</p>
      <button class="btn btn-primary" onclick="window.location.hash='#/create-invoice'">➕ Crear Factura</button>
    </div>
  `;
}
