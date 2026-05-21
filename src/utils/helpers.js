// ============================================
// Automalize - Helpers / Utilities
// ============================================

/**
 * Format a number as currency (EUR)
 */
export function formatCurrency(amount) {
  return new Intl.NumberFormat('es-ES', {
    style: 'currency',
    currency: 'EUR',
  }).format(amount);
}

/**
 * Format a date string to local format
 */
export function formatDate(dateStr) {
  if (!dateStr) return '-';
  const d = new Date(dateStr);
  return d.toLocaleDateString('es-ES', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

/**
 * Format date for input[type=date]
 */
export function toInputDate(dateStr) {
  if (!dateStr) {
    const now = new Date();
    return now.toISOString().split('T')[0];
  }
  return new Date(dateStr).toISOString().split('T')[0];
}

/**
 * Generate a unique ID
 */
export function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
}

/**
 * Generate next invoice number in format FAC-YYYY-NNNN
 */
export function generateInvoiceNumber(currentNumber) {
  const year = new Date().getFullYear();
  const num = String(currentNumber).padStart(4, '0');
  return `FAC-${year}-${num}`;
}

/**
 * Calculate line total (price * quantity)
 */
export function calculateLineTotal(quantity, price) {
  return parseFloat(quantity || 0) * parseFloat(price || 0);
}

/**
 * Calculate invoice totals from lines
 */
export function calculateInvoiceTotals(lines) {
  let subtotal = 0;
  let totalIva = 0;

  lines.forEach((line) => {
    const lineTotal = calculateLineTotal(line.quantity, line.price);
    const iva = lineTotal * (parseFloat(line.ivaRate || 21) / 100);
    subtotal += lineTotal;
    totalIva += iva;
  });

  return {
    subtotal: Math.round(subtotal * 100) / 100,
    totalIva: Math.round(totalIva * 100) / 100,
    total: Math.round((subtotal + totalIva) * 100) / 100,
  };
}

/**
 * Debounce function
 */
export function debounce(fn, delay = 300) {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), delay);
  };
}

/**
 * Sanitize HTML to prevent XSS
 */
export function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

/**
 * Download a blob as file
 */
export function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Download a string as file
 */
export function downloadString(content, filename, mimeType = 'text/plain') {
  const blob = new Blob([content], { type: mimeType });
  downloadBlob(blob, filename);
}

/**
 * Create an empty invoice line
 */
export function createEmptyLine() {
  return {
    id: generateId(),
    description: '',
    quantity: 1,
    price: 0,
    ivaRate: 21,
  };
}

/**
 * Create a new empty invoice
 */
export function createEmptyInvoice() {
  return {
    id: generateId(),
    number: '',
    date: toInputDate(),
    dueDate: '',
    status: 'borrador',
    emitter: {
      name: '',
      nif: '',
      address: '',
      city: '',
      postalCode: '',
      email: '',
    },
    receiver: {
      name: '',
      nif: '',
      address: '',
      city: '',
      postalCode: '',
      email: '',
    },
    lines: [createEmptyLine()],
    notes: '',
    template: 'classic',
  };
}
