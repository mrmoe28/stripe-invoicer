import {
  InvoiceEventChannel,
  InvoiceEventStatus,
  InvoiceEventType,
  InvoiceStatus,
  MembershipRole,
  Prisma,
} from "@prisma/client";
import { renderToStaticMarkup } from "react-dom/server";

import { InvoiceEmailTemplate } from "@/lib/email/invoice-template";
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
  
  const items = invoice.lineItems.map(item => ({
    description: item.description,
    quantity: item.quantity,
    price: Number(item.unitPrice).toFixed(2),
    total: Number(item.amount).toFixed(2),
  }));

  const subtotal = invoice.lineItems.reduce((total, item) => total + Number(item.amount ?? 0), 0);
  const taxAmount = Number(invoice.taxTotal ?? 0);
  
  const emailElement = InvoiceEmailTemplate({
    customerName: invoice.customer.primaryContact || invoice.customer.businessName,
    invoiceNumber: invoice.number,
    invoiceDate: formatDate(invoice.issueDate),
    dueDate: formatDate(invoice.dueDate),
    amount: Number(invoice.total).toFixed(2),
    currency: invoice.currency ?? "USD",
    paymentLink: invoiceUrl,
    items,
    businessName: invoice.workspace.name,
    businessEmail: "notifications@ledgerflow.org",
    businessAddress: invoice.workspace.address || undefined,
    customerEmail: invoice.customer.email || undefined,
    notes: invoice.notes || undefined,
    subtotal: subtotal.toFixed(2),
    tax: taxAmount > 0 ? taxAmount.toFixed(2) : undefined,
    total: Number(invoice.total).toFixed(2),
  });

  const html = renderToStaticMarkup(emailElement);
  const trackingUrl = getTrackingPixelUrl(invoice);
  
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Invoice ${invoice.number} from ${invoice.workspace.name}</title>
</head>
<body style="margin: 0; padding: 0;">
  ${html}
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
