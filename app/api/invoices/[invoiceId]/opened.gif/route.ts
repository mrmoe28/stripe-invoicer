import { NextResponse } from "next/server";

import { recordInvoiceOpen } from "@/lib/services/invoice-notification-service";

export const dynamic = "force-dynamic";

const PIXEL = Buffer.from("R0lGODlhAQABAPAAAP///wAAACwAAAAAAQABAAACAkQBADs=", "base64");

export async function GET(request: Request, { params }: { params: Promise<{ invoiceId: string }> }) {
  const { invoiceId } = await params;
  if (!invoiceId) {
    return new NextResponse(PIXEL, {
      headers: pixelHeaders(),
    });
  }

  const forwarded = request.headers.get("x-forwarded-for");
  const ip = forwarded?.split(",")[0]?.trim();
  const userAgent = request.headers.get("user-agent") ?? undefined;

  await recordInvoiceOpen(invoiceId, { ip, userAgent });

  return new NextResponse(PIXEL, {
    headers: pixelHeaders(),
  });
}

function pixelHeaders() {
  return {
    "Content-Type": "image/gif",
    "Content-Length": PIXEL.length.toString(),
    "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
    Expires: "0",
    Pragma: "no-cache",
  };
}
