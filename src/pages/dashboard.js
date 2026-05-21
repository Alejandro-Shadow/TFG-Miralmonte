// ============================================
// Automalize - Dashboard Page
// ============================================

import { invoiceService } from '../services/invoice-service.js';
import { formatCurrency, formatDate, calculateInvoiceTotals } from '../utils/helpers.js';
import { router } from '../utils/router.js';
import { icons } from '../utils/icons.js';
import Chart from 'chart.js/auto';

let revenueChartInstance = null;
let clientChartInstance = null;

export async function renderDashboard() {
  const content = document.getElementById('content');
  content.innerHTML = '<div class="loading">Cargando...</div>';

  const stats = await invoiceService.getStats();
  const invoices = await invoiceService.getAll();
  const recent = invoices.slice(-5).reverse();

  // Advanced Analytics Calculations
  let cashFlow = 0;
  let pendingAmount = 0;
  let pendingCount = 0;
  let clientTotals = {};
  
  // For predictions
  let monthlyTotals = {};
  
  invoices.forEach(inv => {
    const total = parseFloat(inv.total_factura) || 0;
    
    // Group by month
    const date = new Date(inv.fecha_emision);
    const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    if (!monthlyTotals[monthKey]) monthlyTotals[monthKey] = 0;
    monthlyTotals[monthKey] += total;
    
    // Client totals
    const clientName = inv.receptor_nombre || 'Desconocido';
    if (!clientTotals[clientName]) clientTotals[clientName] = 0;
    clientTotals[clientName] += total;
    
    // Pending and Cashflow
    // Para simplificar, si no es 'emitida' la consideramos borrador. Si quisieramos estado 'pagada', lo usaríamos aquí.
    if (!inv.estado_verifactu) {
      pendingAmount += total;
      pendingCount++;
    } else if (inv.estado_verifactu === 'emitida' && inv.estado_pago !== 'anulada') {
      cashFlow += total; 
    }
  });

  const uniqueClients = Object.keys(clientTotals).length;
  const avgPerClient = uniqueClients > 0 ? (cashFlow / uniqueClients) : 0;
  
  // Future prediction (simple moving average of last 3 months)
  const sortedMonths = Object.keys(monthlyTotals).sort();
  let predictedNextMonth = 0;
  if (sortedMonths.length > 0) {
    const last3Months = sortedMonths.slice(-3);
    const sumLast3 = last3Months.reduce((acc, m) => acc + monthlyTotals[m], 0);
    predictedNextMonth = sumLast3 / last3Months.length;
  }

  content.innerHTML = `
    <div class="fade-in">
      <div class="page-header">
        <h1>Dashboard y Analítica</h1>
        <div class="page-header-actions">
          <button class="btn btn-ghost" id="dash-export-report">
            <span class="btn-icon-inline">${icons.download}</span> Informe PDF
          </button>
          <button class="btn btn-primary btn-lg" id="dash-new-invoice">
            <span class="btn-icon-inline">${icons.plus}</span> Nueva Factura
          </button>
        </div>
      </div>

      <!-- Advanced KPIs -->
      <div class="stats-grid" style="margin-bottom: var(--space-6);">
        <div class="card card-hover stat-card slide-up" style="animation-delay: 0ms;cursor:pointer" data-stat-filter="emitted">
          <div class="stat-icon purple">${icons.euro}</div>
          <div class="stat-info">
            <h3>${formatCurrency(cashFlow)}</h3>
            <p>Flujo de Caja (Emitido)</p>
          </div>
        </div>

        <div class="card card-hover stat-card slide-up" style="animation-delay: 80ms;cursor:pointer" data-stat-filter="drafts">
          <div class="stat-icon yellow">${icons.clock}</div>
          <div class="stat-info">
            <h3>${formatCurrency(pendingAmount)}</h3>
            <p>Borradores (${pendingCount})</p>
          </div>
        </div>

        <div class="card stat-card slide-up" style="animation-delay: 160ms;">
          <div class="stat-icon blue">${icons.users}</div>
          <div class="stat-info">
            <h3>${formatCurrency(avgPerClient)}</h3>
            <p>Media por Cliente</p>
          </div>
        </div>

        <div class="card stat-card slide-up" style="animation-delay: 240ms;">
          <div class="stat-icon green">${icons.trendingUp}</div>
          <div class="stat-info">
            <h3>${formatCurrency(predictedNextMonth)}</h3>
            <p>Proyección Próx. Mes</p>
          </div>
        </div>
      </div>

      <!-- Charts Section -->
      <div class="charts-grid slide-up" style="animation-delay: 300ms;">
        <div class="card">
          <h2 style="font-size: var(--text-lg); font-weight: 700; margin-bottom: var(--space-4);">Evolución de Ingresos</h2>
          <div class="chart-container">
            <canvas id="revenueChart"></canvas>
          </div>
        </div>
        <div class="card">
          <h2 style="font-size: var(--text-lg); font-weight: 700; margin-bottom: var(--space-4);">Top Clientes</h2>
          <div class="chart-container">
            <canvas id="clientChart"></canvas>
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

  // Use a small timeout to allow the DOM to render the canvas elements before Chart.js accesses them
  setTimeout(() => {
    initCharts(monthlyTotals, clientTotals);
  }, 50);

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

  document.getElementById('dash-export-report')?.addEventListener('click', async () => {
    await exportAnalyticsReport(cashFlow, pendingAmount, avgPerClient, predictedNextMonth);
  });

  // Row clicks
  content.querySelectorAll('.recent-row').forEach((row) => {
    row.addEventListener('click', () => {
      router.navigate('view-invoice', { id: row.dataset.id });
    });
  });
}

function initCharts(monthlyTotals, clientTotals) {
  // Destroy previous instances if they exist
  if (revenueChartInstance) revenueChartInstance.destroy();
  if (clientChartInstance) clientChartInstance.destroy();

  const ctxRev = document.getElementById('revenueChart');
  const ctxClient = document.getElementById('clientChart');
  
  if (!ctxRev || !ctxClient) return;

  const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
  const textColor = isDark ? '#e2e8f0' : '#1e293b';
  const gridColor = isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)';

  Chart.defaults.color = textColor;

  // Revenue Line Chart
  const months = Object.keys(monthlyTotals).sort();
  const revData = months.map(m => monthlyTotals[m]);
  
  revenueChartInstance = new Chart(ctxRev, {
    type: 'line',
    data: {
      labels: months.length ? months : ['Sin datos'],
      datasets: [{
        label: 'Ingresos (€)',
        data: revData.length ? revData : [0],
        borderColor: '#6366f1',
        backgroundColor: 'rgba(99, 102, 241, 0.1)',
        borderWidth: 3,
        fill: true,
        tension: 0.4,
        pointBackgroundColor: '#6366f1'
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false }
      },
      scales: {
        x: { grid: { color: gridColor } },
        y: { grid: { color: gridColor }, beginAtZero: true }
      }
    }
  });

  // Client Doughnut Chart
  const sortedClients = Object.entries(clientTotals)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5); // Top 5
  
  const clientLabels = sortedClients.length ? sortedClients.map(c => c[0].substring(0, 15) + (c[0].length > 15 ? '...' : '')) : ['Sin datos'];
  const clientData = sortedClients.length ? sortedClients.map(c => c[1]) : [1];

  clientChartInstance = new Chart(ctxClient, {
    type: 'doughnut',
    data: {
      labels: clientLabels,
      datasets: [{
        data: clientData,
        backgroundColor: [
          '#6366f1', '#10b981', '#f59e0b', '#3b82f6', '#8b5cf6'
        ],
        borderWidth: 0,
        hoverOffset: 4
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { position: 'right' }
      },
      cutout: '70%'
    }
  });
}

async function exportAnalyticsReport(cashFlow, pending, avg, projected) {
  try {
    const { jsPDF } = await import('jspdf');
    const { formatCurrency } = await import('../utils/helpers.js');
    const { showToast } = await import('../components/toast.js');
    
    showToast('Generando informe analítico...', 'info');
    
    const doc = new jsPDF();
    
    doc.setFontSize(22);
    doc.setTextColor(30, 41, 59);
    doc.text('Informe de Analítica Avanzada', 14, 20);
    
    doc.setFontSize(11);
    doc.setTextColor(100, 116, 139);
    doc.text(`Fecha de generación: ${new Date().toLocaleDateString()}`, 14, 28);
    
    // KPIs
    doc.setFontSize(14);
    doc.setTextColor(30, 41, 59);
    doc.text('KPIs Financieros', 14, 40);
    
    doc.setFontSize(12);
    doc.text(`Flujo de Caja (Emitido): ${formatCurrency(cashFlow)}`, 14, 50);
    doc.text(`Pendiente (Borradores): ${formatCurrency(pending)}`, 14, 58);
    doc.text(`Media por Cliente: ${formatCurrency(avg)}`, 14, 66);
    doc.text(`Proyección Próximo Mes: ${formatCurrency(projected)}`, 14, 74);
    
    // Charts Images
    const revCanvas = document.getElementById('revenueChart');
    const clientCanvas = document.getElementById('clientChart');
    
    if (revCanvas) {
      const revImg = revCanvas.toDataURL('image/png', 1.0);
      doc.text('Evolución de Ingresos', 14, 90);
      doc.addImage(revImg, 'PNG', 14, 95, 180, 80);
    }
    
    if (clientCanvas) {
      const clientImg = clientCanvas.toDataURL('image/png', 1.0);
      doc.addPage();
      doc.text('Top Clientes por Facturación', 14, 20);
      doc.addImage(clientImg, 'PNG', 14, 25, 160, 100);
    }
    
    doc.save('Informe_Analitica_Automalize.pdf');
    showToast('Informe exportado con éxito', 'success');
  } catch (error) {
    console.error('Error exporting report:', error);
    const { showToast } = await import('../components/toast.js');
    showToast('Error al generar el informe', 'error');
  }
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
