import Link from "next/link";
import { subDays } from "date-fns";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { getCurrentUser } from "@/lib/auth";
import { listCustomers } from "@/lib/services/customer-service";
import { formatCurrency } from "@/lib/utils";

const statusCopy = {
  active: "Active",
  late: "Payment due",
  "churn-risk": "Churn risk",
} as const;

const statusVariant = {
  active: "success",
  late: "warning",
  "churn-risk": "destructive",
} as const;

export default async function CustomersPage() {
  const user = await getCurrentUser();
  const customers = await listCustomers(user.workspaceId);
  const churnThreshold = subDays(new Date(), 60);

  const rows = customers.map((customer) => {
    const invoices = customer.invoices ?? [];
    const totalRevenue = invoices.reduce((acc, invoice) => acc + Number(invoice.total ?? 0), 0);
    const hasOverdue = invoices.some((invoice) => invoice.status === "OVERDUE");
    const recentActivity = invoices.some((invoice) => invoice.createdAt && invoice.createdAt > churnThreshold);

    const status = hasOverdue ? "late" : recentActivity ? "active" : "churn-risk";

    return {
      id: customer.id,
      name: customer.businessName,
      email: customer.email,
      customerType: "customerType" in customer ? customer.customerType as string : "BUSINESS",
      revenue: totalRevenue,
      invoiceCount: invoices.length,
      status,
    } as const;
  }).sort((a, b) => b.revenue - a.revenue);

  return (
    <div className="flex flex-col gap-6">
      <Card>
        <CardHeader>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle className="text-2xl">Customers</CardTitle>
              <CardDescription>Stripe customer profiles with payment history.</CardDescription>
            </div>
            <Button className="gap-2" asChild>
              <Link href="/customers/new">Add customer</Link>
            </Button>
          </div>
        </CardHeader>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Top accounts</CardTitle>
          <CardDescription>Segmentation by revenue contribution.</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Total revenue</TableHead>
                <TableHead>Invoices</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((customer) => (
                <TableRow key={customer.id}>
                  <TableCell className="font-medium">{customer.name}</TableCell>
                  <TableCell>
                    <Badge variant="outline">
                      {customer.customerType === "INDIVIDUAL" ? "Individual" : "Business"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground">{customer.email}</TableCell>
                  <TableCell>{formatCurrency(customer.revenue)}</TableCell>
                  <TableCell>{customer.invoiceCount}</TableCell>
                  <TableCell>
                    <Badge variant={statusVariant[customer.status]}>
                      {statusCopy[customer.status]}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button variant="ghost" size="sm" asChild>
                        <Link href={`/customers/${customer.id}/edit`}>Edit</Link>
                      </Button>
                      <Button variant="ghost" size="sm" asChild>
                        <Link href={`/customers/${customer.id}`}>View</Link>
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {rows.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-sm text-muted-foreground">
                    No customers yet. Import your Stripe customers or create one manually.
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
