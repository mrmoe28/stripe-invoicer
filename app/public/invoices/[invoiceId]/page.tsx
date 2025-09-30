import { notFound } from "next/navigation";
import Image from "next/image";
import { InvoiceStatus } from "@prisma/client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { prisma } from "@/lib/prisma";
import { formatCurrency, formatDate } from "@/lib/utils";

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

async function getPublicInvoice(invoiceId: string) {
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
          companyAddress: true,
          companyCity: true,
          companyState: true,
          companyZip: true,
          companyCountry: true,
        },
      },
    },
  });
}

export default async function PublicInvoicePage({ params }: { params: Promise<{ invoiceId: string }> }) {
  const resolvedParams = await params;
  const invoice = await getPublicInvoice(resolvedParams.invoiceId);

  if (!invoice) {
    notFound();
  }

  // Only show public view for sent invoices, overdue invoices, or paid invoices
  if (invoice.status === InvoiceStatus.DRAFT) {
    notFound();
  }

  const subtotal = Number(invoice.subtotal ?? 0);
  const total = Number(invoice.total ?? subtotal);
  const taxAmount = Number(invoice.taxTotal ?? 0);

  // Company information
  const companyName = invoice.workspace.companyName || invoice.workspace.name;
  const companyEmail = invoice.workspace.companyEmail;
  const companyPhone = invoice.workspace.companyPhone;
  const companyWebsite = invoice.workspace.companyWebsite;
  const logoUrl = invoice.workspace.logoUrl;

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="mx-auto max-w-4xl px-4">
        {/* Header */}
        <div className="mb-8 text-center">
          {logoUrl && (
            <Image 
              src={logoUrl} 
              alt={companyName} 
              width={200} 
              height={64} 
              className="mx-auto mb-4 h-16 object-contain" 
            />
          )}
          <h1 className="text-3xl font-bold text-gray-900">{companyName}</h1>
          {companyWebsite && (
            <p className="text-gray-600">
              <a href={companyWebsite} className="text-blue-600 hover:underline">
                {companyWebsite.replace(/^https?:\/\//, '')}
              </a>
            </p>
          )}
        </div>

        {/* Invoice Details */}
        <Card className="mb-6">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-2xl">Invoice {invoice.number}</CardTitle>
                <CardDescription>
                  Issued {formatDate(invoice.issueDate)} • Due {formatDate(invoice.dueDate)}
                </CardDescription>
              </div>
              <Badge variant={statusVariant[invoice.status]}>{statusCopy[invoice.status]}</Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid gap-6 md:grid-cols-2">
              {/* Bill To */}
              <div>
                <h3 className="font-semibold text-gray-900 mb-2">Bill To</h3>
                <div className="text-sm text-gray-600 space-y-1">
                  <p className="font-medium text-gray-900">{invoice.customer.businessName}</p>
                  {invoice.customer.primaryContact && <p>{invoice.customer.primaryContact}</p>}
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
                </div>
              </div>

              {/* Amount Due */}
              <div className="text-right">
                <h3 className="font-semibold text-gray-900 mb-2">Amount Due</h3>
                <p className="text-3xl font-bold text-gray-900">{formatCurrency(total)}</p>
                <p className="text-sm text-gray-600">Due {formatDate(invoice.dueDate)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Line Items */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Invoice Items</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Description</TableHead>
                  <TableHead className="text-right">Qty</TableHead>
                  <TableHead className="text-right">Price</TableHead>
                  <TableHead className="text-right">Total</TableHead>
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
            
            {/* Totals */}
            <div className="mt-6 space-y-2 text-right">
              <div className="flex justify-between">
                <span className="text-gray-600">Subtotal</span>
                <span>{formatCurrency(subtotal)}</span>
              </div>
              {taxAmount > 0 && (
                <div className="flex justify-between">
                  <span className="text-gray-600">Tax</span>
                  <span>{formatCurrency(taxAmount)}</span>
                </div>
              )}
              <div className="flex justify-between border-t pt-2 font-semibold text-lg">
                <span>Total</span>
                <span>{formatCurrency(total)}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Payment Section */}
        {invoice.status !== InvoiceStatus.PAID && invoice.status !== InvoiceStatus.VOID && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>Payment</CardTitle>
              <CardDescription>
                Click the button below to pay this invoice securely with Stripe
              </CardDescription>
            </CardHeader>
            <CardContent className="text-center">
              {invoice.paymentLinkUrl ? (
                <div className="space-y-4">
                  <Button size="lg" asChild className="bg-blue-600 hover:bg-blue-700">
                    <a 
                      href={invoice.paymentLinkUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      Pay Invoice Now - {formatCurrency(total)}
                    </a>
                  </Button>
                  <p className="text-sm text-gray-600">
                    🔒 Secure payment powered by Stripe
                  </p>
                  <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                    <p className="text-xs text-gray-600 mb-2">
                      Or copy this link to pay:
                    </p>
                    <p className="text-xs text-blue-600 break-all">
                      {invoice.paymentLinkUrl}
                    </p>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <p className="text-gray-600">
                    Payment link is being generated. Please refresh this page in a moment.
                  </p>
                  <Button variant="outline" asChild>
                    <a href={`/public/invoices/${invoice.id}`}>
                      Refresh Page
                    </a>
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Paid Status */}
        {invoice.status === InvoiceStatus.PAID && (
          <Card className="mb-6 border-green-200 bg-green-50">
            <CardContent className="pt-6 text-center">
              <div className="text-green-600 mb-2">✅</div>
              <h3 className="text-lg font-semibold text-green-800 mb-2">Payment Received</h3>
              <p className="text-green-700">Thank you! This invoice has been paid in full.</p>
            </CardContent>
          </Card>
        )}

        {/* Notes */}
        {invoice.notes && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>Notes</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="whitespace-pre-wrap text-sm text-gray-600">{invoice.notes}</p>
            </CardContent>
          </Card>
        )}

        {/* Footer */}
        <div className="text-center text-sm text-gray-500 mt-8">
          <p>{companyName}</p>
          {companyEmail && <p>{companyEmail}</p>}
          {companyPhone && <p>{companyPhone}</p>}
          <p className="mt-2">Questions? Reply to the invoice email or contact us directly.</p>
        </div>
      </div>
    </div>
  );
}