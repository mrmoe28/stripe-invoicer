// Example: after calling POST /api/checkout and receiving { url }, embed in your email template:
export function invoiceEmailHtml({ businessName, customerName, amount, payUrl }: {
  businessName: string; customerName: string; amount: string; payUrl: string;
}) {
  return `
    <div style="font-family: system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial;">
      <h2>${businessName} — Invoice</h2>
      <p>Hi ${customerName},</p>
      <p>Your amount due is <strong>${amount}</strong>.</p>
      <p><a href="${payUrl}" style="display:inline-block;padding:12px 18px;border-radius:8px;background:#635bff;color:#fff;text-decoration:none;font-weight:600;">
        Pay securely
      </a></p>
      <p>If the button doesn't work, copy this URL:<br>${payUrl}</p>
    </div>
  `;
}