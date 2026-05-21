// ============================================
// Automalize - Modal Component
// ============================================

import { icons } from '../utils/icons.js';

/**
 * Show a confirmation modal
 */
export function showModal({ title, message, html, confirmText = 'Confirmar', cancelText = 'Cancelar', onConfirm, onCancel, type = 'default' }) {
  const overlay = document.getElementById('modal-overlay');
  overlay.classList.remove('hidden');

  const confirmClass = type === 'danger' ? 'btn-danger' : 'btn-primary';
  const body = html
    ? `<div style="margin-bottom:var(--space-4)">${html}</div>`
    : `<p style="color: var(--text-secondary); line-height: 1.6;">${message}</p>`;

  overlay.innerHTML = `
    <div class="modal fade-in">
      <div class="modal-header">
        <h2>${title}</h2>
        <button class="btn-icon modal-close-btn" id="modal-close">${icons.x}</button>
      </div>
      ${body}
      <div class="modal-footer">
        <button class="btn btn-ghost" id="modal-cancel">${cancelText}</button>
        <button class="btn ${confirmClass}" id="modal-confirm">${confirmText}</button>
      </div>
    </div>
  `;

  const close = () => {
    overlay.classList.add('hidden');
    overlay.innerHTML = '';
  };

  document.getElementById('modal-confirm').addEventListener('click', async () => {
    if (onConfirm) await onConfirm();
    close();
  });

  document.getElementById('modal-cancel').addEventListener('click', () => {
    close();
    if (onCancel) onCancel();
  });

  document.getElementById('modal-close').addEventListener('click', () => {
    close();
    if (onCancel) onCancel();
  });

  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) {
      close();
      if (onCancel) onCancel();
    }
  });
}
