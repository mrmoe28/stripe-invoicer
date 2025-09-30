import type { Invoice, InvoiceLine } from "@prisma/client";

import { getStripeClient } from "@/lib/stripe";
import { buildEmailUrl } from "@/lib/utils/email-helpers";

function getPaymentSuccessUrl(invoiceId: string): string {
  // For Stripe payment links, we need a publicly accessible URL
  // In production, use the production domain
  if (process.env.NODE_ENV === 'production' || process.env.VERCEL_URL) {
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 
                   process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` :
                   'https://ledgerflow.org';
    return `${baseUrl}/payment-success?invoice=${invoiceId}`;
  }
  
  // In development, use a placeholder that can be updated when testing
  // with real Stripe webhooks. For local testing, this will need to be 
  // a publicly accessible URL (like ngrok tunnel)
  const devUrl = process.env.STRIPE_REDIRECT_BASE_URL || buildEmailUrl('payment-success');
  return `${devUrl}${devUrl.includes('?') ? '&' : '?'}invoice=${invoiceId}`;
}

export async function maybeCreateStripePaymentLink(invoice: Invoice & { lineItems: InvoiceLine[] }) {
  console.log('🔗 Attempting to create Stripe payment link for invoice:', invoice.number);
  
  const stripe = getStripeClient();
  if (!stripe) {
    console.log('❌ Stripe client not available - check STRIPE_SECRET_KEY');
    return null;
  }

  console.log('✅ Stripe client initialized');

  try {
    const depositEnabled = Boolean(
      invoice.requiresDeposit && invoice.depositAmount && Number(invoice.depositAmount) > 0,
    );

    const lineItems = depositEnabled
      ? [
          {
            quantity: 1,
            price_data: {
              currency: invoice.currency.toLowerCase(),
              product_data: {
                name: `Deposit for ${invoice.number}`,
              },
              unit_amount: Math.round(Number(invoice.depositAmount) * 100),
            },
          },
        ]
      : invoice.lineItems.map((item) => ({
          quantity: item.quantity,
          price_data: {
            currency: invoice.currency.toLowerCase(),
            product_data: {
              name: item.description,
            },
            unit_amount: Math.round(Number(item.unitPrice) * 100),
          },
        }));

    const metadata: Record<string, string> = {
      invoiceId: invoice.id,
      invoiceNumber: invoice.number,
      requiresDeposit: depositEnabled ? "true" : "false",
      ...(depositEnabled && invoice.depositAmount
        ? { depositAmount: String(Number(invoice.depositAmount)) }
        : {}),
      ...(depositEnabled && invoice.depositType ? { depositType: invoice.depositType } : {}),
    };

    console.log('📝 Creating payment link with data:', {
      lineItemsCount: lineItems.length,
      currency: invoice.currency,
      total: invoice.total,
      depositEnabled
    });

    const link = await stripe.paymentLinks.create({
      line_items: lineItems,
      metadata,
      after_completion: {
        type: "redirect",
        redirect: {
          url: getPaymentSuccessUrl(invoice.id),
        },
      },
    });

    console.log('✅ Stripe payment link created successfully:', link.url);
    return link.url;
  } catch (error) {
    console.error("❌ Failed to create Stripe payment link:", error);
    if (error instanceof Error) {
      console.error('Error details:', error.message);
      console.error('Error stack:', error.stack);
    }
    return null;
  }
}
