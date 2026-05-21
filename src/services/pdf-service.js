// ============================================
// Automalize - PDF Service (jsPDF + templates)
// ============================================

import { calculateInvoiceTotals, formatDate, formatCurrency, downloadBlob } from '../utils/helpers.js';

/**
 * Generate PDF for an invoice using selected template
 */
export async function generatePDF(invoice, templateId = 'classic') {
  const jsPDFModule = await import('jspdf');
  const jsPDF = jsPDFModule.jsPDF || jsPDFModule.default;
  await import('jspdf-autotable');

  // Normalize Supabase fields to what templates expect
  const normalized = normalizeInvoice(invoice);

  const doc = new jsPDF();
  const totals = calculateInvoiceTotals(normalized.lines);

  switch (templateId) {
    case 'modern':
      renderModernTemplate(doc, normalized, totals);
      break;
    case 'minimal':
      renderMinimalTemplate(doc, normalized, totals);
      break;
    case 'classic':
    default:
      renderClassicTemplate(doc, normalized, totals);
      break;
  }

  doc.save(`${normalized.number}.pdf`);
}

export async function generatePDFBlob(invoice, templateId = 'classic') {
  const jsPDFModule = await import('jspdf');
  const jsPDF = jsPDFModule.jsPDF || jsPDFModule.default;
  await import('jspdf-autotable');

  const normalized = normalizeInvoice(invoice);
  const doc = new jsPDF();
  const totals = calculateInvoiceTotals(normalized.lines);

  switch (templateId) {
    case 'modern':
      renderModernTemplate(doc, normalized, totals);
      break;
    case 'minimal':
      renderMinimalTemplate(doc, normalized, totals);
      break;
    case 'classic':
    default:
      renderClassicTemplate(doc, normalized, totals);
      break;
  }

  return doc.output('blob');
}

/**
 * Normalize a Supabase invoice object to the format expected by PDF templates
 */
function normalizeInvoice(inv) {
  // If it already has .lines and .number, assume it's already normalized
  if (inv.lines && inv.number) return inv;

  const subtotal = parseFloat(inv.subtotal_sin_iva) || 0;
  const ivaRate = parseFloat(inv.porcentaje_iva) || 21;

  return {
    number: `FAC-${inv.numero_factura || 'XXXX'}`,
    date: inv.fecha_emision || new Date().toISOString(),
    dueDate: inv.fecha_vencimiento || '',
    status: inv.estado_verifactu || 'borrador',
    emitter: {
      name: inv.emisor_nombre || 'Mi Empresa S.L.',
      nif: inv.emisor_cif_nif || '',
      address: inv.emisor_direccion || '',
      city: inv.emisor_ciudad || '',
      postalCode: inv.emisor_cp || '',
      email: inv.emisor_email || '',
    },
    receiver: {
      name: inv.receptor_nombre || inv.descripcion_general || '-',
      nif: inv.receptor_cif_nif || '',
      address: inv.receptor_direccion || '',
      city: inv.receptor_ciudad || '',
      postalCode: inv.receptor_cp || '',
      email: inv.receptor_email || '',
    },
    lines: [
      {
        description: inv.descripcion_general || 'Servicio',
        quantity: 1,
        price: subtotal,
        ivaRate: ivaRate,
      },
    ],
    notes: inv.notas || '',
    verifactuQr:  inv.verifactu_qr  || null,
    verifactuUrl: inv.verifactu_url || null,
  };
}

// Añade el bloque QR de Verifactu al pie del documento
function renderVerifactuBlock(doc, invoice, startY) {
  if (!invoice.verifactuQr) return;

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const qrSize = 28;
  const margin = 20;

  // Si no hay espacio suficiente en la página actual, añadir nueva página
  let y = startY + 14;
  if (y + qrSize + 16 > pageHeight - 10) {
    doc.addPage();
    y = 20;
  }

  // Línea separadora
  doc.setDrawColor(200, 200, 200);
  doc.setLineWidth(0.4);
  doc.line(margin, y, pageWidth - margin, y);

  y += 8;

  // QR image
  doc.addImage(`data:image/png;base64,${invoice.verifactuQr}`, 'PNG', margin, y, qrSize, qrSize);

  // Texto al lado del QR
  const textX = margin + qrSize + 6;
  doc.setFontSize(7);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(80, 80, 80);
  doc.text('Factura verificable en la AEAT — Verifactu', textX, y + 5);

  doc.setFont('helvetica', 'normal');
  doc.setTextColor(120, 120, 120);
  doc.text('Escanea el código QR para verificar esta factura', textX, y + 11);
  doc.text('en la sede electrónica de la Agencia Tributaria.', textX, y + 16);

  if (invoice.verifactuUrl) {
    doc.setFontSize(6);
    doc.setTextColor(99, 102, 241);
    const urlText = invoice.verifactuUrl.length > 80
      ? invoice.verifactuUrl.substring(0, 77) + '...'
      : invoice.verifactuUrl;
    doc.text(urlText, textX, y + 23);
  }
}

// ======================
// Classic Template
// ======================
function renderClassicTemplate(doc, invoice, totals) {
  const pageWidth = doc.internal.pageSize.getWidth();

  // Header bar
  doc.setFillColor(49, 46, 129); // deep indigo
  doc.rect(0, 0, pageWidth, 40, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(22);
  doc.setFont('helvetica', 'bold');
  doc.text('FACTURA', 20, 25);

  doc.setFontSize(12);
  doc.setFont('helvetica', 'normal');
  doc.text(invoice.number, pageWidth - 20, 18, { align: 'right' });
  doc.setFontSize(10);
  doc.text(`Fecha: ${formatDate(invoice.date)}`, pageWidth - 20, 28, { align: 'right' });
  if (invoice.dueDate) {
    doc.text(`Vencimiento: ${formatDate(invoice.dueDate)}`, pageWidth - 20, 35, { align: 'right' });
  }

  // Status badge
  const statusColor = invoice.status === 'emitida' ? [16, 185, 129] : [245, 158, 11];
  doc.setFillColor(...statusColor);
  doc.roundedRect(20, 48, 30, 8, 2, 2, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(8);
  doc.text(invoice.status.toUpperCase(), 35, 53.5, { align: 'center' });

  // Emitter & Receiver
  doc.setTextColor(60, 60, 60);
  let y = 70;

  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(100, 100, 100);
  doc.text('EMISOR', 20, y);
  doc.text('RECEPTOR', pageWidth / 2 + 10, y);

  y += 6;
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(40, 40, 40);

  const emitter = invoice.emitter || {};
  const receiver = invoice.receiver || {};

  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text(emitter.name || '', 20, y);
  doc.text(receiver.name || '', pageWidth / 2 + 10, y);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  y += 6;
  doc.text(`NIF: ${emitter.nif || ''}`, 20, y);
  doc.text(`NIF: ${receiver.nif || ''}`, pageWidth / 2 + 10, y);
  y += 5;
  doc.text(emitter.address || '', 20, y);
  doc.text(receiver.address || '', pageWidth / 2 + 10, y);
  y += 5;
  doc.text(`${emitter.postalCode || ''} ${emitter.city || ''}`, 20, y);
  doc.text(`${receiver.postalCode || ''} ${receiver.city || ''}`, pageWidth / 2 + 10, y);
  y += 5;
  doc.text(emitter.email || '', 20, y);
  doc.text(receiver.email || '', pageWidth / 2 + 10, y);

  // Separator
  y += 10;
  doc.setDrawColor(200, 200, 200);
  doc.line(20, y, pageWidth - 20, y);

  // Lines table
  y += 5;
  const tableData = invoice.lines.map((line) => [
    line.description,
    line.quantity.toString(),
    formatCurrency(line.price),
    `${line.ivaRate}%`,
    formatCurrency(line.quantity * line.price),
  ]);

  doc.autoTable({
    startY: y,
    head: [['Descripción', 'Cantidad', 'Precio Unit.', 'IVA', 'Subtotal']],
    body: tableData,
    margin: { left: 20, right: 20 },
    styles: {
      fontSize: 9,
      cellPadding: 4,
    },
    headStyles: {
      fillColor: [49, 46, 129],
      textColor: 255,
      fontStyle: 'bold',
    },
    alternateRowStyles: {
      fillColor: [245, 245, 250],
    },
  });

  // Totals
  const finalY = doc.lastAutoTable.finalY + 10;
  const totalsX = pageWidth - 80;

  doc.setFontSize(10);
  doc.setTextColor(80, 80, 80);
  doc.text('Base Imponible:', totalsX, finalY);
  doc.text(formatCurrency(totals.subtotal), pageWidth - 20, finalY, { align: 'right' });

  doc.text('IVA:', totalsX, finalY + 7);
  doc.text(formatCurrency(totals.totalIva), pageWidth - 20, finalY + 7, { align: 'right' });

  doc.setDrawColor(49, 46, 129);
  doc.line(totalsX, finalY + 11, pageWidth - 20, finalY + 11);

  doc.setFontSize(13);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(49, 46, 129);
  doc.text('TOTAL:', totalsX, finalY + 19);
  doc.text(formatCurrency(totals.total), pageWidth - 20, finalY + 19, { align: 'right' });

  // Notes
  let notesEndY = finalY + 19;
  if (invoice.notes) {
    const notesY = finalY + 35;
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(100, 100, 100);
    doc.text('NOTAS', 20, notesY);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(80, 80, 80);
    doc.text(invoice.notes, 20, notesY + 6, { maxWidth: pageWidth - 40 });
    notesEndY = notesY + 12;
  }

  renderVerifactuBlock(doc, invoice, notesEndY);
}

// ======================
// Modern Template
// ======================
function renderModernTemplate(doc, invoice, totals) {
  const pageWidth = doc.internal.pageSize.getWidth();

  // Gradient-style header
  doc.setFillColor(99, 102, 241);
  doc.rect(0, 0, pageWidth, 50, 'F');
  doc.setFillColor(79, 70, 229);
  doc.rect(0, 35, pageWidth, 15, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(28);
  doc.setFont('helvetica', 'bold');
  doc.text('FACTURA', 20, 28);

  doc.setFontSize(14);
  doc.text(invoice.number, pageWidth - 20, 22, { align: 'right' });
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(`${formatDate(invoice.date)}`, pageWidth - 20, 32, { align: 'right' });

  // Accent accent line
  doc.setFillColor(52, 211, 153);
  doc.rect(0, 50, pageWidth, 3, 'F');

  // Parties in cards
  let y = 65;

  // Emitter card
  doc.setFillColor(245, 245, 255);
  doc.roundedRect(15, y - 5, pageWidth / 2 - 25, 45, 3, 3, 'F');

  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(99, 102, 241);
  doc.text('DE', 20, y);
  y += 5;
  doc.setFontSize(11);
  doc.setTextColor(30, 30, 30);
  doc.text(invoice.emitter?.name || '', 20, y);
  y += 5;
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 100, 100);
  doc.text(`NIF: ${invoice.emitter?.nif || ''}`, 20, y);
  y += 5;
  doc.text(invoice.emitter?.address || '', 20, y);
  y += 5;
  doc.text(`${invoice.emitter?.postalCode || ''} ${invoice.emitter?.city || ''}`, 20, y);

  // Receiver card
  y = 65;
  const rx = pageWidth / 2 + 10;
  doc.setFillColor(240, 253, 244);
  doc.roundedRect(rx - 5, y - 5, pageWidth / 2 - 25, 45, 3, 3, 'F');

  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(16, 185, 129);
  doc.text('PARA', rx, y);
  y += 5;
  doc.setFontSize(11);
  doc.setTextColor(30, 30, 30);
  doc.text(invoice.receiver?.name || '', rx, y);
  y += 5;
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 100, 100);
  doc.text(`NIF: ${invoice.receiver?.nif || ''}`, rx, y);
  y += 5;
  doc.text(invoice.receiver?.address || '', rx, y);
  y += 5;
  doc.text(`${invoice.receiver?.postalCode || ''} ${invoice.receiver?.city || ''}`, rx, y);

  // Table
  y = 120;
  const tableData = invoice.lines.map((line) => [
    line.description,
    line.quantity.toString(),
    formatCurrency(line.price),
    `${line.ivaRate}%`,
    formatCurrency(line.quantity * line.price),
  ]);

  doc.autoTable({
    startY: y,
    head: [['Concepto', 'Uds.', 'Precio', 'IVA', 'Importe']],
    body: tableData,
    margin: { left: 15, right: 15 },
    styles: {
      fontSize: 9,
      cellPadding: 5,
    },
    headStyles: {
      fillColor: [99, 102, 241],
      textColor: 255,
      fontStyle: 'bold',
      halign: 'center',
    },
    bodyStyles: {
      halign: 'center',
    },
    columnStyles: {
      0: { halign: 'left' },
    },
  });

  // Totals with modern styling
  const finalY = doc.lastAutoTable.finalY + 10;
  const boxX = pageWidth - 100;

  doc.setFillColor(99, 102, 241);
  doc.roundedRect(boxX - 5, finalY - 3, 90, 38, 3, 3, 'F');

  doc.setTextColor(200, 210, 255);
  doc.setFontSize(9);
  doc.text('Base:', boxX, finalY + 5);
  doc.text(formatCurrency(totals.subtotal), pageWidth - 20, finalY + 5, { align: 'right' });
  doc.text('IVA:', boxX, finalY + 13);
  doc.text(formatCurrency(totals.totalIva), pageWidth - 20, finalY + 13, { align: 'right' });

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('Total', boxX, finalY + 28);
  doc.text(formatCurrency(totals.total), pageWidth - 20, finalY + 28, { align: 'right' });

  // Notes
  let modernNotesEndY = finalY + 38;
  if (invoice.notes) {
    const notesY = finalY + 50;
    doc.setFontSize(9);
    doc.setFont('helvetica', 'italic');
    doc.setTextColor(120, 120, 120);
    doc.text(`Notas: ${invoice.notes}`, 15, notesY, { maxWidth: pageWidth - 30 });
    modernNotesEndY = notesY + 10;
  }

  renderVerifactuBlock(doc, invoice, modernNotesEndY);
}

// ======================
// Minimal Template
// ======================
function renderMinimalTemplate(doc, invoice, totals) {
  const pageWidth = doc.internal.pageSize.getWidth();

  doc.setTextColor(30, 30, 30);
  doc.setFontSize(24);
  doc.setFont('helvetica', 'bold');
  doc.text('Factura', 20, 25);

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(130, 130, 130);
  doc.text(invoice.number, 20, 33);

  doc.text(`Fecha: ${formatDate(invoice.date)}`, pageWidth - 20, 25, { align: 'right' });
  if (invoice.dueDate) {
    doc.text(`Vence: ${formatDate(invoice.dueDate)}`, pageWidth - 20, 32, { align: 'right' });
  }

  // Thin line
  doc.setDrawColor(220, 220, 220);
  doc.setLineWidth(0.5);
  doc.line(20, 40, pageWidth - 20, 40);

  // Parties side by side
  let y = 52;
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(160, 160, 160);
  doc.text('EMISOR', 20, y);
  doc.text('RECEPTOR', pageWidth / 2 + 10, y);

  y += 6;
  doc.setTextColor(50, 50, 50);
  doc.setFontSize(10);
  doc.text(invoice.emitter?.name || '', 20, y);
  doc.text(invoice.receiver?.name || '', pageWidth / 2 + 10, y);

  y += 6;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(100, 100, 100);
  doc.text(`${invoice.emitter?.nif || ''}`, 20, y);
  doc.text(`${invoice.receiver?.nif || ''}`, pageWidth / 2 + 10, y);
  y += 5;
  doc.text(`${invoice.emitter?.address || ''}, ${invoice.emitter?.city || ''}`, 20, y);
  doc.text(`${invoice.receiver?.address || ''}, ${invoice.receiver?.city || ''}`, pageWidth / 2 + 10, y);

  // Table
  y += 15;
  const tableData = invoice.lines.map((line) => [
    line.description,
    line.quantity,
    formatCurrency(line.price),
    `${line.ivaRate}%`,
    formatCurrency(line.quantity * line.price),
  ]);

  doc.autoTable({
    startY: y,
    head: [['Descripción', 'Cant.', 'Precio', 'IVA', 'Total']],
    body: tableData,
    margin: { left: 20, right: 20 },
    styles: {
      fontSize: 9,
      cellPadding: 4,
      lineColor: [230, 230, 230],
      lineWidth: 0.3,
    },
    headStyles: {
      fillColor: [250, 250, 250],
      textColor: [100, 100, 100],
      fontStyle: 'bold',
      lineColor: [200, 200, 200],
    },
  });

  // Totals - minimal style
  const finalY = doc.lastAutoTable.finalY + 12;
  const totalsX = pageWidth - 80;

  doc.setFontSize(9);
  doc.setTextColor(130, 130, 130);
  doc.text('Subtotal', totalsX, finalY);
  doc.text(formatCurrency(totals.subtotal), pageWidth - 20, finalY, { align: 'right' });

  doc.text('IVA', totalsX, finalY + 7);
  doc.text(formatCurrency(totals.totalIva), pageWidth - 20, finalY + 7, { align: 'right' });

  doc.setDrawColor(180, 180, 180);
  doc.line(totalsX, finalY + 11, pageWidth - 20, finalY + 11);

  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(30, 30, 30);
  doc.text('Total', totalsX, finalY + 19);
  doc.text(formatCurrency(totals.total), pageWidth - 20, finalY + 19, { align: 'right' });

  // Notes
  let minimalNotesEndY = finalY + 19;
  if (invoice.notes) {
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(160, 160, 160);
    doc.text(invoice.notes, 20, finalY + 35, { maxWidth: pageWidth - 40 });
    minimalNotesEndY = finalY + 42;
  }

  renderVerifactuBlock(doc, invoice, minimalNotesEndY);
}
