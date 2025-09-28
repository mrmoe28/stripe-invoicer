import { PrismaClient, InvoiceStatus, PaymentStatus, Prisma, MembershipRole } from "@prisma/client";
import { hashSync } from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  await prisma.payment.deleteMany();
  await prisma.invoiceLine.deleteMany();
  await prisma.invoice.deleteMany();
  await prisma.customer.deleteMany();
  await prisma.membership.deleteMany();
  await prisma.session.deleteMany();
  await prisma.account.deleteMany();
  await prisma.verificationToken.deleteMany();
  await prisma.user.deleteMany();
  await prisma.workspace.deleteMany();

  const workspace = await prisma.workspace.create({
    data: {
      name: "Ledgerflow Studio",
      slug: "ledgerflow",
    },
  });

  const passwordHash = hashSync("Passw0rd!", 10);

  const user = await prisma.user.create({
    data: {
      email: "founder@ledgerflow.app",
      name: "Avery Johnson",
      passwordHash,
      defaultWorkspaceId: workspace.id,
    },
  });

  await prisma.membership.create({
    data: {
      userId: user.id,
      workspaceId: workspace.id,
      role: MembershipRole.OWNER,
    },
  });

  const customers = await prisma.$transaction([
    prisma.customer.create({
      data: {
        email: "billing@atlascreative.co",
        businessName: "Atlas Creative",
        primaryContact: "Morgan Jade",
        workspaceId: workspace.id,
      },
    }),
    prisma.customer.create({
      data: {
        email: "ap@northwind.io",
        businessName: "Northwind Logistics",
        primaryContact: "Kaden Lee",
        workspaceId: workspace.id,
      },
    }),
  ]);

  const [atlas] = customers;

  const invoice = await prisma.invoice.create({
    data: {
      number: "INV-2040",
      status: InvoiceStatus.SENT,
      currency: "USD",
      dueDate: new Date("2024-07-10"),
      subtotal: new Prisma.Decimal(1840),
      taxTotal: new Prisma.Decimal(0),
      discountTotal: new Prisma.Decimal(0),
      total: new Prisma.Decimal(1840),
      notes: "Thanks for partnering with Ledgerflow!",
      workspaceId: workspace.id,
      customerId: atlas.id,
      lineItems: {
        create: [
          {
            description: "Marketing retainer",
            quantity: 1,
            unitPrice: new Prisma.Decimal(1200),
            amount: new Prisma.Decimal(1200),
            sortOrder: 0,
          },
          {
            description: "Campaign launch",
            quantity: 1,
            unitPrice: new Prisma.Decimal(640),
            amount: new Prisma.Decimal(640),
            sortOrder: 1,
          },
        ],
      },
    },
    include: { customer: true },
  });

  await prisma.payment.create({
    data: {
      amount: invoice.total,
      currency: invoice.currency,
      status: PaymentStatus.PENDING,
      method: "card",
      stripePaymentIntent: "pi_default",
      invoiceId: invoice.id,
    },
  });

  console.log(`Seeded data for user ${user.email} with password Passw0rd!`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
