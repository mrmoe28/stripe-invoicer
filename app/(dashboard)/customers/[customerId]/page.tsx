import Link from "next/link";
import { notFound } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { getCurrentUser } from "@/lib/auth";
import { getCustomerById } from "@/lib/services/customer-service";
import { formatCurrency, formatDate } from "@/lib/utils";

const statusVariant = {
  DRAFT: "outline",
  SENT: "secondary",
  PAID: "success",
  OVERDUE: "destructive",
  VOID: "destructive",
} as const;

export default async function CustomerDetailPage({ params }: { params: Promise<{ customerId: string }> }) {
  const user = await getCurrentUser();
  const resolvedParams = await params;
  const customer = await getCustomerById(user.workspaceId, resolvedParams.customerId);

  if (!customer) {
    notFound();
  }

  const lifetimeValue = customer.invoices.reduce((acc, invoice) => acc + Number(invoice.total ?? 0), 0);
  const openInvoices = customer.invoices.filter((invoice) => invoice.status !== "PAID" && invoice.status !== "VOID");

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle className="text-2xl">{customer.businessName}</CardTitle>
            <CardDescription>{customer.email}</CardDescription>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" asChild>
              <Link href={`/customers/${customer.id}/edit`}>Edit customer</Link>
            </Button>
            <Button variant="outline" asChild>
              <Link href={`/invoices/new?customerId=${customer.id}`}>Create invoice</Link>
            </Button>
          </div>
        </CardHeader>
        <CardContent className="grid gap-6 lg:grid-cols-3">
          <div>
            <p className="text-sm text-muted-foreground">Lifetime revenue</p>
            <p className="text-xl font-semibold text-foreground">{formatCurrency(lifetimeValue)}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Open invoices</p>
            <p className="text-xl font-semibold text-foreground">{openInvoices.length}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Primary contact</p>
            <p className="text-lg text-foreground">{customer.primaryContact ?? "—"}</p>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-[2fr,1fr]">
        <Card>
          <CardHeader>
            <CardTitle>Invoice history</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Invoice</TableHead>
                  <TableHead>Issued</TableHead>
                  <TableHead>Total</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {customer.invoices.map((invoice) => (
                  <TableRow key={invoice.id}>
                    <TableCell className="font-medium">
                      <Link href={`/invoices/${invoice.id}`} className="text-primary underline">
                        {invoice.number ?? invoice.id}
                      </Link>
                    </TableCell>
                    <TableCell>{invoice.issueDate ? formatDate(invoice.issueDate) : "—"}</TableCell>
                    <TableCell>{formatCurrency(Number(invoice.total ?? 0))}</TableCell>
                    <TableCell>
                      <Badge variant={statusVariant[invoice.status]}>{invoice.status.toLowerCase()}</Badge>
                    </TableCell>
                  </TableRow>
                ))}
                {customer.invoices.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center text-sm text-muted-foreground">
                      No invoices yet for this customer.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Billing details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-muted-foreground">
            {customer.phone && <p>Phone: {customer.phone}</p>}
            {customer.addressLine1 && (
              <p>
                {customer.addressLine1}
                {customer.addressLine2 ? `, ${customer.addressLine2}` : ""}
              </p>
            )}
            {(customer.city || customer.state) && (
              <p>
                {[customer.city, customer.state, customer.postalCode].filter(Boolean).join(", ")}
              </p>
            )}
            {customer.country && <p>{customer.country}</p>}
            {customer.notes && (
              <p className="mt-4 whitespace-pre-wrap text-muted-foreground">{customer.notes}</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
