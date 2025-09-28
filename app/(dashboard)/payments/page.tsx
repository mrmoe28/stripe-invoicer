import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { getCurrentUser } from "@/lib/auth";
import { listPayments } from "@/lib/services/payment-service";
import { formatCurrency, formatDate } from "@/lib/utils";

const statusCopy = {
  SUCCEEDED: "Succeeded",
  FAILED: "Failed",
  PENDING: "Pending",
  REFUNDED: "Refunded",
} as const;

const statusVariant = {
  SUCCEEDED: "success",
  FAILED: "destructive",
  PENDING: "warning",
  REFUNDED: "secondary",
} as const;

export default async function PaymentsPage() {
  const user = await getCurrentUser();
  const payments = await listPayments(user.workspaceId);

  return (
    <div className="flex flex-col gap-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl">Payments</CardTitle>
          <CardDescription>Stripe transaction history and settlement timeline.</CardDescription>
        </CardHeader>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Recent payments</CardTitle>
          <CardDescription>Includes failed or pending card attempts.</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Payment</TableHead>
                <TableHead>Invoice</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Processed</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Method</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {payments.map((payment) => (
                <TableRow key={payment.id}>
                  <TableCell className="font-medium">{payment.id}</TableCell>
                  <TableCell>{payment.invoice?.number}</TableCell>
                  <TableCell>{payment.invoice?.customer?.businessName}</TableCell>
                  <TableCell>{payment.processedAt ? formatDate(payment.processedAt) : "N/A"}</TableCell>
                  <TableCell>{formatCurrency(Number(payment.amount ?? 0))}</TableCell>
                  <TableCell className="uppercase text-muted-foreground">
                    {payment.method ?? "card"}
                  </TableCell>
                  <TableCell>
                    <Badge variant={statusVariant[payment.status]}>
                      {statusCopy[payment.status]}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
              {payments.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-sm text-muted-foreground">
                    No payments yet. Collect payments via Stripe payment links to populate this table.
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
