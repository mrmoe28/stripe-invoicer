import type { Invoice, InvoiceLine } from "@prisma/client";

import { getStripeClient } from "@/lib/stripe";
import { buildEmailUrl } from "@/lib/utils/email-helpers";

export async function maybeCreateStripePaymentLink(invoice: Invoice & { lineItems: InvoiceLine[] }) {
  const stripe = getStripeClient();
  if (!stripe) {
    return null;
  }

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

    const link = await stripe.paymentLinks.create({
      line_items: lineItems,
      metadata,
      after_completion: {
        type: "redirect",
        redirect: {
          url: buildEmailUrl(`payment-success?invoice=${invoice.id}`),
        },
      },
    });

    return link.url;
  } catch (error) {
    console.error("Failed to create Stripe payment link", error);
    return null;
  }
}
