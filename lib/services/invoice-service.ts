import { DepositType, InvoiceStatus, Prisma } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import type { InvoiceFormValues } from "@/lib/validations/invoice";

async function nextInvoiceNumber(workspaceId: string) {
  const latest = await prisma.invoice.findFirst({
    where: { workspaceId },
    orderBy: { createdAt: "desc" },
    select: { number: true },
  });

  const latestNumber = latest?.number ?? "INV-2000";
  const match = latestNumber.match(/^(\D*)(\d+)$/);
  if (!match) {
    return "INV-2001";
  }

  const [, prefix, numeric] = match;
  const next = Number.parseInt(numeric, 10) + 1;
  return `${prefix}${next}`;
}

export async function listInvoices(workspaceId: string) {
  return prisma.invoice.findMany({
    where: { workspaceId },
    orderBy: { issueDate: "desc" },
    include: {
      customer: true,
      payments: true,
    },
  });
}

export async function getInvoiceById(workspaceId: string, invoiceId: string) {
  return prisma.invoice.findFirst({
    where: { id: invoiceId, workspaceId },
    include: {
      customer: true,
      lineItems: {
        orderBy: { sortOrder: "asc" },
      },
      payments: true,
    },
  });
}

export async function createInvoice(workspaceId: string, values: InvoiceFormValues) {
  const subtotal = values.lineItems.reduce(
    (acc, item) => acc + item.quantity * item.unitPrice,
    0,
  );
  const total = subtotal; // taxes/discounts handled later

  const rawDeposit = values.requiresDeposit
    ? values.depositType === "PERCENTAGE"
      ? subtotal * (values.depositValue / 100)
      : values.depositValue
    : 0;

  const safeRawDeposit = Number.isFinite(rawDeposit) ? rawDeposit : 0;
  const normalizedDeposit = Math.min(Math.max(safeRawDeposit, 0), subtotal);

  const invoiceNumber = await nextInvoiceNumber(workspaceId);

  const dueDate = new Date(values.dueDate);
  const issueDate = new Date(values.issueDate);

  const depositData: Partial<Prisma.InvoiceCreateInput> = values.requiresDeposit
    ? {
        requiresDeposit: true,
        depositType: values.depositType as DepositType,
        depositValue: new Prisma.Decimal(values.depositValue),
        depositAmount: new Prisma.Decimal(normalizedDeposit),
        depositDueDate: values.depositDueDate ? new Date(values.depositDueDate) : dueDate,
      }
    : {
        requiresDeposit: false,
      };

  const data: Prisma.InvoiceCreateInput = {
    number: invoiceNumber,
    status: values.status as InvoiceStatus,
    currency: values.currency,
    issueDate,
    dueDate,
    subtotal: new Prisma.Decimal(subtotal),
    taxTotal: new Prisma.Decimal(0),
    discountTotal: new Prisma.Decimal(0),
    total: new Prisma.Decimal(total),
    ...depositData,
    notes: values.notes ?? undefined,
    workspace: { connect: { id: workspaceId } },
    customer: { connect: { id: values.customerId } },
    lineItems: {
      create: values.lineItems.map((item, index) => ({
        description: item.description,
        quantity: item.quantity,
        unitPrice: new Prisma.Decimal(item.unitPrice),
        amount: new Prisma.Decimal(item.quantity * item.unitPrice),
        sortOrder: index,
      })),
    },
  };

  return prisma.invoice.create({
    data,
    include: {
      customer: true,
      lineItems: true,
    },
  });
}

export async function updateInvoice(workspaceId: string, invoiceId: string, values: InvoiceFormValues) {
  const subtotal = values.lineItems.reduce(
    (acc, item) => acc + item.quantity * item.unitPrice,
    0,
  );
  const total = subtotal;

  const rawDeposit = values.requiresDeposit
    ? values.depositType === "PERCENTAGE"
      ? subtotal * (values.depositValue / 100)
      : values.depositValue
    : 0;

  const safeRawDeposit = Number.isFinite(rawDeposit) ? rawDeposit : 0;
  const normalizedDeposit = Math.min(Math.max(safeRawDeposit, 0), subtotal);

  const issueDate = new Date(values.issueDate);
  const dueDate = new Date(values.dueDate);

  const depositData: Partial<Prisma.InvoiceUpdateInput> = values.requiresDeposit
    ? {
        requiresDeposit: true,
        depositType: values.depositType as DepositType,
        depositValue: new Prisma.Decimal(values.depositValue),
        depositAmount: new Prisma.Decimal(normalizedDeposit),
        depositDueDate: values.depositDueDate ? new Date(values.depositDueDate) : dueDate,
      }
    : {
        requiresDeposit: false,
        depositType: null,
        depositValue: null,
        depositAmount: null,
        depositDueDate: null,
      };

  return prisma.invoice.update({
    where: { id: invoiceId, workspaceId },
    data: {
      status: values.status as InvoiceStatus,
      currency: values.currency,
      issueDate,
      dueDate,
      subtotal: new Prisma.Decimal(subtotal),
      taxTotal: new Prisma.Decimal(0),
      discountTotal: new Prisma.Decimal(0),
      total: new Prisma.Decimal(total),
      notes: values.notes ?? undefined,
      customer: { connect: { id: values.customerId } },
      lineItems: {
        deleteMany: {},
        create: values.lineItems.map((item, index) => ({
          description: item.description,
          quantity: item.quantity,
          unitPrice: new Prisma.Decimal(item.unitPrice),
          amount: new Prisma.Decimal(item.quantity * item.unitPrice),
          sortOrder: index,
        })),
      },
      ...depositData,
    },
    include: {
      customer: true,
      lineItems: true,
    },
  });
}

export async function deleteInvoice(workspaceId: string, invoiceId: string) {
  // First verify the invoice exists and belongs to the workspace
  const invoice = await prisma.invoice.findFirst({
    where: { id: invoiceId, workspaceId },
    select: { id: true, status: true },
  });

  if (!invoice) {
    throw new Error("Invoice not found");
  }

  // Delete the invoice and its related data (line items, events, etc.)
  // Prisma will handle cascading deletes based on the schema
  return prisma.invoice.delete({
    where: { id: invoiceId },
  });
}
