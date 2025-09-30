"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { InvoiceStatus } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { maybeCreateStripePaymentLink } from "@/lib/services/payment-link-service";
import { createInvoice, updateInvoice, deleteInvoice } from "@/lib/services/invoice-service";
import {
  dispatchInvoice,
  notifyInvoicePaid,
} from "@/lib/services/invoice-notification-service";
import { invoiceFormSchema, type InvoiceFormValues } from "@/lib/validations/invoice";

export async function createInvoiceAction(rawValues: InvoiceFormValues) {
  const user = await getCurrentUser();
  const values = invoiceFormSchema.parse(rawValues);

  const invoice = await createInvoice(user.workspaceId, values);

  console.log('🔗 Payment link enabled:', values.enablePaymentLink);
  let createdPaymentLink: string | null = null;
  if (values.enablePaymentLink) {
    console.log('🔗 Creating payment link for invoice:', invoice.number);
    const paymentLink = await maybeCreateStripePaymentLink(invoice);
    if (paymentLink) {
      console.log('✅ Payment link created, updating invoice with URL:', paymentLink);
      await prisma.invoice.update({
        where: { id: invoice.id },
        data: { paymentLinkUrl: paymentLink },
      });
      createdPaymentLink = paymentLink;
    } else {
      console.log('❌ Payment link creation failed');
    }
  }

  if (values.status === InvoiceStatus.SENT) {
    await dispatchInvoice(invoice.id, createdPaymentLink);
  }

  revalidatePath("/dashboard");
  revalidatePath("/invoices");
  revalidatePath(`/invoices/${invoice.id}`);

  if (values.status === InvoiceStatus.SENT) {
    redirect(`/invoices/${invoice.id}?sent=1`);
  }

  return { id: invoice.id };
}

export async function updateInvoiceAction(invoiceId: string, rawValues: InvoiceFormValues) {
  const user = await getCurrentUser();
  const values = invoiceFormSchema.parse(rawValues);

  const existing = await prisma.invoice.findFirst({
    where: { id: invoiceId, workspaceId: user.workspaceId },
    select: { status: true },
  });

  if (!existing) {
    throw new Error("Invoice not found");
  }

  const updated = await updateInvoice(user.workspaceId, invoiceId, values);

  let latestInvoice = updated;
  let updatedPaymentLink: string | null = null;

  if (values.enablePaymentLink) {
    const paymentLink = await maybeCreateStripePaymentLink(updated);
    if (paymentLink) {
      latestInvoice = await prisma.invoice.update({
        where: { id: updated.id },
        data: { paymentLinkUrl: paymentLink },
        include: {
          customer: true,
          lineItems: true,
        },
      });
      updatedPaymentLink = paymentLink;
    }
  }

  if (values.status === InvoiceStatus.SENT && existing.status !== InvoiceStatus.SENT) {
    await dispatchInvoice(invoiceId, updatedPaymentLink || latestInvoice.paymentLinkUrl);
  }

  if (values.status === InvoiceStatus.PAID && existing.status !== InvoiceStatus.PAID) {
    await notifyInvoicePaid(invoiceId);
  }

  revalidatePath("/dashboard");
  revalidatePath("/invoices");
  revalidatePath(`/invoices/${invoiceId}`);

  return { id: latestInvoice.id };
}

export async function updateInvoiceStatusAction(invoiceId: string, status: InvoiceStatus) {
  const user = await getCurrentUser();
  
  // First, fetch the invoice to check if we need to create a payment link
  const invoice = await prisma.invoice.findFirst({
    where: { id: invoiceId, workspaceId: user.workspaceId },
    include: {
      lineItems: true,
      customer: true,
    },
  });

  if (!invoice) {
    throw new Error("Invoice not found");
  }

  // Create Stripe payment link if sending and not already created
  let paymentLinkToUse = invoice.paymentLinkUrl;
  if (status === InvoiceStatus.SENT && !invoice.paymentLinkUrl) {
    const paymentLink = await maybeCreateStripePaymentLink(invoice);
    if (paymentLink) {
      await prisma.invoice.update({
        where: { id: invoice.id },
        data: { 
          status,
          paymentLinkUrl: paymentLink 
        },
      });
      paymentLinkToUse = paymentLink;
    } else {
      await prisma.invoice.update({
        where: { id: invoice.id },
        data: { status },
      });
    }
  } else {
    await prisma.invoice.update({
      where: { id: invoice.id },
      data: { status },
    });
  }

  if (status === InvoiceStatus.SENT) {
    await dispatchInvoice(invoiceId, paymentLinkToUse);
  }

  if (status === InvoiceStatus.PAID) {
    await notifyInvoicePaid(invoiceId);
  }

  revalidatePath("/dashboard");
  revalidatePath("/invoices");
  revalidatePath(`/invoices/${invoiceId}`);
}

export async function sendInvoiceAction(invoiceId: string) {
  const user = await getCurrentUser();
  const invoice = await prisma.invoice.findFirst({
    where: { id: invoiceId, workspaceId: user.workspaceId },
    include: {
      lineItems: true,
      customer: true,
    },
  });

  if (!invoice) {
    throw new Error("Invoice not found");
  }

  // Create Stripe payment link if not already created
  console.log('📧 Sending invoice:', invoice.number, 'Has payment link:', !!invoice.paymentLinkUrl);
  let updatedPaymentLinkUrl = invoice.paymentLinkUrl;
  if (!invoice.paymentLinkUrl) {
    console.log('🔗 Creating payment link for sending invoice');
    const paymentLink = await maybeCreateStripePaymentLink(invoice);
    if (paymentLink) {
      console.log('✅ Payment link created for sending, updating invoice:', paymentLink);
      await prisma.invoice.update({
        where: { id: invoice.id },
        data: { paymentLinkUrl: paymentLink },
      });
      updatedPaymentLinkUrl = paymentLink;
    } else {
      console.log('❌ Payment link creation failed for sending');
    }
  }

  // Pass the payment link URL to ensure the email uses the correct URL
  const result = await dispatchInvoice(invoiceId, updatedPaymentLinkUrl);

  revalidatePath("/dashboard");
  revalidatePath("/invoices");
  revalidatePath(`/invoices/${invoiceId}`);

  return result;
}

export async function deleteInvoiceAction(invoiceId: string) {
  const user = await getCurrentUser();
  
  await deleteInvoice(user.workspaceId, invoiceId);

  revalidatePath("/dashboard");
  revalidatePath("/invoices");
}
