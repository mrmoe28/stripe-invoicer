import Link from "next/link";

import { CustomerForm } from "@/components/forms/customer-form";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function NewCustomerPage() {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle className="text-2xl">New customer</CardTitle>
            <CardDescription>Create a customer profile for invoicing and reminders.</CardDescription>
          </div>
          <Button variant="outline" asChild>
            <Link href="/customers">Back to customers</Link>
          </Button>
        </CardHeader>
      </Card>
      <Card>
        <CardContent className="py-6">
          <CustomerForm />
        </CardContent>
      </Card>
    </div>
  );
}
