// ============================================
// FacturApp - Ticket/Invoice Text Parser
// Extracts structured data from OCR/PDF text
// ============================================

/**
 * Parse raw text from a ticket/invoice into structured invoice data
 */
export function parseTicketText(text) {
  const lines = text.split('\n').map(l => l.trim()).filter(Boolean);

  return {
    vendorName: extractVendorName(lines),
    vendorNif: extractNIF(text),
    vendorAddress: extractAddress(lines),
    date: extractDate(text),
    total: extractTotal(text),
    subtotal: extractSubtotal(text),
    iva: extractIVA(text),
    ivaRate: extractIVARate(text),
    items: extractLineItems(lines),
    rawText: text,
  };
}

/**
 * Vendor name is usually in the first few non-empty lines
 */
function extractVendorName(lines) {
  // Skip very short lines (often just symbols) and look for a business name
  for (let i = 0; i < Math.min(lines.length, 5); i++) {
    const line = lines[i];
    // Skip lines that are just numbers, dates, or very short
    if (line.length < 3) continue;
    if (/^\d+[\/\-]\d+[\/\-]\d+$/.test(line)) continue;
    if (/^[\d\s\.\,\-\+\*]+$/.test(line)) continue;
    // This is likely the business name
    return line;
  }
  return '';
}

/**
 * Extract NIF/CIF (Spanish tax ID) patterns
 */
function extractNIF(text) {
  // NIF: letter + 8 digits, or 8 digits + letter
  // CIF: letter + 8 digits (starting with A,B,C,D,E,F,G,H,J,N,P,Q,R,S,U,V,W)
  const patterns = [
    /\b([A-HJ-NP-SUVW]\d{7}[A-J0-9])\b/i,          // CIF
    /\b(\d{8}[A-Z])\b/i,                              // NIF personal
    /\b([XYZKLM]\d{7}[A-Z])\b/i,                      // NIE
    /(?:NIF|CIF|N\.I\.F|C\.I\.F)[:\s]*([A-Z0-9]{9})/i,// Labeled NIF/CIF
    /(?:NIF|CIF)[:\s]*([A-Z]\d{8})/i,
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) return match[1].toUpperCase();
  }
  return '';
}

/**
 * Extract date from text
 */
function extractDate(text) {
  const patterns = [
    // DD/MM/YYYY or DD-MM-YYYY
    /(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})/,
    // DD/MM/YY
    /(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2})\b/,
    // YYYY-MM-DD (ISO)
    /(\d{4})-(\d{2})-(\d{2})/,
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) {
      let [, a, b, c] = match;
      // ISO format
      if (a.length === 4) return `${a}-${b.padStart(2, '0')}-${c.padStart(2, '0')}`;
      // 2-digit year
      if (c.length === 2) c = (parseInt(c) > 50 ? '19' : '20') + c;
      return `${c}-${b.padStart(2, '0')}-${a.padStart(2, '0')}`;
    }
  }
  return new Date().toISOString().split('T')[0];
}

/**
 * Extract total amount
 */
function extractTotal(text) {
  const patterns = [
    /TOTAL\s*(?:A\s*PAGAR)?[\s:€]*(\d+[.,]\d{2})/i,
    /TOTAL[\s:€]*(\d+[.,]\d{2})/i,
    /IMPORTE\s*TOTAL[\s:€]*(\d+[.,]\d{2})/i,
    /TOTAL\s*FACTURA[\s:€]*(\d+[.,]\d{2})/i,
    /A\s*PAGAR[\s:€]*(\d+[.,]\d{2})/i,
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) return parseSpanishNumber(match[1]);
  }

  // Fallback: find the largest number that looks like a price
  const amounts = [...text.matchAll(/(\d+[.,]\d{2})\s*€?/g)]
    .map(m => parseSpanishNumber(m[1]))
    .filter(n => n > 0);

  return amounts.length > 0 ? Math.max(...amounts) : 0;
}

/**
 * Extract subtotal (base imponible)
 */
function extractSubtotal(text) {
  const patterns = [
    /BASE\s*(?:IMPONIBLE)?[\s:€]*(\d+[.,]\d{2})/i,
    /SUBTOTAL[\s:€]*(\d+[.,]\d{2})/i,
    /NETO[\s:€]*(\d+[.,]\d{2})/i,
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) return parseSpanishNumber(match[1]);
  }
  return 0;
}

/**
 * Extract IVA amount
 */
function extractIVA(text) {
  const patterns = [
    /IVA\s*(?:\d+%)?[\s:€]*(\d+[.,]\d{2})/i,
    /I\.V\.A\.?\s*[\s:€]*(\d+[.,]\d{2})/i,
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) return parseSpanishNumber(match[1]);
  }
  return 0;
}

/**
 * Extract IVA rate percentage
 */
function extractIVARate(text) {
  const patterns = [
    /IVA\s*(\d+)\s*%/i,
    /I\.V\.A\.?\s*(\d+)\s*%/i,
    /(\d+)\s*%\s*IVA/i,
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) return parseInt(match[1]);
  }
  return 21; // Default Spanish IVA
}

/**
 * Extract individual line items from ticket
 */
function extractLineItems(lines) {
  const items = [];
  // Look for lines with a price pattern at the end
  const pricePattern = /^(.+?)\s+(\d+(?:[.,]\d+)?)\s*[xX*]\s*(\d+[.,]\d{2})\s*€?$/;
  const simplePricePattern = /^(.+?)\s+(\d+[.,]\d{2})\s*€?\s*$/;

  for (const line of lines) {
    // Try quantity × price pattern: "Café con leche  2 x 1,50"
    let match = line.match(pricePattern);
    if (match) {
      items.push({
        description: match[1].trim(),
        quantity: parseSpanishNumber(match[2]),
        price: parseSpanishNumber(match[3]),
      });
      continue;
    }

    // Try simple price pattern: "Café con leche  1,50"
    match = line.match(simplePricePattern);
    if (match) {
      const desc = match[1].trim();
      // Skip lines that are totals/subtotals
      if (/^(TOTAL|BASE|IVA|SUBTOTAL|NETO|CAMBIO|EFECTIVO|TARJETA|VISA)/i.test(desc)) continue;
      if (desc.length < 2) continue;
      items.push({
        description: desc,
        quantity: 1,
        price: parseSpanishNumber(match[2]),
      });
    }
  }

  return items;
}

/**
 * Extract address (usually follow the vendor name)
 */
function extractAddress(lines) {
  // Common address keywords
  const keywords = ['C/', 'CALLE', 'AVDA', 'AVENIDA', 'PLAZA', 'PL.', 'CTRA', 'CARRETERA', 'VIA'];
  
  for (let i = 0; i < Math.min(lines.length, 8); i++) {
    const line = lines[i].toUpperCase();
    if (keywords.some(k => line.includes(k)) || /\d{5}/.test(line)) {
      return lines[i];
    }
  }
  return '';
}

/**
 * Parse Spanish number format (1.234,56 → 1234.56)
 */
function parseSpanishNumber(str) {
  if (!str) return 0;
  // Remove thousands separator (.) and convert decimal comma to dot
  const cleaned = str.replace(/\./g, '').replace(',', '.');
  return parseFloat(cleaned) || 0;
}
