// ============================================
// FacturApp - Navbar Component
// ============================================

import { icons } from '../utils/icons.js';

const PAGE_TITLES = {
  dashboard: 'Dashboard',
  invoices: 'Facturas',
  'create-invoice': 'Nueva Factura',
  'edit-invoice': 'Editar Factura',
  'view-invoice': 'Detalle de Factura',
  'scan-qr': 'Escanear QR',
};

export function renderNavbar() {
  const navbar = document.getElementById('navbar');

  navbar.innerHTML = `
    <div style="display:flex;align-items:center;gap:var(--space-4)">
      <button class="hamburger" id="hamburger-btn">${icons.menu}</button>
      <h1 class="navbar-title" id="navbar-page-title">Dashboard</h1>
    </div>
    <div class="navbar-actions">
      <div class="navbar-search">
        <span class="navbar-search-icon">${icons.search}</span>
        <input type="text" placeholder="Buscar facturas..." id="global-search" />
      </div>
    </div>
  `;

  // Hamburger menu
  document.getElementById('hamburger-btn').addEventListener('click', () => {
    document.getElementById('sidebar').classList.toggle('open');
  });

  // Search
  document.getElementById('global-search').addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      const query = e.target.value.trim();
      if (query) {
        import('../utils/router.js').then(({ router }) => {
          router.navigate('invoices', { search: query });
        });
      }
    }
  });

  // Close sidebar on outside click (mobile)
  document.addEventListener('click', (e) => {
    const sidebar = document.getElementById('sidebar');
    const hamburger = document.getElementById('hamburger-btn');
    if (
      sidebar.classList.contains('open') &&
      !sidebar.contains(e.target) &&
      !hamburger.contains(e.target)
    ) {
      sidebar.classList.remove('open');
    }
  });
}

/**
 * Update the navbar title based on current route
 */
export function updateNavbarTitle(route) {
  const title = document.getElementById('navbar-page-title');
  if (title) {
    title.textContent = PAGE_TITLES[route] || 'FacturApp';
  }
}
