import { notFound } from "next/navigation";

import { EditCustomerForm } from "@/components/forms/edit-customer-form";
import { getCurrentUser } from "@/lib/auth";
import { getCustomerById } from "@/lib/services/customer-service";

export default async function EditCustomerPage({ 
  params 
}: { 
  params: Promise<{ customerId: string }> 
}) {
  const user = await getCurrentUser();
  const resolvedParams = await params;
  const customer = await getCustomerById(user.workspaceId, resolvedParams.customerId);

  if (!customer) {
    notFound();
  }

  return (
    <div className="mx-auto max-w-2xl">
      <EditCustomerForm customer={customer} />
    </div>
  );
}