// ============================================
// FacturApp - Sidebar Component
// ============================================

import { router } from '../utils/router.js';
import { authService } from '../services/auth-service.js';
import { STORAGE_KEYS } from '../utils/constants.js';

export function renderSidebar() {
  const sidebar = document.getElementById('sidebar');

  sidebar.innerHTML = `
    <div class="sidebar-header">
      <div class="sidebar-logo">
        <div class="sidebar-logo-icon">F</div>
        <span class="sidebar-logo-text">FacturApp</span>
      </div>
    </div>
    <nav class="sidebar-nav">
      <span class="sidebar-section-title">Principal</span>
      <a class="sidebar-link" data-route="dashboard" id="nav-dashboard">
        <span class="icon">📊</span>
        <span>Dashboard</span>
      </a>
      <a class="sidebar-link" data-route="invoices" id="nav-invoices">
        <span class="icon">📋</span>
        <span>Facturas</span>
      </a>

      <span class="sidebar-section-title">Acciones</span>
      <a class="sidebar-link" data-route="create-invoice" id="nav-create">
        <span class="icon">➕</span>
        <span>Nueva Factura</span>
      </a>
      <a class="sidebar-link" data-route="scan-qr" id="nav-scan">
        <span class="icon">📷</span>
        <span>Escanear QR</span>
      </a>
    </nav>
    <div class="sidebar-footer">
      <a class="sidebar-link" id="nav-theme-toggle">
        <span class="icon" id="theme-icon">🌙</span>
        <span id="theme-label">Modo Oscuro</span>
      </a>
      <a class="sidebar-link" id="nav-logout">
        <span class="icon">🚪</span>
        <span>Cerrar Sesión</span>
      </a>
    </div>
  `;

  // Navigation
  sidebar.querySelectorAll('.sidebar-link[data-route]').forEach((link) => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      router.navigate(link.dataset.route);
      // Close mobile sidebar
      sidebar.classList.remove('open');
    });
  });

  // Theme toggle
  document.getElementById('nav-theme-toggle').addEventListener('click', () => {
    const current = document.documentElement.getAttribute('data-theme');
    const newTheme = current === 'light' ? 'dark' : 'light';
    document.documentElement.setAttribute('data-theme', newTheme);
    localStorage.setItem(STORAGE_KEYS.THEME, newTheme);
    updateThemeUI(newTheme);
  });

  // Logout
  document.getElementById('nav-logout').addEventListener('click', async () => {
    await authService.logout();
    window.location.reload();
  });

  // Apply saved theme
  const savedTheme = localStorage.getItem(STORAGE_KEYS.THEME) || 'dark';
  document.documentElement.setAttribute('data-theme', savedTheme);
  updateThemeUI(savedTheme);
}

function updateThemeUI(theme) {
  const icon = document.getElementById('theme-icon');
  const label = document.getElementById('theme-label');
  if (icon) icon.textContent = theme === 'light' ? '☀️' : '🌙';
  if (label) label.textContent = theme === 'light' ? 'Modo Claro' : 'Modo Oscuro';
}
