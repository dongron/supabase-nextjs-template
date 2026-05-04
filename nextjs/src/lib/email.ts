import 'server-only';
import { Resend } from 'resend';
import type { QuoteService } from '@/lib/quote';
import { calculateQuoteTotal } from '@/lib/quote';

const FROM_ADDRESS = 'onboarding@resend.dev';

function getResendClient(): Resend {
  const apiKey = process.env.PRIVATE_RESEND_API_KEY;
  if (!apiKey) {
    throw new Error('PRIVATE_RESEND_API_KEY environment variable is not set');
  }
  return new Resend(apiKey);
}

function formatPrice(price: number | null): string {
  if (price === null) return '—';
  return `$${price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export async function sendCustomerQuoteEmail(
  to: string,
  customerName: string,
  services: QuoteService[],
): Promise<void> {
  const total = calculateQuoteTotal(services);

  const serviceLines = services
    .map((s) => `  • ${s.serviceName}: ${formatPrice(s.price)}`)
    .join('\n');

  const text = [
    `Dear ${customerName},`,
    '',
    'Thank you for considering Greenscape Pro for your landscaping needs.',
    'Please find your personalised quote below:',
    '',
    serviceLines,
    '',
    `Grand Total: ${formatPrice(total)}`,
    '',
    'We appreciate your interest and look forward to working with you.',
    '',
    'Warm regards,',
    'CEO of Greenscape Pro',
  ].join('\n');

  const html = `
<p>Dear ${customerName},</p>
<p>Thank you for considering <strong>Greenscape Pro</strong> for your landscaping needs.<br>
Please find your personalised quote below:</p>
<table cellpadding="4" cellspacing="0" style="border-collapse:collapse;min-width:320px">
  <thead>
    <tr>
      <th style="text-align:left;border-bottom:1px solid #ddd;padding:6px 12px">Service</th>
      <th style="text-align:right;border-bottom:1px solid #ddd;padding:6px 12px">Price</th>
    </tr>
  </thead>
  <tbody>
    ${services.map((s) => `<tr><td style="padding:6px 12px">${s.serviceName}</td><td style="text-align:right;padding:6px 12px">${formatPrice(s.price)}</td></tr>`).join('\n    ')}
  </tbody>
  <tfoot>
    <tr>
      <td style="padding:8px 12px;font-weight:bold;border-top:2px solid #333">Grand Total</td>
      <td style="text-align:right;padding:8px 12px;font-weight:bold;border-top:2px solid #333">${formatPrice(total)}</td>
    </tr>
  </tfoot>
</table>
<p>We appreciate your interest and look forward to working with you.</p>
<p>Warm regards,<br><strong>CEO of Greenscape Pro</strong></p>
`.trim();

  const resend = getResendClient();
  const { error } = await resend.emails.send({
    from: FROM_ADDRESS,
    to,
    subject: `Your Greenscape Pro Quote — ${formatPrice(total)}`,
    text,
    html,
  });

  if (error) {
    throw new Error(`Failed to send customer quote email: ${error.message}`);
  }
}

export async function sendDesignerNotificationEmail(
  to: string,
  customerName: string,
  neighborhood: string,
  services: QuoteService[],
): Promise<void> {
  const total = calculateQuoteTotal(services);

  const serviceLines = services
    .map((s) => `  • ${s.serviceName}: ${formatPrice(s.price)}`)
    .join('\n');

  const text = [
    `High-Value Quote Alert`,
    '',
    `Customer: ${customerName}`,
    `Neighborhood: ${neighborhood}`,
    '',
    'Quote breakdown:',
    serviceLines,
    '',
    `Total: ${formatPrice(total)}`,
    '',
    'This quote exceeds the $30,000 threshold and requires your review.',
  ].join('\n');

  const html = `
<h2>High-Value Quote Alert</h2>
<p><strong>Customer:</strong> ${customerName}<br>
<strong>Neighborhood:</strong> ${neighborhood}</p>
<table cellpadding="4" cellspacing="0" style="border-collapse:collapse;min-width:320px">
  <thead>
    <tr>
      <th style="text-align:left;border-bottom:1px solid #ddd;padding:6px 12px">Service</th>
      <th style="text-align:right;border-bottom:1px solid #ddd;padding:6px 12px">Price</th>
    </tr>
  </thead>
  <tbody>
    ${services.map((s) => `<tr><td style="padding:6px 12px">${s.serviceName}</td><td style="text-align:right;padding:6px 12px">${formatPrice(s.price)}</td></tr>`).join('\n    ')}
  </tbody>
  <tfoot>
    <tr>
      <td style="padding:8px 12px;font-weight:bold;border-top:2px solid #333">Total</td>
      <td style="text-align:right;padding:8px 12px;font-weight:bold;border-top:2px solid #333">${formatPrice(total)}</td>
    </tr>
  </tfoot>
</table>
<p>This quote exceeds the $30,000 threshold and requires your review.</p>
`.trim();

  const resend = getResendClient();
  const { error } = await resend.emails.send({
    from: FROM_ADDRESS,
    to,
    subject: `High-Value Quote Alert: ${customerName} — ${formatPrice(total)}`,
    text,
    html,
  });

  if (error) {
    throw new Error(`Failed to send designer notification email: ${error.message}`);
  }
}
