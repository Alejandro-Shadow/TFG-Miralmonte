// ============================================
// FacturApp - QR Service
// ============================================

/**
 * Initialize QR scanner on a container element using html5-qrcode
 */
export async function initQrScanner(containerId, onSuccess, onError) {
  const { Html5Qrcode } = await import('html5-qrcode');
  const scanner = new Html5Qrcode(containerId);

  try {
    await scanner.start(
      { facingMode: 'environment' },
      {
        fps: 10,
        qrbox: { width: 250, height: 250 },
        aspectRatio: 1,
      },
      (decodedText) => {
        onSuccess(decodedText);
      },
      (errorMessage) => {
        // Ignore scan errors (no QR found is normal)
      }
    );
  } catch (err) {
    if (onError) onError(err);
  }

  return scanner;
}

/**
 * Stop QR scanner
 */
export async function stopQrScanner(scanner) {
  if (scanner) {
    try {
      await scanner.stop();
      scanner.clear();
    } catch (e) {
      // Scanner might already be stopped
    }
  }
}

/**
 * Scan QR from an image file
 */
export async function scanQrFromFile(file) {
  const { Html5Qrcode } = await import('html5-qrcode');
  const scanner = new Html5Qrcode('qr-temp-scanner');

  try {
    const result = await scanner.scanFile(file, true);
    return result;
  } catch (err) {
    throw new Error('No se encontró un código QR válido en la imagen');
  }
}

/**
 * Parse QR data and try to extract invoice information.
 * Supports JSON format and TBAI/Verifactu QR URL format.
 */
export function parseQrData(rawData) {
  // Try JSON first
  try {
    const parsed = JSON.parse(rawData);
    if (parsed && typeof parsed === 'object') {
      return {
        type: 'json',
        data: normalizeInvoiceData(parsed),
        raw: rawData,
      };
    }
  } catch (e) {
    // Not JSON, try other formats
  }

  // Try URL format (Verifactu / TBAI style)
  if (rawData.startsWith('http')) {
    try {
      const url = new URL(rawData);
      const params = Object.fromEntries(url.searchParams.entries());
      return {
        type: 'url',
        data: normalizeInvoiceData(params),
        raw: rawData,
      };
    } catch (e) {
      // Not a valid URL
    }
  }

  // Try key=value format
  if (rawData.includes('=') || rawData.includes(';')) {
    const pairs = rawData.split(/[;\n]/).reduce((acc, pair) => {
      const [key, ...valueParts] = pair.split('=');
      if (key && valueParts.length) {
        acc[key.trim()] = valueParts.join('=').trim();
      }
      return acc;
    }, {});
    if (Object.keys(pairs).length > 0) {
      return {
        type: 'keyvalue',
        data: normalizeInvoiceData(pairs),
        raw: rawData,
      };
    }
  }

  // Plain text fallback
  return {
    type: 'text',
    data: { notes: rawData },
    raw: rawData,
  };
}

/**
 * Normalize various data formats to invoice structure
 */
function normalizeInvoiceData(data) {
  return {
    number: data.number || data.numero || data.nf || data.factura || '',
    date: data.date || data.fecha || data.f || '',
    receiver: {
      name: data.receiver_name || data.receptor || data.nombre || data.r || '',
      nif: data.receiver_nif || data.nif_receptor || data.cif || data.nif || '',
    },
    emitter: {
      name: data.emitter_name || data.emisor || data.e || '',
      nif: data.emitter_nif || data.nif_emisor || data.nife || '',
    },
    total: data.total || data.importe || data.i || '',
    notes: data.notes || data.notas || data.concepto || '',
  };
}
