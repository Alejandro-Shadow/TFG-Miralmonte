// ============================================
// FacturApp - Main Entry Point
// ============================================

import { router } from './utils/router.js';
import { renderSidebar } from './components/sidebar.js';
import { renderNavbar, updateNavbarTitle } from './components/navbar.js';
import { authService } from './services/auth-service.js';
import { invoiceService } from './services/invoice-service.js';
import { initDemoUser } from './utils/init-demo.js';

// Pages
import { renderLogin } from './pages/login.js';
import { renderDashboard } from './pages/dashboard.js';
import { renderInvoices } from './pages/invoices.js';
import { renderCreateInvoice, renderEditInvoice } from './pages/create-invoice.js';
import { renderViewInvoice } from './pages/view-invoice.js';
import { renderScanQR } from './pages/scan-qr.js';

// Initialize App
function initApp() {
  // Check if user is authenticated
  const clienteId = authService.getClienteId();
  if (!clienteId) {
    renderLogin();
    return;
  }

  // Set context for invoice service (using hardcoded emisor for demo)
  invoiceService.setContext(clienteId, 1);

  // Render layout components
  renderSidebar();
  renderNavbar();

  // Setup routes
  router
    .on('dashboard', () => {
      updateNavbarTitle('Dashboard');
      renderDashboard();
    })
    .on('invoices', () => {
      updateNavbarTitle('Facturas');
      renderInvoices();
    })
    .on('create-invoice', () => {
      updateNavbarTitle('Nueva Factura');
      renderCreateInvoice();
    })
    .on('edit-invoice', (params) => {
      updateNavbarTitle('Editar Factura');
      renderEditInvoice(params);
    })
    .on('view-invoice', (params) => {
      updateNavbarTitle('Ver Factura');
      renderViewInvoice(params);
    })
    .on('scan-qr', () => {
      updateNavbarTitle('Escanear QR');
      renderScanQR();
    });

  // Start router
  router.start();
  router.navigate('dashboard');
}

// Boot
document.addEventListener('DOMContentLoaded', async () => {
  await initDemoUser();
  initApp();
});
