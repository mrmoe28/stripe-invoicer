import { NextRequest, NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { getBaseUrl } from "@/lib/baseUrl";
import { upsertInvoice } from "@/lib/invoiceStore";

export const runtime = "nodejs"; // ensures edge doesn't block Stripe SDK usage

// POST /api/checkout
// body: { invoiceId: string; amount_cents: number; currency?: string; customer_email?: string; description?: string }
export async function POST(req: NextRequest) {
  try {
    const { invoiceId, amount_cents, currency = "usd", customer_email, description } = await req.json();

    if (!invoiceId || !Number.isInteger(amount_cents) || amount_cents <= 0) {
      return NextResponse.json({ error: "Invalid invoiceId or amount_cents" }, { status: 400 });
    }

    const baseUrl = getBaseUrl();

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      customer_email: customer_email,
      line_items: [
        {
          price_data: {
            currency,
            product_data: { name: description || `Invoice ${invoiceId}` },
            unit_amount: amount_cents,
          },
          quantity: 1,
        },
      ],
      success_url: `${baseUrl}/success?invoiceId=${encodeURIComponent(invoiceId)}&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${baseUrl}/cancel?invoiceId=${encodeURIComponent(invoiceId)}`,
      metadata: {
        invoice_id: String(invoiceId),
      },
    });

    // Save/refresh invoice in store (replace with DB write)
    upsertInvoice({
      id: String(invoiceId),
      amount_cents,
      currency,
      customer_email,
      status: "unpaid",
      stripe_session_id: session.id,
    });

    return NextResponse.json({ url: session.url }, { status: 200 });
  } catch (err: unknown) {
    console.error("Checkout error:", err);
    const errorMessage = err instanceof Error ? err.message : "Internal error";
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}