import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Icon } from "@/components/icons";
import { DeleteInvoiceButton } from "@/components/forms/delete-invoice-button";
import { getCurrentUser } from "@/lib/auth";
import { listInvoices } from "@/lib/services/invoice-service";
import { formatCurrency, formatDate } from "@/lib/utils";

const statusCopy = {
  DRAFT: "Draft",
  SENT: "Sent",
  PAID: "Paid",
  OVERDUE: "Overdue",
  VOID: "Void",
} as const;

const statusVariant = {
  DRAFT: "outline",
  SENT: "secondary",
  PAID: "success",
  OVERDUE: "destructive",
  VOID: "destructive",
} as const;

export default async function InvoicesPage() {
  const user = await getCurrentUser();
  const invoices = await listInvoices(user.workspaceId);

  return (
    <div className="flex flex-col gap-6">
      <Card>
        <CardHeader>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle className="text-2xl">Invoices</CardTitle>
              <CardDescription>Organize client billing, filters, and quick exports.</CardDescription>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" asChild>
                <Link href="/invoices/templates">Templates</Link>
              </Button>
              <Button className="gap-2" asChild>
                <Link href="/invoices/new">
                  <Icon name="plus" className="size-4" />
                  New invoice
                </Link>
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <p className="text-sm text-muted-foreground">
              Sync status: <span className="font-medium text-foreground">Square webhook ready</span>
            </p>
            <div className="flex gap-2">
              <Button variant="outline">Export CSV</Button>
              <Button variant="secondary">Download PDFs</Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Invoices queue</CardTitle>
          <CardDescription>Upcoming due dates and collection status.</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Invoice</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Issued</TableHead>
                <TableHead>Due</TableHead>
                <TableHead>Total</TableHead>
                <TableHead>Balance</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {invoices.map((invoice) => {
                const total = Number(invoice.total ?? 0);
                const succeededPayments =
                  invoice.payments?.filter((p) => p.status === "SUCCEEDED") ?? [];
                const totalPaid = succeededPayments.reduce(
                  (sum, p) => sum + Number(p.amount),
                  0
                );
                const balance = Math.max(total - totalPaid, 0);
                const hasPayments = succeededPayments.length > 0;
                return (
                <TableRow key={invoice.id}>
                  <TableCell className="font-medium">{invoice.number}</TableCell>
                  <TableCell>{invoice.customer.businessName}</TableCell>
                  <TableCell>{formatDate(invoice.issueDate)}</TableCell>
                  <TableCell>{formatDate(invoice.dueDate)}</TableCell>
                  <TableCell>{formatCurrency(total)}</TableCell>
                  <TableCell>
                    {hasPayments ? (
                      balance === 0 ? (
                        <span className="text-muted-foreground">Paid</span>
                      ) : (
                        formatCurrency(balance)
                      )
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge variant={statusVariant[invoice.status]}>
                      {statusCopy[invoice.status]}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Button variant="ghost" size="sm" asChild>
                        <Link href={`/invoices/${invoice.id}`}>View</Link>
                      </Button>
                      <DeleteInvoiceButton 
                        invoiceId={invoice.id} 
                        invoiceNumber={invoice.number} 
                      />
                    </div>
                  </TableCell>
                </TableRow>
              );
              })}
              {invoices.length === 0 && (
                <TableRow>
                  <TableCell colSpan={8} className="text-center text-sm text-muted-foreground">
                    No invoices yet. Create your first invoice to get started.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
