import { prisma } from "@/lib/prisma";
import type { CustomerFormValues } from "@/lib/validations/customer";

export async function listCustomers(workspaceId: string) {
  return prisma.customer.findMany({
    where: { workspaceId },
    orderBy: { businessName: "asc" },
    include: {
      invoices: {
        select: {
          id: true,
          total: true,
          status: true,
          createdAt: true,
        },
        orderBy: { createdAt: "desc" },
      },
    },
  });
}

export async function getCustomerById(workspaceId: string, customerId: string) {
  return prisma.customer.findFirst({
    where: { id: customerId, workspaceId },
    include: {
      invoices: {
        orderBy: { issueDate: "desc" },
      },
    },
  });
}

export async function createCustomer(workspaceId: string, values: CustomerFormValues) {
  return prisma.customer.create({
    data: {
      businessName: values.businessName,
      primaryContact: values.primaryContact,
      email: values.email,
      phone: values.phone,
      customerType: values.customerType,
      taxId: values.taxId,
      addressLine1: values.addressLine1,
      addressLine2: values.addressLine2,
      city: values.city,
      state: values.state,
      postalCode: values.postalCode,
      country: values.country,
      notes: values.notes,
      workspace: {
        connect: { id: workspaceId },
      },
    },
  });
}

export async function updateCustomer(workspaceId: string, customerId: string, values: CustomerFormValues) {
  return prisma.customer.update({
    where: { 
      id: customerId,
      workspaceId, // Ensure the customer belongs to the workspace
    },
    data: {
      businessName: values.businessName,
      primaryContact: values.primaryContact,
      email: values.email,
      phone: values.phone,
      customerType: values.customerType,
      taxId: values.taxId,
      addressLine1: values.addressLine1,
      addressLine2: values.addressLine2,
      city: values.city,
      state: values.state,
      postalCode: values.postalCode,
      country: values.country,
      notes: values.notes,
    },
  });
}
