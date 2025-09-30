"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { getCurrentUser } from "@/lib/auth";
import { createCustomer, updateCustomer } from "@/lib/services/customer-service";
import { customerFormSchema, type CustomerFormValues } from "@/lib/validations/customer";

export async function createCustomerAction(rawValues: CustomerFormValues) {
  const user = await getCurrentUser();
  const values = customerFormSchema.parse(rawValues);

  const customer = await createCustomer(user.workspaceId, values);

  revalidatePath("/customers");
  redirect(`/customers/${customer.id}?created=1`);
}

export async function updateCustomerAction(customerId: string, rawValues: CustomerFormValues) {
  const user = await getCurrentUser();
  const values = customerFormSchema.parse(rawValues);

  await updateCustomer(user.workspaceId, customerId, values);

  revalidatePath("/customers");
  revalidatePath(`/customers/${customerId}`);
  redirect(`/customers/${customerId}?updated=1`);
}
