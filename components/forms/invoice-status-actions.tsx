"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { InvoiceStatus } from "@prisma/client";

import { updateInvoiceStatusAction } from "@/app/(dashboard)/invoices/actions";
import { Button } from "@/components/ui/button";

type Props = {
  invoiceId: string;
  currentStatus: InvoiceStatus;
  paymentLinkUrl?: string | null;
};

const statusTransitions: { label: string; status: InvoiceStatus }[] = [
  { label: "Mark as sent", status: InvoiceStatus.SENT },
  { label: "Mark as paid", status: InvoiceStatus.PAID },
  { label: "Mark as overdue", status: InvoiceStatus.OVERDUE },
];

export function InvoiceStatusActions({ invoiceId, currentStatus, paymentLinkUrl }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = React.useTransition();

  const availableActions = statusTransitions.filter((action) => action.status !== currentStatus);

  if (availableActions.length === 0) {
    return null;
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      {paymentLinkUrl && (
        <Button variant="secondary" size="sm" asChild>
          <a href={paymentLinkUrl} target="_blank" rel="noreferrer">
            View payment link
          </a>
        </Button>
      )}
      {availableActions.map((action) => (
        <Button
          key={action.status}
          size="sm"
          variant="outline"
          className={action.status === InvoiceStatus.PAID ? "border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100" : undefined}
          onClick={() =>
            startTransition(async () => {
              await updateInvoiceStatusAction(invoiceId, action.status);
              router.refresh();
            })
          }
          disabled={isPending}
        >
          {isPending ? "Updating..." : action.label}
        </Button>
      ))}
    </div>
  );
}
