import {
  InvoiceEventChannel,
  InvoiceEventStatus,
  InvoiceEventType,
  InvoiceStatus,
  MembershipRole,
  Prisma,
} from "@prisma/client";

import { prisma } from "@/lib/prisma";
import { formatCurrency, formatDate } from "@/lib/utils";
import { buildEmailUrl } from "@/lib/utils/email-helpers";

import { sendEmail, sendSms } from "./notification-service";

export type DispatchResult = {
  email?: { success: boolean; error?: string };
  sms?: { success: boolean; error?: string };
};

type WorkspaceWithCompanyInfo = {
  id: string;
  name: string;
  companyName?: string | null;
  companyEmail?: string | null;
  companyPhone?: string | null;
  companyWebsite?: string | null;
  companyEin?: string | null;
  companyAddress?: string | null;
  companyCity?: string | null;
  companyState?: string | null;
  companyZip?: string | null;
  companyCountry?: string | null;
  logoUrl?: string | null;
  members: Array<{
    role: MembershipRole;
    user: {
      id: string;
      email: string;
    } | null;
  }>;
};

type InvoiceWithRelations = NonNullable<Awaited<ReturnType<typeof getInvoiceWithRelations>>>;

async function getInvoiceWithRelations(invoiceId: string) {
  return prisma.invoice.findUnique({
    where: { id: invoiceId },
    include: {
      customer: true,
      workspace: {
        include: {
          members: {
            include: { user: true },
          },
        },
      },
      lineItems: true,
    },
  });
}

function getInvoiceUrl(invoice: InvoiceWithRelations) {
  // Always prioritize Stripe payment link for direct payments
  if (invoice.paymentLinkUrl) {
    return invoice.paymentLinkUrl;
  }
  // Fallback to public invoice page (no authentication required)
  return buildEmailUrl(`invoices/${invoice.id}`);
}

function getTrackingPixelUrl(invoice: InvoiceWithRelations) {
  return buildEmailUrl(`api/invoices/${invoice.id}/opened.gif`);
}

function parseAlertRecipients(invoice: InvoiceWithRelations) {
  const envRecipients = (process.env.INVOICE_ALERT_RECIPIENTS ?? "")
    .split(/[,\s;]/)
    .map((email) => email.trim())
    .filter(Boolean);

  if (envRecipients.length > 0) {
    return envRecipients;
  }

  return invoice.workspace.members
    .filter((member) => member.user?.email && member.role !== MembershipRole.MEMBER)
    .map((member) => member.user!.email!);
}

function sanitizePhone(phone?: string | null) {
  if (!phone) {
    return undefined;
  }
  const trimmed = phone.trim();
  if (/^\+?[1-9]\d{7,14}$/.test(trimmed)) {
    return trimmed.startsWith("+") ? trimmed : `+${trimmed}`;
  }
  return undefined;
}

function buildInvoiceSummary(invoice: InvoiceWithRelations) {
  const subtotal = invoice.lineItems.reduce((total, item) => total + Number(item.amount ?? 0), 0);
  const formattedTotal = formatCurrency(Number(invoice.total ?? subtotal), invoice.currency ?? "USD");
  const dueDate = formatDate(invoice.dueDate);

  return {
    subtotal,
    formattedTotal,
    dueDate,
  };
}

function buildEmailHtml(invoice: InvoiceWithRelations) {
  const invoiceUrl = getInvoiceUrl(invoice);
  const trackingUrl = getTrackingPixelUrl(invoice);
  
  const customerName = invoice.customer.primaryContact || invoice.customer.businessName;
  const subtotal = invoice.lineItems.reduce((total, item) => total + Number(item.amount ?? 0), 0);
  const taxAmount = Number(invoice.taxTotal ?? 0);
  const totalAmount = Number(invoice.total);
  const currency = invoice.currency ?? "USD";
  const currencySymbol = currency === 'USD' ? '$' : currency === 'EUR' ? '€' : currency === 'GBP' ? '£' : '';
  
  // Company information
  const workspace = invoice.workspace as WorkspaceWithCompanyInfo;
  const companyName = workspace.companyName || workspace.name;
  const companyEmail = workspace.companyEmail || "notifications@ledgerflow.org";
  const companyPhone = workspace.companyPhone;
  const companyWebsite = workspace.companyWebsite;
  const logoUrl = workspace.logoUrl;
  const companyAddress = workspace.companyAddress;
  const companyCity = workspace.companyCity;
  const companyState = workspace.companyState;
  const companyZip = workspace.companyZip;
  const companyCountry = workspace.companyCountry;
  
  // Build full company address
  const addressParts = [companyAddress, companyCity, companyState, companyZip, companyCountry].filter(Boolean);
  const fullAddress = addressParts.join(', ');
  
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
          ${logoUrl ? `
            <img src="${logoUrl}" alt="${companyName}" style="max-height: 60px; max-width: 200px; margin: 0 auto 16px auto; display: block;" />
          ` : ''}
          <h1 style="color: white; margin: 0; font-size: 24px; font-weight: 600;">${companyName}</h1>
          ${companyPhone || companyWebsite ? `
            <div style="margin-top: 8px; font-size: 14px; color: #cbd5e1;">
              ${companyPhone ? `<span>${companyPhone}</span>` : ''}
              ${companyPhone && companyWebsite ? ' • ' : ''}
              ${companyWebsite ? `<a href="${companyWebsite}" style="color: #cbd5e1; text-decoration: none;">${companyWebsite.replace(/^https?:\/\//, '')}</a>` : ''}
            </div>
          ` : ''}
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
                ${taxAmount > 0 ? `
                <tr>
                  <td colspan="3" style="padding: 12px 0; font-size: 14px; color: #6b7280; text-align: right;">Tax</td>
                  <td style="padding: 12px 0; font-size: 14px; color: #374151; text-align: right;">${currencySymbol}${taxAmount.toFixed(2)}</td>
                </tr>
                ` : ''}
                <tr style="border-top: 2px solid #e5e7eb;">
                  <td colspan="3" style="padding: 12px 0; font-size: 16px; font-weight: 600; color: #111827; text-align: right;">Total Due</td>
                  <td style="padding: 12px 0; font-size: 16px; font-weight: 600; color: #111827; text-align: right;">${currencySymbol}${totalAmount.toFixed(2)}</td>
                </tr>
              </tfoot>
            </table>
          </div>

          ${invoice.notes ? `
          <div style="background-color: #fef3c7; border-radius: 6px; padding: 16px; margin-bottom: 32px;">
            <p style="font-size: 14px; color: #92400e; margin: 0;">
              <strong>Notes:</strong> ${invoice.notes}
            </p>
          </div>
          ` : ''}

          <!-- Payment Button -->
          <div style="text-align: center; margin-bottom: 32px;">
            <a href="${invoiceUrl}" 
               target="_blank" 
               rel="noopener nofollow"
               role="button"
               aria-label="Pay Invoice ${invoice.number} - Secure payment via Stripe"
               style="display: inline-block; background-color: #3b82f6; color: white !important; padding: 16px 32px; border-radius: 6px; text-decoration: none; font-size: 16px; font-weight: 600; box-shadow: 0 1px 3px rgba(0,0,0,0.1); border: 2px solid #3b82f6; mso-padding-alt: 16px 32px; mso-text-raise: 4px;">
              <!--[if mso]>
              <v:rect xmlns:v="urn:schemas-microsoft-com:vml" fill="true" stroke="false" style="height:54px;v-text-anchor:middle;width:200px;">
                <v:fill type="tile" color="#3b82f6" />
                <v:textbox inset="0,0,0,0">
              <![endif]-->
              <span style="color: white !important; text-decoration: none;">Pay Invoice Now</span>
              <!--[if mso]>
                </v:textbox>
              </v:rect>
              <![endif]-->
            </a>
            <p style="font-size: 12px; color: #6b7280; margin-top: 12px;">
              🔒 Secure payment powered by Stripe
            </p>
          </div>

          <!-- Alternative Link -->
          <div style="background-color: #f9fafb; border-radius: 6px; padding: 16px; margin-bottom: 24px; border: 1px solid #e5e7eb;">
            <p style="font-size: 12px; color: #6b7280; margin: 0 0 8px 0; font-weight: 500;">
              Having trouble with the button above? Copy and paste this link:
            </p>
            <p style="font-size: 12px; color: #3b82f6; word-break: break-all; margin: 0; padding: 8px; background-color: white; border-radius: 4px; border: 1px solid #d1d5db;">
              <a href="${invoiceUrl}" target="_blank" rel="noopener nofollow" style="color: #3b82f6; text-decoration: none;">${invoiceUrl}</a>
            </p>
            <p style="font-size: 11px; color: #9ca3af; margin: 8px 0 0 0;">
              💡 Right-click and select "Copy link address" or highlight and copy the text above
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
                  <strong>${companyName}</strong>
                </p>
                <p style="font-size: 12px; color: #6b7280; margin: 0;">
                  ${companyEmail}
                </p>
                ${fullAddress ? `
                <p style="font-size: 12px; color: #6b7280; margin: 4px 0 0 0;">
                  ${fullAddress}
                </p>
                ` : ''}
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
  
  <!-- Tracking Pixel -->
  <img src="${trackingUrl}" alt="" width="1" height="1" style="display: none;" />
</body>
</html>`;
}

function buildEmailText(invoice: InvoiceWithRelations) {
  const { formattedTotal, dueDate } = buildInvoiceSummary(invoice);
  const invoiceUrl = getInvoiceUrl(invoice);
  
  // Company information
  const workspace = invoice.workspace as WorkspaceWithCompanyInfo;
  const companyName = workspace.companyName || workspace.name;
  const companyEmail = workspace.companyEmail || "notifications@ledgerflow.org";
  const companyWebsite = workspace.companyWebsite;
  const companyPhone = workspace.companyPhone;
  const companyAddress = workspace.companyAddress;
  const companyCity = workspace.companyCity;
  const companyState = workspace.companyState;
  const companyZip = workspace.companyZip;
  const companyCountry = workspace.companyCountry;
  
  // Build full company address
  const addressParts = [companyAddress, companyCity, companyState, companyZip, companyCountry].filter(Boolean);
  const fullAddress = addressParts.join(', ');
  
  return `Invoice ${invoice.number} from ${companyName}

Dear ${invoice.customer.primaryContact || invoice.customer.businessName},

Thank you for your business. We have prepared an invoice for ${formattedTotal} due on ${dueDate}.

Please review the invoice details and submit payment at your convenience.

View Invoice & Pay Online: ${invoiceUrl}

Payment Options:
- Credit or debit card (secure online payment)
- Bank transfer details provided on invoice
- Contact us for alternative payment methods

Questions about this invoice? Simply reply to this email and we will be happy to help.

Best regards,
${companyName}

Email: ${companyEmail}${companyWebsite ? `
Website: ${companyWebsite}` : ''}${companyPhone ? `
Phone: ${companyPhone}` : ''}${fullAddress ? `
Address: ${fullAddress}` : ''}

---
This email was sent regarding Invoice ${invoice.number}.
If you believe you received this email in error, please contact us immediately.`;
}

function buildSmsMessage(invoice: InvoiceWithRelations) {
  const { formattedTotal, dueDate } = buildInvoiceSummary(invoice);
  const invoiceUrl = getInvoiceUrl(invoice);
  return `Invoice ${invoice.number} for ${formattedTotal} is due on ${dueDate}. Pay now: ${invoiceUrl}`;
}

async function recordEvent(
  invoiceId: string,
  type: InvoiceEventType,
  status: InvoiceEventStatus,
  channel?: InvoiceEventChannel,
  detail?: Record<string, unknown>,
) {
  await prisma.invoiceEvent.create({
    data: {
      invoiceId,
      type,
      status,
      channel,
      detail: detail ? (detail as Prisma.JsonObject) : undefined,
    },
  });
}

export async function dispatchInvoice(invoiceId: string, paymentLinkUrl?: string | null): Promise<DispatchResult> {
  const invoice = await getInvoiceWithRelations(invoiceId);
  if (!invoice) {
    throw new Error("Invoice not found");
  }

  // Use the provided payment link URL if available (to avoid race conditions)
  const invoiceWithPaymentLink = paymentLinkUrl ? { ...invoice, paymentLinkUrl } : invoice;

  const results: DispatchResult = {};
  const tasks: Promise<void>[] = [];

  if (invoice.customer.email) {
    tasks.push(
      (async () => {
        const html = buildEmailHtml(invoiceWithPaymentLink);
        const text = buildEmailText(invoiceWithPaymentLink);
        const subject = `Invoice ${invoice.number} from ${invoice.workspace.name}`;
        const response = await sendEmail({ to: invoice.customer.email, subject, html, text });
        if (response.success) {
          results.email = { success: true };
          await recordEvent(invoice.id, InvoiceEventType.SENT_EMAIL, InvoiceEventStatus.SUCCESS, InvoiceEventChannel.EMAIL, {
            providerId: response.id,
          });
        } else {
          results.email = { success: false, error: response.error };
          await recordEvent(invoice.id, InvoiceEventType.SENT_EMAIL, InvoiceEventStatus.FAILED, InvoiceEventChannel.EMAIL, {
            error: response.error,
          });
        }
      })(),
    );
  }

  const phone = sanitizePhone(invoice.customer.phone);
  if (phone) {
    tasks.push(
      (async () => {
        const body = buildSmsMessage(invoiceWithPaymentLink);
        const response = await sendSms({ to: phone, body });
        if (response.success) {
          results.sms = { success: true };
          await recordEvent(invoice.id, InvoiceEventType.SENT_SMS, InvoiceEventStatus.SUCCESS, InvoiceEventChannel.SMS, {
            providerId: response.sid,
          });
        } else {
          results.sms = { success: false, error: response.error };
          await recordEvent(invoice.id, InvoiceEventType.SENT_SMS, InvoiceEventStatus.FAILED, InvoiceEventChannel.SMS, {
            error: response.error,
          });
        }
      })(),
    );
  }

  if (tasks.length === 0) {
    return results;
  }

  await Promise.allSettled(tasks);

  const anySuccess = [results.email?.success, results.sms?.success].some(Boolean);
  if (anySuccess) {
    await prisma.invoice.update({
      where: { id: invoice.id },
      data: {
        status: invoice.status === InvoiceStatus.DRAFT ? InvoiceStatus.SENT : invoice.status,
        sentAt: invoice.sentAt ?? new Date(),
        updatedAt: new Date(),
      },
    });
  }

  return results;
}

export async function recordInvoiceOpen(
  invoiceId: string,
  detail: { ip?: string; userAgent?: string } = {},
): Promise<void> {
  const invoice = await getInvoiceWithRelations(invoiceId);
  if (!invoice) {
    return;
  }

  const now = new Date();
  const firstOpen = invoice.firstOpenedAt ?? now;

  await prisma.invoice.update({
    where: { id: invoice.id },
    data: {
      firstOpenedAt: firstOpen,
      lastOpenedAt: now,
      events: {
        create: {
          type: InvoiceEventType.OPENED,
          status: InvoiceEventStatus.SUCCESS,
          channel: InvoiceEventChannel.SYSTEM,
          detail: detail as Prisma.JsonObject,
        },
      },
    },
  });

  if (!invoice.firstOpenedAt) {
    await notifyWorkspace(invoice, "opened", detail);
  }
}

async function sendReceiptEmail(invoice: InvoiceWithRelations): Promise<void> {
  if (!invoice.customer.email) {
    return;
  }

  const customerName = invoice.customer.primaryContact || invoice.customer.businessName;
  const subtotal = invoice.lineItems.reduce((total, item) => total + Number(item.amount ?? 0), 0);
  const taxAmount = Number(invoice.taxTotal ?? 0);
  const totalAmount = Number(invoice.total);
  const currency = invoice.currency ?? "USD";
  const currencySymbol = currency === 'USD' ? '$' : currency === 'EUR' ? '€' : currency === 'GBP' ? '£' : '';
  
  // Company information
  const workspace = invoice.workspace as WorkspaceWithCompanyInfo;
  const companyName = workspace.companyName || workspace.name;
  const companyEmail = workspace.companyEmail || "notifications@ledgerflow.org";
  const logoUrl = workspace.logoUrl;
  
  // Build line items HTML
  const itemsHtml = invoice.lineItems.map(item => `
    <tr style="border-bottom: 1px solid #f3f4f6;">
      <td style="padding: 12px 0; font-size: 14px; color: #374151;">${item.description}</td>
      <td style="padding: 12px 0; font-size: 14px; color: #374151; text-align: center;">${item.quantity}</td>
      <td style="padding: 12px 0; font-size: 14px; color: #374151; text-align: right;">${currencySymbol}${Number(item.unitPrice).toFixed(2)}</td>
      <td style="padding: 12px 0; font-size: 14px; color: #374151; text-align: right;">${currencySymbol}${Number(item.amount).toFixed(2)}</td>
    </tr>
  `).join('');

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Payment Receipt - Invoice ${invoice.number}</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f9fafb;">
  <div style="padding: 40px 0;">
    <table cellpadding="0" cellspacing="0" style="margin: 0 auto; max-width: 600px; background-color: white; border-radius: 8px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
      <!-- Header -->
      <tr>
        <td style="background-color: #059669; padding: 32px; text-align: center;">
          <div style="background-color: white; width: 64px; height: 64px; border-radius: 50%; margin: 0 auto 16px auto; display: flex; align-items: center; justify-content: center;">
            <span style="font-size: 32px;">✓</span>
          </div>
          ${logoUrl ? `
            <img src="${logoUrl}" alt="${companyName}" style="max-height: 40px; max-width: 150px; margin: 0 auto 12px auto; display: block;" />
          ` : ''}
          <h1 style="color: white; margin: 0; font-size: 24px; font-weight: 600;">Payment Received</h1>
          <p style="color: #d1fae5; margin: 8px 0 0 0; font-size: 16px;">Thank you for your payment!</p>
        </td>
      </tr>
      
      <!-- Main Content -->
      <tr>
        <td style="padding: 32px;">
          <p style="font-size: 16px; line-height: 24px; color: #374151; margin-bottom: 24px;">
            Dear ${customerName},
          </p>
          
          <p style="font-size: 16px; line-height: 24px; color: #374151; margin-bottom: 32px;">
            We have successfully received your payment for Invoice ${invoice.number}. This email serves as your receipt and confirmation.
          </p>

          <!-- Payment Summary -->
          <div style="background-color: #f0fdf4; border-radius: 8px; padding: 24px; margin-bottom: 32px; border: 1px solid #bbf7d0;">
            <h3 style="margin: 0 0 16px 0; color: #059669; font-size: 18px;">Payment Confirmation</h3>
            <table style="width: 100%;">
              <tr>
                <td style="padding-bottom: 12px;">
                  <strong style="color: #6b7280; font-size: 12px; text-transform: uppercase;">Invoice Number</strong>
                  <div style="color: #111827; font-size: 16px; margin-top: 4px;">${invoice.number}</div>
                </td>
                <td style="padding-bottom: 12px; text-align: right;">
                  <strong style="color: #6b7280; font-size: 12px; text-transform: uppercase;">Amount Paid</strong>
                  <div style="color: #059669; font-size: 20px; font-weight: 600; margin-top: 4px;">
                    ${currencySymbol}${totalAmount.toFixed(2)}
                  </div>
                </td>
              </tr>
              <tr>
                <td>
                  <strong style="color: #6b7280; font-size: 12px; text-transform: uppercase;">Payment Date</strong>
                  <div style="color: #111827; font-size: 14px; margin-top: 4px;">${formatDate(new Date())}</div>
                </td>
                <td style="text-align: right;">
                  <strong style="color: #6b7280; font-size: 12px; text-transform: uppercase;">Status</strong>
                  <div style="color: #059669; font-size: 14px; font-weight: 600; margin-top: 4px;">PAID</div>
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
                ${taxAmount > 0 ? `
                <tr>
                  <td colspan="3" style="padding: 12px 0; font-size: 14px; color: #6b7280; text-align: right;">Tax</td>
                  <td style="padding: 12px 0; font-size: 14px; color: #374151; text-align: right;">${currencySymbol}${taxAmount.toFixed(2)}</td>
                </tr>
                ` : ''}
                <tr style="border-top: 2px solid #e5e7eb;">
                  <td colspan="3" style="padding: 12px 0; font-size: 16px; font-weight: 600; color: #111827; text-align: right;">Total Paid</td>
                  <td style="padding: 12px 0; font-size: 16px; font-weight: 600; color: #059669; text-align: right;">${currencySymbol}${totalAmount.toFixed(2)}</td>
                </tr>
              </tfoot>
            </table>
          </div>

          <div style="background-color: #f9fafb; border-radius: 6px; padding: 16px; margin-bottom: 24px; border: 1px solid #e5e7eb;">
            <p style="font-size: 14px; color: #374151; margin: 0;">
              <strong>📧 Keep this email</strong> as your receipt for your records. If you need a printed copy, you can print this email.
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
                  <strong>${companyName}</strong>
                </p>
                <p style="font-size: 12px; color: #6b7280; margin: 0;">
                  ${companyEmail}
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

  const text = `Payment Receipt - Invoice ${invoice.number}

Dear ${customerName},

We have successfully received your payment for Invoice ${invoice.number}. This email serves as your receipt and confirmation.

Payment Details:
- Invoice Number: ${invoice.number}
- Amount Paid: ${currencySymbol}${totalAmount.toFixed(2)}
- Payment Date: ${formatDate(new Date())}
- Status: PAID

Thank you for your business!

${companyName}
${companyEmail}

Keep this email as your receipt for your records.`;

  const subject = `Payment Receipt - Invoice ${invoice.number}`;
  const response = await sendEmail({ 
    to: invoice.customer.email, 
    subject, 
    html, 
    text 
  });

  if (response.success) {
    await recordEvent(invoice.id, InvoiceEventType.SENT_EMAIL, InvoiceEventStatus.SUCCESS, InvoiceEventChannel.EMAIL, {
      type: 'receipt',
      providerId: response.id,
    });
  } else {
    await recordEvent(invoice.id, InvoiceEventType.SENT_EMAIL, InvoiceEventStatus.FAILED, InvoiceEventChannel.EMAIL, {
      type: 'receipt',
      error: response.error,
    });
  }
}

export async function notifyInvoicePaid(invoiceId: string): Promise<void> {
  const invoice = await getInvoiceWithRelations(invoiceId);
  if (!invoice) {
    return;
  }

  if (invoice.paidNotifiedAt) {
    return;
  }

  // Send receipt email to customer
  await sendReceiptEmail(invoice);

  // Notify workspace members
  await notifyWorkspace(invoice, "paid");

  await prisma.invoice.update({
    where: { id: invoice.id },
    data: {
      paidNotifiedAt: new Date(),
      events: {
        create: {
          type: InvoiceEventType.PAID_ALERT,
          status: InvoiceEventStatus.SUCCESS,
          channel: InvoiceEventChannel.SYSTEM,
        },
      },
    },
  });
}

async function notifyWorkspace(
  invoice: InvoiceWithRelations,
  kind: "opened" | "paid",
  detail: { ip?: string; userAgent?: string } = {},
) {
  const recipients = parseAlertRecipients(invoice);
  if (recipients.length === 0) {
    return;
  }

  const { formattedTotal, dueDate } = buildInvoiceSummary(invoice);
  const invoiceUrl = buildEmailUrl(`invoices/${invoice.id}`);

  const subject =
    kind === "opened"
      ? `Invoice ${invoice.number} was opened by ${invoice.customer.businessName}`
      : `Invoice ${invoice.number} was paid`;

  const detailLines = [
    `<p><strong>Customer:</strong> ${invoice.customer.businessName}</p>`,
    `<p><strong>Total:</strong> ${formattedTotal}</p>`,
    `<p><strong>Due date:</strong> ${dueDate}</p>`,
    `<p><strong>Invoice:</strong> <a href="${invoiceUrl}">${invoiceUrl}</a></p>`,
  ];

  if (detail.ip) {
    detailLines.push(`<p><strong>IP:</strong> ${detail.ip}</p>`);
  }
  if (detail.userAgent) {
    detailLines.push(`<p><strong>User agent:</strong> ${detail.userAgent}</p>`);
  }

  const html = `<div style="font-family: sans-serif; line-height:1.6;">
    <h2>${subject}</h2>
    ${detailLines.join("\n")}
  </div>`;

  const text = `${subject}\nCustomer: ${invoice.customer.businessName}\nTotal: ${formattedTotal}\nInvoice: ${invoiceUrl}`;

  const response = await sendEmail({ to: recipients, subject, html, text });

  await recordEvent(
    invoice.id,
    InvoiceEventType.ALERT_EMAIL,
    response.success ? InvoiceEventStatus.SUCCESS : InvoiceEventStatus.FAILED,
    InvoiceEventChannel.EMAIL,
    {
      kind,
      error: response.error,
    },
  );
}
