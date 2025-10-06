#!/usr/bin/env tsx

import { prisma } from "../lib/prisma";
import { maybeCreateStripePaymentLink } from "../lib/services/payment-link-service";

async function fixPaymentLinks() {
  console.log("🔗 Finding invoices without payment links...");
  
  const invoicesWithoutPaymentLinks = await prisma.invoice.findMany({
    where: {
      paymentLinkUrl: null,
      status: {
        in: ['SENT', 'OVERDUE']
      }
    },
    include: {
      lineItems: true,
      customer: true,
      workspace: true
    },
    orderBy: {
      createdAt: 'desc'
    }
  });

  console.log(`Found ${invoicesWithoutPaymentLinks.length} invoices without payment links`);

  for (const invoice of invoicesWithoutPaymentLinks) {
    console.log(`\n📄 Processing invoice ${invoice.number} (${invoice.id})...`);
    
    try {
      const paymentLink = await maybeCreateStripePaymentLink(invoice);
      
      if (paymentLink) {
        await prisma.invoice.update({
          where: { id: invoice.id },
          data: { paymentLinkUrl: paymentLink }
        });
        console.log(`✅ Created payment link for ${invoice.number}: ${paymentLink}`);
      } else {
        console.log(`❌ Failed to create payment link for ${invoice.number}`);
      }
    } catch (error) {
      console.error(`❌ Error processing ${invoice.number}:`, error);
    }
  }

  console.log("\n🎉 Payment link fix completed!");
}

// Run the script
if (require.main === module) {
  fixPaymentLinks()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error("Script failed:", error);
      process.exit(1);
    });
}