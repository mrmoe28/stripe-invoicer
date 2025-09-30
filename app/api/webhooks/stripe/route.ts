import { NextRequest, NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { markInvoicePaid } from "@/lib/invoiceStore";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const sig = req.headers.get("stripe-signature");
  const whSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!sig || !whSecret) {
    return new NextResponse("Webhook signature or secret missing", { status: 400 });
  }

  let event;
  const rawBody = await req.text(); // IMPORTANT: use raw text for verification

  try {
    event = stripe.webhooks.constructEvent(rawBody, sig, whSecret);
  } catch (err: any) {
    console.error("Webhook signature verification failed.", err.message);
    return new NextResponse(`Webhook Error: ${err.message}`, { status: 400 });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as any;
        const invoiceId = session.metadata?.invoice_id;
        if (invoiceId) {
          markInvoicePaid(invoiceId); // TODO: replace with DB update
        }
        break;
      }
      // (Optional) handle refunds, disputes, etc.
      default:
        // noop
        break;
    }
    return NextResponse.json({ received: true });
  } catch (err: any) {
    console.error("Webhook handler error:", err);
    return new NextResponse("Webhook handler failed", { status: 500 });
  }
}

// Tell Next.js NOT to parse body so we can verify signature from raw text
export const config = {
  api: {
    bodyParser: false,
  },
} as any;