// ============================================
// FacturApp - Main Entry Point
// ============================================

import { router } from './utils/router.js';
import { renderSidebar } from './components/sidebar.js';
import { renderNavbar, updateNavbarTitle } from './components/navbar.js';
import { authService } from './services/auth-service.js';
import { invoiceService } from './services/invoice-service.js';

// Pages
import { renderLogin } from './pages/login.js';
import { renderDashboard } from './pages/dashboard.js';
import { renderInvoices } from './pages/invoices.js';
import { renderCreateInvoice, renderEditInvoice } from './pages/create-invoice.js';
import { renderViewInvoice } from './pages/view-invoice.js';
import { renderScanQR } from './pages/scan-qr.js';

async function initApp() {
  const session = await authService.getSession();

  if (!session) {
    renderLogin();
    return;
  }

  const emisorId = session.user?.user_metadata?.id_emisor;
  if (!emisorId) {
    // Usuario autenticado pero sin emisor asignado
    document.getElementById('content').innerHTML = `
      <div style="max-width:500px;margin:100px auto;text-align:center;">
        <div class="card" style="padding:40px">
          <h2>Cuenta sin empresa asignada</h2>
          <p style="color:var(--text-secondary);margin:16px 0">
            Tu cuenta no tiene una empresa (emisor) asignada. Contacta con el administrador.
          </p>
          <p style="color:var(--text-muted);font-size:var(--text-sm)">Email: ${session.user.email}</p>
          <button class="btn btn-ghost" style="margin-top:20px" id="btn-logout">Cerrar Sesión</button>
        </div>
      </div>
    `;
    document.getElementById('btn-logout')?.addEventListener('click', async () => {
      await authService.logout();
      window.location.reload();
    });
    return;
  }

  invoiceService.setContext(session.user.id, emisorId);

  renderSidebar();
  renderNavbar();

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

  router.start();
  router.navigate('dashboard');
}

document.addEventListener('DOMContentLoaded', async () => {
  await initApp();
});
