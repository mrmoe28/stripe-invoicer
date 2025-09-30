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
    console.error("Missing Stripe configuration - check STRIPE_SECRET_KEY and STRIPE_WEBHOOK_SECRET");
    return NextResponse.json({ received: true });
  }

  // Get raw body as text for signature verification (Next.js 15 requirement)
  const payload = await request.text();
  const signature = (await headers()).get("stripe-signature");

  if (!signature) {
    console.error("Missing Stripe signature header");
    return NextResponse.json({ message: "Missing signature" }, { status: 400 });
  }

  try {
    const event = stripe.webhooks.constructEvent(payload, signature, webhookSecret);
    console.log(`🔗 Received Stripe webhook: ${event.type}`);

    switch (event.type) {
      case "checkout.session.completed": {
        // Primary event for Stripe Payment Links
        const session = event.data.object;
        console.log("✅ Processing checkout.session.completed", session.id);
        
        if (session && typeof session === "object" && "metadata" in session && session.metadata) {
          const { invoiceId } = session.metadata;
          
          if (invoiceId) {
            console.log(`💰 Marking invoice ${invoiceId} as PAID from checkout session`);
            
            // Update invoice status to PAID
            const invoice = await prisma.invoice.update({
              where: { id: invoiceId },
              data: { status: "PAID" },
              include: { customer: true, workspace: true }
            });
            
            // Create or update payment record
            await prisma.payment.upsert({
              where: { 
                invoiceId_stripeCheckoutSession: {
                  invoiceId: invoiceId,
                  stripeCheckoutSession: session.id
                }
              },
              update: {
                status: "SUCCEEDED",
                processedAt: new Date(),
                rawPayload: JSON.parse(JSON.stringify(session)),
              },
              create: {
                invoiceId: invoiceId,
                amount: session.amount_total ? (session.amount_total / 100) : 0,
                currency: session.currency || "USD",
                status: "SUCCEEDED",
                processedAt: new Date(),
                stripeCheckoutSession: session.id,
                rawPayload: JSON.parse(JSON.stringify(session)),
              }
            });
            
            // Send notification
            await notifyInvoicePaid(invoice.id);
            console.log(`✅ Invoice ${invoiceId} marked as PAID and notification sent`);
          } else {
            console.warn("No invoiceId found in checkout session metadata");
          }
        }
        break;
      }
      case "payment_intent.succeeded": {
        // Fallback for direct Payment Intent workflows
        const intent = event.data.object;
        console.log("✅ Processing payment_intent.succeeded", intent.id);
        
        if (intent && typeof intent === "object" && "id" in intent) {
          const id = intent.id as string;
          const payment = await prisma.payment.findUnique({ 
            where: { stripePaymentIntent: id },
            include: { invoice: true }
          });
          
          if (payment) {
            console.log(`💰 Updating payment ${payment.id} to SUCCEEDED`);
            await prisma.payment.update({
              where: { id: payment.id },
              data: {
                status: "SUCCEEDED",
                processedAt: new Date(),
                rawPayload: JSON.parse(JSON.stringify(intent)),
              },
            });
            
            const invoice = await prisma.invoice.update({
              where: { id: payment.invoiceId },
              data: { status: "PAID" },
            });
            
            await notifyInvoicePaid(invoice.id);
            console.log(`✅ Invoice ${payment.invoiceId} marked as PAID via payment intent`);
          } else {
            console.warn(`No payment found for payment_intent ${id}`);
          }
        }
        break;
      }
      case "payment_intent.payment_failed": {
        const intent = event.data.object;
        console.log("❌ Processing payment_intent.payment_failed", intent.id);
        
        if (intent && typeof intent === "object" && "id" in intent) {
          const id = intent.id as string;
          await prisma.payment.updateMany({
            where: { stripePaymentIntent: id },
            data: { status: "FAILED" },
          });
          console.log(`❌ Payment intent ${id} marked as FAILED`);
        }
        break;
      }
      case "checkout.session.expired": {
        const session = event.data.object;
        console.log("⏰ Processing checkout.session.expired", session.id);
        
        if (session && typeof session === "object" && "metadata" in session && session.metadata) {
          const { invoiceId } = session.metadata;
          if (invoiceId) {
            console.log(`⏰ Checkout session expired for invoice ${invoiceId}`);
            // Optionally handle expired sessions (e.g., send reminder email)
          }
        }
        break;
      }
      default:
        console.log(`🔍 Unhandled webhook event type: ${event.type}`);
        break;
    }

    return NextResponse.json({ received: true }, { status: 200 });
  } catch (error) {
    console.error("❌ Stripe webhook error:", error);
    
    if (error instanceof Error) {
      console.error("Error message:", error.message);
      if (error.message.includes("Invalid signature")) {
        console.error("🔑 Webhook signature verification failed - check STRIPE_WEBHOOK_SECRET");
      }
    }
    
    return NextResponse.json({ 
      message: "Webhook processing failed",
      error: error instanceof Error ? error.message : "Unknown error"
    }, { status: 400 });
  }
}
