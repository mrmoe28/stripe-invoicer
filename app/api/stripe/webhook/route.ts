import { headers } from "next/headers";
import { NextResponse } from "next/server";

import { getStripeClient } from "@/lib/stripe";
import { prisma } from "@/lib/prisma";
import { notifyInvoicePaid } from "@/lib/services/invoice-notification-service";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const stripe = getStripeClient();
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!stripe || !webhookSecret) {
    return NextResponse.json({ received: true });
  }

  const payload = await request.text();
  const signature = (await headers()).get("stripe-signature");

  if (!signature) {
    return NextResponse.json({ message: "Missing signature" }, { status: 400 });
  }

  try {
    const event = stripe.webhooks.constructEvent(payload, signature, webhookSecret);

    switch (event.type) {
      case "payment_intent.succeeded": {
        const intent = event.data.object;
        if (intent && typeof intent === "object" && "id" in intent) {
          const id = intent.id as string;
          const payment = await prisma.payment.findUnique({ where: { stripePaymentIntent: id } });
          if (payment) {
            await prisma.payment.update({
              where: { id: payment.id },
              data: {
                status: "SUCCEEDED",
                processedAt: new Date(),
                rawPayload: JSON.parse(JSON.stringify(event.data.object)),
              },
            });
            const invoice = await prisma.invoice.update({
              where: { id: payment.invoiceId },
              data: { status: "PAID" },
            });
            await notifyInvoicePaid(invoice.id);
          }
        }
        break;
      }
      case "payment_intent.payment_failed": {
        const intent = event.data.object;
        if (intent && typeof intent === "object" && "id" in intent) {
          const id = intent.id as string;
          await prisma.payment.updateMany({
            where: { stripePaymentIntent: id },
            data: { status: "FAILED" },
          });
        }
        break;
      }
      default:
        break;
    }

    return NextResponse.json({ received: true }, { status: 200 });
  } catch (error) {
    console.error("Stripe webhook error", error);
    return NextResponse.json({ message: "Webhook signature verification failed" }, { status: 400 });
  }
}
