import Link from "next/link";
import { notFound } from "next/navigation";
import { InvoiceStatus } from "@prisma/client";

import { InvoiceStatusActions } from "@/components/forms/invoice-status-actions";
import { SendInvoiceButton } from "@/components/forms/send-invoice-button";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { getCurrentUser } from "@/lib/auth";
import { getInvoiceById } from "@/lib/services/invoice-service";
import { prisma } from "@/lib/prisma";
import { cn, formatCurrency, formatDate, formatDateTime } from "@/lib/utils";

const statusCopy: Record<InvoiceStatus, string> = {
  DRAFT: "Draft",
  SENT: "Sent",
  PAID: "Paid",
  OVERDUE: "Overdue",
  VOID: "Void",
};

const statusVariant: Record<InvoiceStatus, "outline" | "secondary" | "success" | "destructive"> = {
  DRAFT: "outline",
  SENT: "secondary",
  PAID: "success",
  OVERDUE: "destructive",
  VOID: "destructive",
};

// Get invoice without requiring authentication for public access
async function getInvoiceForPublicAccess(invoiceId: string) {
  return prisma.invoice.findUnique({
    where: { id: invoiceId },
    include: {
      customer: true,
      lineItems: true,
      workspace: {
        select: {
          name: true,
          companyName: true,
          companyEmail: true,
          companyPhone: true,
          companyWebsite: true,
          logoUrl: true,
        },
      },
    },
  });
}

export default async function InvoiceDetailPage({ params }: { params: Promise<{ invoiceId: string }> }) {
  const resolvedParams = await params;
  
  // Try to get current user (may be null for public access)
  let user = null;
  let invoice = null;
  
  try {
    user = await getCurrentUser();
    invoice = await getInvoiceById(user.workspaceId, resolvedParams.invoiceId);
  } catch {
    // User not authenticated, try public access
    invoice = await getInvoiceForPublicAccess(resolvedParams.invoiceId);
  }

  if (!invoice) {
    notFound();
  }
  
  // For public access, only show sent/overdue invoices
  const isPublicAccess = !user;
  if (isPublicAccess && invoice.status === InvoiceStatus.DRAFT) {
    notFound();
  }

  const subtotal = Number(invoice.subtotal ?? 0);
  const total = Number(invoice.total ?? subtotal);
  const depositAmount = Number(invoice.depositAmount ?? 0);
  const remainingBalance = Math.max(total - depositAmount, 0);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle className="text-2xl">Invoice {invoice.number}</CardTitle>
            <CardDescription>
              Issued {formatDate(invoice.issueDate)} · due {formatDate(invoice.dueDate)} to {invoice.customer.businessName}
            </CardDescription>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Link
              href={`/invoices/${invoice.id}/edit`}
              className={cn(buttonVariants.secondary, "h-8 rounded-md px-3 text-xs")}
            >
              Edit
            </Link>
            <SendInvoiceButton invoiceId={invoice.id} disabled={invoice.customer.email == null && invoice.customer.phone == null} />
            <Badge variant={statusVariant[invoice.status]}>{statusCopy[invoice.status]}</Badge>
            <InvoiceStatusActions
              invoiceId={invoice.id}
              currentStatus={invoice.status}
              paymentLinkUrl={invoice.paymentLinkUrl}
            />
          </div>
        </CardHeader>
      </Card>

      <div className="grid gap-6 lg:grid-cols-[2fr,1fr]">
        <Card>
          <CardHeader>
            <CardTitle>Line items</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Description</TableHead>
                  <TableHead className="text-right">Qty</TableHead>
                  <TableHead className="text-right">Unit price</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {invoice.lineItems.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell className="font-medium">{item.description}</TableCell>
                    <TableCell className="text-right">{item.quantity}</TableCell>
                    <TableCell className="text-right">{formatCurrency(Number(item.unitPrice))}</TableCell>
                    <TableCell className="text-right">{formatCurrency(Number(item.amount))}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <div className="mt-6 space-y-1 text-right">
              <p className="text-sm text-muted-foreground">Subtotal {formatCurrency(subtotal)}</p>
              <p className="text-base font-semibold text-foreground">Total {formatCurrency(total)}</p>
            </div>
          </CardContent>
        </Card>
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Delivery timeline</CardTitle>
              <CardDescription>Track outreach and customer engagement.</CardDescription>
            </CardHeader>
            <CardContent>
              <dl className="space-y-3 text-sm">
                <div className="flex items-center justify-between gap-4">
                  <dt className="text-muted-foreground">Sent</dt>
                  <dd>{invoice.sentAt ? formatDateTime(invoice.sentAt) : "Not sent"}</dd>
                </div>
                <div className="flex items-center justify-between gap-4">
                  <dt className="text-muted-foreground">First opened</dt>
                  <dd>{invoice.firstOpenedAt ? formatDateTime(invoice.firstOpenedAt) : "Not yet opened"}</dd>
                </div>
                <div className="flex items-center justify-between gap-4">
                  <dt className="text-muted-foreground">Last opened</dt>
                  <dd>{invoice.lastOpenedAt ? formatDateTime(invoice.lastOpenedAt) : "—"}</dd>
                </div>
                <div className="flex items-center justify-between gap-4">
                  <dt className="text-muted-foreground">Paid alert</dt>
                  <dd>{invoice.paidNotifiedAt ? formatDateTime(invoice.paidNotifiedAt) : "Pending"}</dd>
                </div>
              </dl>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Bill to</CardTitle>
              <CardDescription>{invoice.customer.primaryContact ?? ""}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2 text-sm text-muted-foreground">
              <p className="font-medium text-foreground">{invoice.customer.businessName}</p>
              <p>{invoice.customer.email}</p>
              {invoice.customer.addressLine1 && (
                <p>
                  {invoice.customer.addressLine1}
                  {invoice.customer.addressLine2 ? `, ${invoice.customer.addressLine2}` : ""}
                </p>
              )}
              {(invoice.customer.city || invoice.customer.state) && (
                <p>
                  {[invoice.customer.city, invoice.customer.state, invoice.customer.postalCode]
                    .filter(Boolean)
                    .join(", ")}
                </p>
              )}
              {invoice.customer.country && <p>{invoice.customer.country}</p>}
            </CardContent>
          </Card>

          {invoice.requiresDeposit && (
            <Card>
              <CardHeader>
                <CardTitle>Deposit schedule</CardTitle>
                <CardDescription>
                  Collect an upfront payment and settle the remaining balance when work is complete.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 text-sm text-muted-foreground">
                <dl className="space-y-3">
                  <div className="flex items-center justify-between gap-4">
                    <dt className="text-muted-foreground">Deposit amount</dt>
                    <dd className="font-medium text-foreground">{formatCurrency(depositAmount)}</dd>
                  </div>
                  {invoice.depositType === "PERCENTAGE" && invoice.depositValue != null && (
                    <div className="flex items-center justify-between gap-4">
                      <dt className="text-muted-foreground">Deposit percentage</dt>
                      <dd>{Number(invoice.depositValue)}%</dd>
                    </div>
                  )}
                  <div className="flex items-center justify-between gap-4">
                    <dt className="text-muted-foreground">Deposit due</dt>
                    <dd>{invoice.depositDueDate ? formatDate(invoice.depositDueDate) : "—"}</dd>
                  </div>
                  <div className="flex items-center justify-between gap-4">
                    <dt className="text-muted-foreground">Remaining balance</dt>
                    <dd className="font-medium text-foreground">{formatCurrency(remainingBalance)}</dd>
                  </div>
                </dl>
                <p>
                  Share the payment link below to collect the deposit. Create a follow-up invoice or payment link for the remaining balance when you are ready.
                </p>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle>Payment link</CardTitle>
              <CardDescription>
                Share the hosted checkout for instant card payments.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {invoice.paymentLinkUrl ? (
                <a
                  href={invoice.paymentLinkUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="block truncate text-sm font-medium text-primary underline"
                >
                  {invoice.paymentLinkUrl}
                </a>
              ) : (
                <p className="text-sm text-muted-foreground">
                  Generate a payment link by enabling Stripe keys and re-saving this invoice.
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {invoice.notes && (
        <Card>
          <CardHeader>
            <CardTitle>Notes</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="whitespace-pre-wrap text-sm text-muted-foreground">{invoice.notes}</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
