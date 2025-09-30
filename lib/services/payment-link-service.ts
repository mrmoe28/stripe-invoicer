import type { Invoice, InvoiceLine } from "@prisma/client";

import { getStripeClient } from "@/lib/stripe";
import { buildEmailUrl } from "@/lib/utils/email-helpers";
import { logPaymentLinkAttempt } from "./payment-monitoring-service";

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

function getPublicInvoiceUrl(invoiceId: string): string {
  // Public invoice URL for sharing with customers
  if (process.env.NODE_ENV === 'production' || process.env.VERCEL_URL) {
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 
                   process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` :
                   'https://ledgerflow.org';
    return `${baseUrl}/public/invoices/${invoiceId}`;
  }
  
  // In development
  const devUrl = process.env.STRIPE_REDIRECT_BASE_URL || buildEmailUrl('');
  const cleanUrl = devUrl.replace(/\/+$/, ''); // Remove trailing slashes
  return `${cleanUrl}/public/invoices/${invoiceId}`;
}

export { getPublicInvoiceUrl };

export async function maybeCreateStripePaymentLink(invoice: Invoice & { lineItems: InvoiceLine[] }) {
  const startTime = Date.now();
  console.log('🔗 Attempting to create Stripe payment link for invoice:', invoice.number);
  
  // Helper function to log result and return
  const logAndReturn = async (success: boolean, paymentLinkUrl?: string, error?: string) => {
    const duration = Date.now() - startTime;
    await logPaymentLinkAttempt({
      success,
      paymentLinkUrl,
      error,
      duration,
      invoiceId: invoice.id,
      invoiceNumber: invoice.number,
    });
    return success ? paymentLinkUrl : null;
  };

  // Validate invoice data before attempting Stripe integration
  if (!invoice.lineItems || invoice.lineItems.length === 0) {
    const error = 'Cannot create payment link: Invoice has no line items';
    console.error('❌', error);
    return await logAndReturn(false, undefined, error);
  }

  if (!invoice.total || Number(invoice.total) <= 0) {
    const error = 'Cannot create payment link: Invoice total is zero or negative';
    console.error('❌', error);
    return await logAndReturn(false, undefined, error);
  }

  if (!invoice.currency) {
    const error = 'Cannot create payment link: Invoice currency is not specified';
    console.error('❌', error);
    return await logAndReturn(false, undefined, error);
  }
  
  const stripe = getStripeClient();
  if (!stripe) {
    const error = 'Stripe client not available - check STRIPE_SECRET_KEY environment variable';
    console.error('❌', error);
    return await logAndReturn(false, undefined, error);
  }

  console.log('✅ Stripe client initialized and invoice validation passed');

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

    // Validate line items before sending to Stripe
    const validLineItems = lineItems.filter(item => {
      if (!item.price_data?.unit_amount || item.price_data.unit_amount <= 0) {
        console.warn(`⚠️  Skipping line item with invalid amount: ${item.price_data?.product_data?.name}`);
        return false;
      }
      if (!item.quantity || item.quantity <= 0) {
        console.warn(`⚠️  Skipping line item with invalid quantity: ${item.price_data?.product_data?.name}`);
        return false;
      }
      return true;
    });

    if (validLineItems.length === 0) {
      console.error('❌ No valid line items found for Stripe payment link');
      return null;
    }

    const successUrl = getPaymentSuccessUrl(invoice.id);
    console.log('📝 Creating payment link with data:', {
      lineItemsCount: validLineItems.length,
      currency: invoice.currency,
      total: invoice.total,
      depositEnabled,
      successUrl
    });

    const link = await stripe.paymentLinks.create({
      line_items: validLineItems,
      metadata,
      after_completion: {
        type: "redirect",
        redirect: {
          url: successUrl,
        },
      },
      // Additional configuration for better reliability
      billing_address_collection: 'auto',
      shipping_address_collection: {
        allowed_countries: ['US', 'CA', 'GB', 'AU', 'DE', 'FR', 'IT', 'ES', 'NL', 'BE', 'CH', 'AT', 'IE', 'PT', 'LU', 'DK', 'FI', 'SE', 'NO'],
      },
      payment_method_types: ['card'],
      submit_type: 'pay',
    });

    // Validate the created link
    if (!link.url || !link.url.includes('stripe.com')) {
      const error = 'Invalid payment link returned from Stripe';
      console.error('❌', error, link);
      return await logAndReturn(false, undefined, error);
    }

    console.log('✅ Stripe payment link created successfully:', link.url);
    console.log('✅ Link metadata:', link.metadata);
    return await logAndReturn(true, link.url);
  } catch (error) {
    console.error("❌ Failed to create Stripe payment link for invoice:", invoice.number);
    
    if (error instanceof Error) {
      console.error('Error message:', error.message);
      console.error('Error stack:', error.stack);
      
      // Log specific Stripe errors for better debugging
      if (error.message.includes('Invalid API Key')) {
        console.error('🔑 Stripe API key configuration issue - check STRIPE_SECRET_KEY');
      } else if (error.message.includes('currency')) {
        console.error('💱 Currency validation issue - check invoice currency:', invoice.currency);
      } else if (error.message.includes('amount')) {
        console.error('💰 Amount validation issue - check line item amounts');
      } else if (error.message.includes('redirect')) {
        console.error('🔗 Redirect URL issue - check payment success URL configuration');
      }
    }
    
    // Log invoice details for debugging
    console.error('Invoice details for debugging:', {
      id: invoice.id,
      number: invoice.number,
      total: invoice.total,
      currency: invoice.currency,
      lineItemCount: invoice.lineItems.length,
      hasDeposit: Boolean(invoice.requiresDeposit && invoice.depositAmount)
    });
    
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return await logAndReturn(false, undefined, errorMessage);
  }
}
