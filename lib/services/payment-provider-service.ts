import type { Invoice, InvoiceLine } from "@prisma/client";
import { maybeCreateStripePaymentLink } from "./payment-link-service";
import { createSquareCheckoutLink } from "./square-payment-service";

export type PaymentProvider = 'stripe' | 'square';

export interface PaymentLinkResult {
  success: boolean;
  url?: string;
  provider: PaymentProvider;
  error?: string;
}

export async function createPaymentLink(
  invoice: Invoice & { lineItems: InvoiceLine[] },
  provider: PaymentProvider = 'stripe'
): Promise<PaymentLinkResult> {
  console.log(`🔗 Creating payment link with ${provider} for invoice:`, invoice.number);
  
  try {
    switch (provider) {
      case 'stripe': {
        const stripeUrl = await maybeCreateStripePaymentLink(invoice);
        return {
          success: !!stripeUrl,
          url: stripeUrl || undefined,
          provider: 'stripe',
          error: stripeUrl ? undefined : 'Failed to create Stripe payment link'
        };
      }
      
      case 'square': {
        const squareResult = await createSquareCheckoutLink(invoice);
        return {
          success: !!squareResult?.success,
          url: squareResult?.url,
          provider: 'square',
          error: squareResult?.success ? undefined : 'Failed to create Square checkout link'
        };
      }
      
      default:
        return {
          success: false,
          provider,
          error: `Unsupported payment provider: ${provider}`
        };
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error(`❌ Payment link creation failed for ${provider}:`, errorMessage);
    
    return {
      success: false,
      provider,
      error: errorMessage
    };
  }
}

export function getAvailableProviders(): PaymentProvider[] {
  const providers: PaymentProvider[] = [];
  
  // Check if Stripe is configured
  if (process.env.STRIPE_SECRET_KEY || process.env.STRIPE_SECRET_KEY_NEW) {
    providers.push('stripe');
  }
  
  // Check if Square is configured
  if (process.env.SQUARE_ACCESS_TOKEN) {
    providers.push('square');
  }
  
  return providers;
}

export function getDefaultProvider(): PaymentProvider {
  const available = getAvailableProviders();
  
  // Prefer Stripe if available, fallback to Square, then default to Stripe
  if (available.includes('stripe')) {
    return 'stripe';
  } else if (available.includes('square')) {
    return 'square';
  }
  
  return 'stripe'; // Default fallback
}