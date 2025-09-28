import { prisma } from "@/lib/prisma";
import { dispatchInvoice } from "@/lib/services/invoice-notification-service";

async function main() {
  const invoiceRef = process.argv[2];

  const invoice = invoiceRef
    ? await prisma.invoice.findFirst({
        where: {
          OR: [{ id: invoiceRef }, { number: invoiceRef }],
        },
        select: { id: true, number: true },
      })
    : await prisma.invoice.findFirst({
        orderBy: { createdAt: "desc" },
        select: { id: true, number: true },
      });

  if (!invoice) {
    console.error("No invoice found. Seed the database or create an invoice first.");
    process.exit(1);
  }

  console.log(`Dispatching invoice ${invoice.number} (${invoice.id})...`);
  const result = await dispatchInvoice(invoice.id);
  console.log("Dispatch result:", result);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
