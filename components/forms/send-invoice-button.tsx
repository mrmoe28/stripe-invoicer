"use client";

import * as React from "react";

import { sendInvoiceAction } from "@/app/(dashboard)/invoices/actions";
import { Icon } from "@/components/icons";
import { Button } from "@/components/ui/button";

const successCopy = "Invoice sent";
const errorCopy = "Send failed";

type Props = {
  invoiceId: string;
  disabled?: boolean;
};

export function SendInvoiceButton({ invoiceId, disabled }: Props) {
  const [message, setMessage] = React.useState<string | null>(null);
  const [isPending, startTransition] = React.useTransition();

  const handleSend = () => {
    startTransition(async () => {
      setMessage(null);
      try {
        const result = await sendInvoiceAction(invoiceId);
        const delivered = Boolean(result?.email?.success || result?.sms?.success);
        if (delivered) {
          setMessage(successCopy);
        } else {
          setMessage(result?.email?.error ?? result?.sms?.error ?? errorCopy);
        }
      } catch (error) {
        console.error(error);
        setMessage(errorCopy);
      }
    });
  };

  return (
    <div className="flex items-center gap-3">
      <Button
        type="button"
        size="sm"
        className="gap-2"
        onClick={handleSend}
        disabled={isPending || disabled}
      >
        {isPending ? <Icon name="loader" className="size-4 animate-spin" /> : <Icon name="send" className="size-4" />}
        {isPending ? "Sending" : "Send invoice"}
      </Button>
      {message && (
        <span className="text-xs text-muted-foreground">{message}</span>
      )}
    </div>
  );
}
