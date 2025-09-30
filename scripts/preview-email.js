// Simple script to preview the email that would be sent
require('dotenv').config();

// Mock invoice data (similar to what would be in your database)
const mockInvoice = {
  id: 'inv_test123',
  number: 'INV-2003', 
  issueDate: new Date('2025-09-30'),
  dueDate: new Date('2025-10-07'),
  total: 500.00,
  subtotal: 500.00,
  taxTotal: 0,
  currency: 'USD',
  notes: null,
  // This would be the actual Stripe payment link generated
  paymentLinkUrl: 'https://payment.link.stripe.com/test_YWNjdF8xTzkyNzYxS3lueEVvNm5VLF9RUzFiM1hNbHlRRGhmZmM1QUxpM1NOa0c0ZUNOdXpR0100abc123def',
  customer: {
    businessName: 'Test Customer Co.',
    primaryContact: 'John Doe',
    email: 'customer@example.com'
  },
  workspace: {
    name: 'Your Business Name'
  },
  lineItems: [
    {
      description: 'site inspection',
      quantity: 1,
      unitPrice: 500.00,
      amount: 500.00
    }
  ]
};

// Function to format currency
function formatCurrency(amount, currency = 'USD') {
  const formatter = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency
  });
  return formatter.format(amount);
}

// Function to format date
function formatDate(date) {
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  }).format(new Date(date));
}

// Generate the email HTML (simplified version of what the service generates)
function generateEmailHTML(invoice) {
  const customerName = invoice.customer.primaryContact || invoice.customer.businessName;
  const subtotal = invoice.lineItems.reduce((total, item) => total + Number(item.amount ?? 0), 0);
  const taxAmount = Number(invoice.taxTotal ?? 0);
  const totalAmount = Number(invoice.total);
  const currency = invoice.currency ?? "USD";
  const currencySymbol = currency === 'USD' ? '$' : currency === 'EUR' ? '€' : currency === 'GBP' ? '£' : '';
  
  // Build line items HTML
  const itemsHtml = invoice.lineItems.map(item => `
    <tr style="border-bottom: 1px solid #f3f4f6;">
      <td style="padding: 12px 0; font-size: 14px; color: #374151;">${item.description}</td>
      <td style="padding: 12px 0; font-size: 14px; color: #374151; text-align: center;">${item.quantity}</td>
      <td style="padding: 12px 0; font-size: 14px; color: #374151; text-align: right;">${currencySymbol}${Number(item.unitPrice).toFixed(2)}</td>
      <td style="padding: 12px 0; font-size: 14px; color: #374151; text-align: right;">${currencySymbol}${Number(item.amount).toFixed(2)}</td>
    </tr>
  `).join('');

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Invoice ${invoice.number} from ${invoice.workspace.name}</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f9fafb;">
  <div style="padding: 40px 0;">
    <table cellpadding="0" cellspacing="0" style="margin: 0 auto; max-width: 600px; background-color: white; border-radius: 8px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
      <!-- Header -->
      <tr>
        <td style="background-color: #0f172a; padding: 32px; text-align: center;">
          <h1 style="color: white; margin: 0; font-size: 24px; font-weight: 600;">${invoice.workspace.name}</h1>
        </td>
      </tr>
      
      <!-- Main Content -->
      <tr>
        <td style="padding: 32px;">
          <p style="font-size: 16px; line-height: 24px; color: #374151; margin-bottom: 24px;">
            Hi ${customerName},
          </p>
          
          <p style="font-size: 16px; line-height: 24px; color: #374151; margin-bottom: 32px;">
            Thank you for your business. Please find your invoice details below.
          </p>

          <!-- Invoice Summary -->
          <div style="background-color: #f3f4f6; border-radius: 8px; padding: 24px; margin-bottom: 32px;">
            <table style="width: 100%;">
              <tr>
                <td style="padding-bottom: 12px;">
                  <strong style="color: #6b7280; font-size: 12px; text-transform: uppercase;">Invoice Number</strong>
                  <div style="color: #111827; font-size: 16px; margin-top: 4px;">${invoice.number}</div>
                </td>
                <td style="padding-bottom: 12px; text-align: right;">
                  <strong style="color: #6b7280; font-size: 12px; text-transform: uppercase;">Amount Due</strong>
                  <div style="color: #111827; font-size: 20px; font-weight: 600; margin-top: 4px;">
                    ${currencySymbol}${totalAmount.toFixed(2)}
                  </div>
                </td>
              </tr>
              <tr>
                <td>
                  <strong style="color: #6b7280; font-size: 12px; text-transform: uppercase;">Invoice Date</strong>
                  <div style="color: #111827; font-size: 14px; margin-top: 4px;">${formatDate(invoice.issueDate)}</div>
                </td>
                <td style="text-align: right;">
                  <strong style="color: #6b7280; font-size: 12px; text-transform: uppercase;">Due Date</strong>
                  <div style="color: #111827; font-size: 14px; margin-top: 4px;">${formatDate(invoice.dueDate)}</div>
                </td>
              </tr>
            </table>
          </div>

          <!-- Line Items -->
          <div style="margin-bottom: 32px;">
            <h3 style="font-size: 14px; font-weight: 600; color: #374151; margin-bottom: 16px; text-transform: uppercase;">Invoice Items</h3>
            <table style="width: 100%; border-collapse: collapse;">
              <thead>
                <tr style="border-bottom: 1px solid #e5e7eb;">
                  <th style="text-align: left; padding: 8px 0; font-size: 12px; color: #6b7280; font-weight: 500;">Description</th>
                  <th style="text-align: center; padding: 8px 0; font-size: 12px; color: #6b7280; font-weight: 500;">Qty</th>
                  <th style="text-align: right; padding: 8px 0; font-size: 12px; color: #6b7280; font-weight: 500;">Price</th>
                  <th style="text-align: right; padding: 8px 0; font-size: 12px; color: #6b7280; font-weight: 500;">Total</th>
                </tr>
              </thead>
              <tbody>
                ${itemsHtml}
              </tbody>
              <tfoot>
                <tr>
                  <td colspan="3" style="padding: 12px 0; font-size: 14px; color: #6b7280; text-align: right;">Subtotal</td>
                  <td style="padding: 12px 0; font-size: 14px; color: #374151; text-align: right;">${currencySymbol}${subtotal.toFixed(2)}</td>
                </tr>
                <tr style="border-top: 2px solid #e5e7eb;">
                  <td colspan="3" style="padding: 12px 0; font-size: 16px; font-weight: 600; color: #111827; text-align: right;">Total Due</td>
                  <td style="padding: 12px 0; font-size: 16px; font-weight: 600; color: #111827; text-align: right;">${currencySymbol}${totalAmount.toFixed(2)}</td>
                </tr>
              </tfoot>
            </table>
          </div>

          <!-- Payment Button -->
          <div style="text-align: center; margin-bottom: 32px;">
            <a href="${invoice.paymentLinkUrl}" style="display: inline-block; background-color: #3b82f6; color: white; padding: 16px 32px; border-radius: 6px; text-decoration: none; font-size: 16px; font-weight: 600; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
              Pay Invoice Now
            </a>
            <p style="font-size: 12px; color: #6b7280; margin-top: 12px;">
              Secure payment powered by Stripe
            </p>
          </div>

          <!-- Alternative Link -->
          <div style="background-color: #f9fafb; border-radius: 6px; padding: 16px; margin-bottom: 24px;">
            <p style="font-size: 12px; color: #6b7280; margin: 0 0 8px 0;">
              Or copy this link to pay online:
            </p>
            <p style="font-size: 12px; color: #3b82f6; word-break: break-all; margin: 0;">
              ${invoice.paymentLinkUrl}
            </p>
          </div>
        </td>
      </tr>

      <!-- Footer -->
      <tr>
        <td style="background-color: #f9fafb; padding: 24px; border-top: 1px solid #e5e7eb;">
          <table style="width: 100%;">
            <tr>
              <td>
                <p style="font-size: 12px; color: #6b7280; margin: 0 0 4px 0;">
                  <strong>${invoice.workspace.name}</strong>
                </p>
                <p style="font-size: 12px; color: #6b7280; margin: 0;">
                  notifications@ledgerflow.org
                </p>
              </td>
              <td style="text-align: right;">
                <p style="font-size: 12px; color: #9ca3af; margin: 0;">
                  Questions? Reply to this email
                </p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </div>
</body>
</html>`;
}

// Generate and save the email preview
const emailHTML = generateEmailHTML(mockInvoice);

// Write to a file that can be opened in browser
const fs = require('fs');
const path = require('path');

const outputPath = path.join(__dirname, '..', 'email-preview.html');
fs.writeFileSync(outputPath, emailHTML);

console.log('📧 Email preview generated!');
console.log('📁 File saved to:', outputPath);
console.log('');
console.log('🔗 Stripe Payment Link in email:');
console.log(mockInvoice.paymentLinkUrl);
console.log('');
console.log('🌐 Opening email preview in browser...');

// Open the preview in browser
const { exec } = require('child_process');
const platform = process.platform;

let command;
if (platform === 'darwin') {
  command = `open "${outputPath}"`;
} else if (platform === 'win32') {
  command = `start "${outputPath}"`;
} else {
  command = `xdg-open "${outputPath}"`;
}

exec(command, (error) => {
  if (error) {
    console.log('❌ Could not open browser automatically');
    console.log('📂 Please open this file in your browser:');
    console.log(outputPath);
  } else {
    console.log('✅ Opened email preview in browser!');
  }
});