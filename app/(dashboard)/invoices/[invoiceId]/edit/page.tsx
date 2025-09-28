import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { InvoiceForm, type InvoiceFormInvoice } from "@/components/forms/invoice-form";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getCurrentUser } from "@/lib/auth";
import { listCustomers } from "@/lib/services/customer-service";
import { getInvoiceById } from "@/lib/services/invoice-service";

export const metadata: Metadata = {
  title: "Edit invoice",
};

function toPlainInvoice(invoice: NonNullable<Awaited<ReturnType<typeof getInvoiceById>>>) {
  return {
    id: invoice.id,
    customerId: invoice.customerId,
    issueDate: invoice.issueDate.toISOString().split("T")[0] ?? "",
    dueDate: invoice.dueDate.toISOString().split("T")[0] ?? "",
    currency: invoice.currency,
    status: invoice.status,
    notes: invoice.notes ?? "",
    paymentLinkUrl: invoice.paymentLinkUrl,
    requiresDeposit: invoice.requiresDeposit ?? false,
    depositType: invoice.depositType ?? undefined,
    depositValue: invoice.depositValue != null ? Number(invoice.depositValue) : null,
    depositDueDate: invoice.depositDueDate ? invoice.depositDueDate.toISOString().split("T")[0] : null,
    lineItems: invoice.lineItems.map((item) => ({
      id: item.id,
      description: item.description,
      quantity: item.quantity,
      unitPrice: Number(item.unitPrice ?? 0),
    })),
  } satisfies InvoiceFormInvoice;
}

export default async function EditInvoicePage({ params }: { params: Promise<{ invoiceId: string }> }) {
  const user = await getCurrentUser();
  const resolvedParams = await params;

  const [customers, invoice] = await Promise.all([
    listCustomers(user.workspaceId),
    getInvoiceById(user.workspaceId, resolvedParams.invoiceId),
  ]);

  if (!invoice) {
    notFound();
  }

  const customerOptions = customers.map((customer) => ({
    id: customer.id,
    businessName: customer.businessName,
    email: customer.email,
  }));

  const plainInvoice = toPlainInvoice(invoice);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle className="text-2xl">Edit invoice</CardTitle>
            <CardDescription>
              Update amounts, statuses, or deposit requirements for invoice {invoice.number}.
            </CardDescription>
          </div>
          <Button variant="outline" asChild>
            <Link href={`/invoices/${invoice.id}`}>Back to invoice</Link>
          </Button>
        </CardHeader>
      </Card>

      <Card>
        <CardContent className="py-6">
          <InvoiceForm customers={customerOptions} invoice={plainInvoice} />
        </CardContent>
      </Card>
    </div>
  );
}
