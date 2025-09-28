import { NextResponse } from "next/server";

import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { maybeCreateStripePaymentLink } from "@/lib/services/payment-link-service";
import { createInvoice, listInvoices } from "@/lib/services/invoice-service";
import { invoiceFormSchema } from "@/lib/validations/invoice";

export async function GET() {
  const user = await getCurrentUser();
  const invoices = await listInvoices(user.workspaceId);
  return NextResponse.json(invoices);
}

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();
    const body = await request.json();
    const values = invoiceFormSchema.parse(body);

    const invoice = await createInvoice(user.workspaceId, values);
    if (values.enablePaymentLink) {
      const paymentLink = await maybeCreateStripePaymentLink(invoice);
      if (paymentLink) {
        const updatedInvoice = await prisma.invoice.update({
          where: { id: invoice.id },
          data: { paymentLinkUrl: paymentLink },
          include: {
            customer: true,
            lineItems: true,
          },
        });
        return NextResponse.json(updatedInvoice, { status: 201 });
      }
    }

    return NextResponse.json(invoice, { status: 201 });
  } catch (error) {
    console.error("Error creating invoice", error);
    return NextResponse.json(
      { message: "Unable to create invoice" },
      { status: 400 },
    );
  }
}
