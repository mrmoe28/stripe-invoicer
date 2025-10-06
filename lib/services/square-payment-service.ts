import type { Invoice, InvoiceLine } from "@prisma/client";
import { Client, Environment, CheckoutApi } from "squareup";

const squareEnvironment = process.env.SQUARE_ENVIRONMENT === 'production' 
  ? Environment.Production 
  : Environment.Sandbox;

function getSquareClient(): Client | null {
  const accessToken = process.env.SQUARE_ACCESS_TOKEN;
  
  if (!accessToken) {
    console.error("⚠️  SQUARE_ACCESS_TOKEN environment variable is not set");
    return null;
  }
  
  return new Client({
    accessToken,
    environment: squareEnvironment,
  });
}

function getPaymentSuccessUrl(invoiceId: string): string {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://ledgerflow.org';
  return `${baseUrl}/payment-success?invoice=${invoiceId}&provider=square`;
}

export async function createSquareCheckoutLink(invoice: Invoice & { lineItems: InvoiceLine[] }) {
  const startTime = Date.now();
  console.log('🔗 Creating Square checkout link for invoice:', invoice.number);
  
  const client = getSquareClient();
  if (!client) {
    console.error('❌ Square client not available');
    return null;
  }
  
  const checkoutApi = client.checkoutApi;
  
  try {
    // Validate invoice data
    if (!invoice.lineItems || invoice.lineItems.length === 0) {
      console.error('❌ Cannot create Square checkout: Invoice has no line items');
      return null;
    }
    
    if (!invoice.total || Number(invoice.total) <= 0) {
      console.error('❌ Cannot create Square checkout: Invoice total is zero or negative');
      return null;
    }
    
    // Convert line items to Square format
    const orderLineItems = invoice.lineItems.map((item, index) => ({
      uid: `item-${index}`,
      name: item.description,
      quantity: item.quantity.toString(),
      basePriceMoney: {
        amount: BigInt(Math.round(Number(item.unitPrice) * 100)), // Convert to cents
        currency: (invoice.currency || 'USD').toUpperCase()
      }
    }));
    
    // Create checkout request
    const request = {
      askForShippingAddress: false,
      merchantSupportEmail: process.env.SQUARE_MERCHANT_EMAIL || 'support@ledgerflow.org',
      prePopulateBuyerEmail: '', // Could be populated with customer email if available
      redirectUrl: getPaymentSuccessUrl(invoice.id),
      order: {
        locationId: process.env.SQUARE_LOCATION_ID, // Required for Square
        referenceId: invoice.number,
        lineItems: orderLineItems
      },
      checkoutOptions: {
        allowTipping: false,
        customFields: [
          {
            title: `Invoice ${invoice.number}`
          }
        ]
      }
    };
    
    console.log('📝 Creating Square checkout with data:', {
      invoiceNumber: invoice.number,
      total: invoice.total,
      currency: invoice.currency,
      lineItemCount: orderLineItems.length,
    });
    
    const response = await checkoutApi.createPaymentLink(request);
    
    if (response.result.paymentLink?.url) {
      const duration = Date.now() - startTime;
      console.log('✅ Square checkout link created successfully:', response.result.paymentLink.url);
      console.log(`⏱️  Creation took ${duration}ms`);
      
      return {
        success: true,
        url: response.result.paymentLink.url,
        id: response.result.paymentLink.id,
        provider: 'square'
      };
    } else {
      console.error('❌ Invalid response from Square:', response.result);
      return null;
    }
    
  } catch (error) {
    const duration = Date.now() - startTime;
    console.error("❌ Failed to create Square checkout link for invoice:", invoice.number);
    console.error('Error:', error);
    console.error(`⏱️  Failed after ${duration}ms`);
    
    return null;
  }
}

export async function getSquareWebhookSecret(): string | null {
  // Square webhooks use signature verification
  return process.env.SQUARE_WEBHOOK_SIGNATURE_KEY || null;
}