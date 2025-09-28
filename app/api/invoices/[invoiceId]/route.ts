import { NextResponse } from "next/server";

import { getCurrentUser } from "@/lib/auth";
import { getInvoiceById } from "@/lib/services/invoice-service";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ invoiceId: string }> },
) {
  const user = await getCurrentUser();
  const { invoiceId } = await params;
  const invoice = await getInvoiceById(user.workspaceId, invoiceId);

  if (!invoice) {
    return NextResponse.json({ message: "Invoice not found" }, { status: 404 });
  }

  return NextResponse.json(invoice);
}
