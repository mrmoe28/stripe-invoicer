"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { InvoiceStatus } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { maybeCreateStripePaymentLink } from "@/lib/services/payment-link-service";
import { createInvoice, updateInvoice } from "@/lib/services/invoice-service";
import {
  dispatchInvoice,
  notifyInvoicePaid,
} from "@/lib/services/invoice-notification-service";
import { invoiceFormSchema, type InvoiceFormValues } from "@/lib/validations/invoice";

export async function createInvoiceAction(rawValues: InvoiceFormValues) {
  const user = await getCurrentUser();
  const values = invoiceFormSchema.parse(rawValues);

  const invoice = await createInvoice(user.workspaceId, values);

  if (values.enablePaymentLink) {
    const paymentLink = await maybeCreateStripePaymentLink(invoice);
    if (paymentLink) {
      await prisma.invoice.update({
        where: { id: invoice.id },
        data: { paymentLinkUrl: paymentLink },
      });
    }
  }

  if (values.status === InvoiceStatus.SENT) {
    await dispatchInvoice(invoice.id);
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
    }
  }

  if (values.status === InvoiceStatus.SENT && existing.status !== InvoiceStatus.SENT) {
    await dispatchInvoice(invoiceId);
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
    await dispatchInvoice(invoiceId);
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
  if (!invoice.paymentLinkUrl) {
    const paymentLink = await maybeCreateStripePaymentLink(invoice);
    if (paymentLink) {
      await prisma.invoice.update({
        where: { id: invoice.id },
        data: { paymentLinkUrl: paymentLink },
      });
    }
  }

  const result = await dispatchInvoice(invoiceId);

  revalidatePath("/dashboard");
  revalidatePath("/invoices");
  revalidatePath(`/invoices/${invoiceId}`);

  return result;
}
