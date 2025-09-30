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
  if (invoice.paymentLinkUrl) {
    return invoice.paymentLinkUrl;
  }
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
            <a href="${invoiceUrl}" style="display: inline-block; background-color: #3b82f6; color: white; padding: 16px 32px; border-radius: 6px; text-decoration: none; font-size: 16px; font-weight: 600; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
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
              ${invoiceUrl}
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
  
  <!-- Tracking Pixel -->
  <img src="${trackingUrl}" alt="" width="1" height="1" style="display: none;" />
</body>
</html>`;
}

function buildEmailText(invoice: InvoiceWithRelations) {
  const { formattedTotal, dueDate } = buildInvoiceSummary(invoice);
  const invoiceUrl = getInvoiceUrl(invoice);
  
  return `Invoice ${invoice.number} from ${invoice.workspace.name}

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
${invoice.workspace.name}

Email: notifications@ledgerflow.org
Website: https://ledgerflow.org

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

export async function dispatchInvoice(invoiceId: string): Promise<DispatchResult> {
  const invoice = await getInvoiceWithRelations(invoiceId);
  if (!invoice) {
    throw new Error("Invoice not found");
  }

  const results: DispatchResult = {};
  const tasks: Promise<void>[] = [];

  if (invoice.customer.email) {
    tasks.push(
      (async () => {
        const html = buildEmailHtml(invoice);
        const text = buildEmailText(invoice);
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
        const body = buildSmsMessage(invoice);
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

export async function notifyInvoicePaid(invoiceId: string): Promise<void> {
  const invoice = await getInvoiceWithRelations(invoiceId);
  if (!invoice) {
    return;
  }

  if (invoice.paidNotifiedAt) {
    return;
  }

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
