// ============================================
// FacturApp - Scan QR Page
// ============================================

import { parseQrData } from '../services/qr-service.js';
import { router } from '../utils/router.js';
import { showToast } from '../components/toast.js';
import { invoiceService } from '../services/invoice-service.js';
import { DEFAULT_EMITTER } from '../utils/constants.js';
import { createEmptyLine, toInputDate } from '../utils/helpers.js';

let activeScanner = null;

export function renderScanQR() {
  // Cleanup any previous scanner
  cleanupScanner();

  const content = document.getElementById('content');

  content.innerHTML = `
    <div class="fade-in qr-scanner-container">
      <div class="page-header" style="justify-content:center;text-align:center">
        <div>
          <h1>📷 Escanear QR</h1>
          <p style="color:var(--text-secondary);margin-top:var(--space-2)">
            Escanea un código QR de una factura para importarla automáticamente
          </p>
        </div>
      </div>

      <!-- Scanner Mode Toggle -->
      <div class="card" style="margin-bottom:var(--space-6)">
        <div style="display:flex;gap:var(--space-3);justify-content:center">
          <button class="btn btn-primary" id="qr-camera-btn">📸 Usar Cámara</button>
          <button class="btn btn-ghost" id="qr-upload-btn">📁 Subir Imagen</button>
        </div>
      </div>

      <!-- Camera Scanner -->
      <div class="card" id="qr-camera-section" style="display:none">
        <h3 style="margin-bottom:var(--space-4);text-align:center">📸 Escáner de Cámara</h3>
        <div class="qr-reader-wrapper">
          <div id="qr-reader" style="width:100%"></div>
        </div>
        <div style="text-align:center;margin-top:var(--space-3)">
          <button class="btn btn-danger btn-sm" id="qr-stop-camera">⏹ Detener Cámara</button>
        </div>
      </div>

      <!-- Upload Scanner -->
      <div class="card" id="qr-upload-section" style="display:none">
        <h3 style="margin-bottom:var(--space-4);text-align:center">📁 Subir Imagen con QR</h3>
        <div class="qr-upload-area" id="qr-drop-zone">
          <div class="icon">📷</div>
          <p style="color:var(--text-secondary);margin-bottom:var(--space-4)">
            Arrastra una imagen aquí o haz clic para seleccionar
          </p>
          <input type="file" accept="image/*" id="qr-file-input" style="display:none" />
          <button class="btn btn-primary" id="qr-select-file">Seleccionar Imagen</button>
        </div>
      </div>

      <!-- Hidden temp element for file scanning -->
      <div id="qr-temp-scanner" style="display:none"></div>

      <!-- Result -->
      <div id="qr-result-section" style="display:none">
        <div class="qr-result card">
          <h3>✅ Código QR Detectado</h3>
          <div id="qr-result-content"></div>
          <div style="display:flex;gap:var(--space-3);margin-top:var(--space-6);">
            <button class="btn btn-primary" id="qr-create-invoice">➕ Crear Factura con estos datos</button>
            <button class="btn btn-ghost" id="qr-scan-another">🔄 Escanear Otro</button>
          </div>
        </div>
      </div>
    </div>
  `;

  // Camera button
  document.getElementById('qr-camera-btn').addEventListener('click', async () => {
    document.getElementById('qr-camera-section').style.display = 'block';
    document.getElementById('qr-upload-section').style.display = 'none';
    document.getElementById('qr-result-section').style.display = 'none';
    await startCamera();
  });

  // Upload button
  document.getElementById('qr-upload-btn').addEventListener('click', () => {
    document.getElementById('qr-camera-section').style.display = 'none';
    document.getElementById('qr-upload-section').style.display = 'block';
    document.getElementById('qr-result-section').style.display = 'none';
    cleanupScanner();
  });

  // Stop camera
  document.getElementById('qr-stop-camera').addEventListener('click', () => {
    cleanupScanner();
    document.getElementById('qr-camera-section').style.display = 'none';
  });

  // File select
  document.getElementById('qr-select-file').addEventListener('click', () => {
    document.getElementById('qr-file-input').click();
  });

  document.getElementById('qr-file-input').addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (file) {
      await scanFromFile(file);
    }
  });

  // Drag & drop
  const dropZone = document.getElementById('qr-drop-zone');
  dropZone.addEventListener('dragover', (e) => {
    e.preventDefault();
    dropZone.style.borderColor = 'var(--primary-400)';
    dropZone.style.background = 'rgba(99, 102, 241, 0.05)';
  });
  dropZone.addEventListener('dragleave', () => {
    dropZone.style.borderColor = '';
    dropZone.style.background = '';
  });
  dropZone.addEventListener('drop', async (e) => {
    e.preventDefault();
    dropZone.style.borderColor = '';
    dropZone.style.background = '';
    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith('image/')) {
      await scanFromFile(file);
    } else {
      showToast('Por favor, sube una imagen', 'warning');
    }
  });
}

async function startCamera() {
  try {
    const { Html5Qrcode } = await import('html5-qrcode');
    activeScanner = new Html5Qrcode('qr-reader');

    await activeScanner.start(
      { facingMode: 'environment' },
      {
        fps: 10,
        qrbox: { width: 250, height: 250 },
      },
      (decodedText) => {
        handleQrResult(decodedText);
        cleanupScanner();
        document.getElementById('qr-camera-section').style.display = 'none';
      },
      () => {} // Ignore scan misses
    );
  } catch (err) {
    showToast('No se pudo acceder a la cámara. Intenta subir una imagen.', 'warning');
    document.getElementById('qr-camera-section').style.display = 'none';
    document.getElementById('qr-upload-section').style.display = 'block';
  }
}

async function scanFromFile(file) {
  try {
    const { Html5Qrcode } = await import('html5-qrcode');
    const scanner = new Html5Qrcode('qr-temp-scanner');
    const result = await scanner.scanFile(file, true);
    handleQrResult(result);
  } catch (err) {
    showToast('No se encontró un código QR válido en la imagen', 'error');
  }
}

let lastParsedData = null;

function handleQrResult(rawData) {
  const parsed = parseQrData(rawData);
  lastParsedData = parsed;

  const resultSection = document.getElementById('qr-result-section');
  const resultContent = document.getElementById('qr-result-content');

  resultSection.style.display = 'block';

  const dataEntries = Object.entries(flattenObject(parsed.data))
    .filter(([, v]) => v)
    .map(([k, v]) => `
      <div style="display:flex;justify-content:space-between;padding:var(--space-2) 0;border-bottom:1px solid var(--border-default)">
        <span style="color:var(--text-muted);font-size:var(--text-sm)">${k}</span>
        <span style="font-weight:500">${v}</span>
      </div>
    `)
    .join('');

  resultContent.innerHTML = `
    <div style="margin-top:var(--space-4);padding:var(--space-3);background:var(--bg-input);border-radius:var(--radius-md);font-family:var(--font-mono);font-size:var(--text-xs);word-break:break-all;margin-bottom:var(--space-4)">
      ${rawData}
    </div>
    <p style="font-size:var(--text-sm);color:var(--text-secondary);margin-bottom:var(--space-3)">
      Formato detectado: <strong>${parsed.type.toUpperCase()}</strong>
    </p>
    ${dataEntries || '<p style="color:var(--text-muted)">No se encontraron datos estructurados</p>'}
  `;

  // Create invoice button
  document.getElementById('qr-create-invoice').addEventListener('click', () => {
    createInvoiceFromQR(parsed.data);
  });

  // Scan another
  document.getElementById('qr-scan-another').addEventListener('click', () => {
    resultSection.style.display = 'none';
    document.getElementById('qr-file-input').value = '';
  });
}

function createInvoiceFromQR(data) {
  const invoiceData = {
    date: data.date || toInputDate(),
    dueDate: '',
    status: 'borrador',
    emitter: {
      name: data.emitter?.name || DEFAULT_EMITTER.name,
      nif: data.emitter?.nif || DEFAULT_EMITTER.nif,
      address: DEFAULT_EMITTER.address,
      city: DEFAULT_EMITTER.city,
      postalCode: DEFAULT_EMITTER.postalCode,
      email: DEFAULT_EMITTER.email,
    },
    receiver: {
      name: data.receiver?.name || '',
      nif: data.receiver?.nif || '',
      address: '',
      city: '',
      postalCode: '',
      email: '',
    },
    lines: [
      {
        ...createEmptyLine(),
        description: data.notes || 'Servicio escaneado desde QR',
        quantity: 1,
        price: parseFloat(data.total) || 0,
      },
    ],
    notes: `Importada desde QR - ${data.notes || ''}`.trim(),
    template: 'classic',
  };

  const created = invoiceService.create(invoiceData);
  showToast('Factura creada desde QR ✅', 'success');
  router.navigate('edit-invoice', { id: created.id });
}

function cleanupScanner() {
  if (activeScanner) {
    try {
      activeScanner.stop();
      activeScanner.clear();
    } catch (e) {
      // Already stopped
    }
    activeScanner = null;
  }
}

function flattenObject(obj, prefix = '') {
  const result = {};
  for (const [key, value] of Object.entries(obj)) {
    const newKey = prefix ? `${prefix}.${key}` : key;
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      Object.assign(result, flattenObject(value, newKey));
    } else {
      result[newKey] = value;
    }
  }
  return result;
}
