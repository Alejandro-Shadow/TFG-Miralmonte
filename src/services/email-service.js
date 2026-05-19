import emailjs from '@emailjs/browser';

const SERVICE_ID = import.meta.env.VITE_EMAILJS_SERVICE_ID;
const TEMPLATE_ID = import.meta.env.VITE_EMAILJS_TEMPLATE_ID;
const PUBLIC_KEY = import.meta.env.VITE_EMAILJS_PUBLIC_KEY;

emailjs.init(PUBLIC_KEY);

export async function sendInvoiceEmail(invoice, lines = []) {
  const toEmail = invoice.receptor_email;
  if (!toEmail) return { success: false, error: 'El receptor no tiene email' };

  // Generar filas HTML de las líneas
  const linesHtml = lines.length > 0
    ? lines.map(l => `
        <tr>
          <td style="padding:8px;border-bottom:1px solid #e5e7eb;color:#111827;font-size:13px;">${l.description || '-'}</td>
          <td style="padding:8px;border-bottom:1px solid #e5e7eb;color:#374151;font-size:13px;text-align:center;">${l.quantity}</td>
          <td style="padding:8px;border-bottom:1px solid #e5e7eb;color:#374151;font-size:13px;text-align:right;">${parseFloat(l.price).toFixed(2)} €</td>
          <td style="padding:8px;border-bottom:1px solid #e5e7eb;color:#374151;font-size:13px;text-align:center;">${l.ivaRate}%</td>
          <td style="padding:8px;border-bottom:1px solid #e5e7eb;color:#111827;font-size:13px;font-weight:bold;text-align:right;">${(l.quantity * l.price).toFixed(2)} €</td>
        </tr>`).join('')
    : `<tr><td colspan="5" style="padding:8px;color:#6b7280;font-size:13px;">${invoice.descripcion_general || '-'}</td></tr>`;

  const invoice_lines = `
    <table style="width:100%;border-collapse:collapse;margin:12px 0;">
      <thead>
        <tr style="background:#f3f4f6;">
          <th style="padding:8px;text-align:left;font-size:12px;color:#6b7280;">Descripción</th>
          <th style="padding:8px;text-align:center;font-size:12px;color:#6b7280;">Cant.</th>
          <th style="padding:8px;text-align:right;font-size:12px;color:#6b7280;">Precio</th>
          <th style="padding:8px;text-align:center;font-size:12px;color:#6b7280;">IVA</th>
          <th style="padding:8px;text-align:right;font-size:12px;color:#6b7280;">Subtotal</th>
        </tr>
      </thead>
      <tbody>${linesHtml}</tbody>
    </table>`;

  try {
    await emailjs.send(SERVICE_ID, TEMPLATE_ID, {
      to_email: toEmail,
      to_name: invoice.receptor_nombre || 'Cliente',
      invoice_number: `FAC-${invoice.numero_factura}`,
      invoice_date: invoice.fecha_emision || '',
      invoice_total: `${parseFloat(invoice.total_factura || 0).toFixed(2)} €`,
      invoice_lines,
    });
    return { success: true };
  } catch (error) {
    console.error('Error enviando email:', error);
    return { success: false, error: error.text || error.message };
  }
}
