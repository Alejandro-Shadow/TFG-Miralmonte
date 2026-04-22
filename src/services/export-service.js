// ============================================
// FacturApp - Export Service (XML, Excel, CSV)
// ============================================

import { downloadString, downloadBlob, formatDate, calculateInvoiceTotals } from '../utils/helpers.js';

/**
 * Export invoice to XML format
 */
export function exportToXML(invoice) {
  const totals = calculateInvoiceTotals(invoice.lines);

  const linesXml = invoice.lines
    .map(
      (line) => `
      <Linea>
        <Descripcion>${escXml(line.description)}</Descripcion>
        <Cantidad>${line.quantity}</Cantidad>
        <PrecioUnitario>${line.price}</PrecioUnitario>
        <TipoIVA>${line.ivaRate}</TipoIVA>
        <Total>${(line.quantity * line.price).toFixed(2)}</Total>
      </Linea>`
    )
    .join('');

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<Factura>
  <Cabecera>
    <NumeroFactura>${escXml(invoice.number)}</NumeroFactura>
    <FechaEmision>${invoice.date}</FechaEmision>
    <FechaVencimiento>${invoice.dueDate || ''}</FechaVencimiento>
    <Estado>${invoice.status}</Estado>
  </Cabecera>
  <Emisor>
    <Nombre>${escXml(invoice.emitter?.name || '')}</Nombre>
    <NIF>${escXml(invoice.emitter?.nif || '')}</NIF>
    <Direccion>${escXml(invoice.emitter?.address || '')}</Direccion>
    <Ciudad>${escXml(invoice.emitter?.city || '')}</Ciudad>
    <CodigoPostal>${escXml(invoice.emitter?.postalCode || '')}</CodigoPostal>
    <Email>${escXml(invoice.emitter?.email || '')}</Email>
  </Emisor>
  <Receptor>
    <Nombre>${escXml(invoice.receiver?.name || '')}</Nombre>
    <NIF>${escXml(invoice.receiver?.nif || '')}</NIF>
    <Direccion>${escXml(invoice.receiver?.address || '')}</Direccion>
    <Ciudad>${escXml(invoice.receiver?.city || '')}</Ciudad>
    <CodigoPostal>${escXml(invoice.receiver?.postalCode || '')}</CodigoPostal>
    <Email>${escXml(invoice.receiver?.email || '')}</Email>
  </Receptor>
  <Lineas>${linesXml}
  </Lineas>
  <Totales>
    <BaseImponible>${totals.subtotal.toFixed(2)}</BaseImponible>
    <TotalIVA>${totals.totalIva.toFixed(2)}</TotalIVA>
    <TotalFactura>${totals.total.toFixed(2)}</TotalFactura>
  </Totales>
  <Notas>${escXml(invoice.notes || '')}</Notas>
</Factura>`;

  downloadString(xml, `${invoice.number}.xml`, 'application/xml');
}

/**
 * Export invoice to CSV format
 */
export function exportToCSV(invoice) {
  const totals = calculateInvoiceTotals(invoice.lines);
  const separator = ';';
  const headers = ['Descripción', 'Cantidad', 'Precio Unitario', 'IVA (%)', 'Subtotal'];

  const rows = invoice.lines.map((line) => {
    const subtotal = (line.quantity * line.price).toFixed(2);
    return [
      `"${line.description}"`,
      line.quantity,
      line.price.toFixed(2),
      line.ivaRate,
      subtotal,
    ].join(separator);
  });

  // Add totals
  rows.push('');
  rows.push(['', '', '', 'Base Imponible', totals.subtotal.toFixed(2)].join(separator));
  rows.push(['', '', '', 'Total IVA', totals.totalIva.toFixed(2)].join(separator));
  rows.push(['', '', '', 'TOTAL', totals.total.toFixed(2)].join(separator));

  // Add header info
  const headerInfo = [
    `Factura: ${invoice.number}`,
    `Fecha: ${formatDate(invoice.date)}`,
    `Emisor: ${invoice.emitter?.name || ''}`,
    `Receptor: ${invoice.receiver?.name || ''}`,
    `Estado: ${invoice.status}`,
    '',
    headers.join(separator),
  ];

  const csv = [...headerInfo, ...rows].join('\n');
  // BOM for Excel compatibility
  downloadString('\uFEFF' + csv, `${invoice.number}.csv`, 'text/csv;charset=utf-8');
}

/**
 * Export invoice to Excel format
 */
export async function exportToExcel(invoice) {
  const XLSX = await import('xlsx');
  const totals = calculateInvoiceTotals(invoice.lines);

  // Invoice header data
  const headerData = [
    ['FACTURA', invoice.number],
    ['Fecha', formatDate(invoice.date)],
    ['Vencimiento', formatDate(invoice.dueDate)],
    ['Estado', invoice.status.toUpperCase()],
    [],
    ['EMISOR'],
    ['Nombre', invoice.emitter?.name || ''],
    ['NIF', invoice.emitter?.nif || ''],
    ['Dirección', invoice.emitter?.address || ''],
    ['Ciudad', invoice.emitter?.city || ''],
    [],
    ['RECEPTOR'],
    ['Nombre', invoice.receiver?.name || ''],
    ['NIF', invoice.receiver?.nif || ''],
    ['Dirección', invoice.receiver?.address || ''],
    ['Ciudad', invoice.receiver?.city || ''],
    [],
    ['LÍNEAS DE FACTURA'],
    ['Descripción', 'Cantidad', 'Precio Unitario', 'IVA (%)', 'Subtotal'],
  ];

  // Lines
  const lineData = invoice.lines.map((line) => [
    line.description,
    line.quantity,
    line.price,
    line.ivaRate,
    (line.quantity * line.price).toFixed(2),
  ]);

  // Totals
  const totalsData = [
    [],
    ['', '', '', 'Base Imponible', totals.subtotal.toFixed(2)],
    ['', '', '', 'Total IVA', totals.totalIva.toFixed(2)],
    ['', '', '', 'TOTAL', totals.total.toFixed(2)],
  ];

  const wsData = [...headerData, ...lineData, ...totalsData];
  const ws = XLSX.utils.aoa_to_sheet(wsData);

  // Column widths
  ws['!cols'] = [
    { wch: 30 },
    { wch: 12 },
    { wch: 15 },
    { wch: 10 },
    { wch: 15 },
  ];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Factura');

  const buffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  downloadBlob(blob, `${invoice.number}.xlsx`);
}

/**
 * Export multiple invoices as a summary Excel
 */
export async function exportAllToExcel(invoices) {
  const XLSX = await import('xlsx');

  const headers = ['Nº Factura', 'Fecha', 'Receptor', 'Estado', 'Base Imponible', 'IVA', 'Total'];
  const rows = invoices.map((inv) => {
    const totals = calculateInvoiceTotals(inv.lines);
    return [
      inv.number,
      formatDate(inv.date),
      inv.receiver?.name || '',
      inv.status,
      totals.subtotal.toFixed(2),
      totals.totalIva.toFixed(2),
      totals.total.toFixed(2),
    ];
  });

  const wsData = [headers, ...rows];
  const ws = XLSX.utils.aoa_to_sheet(wsData);
  ws['!cols'] = [
    { wch: 18 }, { wch: 12 }, { wch: 25 }, { wch: 12 },
    { wch: 15 }, { wch: 12 }, { wch: 15 },
  ];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Facturas');

  const buffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  downloadBlob(blob, `Facturas_${new Date().toISOString().split('T')[0]}.xlsx`);
}

// Escape XML special chars
function escXml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}
