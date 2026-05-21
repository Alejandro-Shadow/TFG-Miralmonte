// ============================================
// Automalize - Verifacti API Service
// POST https://api.verifacti.com/verifactu/create
// GET  https://api.verifacti.com/verifactu/status?uuid=...
// ============================================

const API_BASE = 'https://api.verifacti.com';
const API_KEY = 'vf_test_DHBBf+OlF54eJRfw9SqnU9bWRpHHE5Tqknfw8odWaT8=';

const HEADERS = {
  'Content-Type': 'application/json',
  'Accept': 'application/json',
  'Authorization': `Bearer ${API_KEY}`,
};

function formatDateDMY(isoDate) {
  const d = new Date(isoDate);
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  return `${day}-${month}-${year}`;
}

function mapInvoiceToBody(invoice) {
  const hasRecipientNif = !!invoice.receptor_cif_nif;

  const body = {
    serie: invoice.serie || 'FAC',
    numero: String(invoice.numero_factura),
    fecha_expedicion: formatDateDMY(invoice.fecha_emision),
    tipo_factura: hasRecipientNif ? 'F1' : 'F2',
    descripcion: invoice.descripcion_general || 'Factura',
    importe_total: String(parseFloat(invoice.total_factura).toFixed(2)),
    lineas: [
      {
        base_imponible: String(parseFloat(invoice.subtotal_sin_iva).toFixed(2)),
        tipo_impositivo: String(invoice.porcentaje_iva ?? 21),
        cuota_repercutida: String(parseFloat(invoice.importe_iva).toFixed(2)),
      },
    ],
  };

  if (hasRecipientNif) {
    body.nif = invoice.receptor_cif_nif;
    body.nombre = invoice.receptor_nombre || 'Cliente';
  }

  return body;
}

export const verifactuService = {
  async create(invoice) {
    const body = mapInvoiceToBody(invoice);

    const res = await fetch(`${API_BASE}/verifactu/create`, {
      method: 'POST',
      headers: HEADERS,
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const err = await res.text();
      throw new Error(`Error Verifactu (${res.status}): ${err}`);
    }

    const data = await res.json();
    // Normalize QR field — API may return it under different keys
    data.resolvedQr = data.qr || data.qr_code || data.codigo_qr || data.qrCode || null;
    return data;
  },

  async getStatus(uuid) {
    const res = await fetch(`${API_BASE}/verifactu/status?uuid=${encodeURIComponent(uuid)}`, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'Authorization': `Bearer ${API_KEY}`,
      },
    });

    if (!res.ok) {
      const err = await res.text();
      throw new Error(`Error estado Verifactu (${res.status}): ${err}`);
    }

    return await res.json();
  },

  // Polls every 10s, max ~2 minutes. Calls onUpdate(attempt, total) each tick.
  async pollStatus(uuid, onUpdate) {
    const MAX = 12;
    const INTERVAL = 10_000;

    for (let attempt = 1; attempt <= MAX; attempt++) {
      onUpdate(attempt, MAX);
      const status = await this.getStatus(uuid);

      // When processing is done the API returns a url / enlace field
      const url = status.url || status.enlace || status.pdf_url || status.link || null;
      const isDone = url || status.estado === 'aceptada' || status.estado === 'correcta' || status.status === 'completed';

      if (isDone) return { ...status, resolvedUrl: url };

      if (attempt < MAX) await new Promise(r => setTimeout(r, INTERVAL));
    }

    throw new Error('Tiempo de espera agotado. Verifactu no respondió en 2 minutos.');
  },
};
