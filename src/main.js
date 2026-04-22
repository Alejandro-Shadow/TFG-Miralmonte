// ============================================
// FacturApp - Main Entry Point
// ============================================

import { router } from './utils/router.js';
import { renderSidebar } from './components/sidebar.js';
import { renderNavbar, updateNavbarTitle } from './components/navbar.js';

// Pages
import { renderDashboard } from './pages/dashboard.js';
import { renderInvoices } from './pages/invoices.js';
import { renderCreateInvoice, renderEditInvoice } from './pages/create-invoice.js';
import { renderViewInvoice } from './pages/view-invoice.js';
import { renderScanQR } from './pages/scan-qr.js';

// Initialize App
function initApp() {
  // Render layout components
  renderSidebar();
  renderNavbar();

  // Setup routes
  router
    .on('dashboard', () => {
      updateNavbarTitle('dashboard');
      renderDashboard();
    })
    .on('invoices', () => {
      updateNavbarTitle('invoices');
      renderInvoices();
    })
    .on('create-invoice', () => {
      updateNavbarTitle('create-invoice');
      renderCreateInvoice();
    })
    .on('edit-invoice', (params) => {
      updateNavbarTitle('edit-invoice');
      renderEditInvoice(params);
    })
    .on('view-invoice', (params) => {
      updateNavbarTitle('view-invoice');
      renderViewInvoice(params);
    })
    .on('scan-qr', () => {
      updateNavbarTitle('scan-qr');
      renderScanQR();
    });

  // Start router
  router.start();
}

// Boot
document.addEventListener('DOMContentLoaded', initApp);
