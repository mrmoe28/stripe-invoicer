import { PaymentStatus } from "@prisma/client";

import { prisma } from "@/lib/prisma";

export async function listPayments(workspaceId: string) {
  return prisma.payment.findMany({
    where: { invoice: { workspaceId } },
    orderBy: [
      { processedAt: "desc" },
      { createdAt: "desc" },
    ],
    include: {
      invoice: {
        select: {
          id: true,
          number: true,
          issueDate: true,
          customer: {
            select: {
              businessName: true,
            },
          },
        },
      },
    },
  });
}

export async function markPaymentStatus(paymentId: string, status: PaymentStatus) {
  return prisma.payment.update({
    where: { id: paymentId },
    data: { status },
  });
}
