// ============================================
// Automalize - Scan & Import Page
// Supports: QR codes, Ticket photos (OCR), PDFs
// ============================================

import { parseQrData } from '../services/qr-service.js';
import { extractTextFromFile } from '../services/ocr-service.js';
import { parseTicketText } from '../utils/ticket-parser.js';
import { router } from '../utils/router.js';
import { showToast } from '../components/toast.js';
import { invoiceService } from '../services/invoice-service.js';
import { DEFAULT_EMITTER } from '../utils/constants.js';
import { createEmptyLine, toInputDate, formatCurrency } from '../utils/helpers.js';
import { icons } from '../utils/icons.js';
import { supabase } from '../utils/supabase.js';

let activeScanner = null;

export function renderScanQR() {
  cleanupScanner();
  const content = document.getElementById('content');

  content.innerHTML = `
    <div class="fade-in scan-page">
      <div class="page-header" style="justify-content:center;text-align:center">
        <div>
          <h1>Importar Factura</h1>
          <p style="color:var(--text-secondary);margin-top:var(--space-2)">
            Importa datos de un QR, foto de ticket o archivo PDF
          </p>
        </div>
      </div>

      <!-- Mode Tabs -->
      <div class="scan-tabs card">
        <button class="scan-tab active" data-mode="qr">
          <span class="scan-tab-icon">${icons.scan}</span>
          <span class="scan-tab-label">Escanear QR</span>
        </button>
        <button class="scan-tab" data-mode="ticket">
          <span class="scan-tab-icon">${icons.camera}</span>
          <span class="scan-tab-label">Foto de Ticket</span>
        </button>
        <button class="scan-tab" data-mode="pdf">
          <span class="scan-tab-icon">${icons.fileDoc}</span>
          <span class="scan-tab-label">Archivo PDF</span>
        </button>
      </div>

      <!-- QR Mode -->
      <div class="scan-mode-panel" id="mode-qr">
        <div class="card" style="margin-bottom:var(--space-4)">
          <div style="display:flex;gap:var(--space-3);justify-content:center">
            <button class="btn btn-primary" id="qr-camera-btn"><span class="btn-icon-inline">${icons.camera}</span> Usar Cámara</button>
            <button class="btn btn-ghost" id="qr-upload-btn"><span class="btn-icon-inline">${icons.folder}</span> Subir Imagen QR</button>
          </div>
        </div>
        <div class="card" id="qr-camera-section" style="display:none">
          <h3 style="margin-bottom:var(--space-4);text-align:center">${icons.camera} Escáner de Cámara</h3>
          <div class="qr-reader-wrapper"><div id="qr-reader" style="width:100%"></div></div>
          <div style="text-align:center;margin-top:var(--space-3)">
            <button class="btn btn-danger btn-sm" id="qr-stop-camera"><span class="btn-icon-inline">${icons.stopCircle}</span> Detener</button>
          </div>
        </div>
        <div class="card" id="qr-upload-section" style="display:none">
          <div class="scan-drop-zone" id="qr-drop-zone">
            <div class="scan-drop-icon">${icons.upload}</div>
            <p>Arrastra una imagen con QR aquí</p>
            <input type="file" accept="image/*" id="qr-file-input" style="display:none" />
            <button class="btn btn-primary btn-sm" id="qr-select-file">Seleccionar Imagen</button>
          </div>
        </div>
        <div id="qr-temp-scanner" style="display:none"></div>
      </div>

      <!-- Ticket Mode -->
      <div class="scan-mode-panel" id="mode-ticket" style="display:none">
        <div class="card">
          <h3 style="margin-bottom:var(--space-2);display:flex;align-items:center;gap:var(--space-2)">${icons.camera} Foto de Ticket / Factura</h3>
          <p style="color:var(--text-muted);font-size:var(--text-sm);margin-bottom:var(--space-4)">
            Sube una foto de un ticket de compra o factura y extraeremos los datos automáticamente mediante OCR.
          </p>
          <div class="scan-drop-zone" id="ticket-drop-zone">
            <div class="scan-drop-icon">${icons.camera}</div>
            <p>Arrastra una foto del ticket o haz clic para seleccionar</p>
            <p style="font-size:var(--text-xs);color:var(--text-muted)">JPG, PNG, WebP — Máx. 10MB</p>
            <input type="file" accept="image/*" id="ticket-file-input" style="display:none" />
            <button class="btn btn-primary btn-sm" id="ticket-select-file">Seleccionar Foto</button>
          </div>
        </div>
      </div>

      <!-- PDF Mode -->
      <div class="scan-mode-panel" id="mode-pdf" style="display:none">
        <div class="card">
          <h3 style="margin-bottom:var(--space-2);display:flex;align-items:center;gap:var(--space-2)">${icons.fileDoc} Importar desde PDF</h3>
          <p style="color:var(--text-muted);font-size:var(--text-sm);margin-bottom:var(--space-4)">
            Sube un PDF de una factura o ticket y extraeremos el texto para generar la factura.
          </p>
          <div class="scan-drop-zone" id="pdf-drop-zone">
            <div class="scan-drop-icon">${icons.fileDoc}</div>
            <p>Arrastra un archivo PDF aquí o haz clic para seleccionar</p>
            <p style="font-size:var(--text-xs);color:var(--text-muted)">Archivos .pdf — Máx. 20MB</p>
            <input type="file" accept="application/pdf" id="pdf-file-input" style="display:none" />
            <button class="btn btn-primary btn-sm" id="pdf-select-file">Seleccionar PDF</button>
          </div>
        </div>
      </div>

      <!-- Processing indicator -->
      <div class="card" id="processing-section" style="display:none">
        <div style="text-align:center;padding:var(--space-8)">
          <div class="processing-spinner"></div>
          <h3 id="processing-title" style="margin-top:var(--space-4)">Procesando...</h3>
          <p id="processing-detail" style="color:var(--text-muted);font-size:var(--text-sm);margin-top:var(--space-2)">Extrayendo texto del documento</p>
          <div class="progress-bar-wrapper" style="margin-top:var(--space-4)">
            <div class="progress-bar" id="processing-progress" style="width:0%"></div>
          </div>
        </div>
      </div>

      <!-- Result Section -->
      <div id="scan-result-section" style="display:none"></div>
    </div>
  `;

  setupTabs();
  setupQRMode();
  setupTicketMode();
  setupPDFMode();
}

// ========================
// Tab Navigation
// ========================
function setupTabs() {
  document.querySelectorAll('.scan-tab').forEach((tab) => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('.scan-tab').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      document.querySelectorAll('.scan-mode-panel').forEach(p => p.style.display = 'none');
      document.getElementById(`mode-${tab.dataset.mode}`).style.display = 'block';
      document.getElementById('scan-result-section').style.display = 'none';
      document.getElementById('processing-section').style.display = 'none';
      cleanupScanner();
    });
  });
}

// ========================
// QR Mode
// ========================
function setupQRMode() {
  document.getElementById('qr-camera-btn').addEventListener('click', async () => {
    document.getElementById('qr-camera-section').style.display = 'block';
    document.getElementById('qr-upload-section').style.display = 'none';
    await startCamera();
  });

  document.getElementById('qr-upload-btn').addEventListener('click', () => {
    document.getElementById('qr-camera-section').style.display = 'none';
    document.getElementById('qr-upload-section').style.display = 'block';
    cleanupScanner();
  });

  document.getElementById('qr-stop-camera').addEventListener('click', () => {
    cleanupScanner();
    document.getElementById('qr-camera-section').style.display = 'none';
  });

  document.getElementById('qr-select-file').addEventListener('click', () => {
    document.getElementById('qr-file-input').click();
  });

  document.getElementById('qr-file-input').addEventListener('change', async (e) => {
    if (e.target.files[0]) await scanQRFromFile(e.target.files[0]);
  });

  setupDropZone('qr-drop-zone', 'image/*', async (file) => await scanQRFromFile(file));
}

async function startCamera() {
  try {
    const { Html5Qrcode } = await import('html5-qrcode');
    activeScanner = new Html5Qrcode('qr-reader');
    await activeScanner.start(
      { facingMode: 'environment' },
      { fps: 10, qrbox: { width: 250, height: 250 } },
      (decodedText) => {
        handleQrResult(decodedText);
        cleanupScanner();
        document.getElementById('qr-camera-section').style.display = 'none';
      },
      () => {}
    );
  } catch {
    showToast('No se pudo acceder a la cámara', 'warning');
    document.getElementById('qr-camera-section').style.display = 'none';
    document.getElementById('qr-upload-section').style.display = 'block';
  }
}

async function scanQRFromFile(file) {
  try {
    const { Html5Qrcode } = await import('html5-qrcode');
    const scanner = new Html5Qrcode('qr-temp-scanner');
    const result = await scanner.scanFile(file, true);
    handleQrResult(result);
  } catch {
    showToast('No se encontró un código QR válido en la imagen', 'error');
  }
}

function handleQrResult(rawData) {
  const parsed = parseQrData(rawData);
  showResult({
    source: 'QR',
    vendorName: parsed.data.emitter?.name || '',
    vendorNif: parsed.data.emitter?.nif || '',
    date: parsed.data.date || toInputDate(),
    total: parseFloat(parsed.data.total) || 0,
    subtotal: 0,
    iva: 0,
    ivaRate: 21,
    items: [],
    description: parsed.data.notes || 'Servicio escaneado desde QR',
    rawText: rawData,
  });
}

// ========================
// Ticket (Image OCR) Mode
// ========================
function setupTicketMode() {
  document.getElementById('ticket-select-file').addEventListener('click', () => {
    document.getElementById('ticket-file-input').click();
  });

  document.getElementById('ticket-file-input').addEventListener('change', async (e) => {
    if (e.target.files[0]) await processFile(e.target.files[0], 'Ticket');
  });

  setupDropZone('ticket-drop-zone', 'image/*', (file) => processFile(file, 'Ticket'));
}

// ========================
// PDF Mode
// ========================
function setupPDFMode() {
  document.getElementById('pdf-select-file').addEventListener('click', () => {
    document.getElementById('pdf-file-input').click();
  });

  document.getElementById('pdf-file-input').addEventListener('change', async (e) => {
    if (e.target.files[0]) await processFile(e.target.files[0], 'PDF');
  });

  setupDropZone('pdf-drop-zone', 'application/pdf', (file) => processFile(file, 'PDF'));
}

// ========================
// Shared: Process File (OCR/PDF)
// ========================
async function processFile(file, source) {
  const processing = document.getElementById('processing-section');
  const progress = document.getElementById('processing-progress');
  const title = document.getElementById('processing-title');
  const detail = document.getElementById('processing-detail');

  processing.style.display = 'block';
  document.getElementById('scan-result-section').style.display = 'none';
  title.textContent = source === 'PDF' ? 'Extrayendo texto del PDF...' : 'Procesando imagen con OCR...';
  detail.textContent = source === 'PDF'
    ? 'Leyendo las páginas del documento'
    : 'Esto puede tardar unos segundos dependiendo de la calidad de la imagen';
  progress.style.width = '0%';

  try {
    const text = await extractTextFromFile(file, (pct) => {
      progress.style.width = pct + '%';
    });

    progress.style.width = '100%';
    title.textContent = 'Analizando contenido...';

    // Small delay so user sees 100%
    await new Promise(r => setTimeout(r, 300));
    processing.style.display = 'none';

    if (!text || text.trim().length < 5) {
      showToast('No se pudo extraer texto del documento. Prueba con una imagen más nítida.', 'warning');
      return;
    }

    const parsed = parseTicketText(text);

    showResult({
      source,
      vendorName: parsed.vendorName,
      vendorNif: parsed.vendorNif,
      date: parsed.date,
      total: parsed.total,
      subtotal: parsed.subtotal,
      iva: parsed.iva,
      ivaRate: parsed.ivaRate,
      items: parsed.items,
      description: parsed.items.map(i => i.description).join(', ') || 'Importado desde ' + source,
      rawText: text,
    });
  } catch (err) {
    processing.style.display = 'none';
    showToast('Error procesando el archivo: ' + err.message, 'error');
  }
}

// ========================
// Shared: Show Result
// ========================
function showResult(data) {
  const section = document.getElementById('scan-result-section');
  section.style.display = 'block';

  const itemsHtml = data.items.length > 0
    ? `<div class="result-items">
        <h4 style="font-size:var(--text-sm);color:var(--text-muted);margin-bottom:var(--space-2)">ARTÍCULOS DETECTADOS</h4>
        <table class="data-table" style="font-size:var(--text-sm)">
          <thead><tr><th>Descripción</th><th style="text-align:right">Uds.</th><th style="text-align:right">Precio</th></tr></thead>
          <tbody>${data.items.map(i => `
            <tr>
              <td>${i.description}</td>
              <td style="text-align:right">${i.quantity}</td>
              <td style="text-align:right">${formatCurrency(i.price)}</td>
            </tr>
          `).join('')}</tbody>
        </table>
      </div>`
    : '';

  section.innerHTML = `
    <div class="card slide-up" style="margin-top:var(--space-6)">
      <div style="display:flex;align-items:center;gap:var(--space-2);margin-bottom:var(--space-4)">
        <span style="color:var(--success-400)">${icons.checkCircle}</span>
        <h3>Datos Extraídos — ${data.source}</h3>
      </div>

      <div class="result-grid">
        <div class="result-field">
          <span class="result-label">Proveedor</span>
          <span class="result-value">${data.vendorName || '—'}</span>
        </div>
        <div class="result-field">
          <span class="result-label">NIF/CIF</span>
          <span class="result-value">${data.vendorNif || '—'}</span>
        </div>
        <div class="result-field">
          <span class="result-label">Fecha</span>
          <span class="result-value">${data.date}</span>
        </div>
        <div class="result-field">
          <span class="result-label">Total</span>
          <span class="result-value" style="font-size:var(--text-lg);font-weight:700;color:var(--primary-400)">${formatCurrency(data.total)}</span>
        </div>
        ${data.subtotal ? `<div class="result-field"><span class="result-label">Base Imponible</span><span class="result-value">${formatCurrency(data.subtotal)}</span></div>` : ''}
        ${data.iva ? `<div class="result-field"><span class="result-label">IVA (${data.ivaRate}%)</span><span class="result-value">${formatCurrency(data.iva)}</span></div>` : ''}
      </div>

      ${itemsHtml}

      <!-- Raw text toggle -->
      <details style="margin-top:var(--space-4)">
        <summary style="cursor:pointer;color:var(--text-muted);font-size:var(--text-xs)">Ver texto extraído</summary>
        <pre style="margin-top:var(--space-2);padding:var(--space-3);background:var(--bg-input);border-radius:var(--radius-md);font-size:var(--text-xs);max-height:200px;overflow-y:auto;white-space:pre-wrap;word-break:break-word">${data.rawText}</pre>
      </details>

      <div style="display:flex;gap:var(--space-3);margin-top:var(--space-6)">
        <button class="btn btn-primary" id="result-create-invoice">
          <span class="btn-icon-inline">${icons.plus}</span> Crear Factura con estos datos
        </button>
        <button class="btn btn-ghost" id="result-scan-another">
          <span class="btn-icon-inline">${icons.refreshCw}</span> Importar Otro
        </button>
      </div>
    </div>
  `;

  document.getElementById('result-create-invoice').addEventListener('click', () => {
    createInvoiceFromData(data);
  });

  document.getElementById('result-scan-another').addEventListener('click', () => {
    section.style.display = 'none';
    // Reset file inputs
    document.querySelectorAll('input[type="file"]').forEach(i => i.value = '');
  });
}

// ========================
// Create Invoice from extracted data
// ========================
async function createInvoiceFromData(data) {
  const subtotal = data.subtotal || (data.total / (1 + data.ivaRate / 100));
  const iva = data.iva || (data.total - subtotal);

  try {
    let id_cliente = null;

    // 1. Intentar encontrar o crear el cliente basado en el NIF/Nombre extraído
    if (data.vendorNif || data.vendorName) {
      // Buscar cliente existente por NIF
      const { data: existingClient } = await supabase
        .from('clientesEmisor')
        .select('id')
        .eq('cif_nif_nie', data.vendorNif)
        .limit(1)
        .single();

      if (existingClient) {
        id_cliente = existingClient.id;
      } else {
        // Crear nuevo cliente si no existe
        const { data: newClient, error: createError } = await supabase
          .from('clientesEmisor')
          .insert([{
            nombre: data.vendorName || 'Proveedor Desconocido',
            cif_nif_nie: data.vendorNif || '',
            direccion_completa: data.vendorAddress || '',
          }])
          .select()
          .single();

        if (!createError && newClient) {
          id_cliente = newClient.id;
        }
      }
    }

    const invoiceData = {
      fecha_emision: data.date || toInputDate(),
      tipo_factura: 'factura',
      id_cliente: id_cliente,
      descripcion_general: data.description || `Importado desde ${data.source}`,
      notas: `Importado automáticamente desde ${data.source}`,
      subtotal_sin_iva: Math.round(subtotal * 100) / 100,
      porcentaje_iva: data.ivaRate || 21,
      importe_iva: Math.round(iva * 100) / 100,
      total_factura: Math.round(data.total * 100) / 100,
    };

    const created = await invoiceService.create(invoiceData);
    showToast(`Factura creada y vinculada a ${data.vendorName || 'cliente'}`, 'success');
    
    if (created) {
      router.navigate('edit-invoice', { id: created.id });
    } else {
      router.navigate('invoices');
    }
  } catch (err) {
    console.error('Error creating invoice from scan:', err);
    showToast('Error al crear la factura: ' + err.message, 'error');
  }
}

// ========================
// Shared Utilities
// ========================
function setupDropZone(zoneId, acceptType, onFile) {
  const zone = document.getElementById(zoneId);
  if (!zone) return;

  zone.addEventListener('dragover', (e) => {
    e.preventDefault();
    zone.classList.add('drag-over');
  });

  zone.addEventListener('dragleave', () => {
    zone.classList.remove('drag-over');
  });

  zone.addEventListener('drop', (e) => {
    e.preventDefault();
    zone.classList.remove('drag-over');
    const file = e.dataTransfer.files[0];
    if (file) {
      onFile(file);
    } else {
      showToast('Archivo no válido', 'warning');
    }
  });
}

function cleanupScanner() {
  if (activeScanner) {
    try { activeScanner.stop(); activeScanner.clear(); } catch {}
    activeScanner = null;
  }
}
