// ============================================
// Automalize - Facturación por Voz
// ============================================

import { icons } from '../utils/icons.js';

const TELEGRAM_BOT_URL = 'https://web.telegram.org/k/#@facturacionAutomaticaBot';

export function renderVoiceInvoice() {
  const content = document.getElementById('content');

  content.innerHTML = `
    <div class="fade-in" style="max-width:680px;margin:0 auto">
      <div class="page-header" style="justify-content:center;text-align:center;margin-bottom:var(--space-8)">
        <div>
          <div style="display:flex;justify-content:center;margin-bottom:var(--space-4)">
            <div style="
              width:80px;height:80px;border-radius:50%;
              background:var(--primary-500);
              display:flex;align-items:center;justify-content:center;
              box-shadow:0 0 30px color-mix(in srgb, var(--primary-500) 40%, transparent);
            ">
              <span style="color:#fff;display:flex">${icons.mic}</span>
            </div>
          </div>
          <h1 style="font-size:var(--text-2xl);margin-bottom:var(--space-2)">Facturación por Voz</h1>
          <p style="color:var(--text-secondary);font-size:var(--text-base)">
            Dicta tu factura en lenguaje natural y el bot la generará automáticamente
          </p>
        </div>
      </div>

      <!-- Pasos -->
      <div class="card" style="margin-bottom:var(--space-6)">
        <h3 style="margin-bottom:var(--space-5);font-size:var(--text-base);color:var(--text-secondary);text-transform:uppercase;letter-spacing:.05em">Cómo funciona</h3>
        <div style="display:flex;flex-direction:column;gap:var(--space-5)">
          ${step(1, icons.externalLink, 'Abre el bot de Telegram', 'Pulsa el botón de abajo para ir directamente al bot de facturación automática.')}
          ${step(2, icons.mic, 'Dicta o escribe tu factura', 'Describe la factura en lenguaje natural: cliente, concepto, importe y fecha.')}
          ${step(3, icons.fileText, 'El bot la genera por ti', 'Recibirás la factura lista para revisar y guardar en tu cuenta.')}
        </div>
      </div>

      <!-- Ejemplo -->
      <div class="card" style="margin-bottom:var(--space-6);background:var(--bg-input);border:1px dashed var(--border-color)">
        <p style="font-size:var(--text-xs);color:var(--text-muted);text-transform:uppercase;letter-spacing:.05em;margin-bottom:var(--space-3)">Ejemplo de mensaje</p>
        <p style="color:var(--text-primary);font-style:italic;line-height:1.6">
          "Factura a Construcciones López SL por trabajos de fontanería realizados el 20 de mayo, importe total 850 euros con IVA incluido"
        </p>
      </div>

      <!-- Botón CTA -->
      <div style="text-align:center">
        <a
          href="${TELEGRAM_BOT_URL}"
          target="_blank"
          rel="noopener noreferrer"
          class="btn btn-primary"
          style="font-size:var(--text-base);padding:var(--space-4) var(--space-8);gap:var(--space-3);display:inline-flex;align-items:center"
        >
          <span style="display:flex">${icons.mic}</span>
          Abrir Bot de Facturación
          <span style="display:flex;opacity:.8">${icons.externalLink}</span>
        </a>
        <p style="margin-top:var(--space-3);color:var(--text-muted);font-size:var(--text-xs)">
          Se abrirá Telegram en una nueva pestaña
        </p>
      </div>
    </div>
  `;
}

function step(num, icon, title, description) {
  return `
    <div style="display:flex;gap:var(--space-4);align-items:flex-start">
      <div style="
        min-width:36px;height:36px;border-radius:50%;
        background:var(--primary-500);color:#fff;
        display:flex;align-items:center;justify-content:center;
        font-weight:700;font-size:var(--text-sm);
        flex-shrink:0;
      ">${num}</div>
      <div>
        <div style="display:flex;align-items:center;gap:var(--space-2);margin-bottom:var(--space-1)">
          <span style="color:var(--primary-400);display:flex">${icon}</span>
          <strong style="font-size:var(--text-base)">${title}</strong>
        </div>
        <p style="color:var(--text-secondary);font-size:var(--text-sm);margin:0">${description}</p>
      </div>
    </div>
  `;
}
