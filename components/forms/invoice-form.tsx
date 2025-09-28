"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Controller, useFieldArray, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import {
  createInvoiceAction,
  updateInvoiceAction,
} from "@/app/(dashboard)/invoices/actions";
import { Icon } from "@/components/icons";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { cn, formatCurrency } from "@/lib/utils";
import {
  invoiceFormSchema,
  type InvoiceFormValues,
  type InvoiceLineValues,
} from "@/lib/validations/invoice";

const now = new Date();
const defaultIssueDate = toInputDate(now);
const defaultDueDate = toInputDate(new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000));

function toInputDate(value: Date | string | null | undefined) {
  if (!value) {
    return "";
  }

  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return date.toISOString().split("T")[0] ?? "";
}

type CustomerOption = {
  id: string;
  businessName: string;
  email: string;
};

type InvoiceLineDefault = {
  id?: string;
  description: string;
  quantity: number;
  unitPrice: number;
};

type InvoiceFormInvoice = {
  id: string;
  customerId: string;
  issueDate: string;
  dueDate: string;
  currency: string;
  status: InvoiceFormValues["status"];
  notes?: string | null;
  paymentLinkUrl?: string | null;
  requiresDeposit?: boolean;
  depositType?: InvoiceFormValues["depositType"] | null;
  depositValue?: number | null;
  depositDueDate?: string | null;
  lineItems: InvoiceLineDefault[];
};

type InvoiceFormProps = {
  customers: CustomerOption[];
  defaultCustomerId?: string;
  invoice?: InvoiceFormInvoice;
};

export function InvoiceForm({ customers, defaultCustomerId, invoice }: InvoiceFormProps) {
  const router = useRouter();
  const isEdit = Boolean(invoice);
  const [formError, setFormError] = React.useState<string | null>(null);
  const [isPending, startTransition] = React.useTransition();

  const defaultValues = React.useMemo<InvoiceFormValues>(() => {
    if (invoice) {
      return {
        customerId: invoice.customerId,
        issueDate: invoice.issueDate || defaultIssueDate,
        dueDate: invoice.dueDate || defaultDueDate,
        currency: invoice.currency,
        status: invoice.status,
        notes: invoice.notes ?? "",
        enablePaymentLink: Boolean(invoice.paymentLinkUrl),
        requiresDeposit: Boolean(invoice.requiresDeposit),
        depositType: invoice.depositType ?? "FIXED",
        depositValue: invoice.depositValue ?? 0,
        depositDueDate:
          invoice.requiresDeposit && invoice.depositDueDate ? invoice.depositDueDate : invoice.dueDate,
        lineItems:
          invoice.lineItems.length > 0
            ? invoice.lineItems.map((item) => ({
                id: item.id,
                description: item.description,
                quantity: item.quantity,
                unitPrice: item.unitPrice,
              }))
            : [
                {
                  description: "",
                  quantity: 1,
                  unitPrice: 0,
                },
              ],
      } satisfies InvoiceFormValues;
    }

    return {
      customerId: defaultCustomerId ?? customers[0]?.id ?? "",
      issueDate: defaultIssueDate,
      dueDate: defaultDueDate,
      currency: "USD",
      status: "DRAFT",
      notes: "",
      enablePaymentLink: true,
      requiresDeposit: false,
      depositType: "FIXED",
      depositValue: 0,
      depositDueDate: defaultDueDate,
      lineItems: [
        {
          description: "",
          quantity: 1,
          unitPrice: 0,
        },
      ],
    } satisfies InvoiceFormValues;
  }, [customers, defaultCustomerId, invoice]);

  const form = useForm<InvoiceFormValues>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(invoiceFormSchema) as any,
    defaultValues,
  });

  const { control, handleSubmit, watch, register, setValue, formState } = form;
  const { fields, append, remove } = useFieldArray({ control, name: "lineItems" });

  const lineItems = watch("lineItems");
  const requiresDeposit = watch("requiresDeposit");
  const depositType = watch("depositType");
  const depositValue = watch("depositValue");
  const dueDateValue = watch("dueDate");
  const depositDueDateValue = watch("depositDueDate");

  React.useEffect(() => {
    if (requiresDeposit && !depositDueDateValue) {
      setValue("depositDueDate", dueDateValue);
    }
  }, [depositDueDateValue, dueDateValue, requiresDeposit, setValue]);

  const subtotal = lineItems.reduce((acc, item) => {
    const quantity = Number(item.quantity ?? 0);
    const unitPrice = Number(item.unitPrice ?? 0);
    return acc + quantity * unitPrice;
  }, 0);

  const numericDepositValue = Number.isFinite(depositValue) ? Number(depositValue) : 0;

  const depositAmount = React.useMemo(() => {
    if (!requiresDeposit) {
      return 0;
    }

    const baseValue =
      depositType === "PERCENTAGE"
        ? subtotal * (numericDepositValue > 0 ? numericDepositValue / 100 : 0)
        : numericDepositValue;

    if (!Number.isFinite(baseValue)) {
      return 0;
    }

    const normalized = Math.max(0, baseValue);
    return Math.min(normalized, subtotal);
  }, [depositType, numericDepositValue, requiresDeposit, subtotal]);

  const remainingBalance = Math.max(subtotal - depositAmount, 0);

  const onSubmit = (values: InvoiceFormValues) => {
    startTransition(async () => {
      setFormError(null);
      try {
        if (isEdit && invoice) {
          const updated = await updateInvoiceAction(invoice.id, values);
          if (updated) {
            router.push(`/invoices/${invoice.id}?updated=1`);
          }
          return;
        }

        const created = await createInvoiceAction(values);
        if (created) {
          router.push(`/invoices/${created.id}?created=1`);
        }
      } catch (error) {
        if (error && typeof error === "object" && "digest" in error) {
          throw error; // Next redirect
        }
        console.error(error);
        setFormError("Something went wrong while saving the invoice.");
      }
    });
  };

  const addLineItem = () => {
    append({ description: "", quantity: 1, unitPrice: 0 } as InvoiceLineValues);
  };

  const removeLineItem = (index: number) => {
    if (fields.length === 1) {
      return;
    }
    remove(index);
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <div className="grid gap-6 lg:grid-cols-[2fr,1fr]">
        <Card>
          <CardHeader>
            <CardTitle>Invoice details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Customer</Label>
                <Select
                  value={form.watch("customerId")}
                  onValueChange={(value) => setValue("customerId", value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select customer" />
                  </SelectTrigger>
                  <SelectContent>
                    {customers.map((customer) => (
                      <SelectItem key={customer.id} value={customer.id}>
                        <div className="flex flex-col text-left">
                          <span className="text-sm font-medium text-foreground">
                            {customer.businessName}
                          </span>
                          <span className="text-xs text-muted-foreground">{customer.email}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {formState.errors.customerId && (
                  <p className="text-xs text-destructive">{formState.errors.customerId.message}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="status">Status</Label>
                <Select
                  value={form.watch("status")}
                  onValueChange={(value) => setValue("status", value as InvoiceFormValues["status"])}
                >
                  <SelectTrigger id="status">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="DRAFT">Draft</SelectItem>
                    <SelectItem value="SENT">Send immediately</SelectItem>
                    <SelectItem value="PAID">Mark as paid</SelectItem>
                    <SelectItem value="OVERDUE">Mark as overdue</SelectItem>
                    <SelectItem value="VOID">Mark as void</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="space-y-2">
                <Label htmlFor="issueDate">Issue date</Label>
                <Input type="date" id="issueDate" {...register("issueDate")} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="dueDate">Due date</Label>
                <Input type="date" id="dueDate" {...register("dueDate")} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="currency">Currency</Label>
                <Input id="currency" maxLength={3} {...register("currency")} />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea id="notes" rows={4} placeholder="Payment terms, thanks, etc." {...register("notes")} />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Payment preferences</CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            <label className="flex items-start gap-3 rounded-lg border border-border/60 p-3 text-sm">
              <input
                type="checkbox"
                className="mt-1"
                {...register("enablePaymentLink")}
                defaultChecked={defaultValues.enablePaymentLink}
              />
              <span>
                <span className="font-medium text-foreground">Generate Stripe payment link</span>
                <span className="block text-xs text-muted-foreground">
                  Creates a hosted checkout link when Stripe keys are configured.
                </span>
              </span>
            </label>
            <p className="text-xs text-muted-foreground">
              Payment links use the invoice line items as one-time products. You can send the link or embed it in your emails.
            </p>

            <div className="space-y-3 rounded-lg border border-border/60 p-4">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-sm font-medium text-foreground">Collect a deposit</p>
                  <p className="text-xs text-muted-foreground">
                    Toggle on to collect part of the invoice upfront. Choose a percentage or fixed amount.
                  </p>
                </div>
                <Controller
                  control={control}
                  name="requiresDeposit"
                  render={({ field }) => (
                    <Switch
                      id="requiresDeposit"
                      checked={field.value}
                      onCheckedChange={(checked) => field.onChange(checked)}
                      aria-label="Enable deposit"
                    />
                  )}
                />
              </div>

              {requiresDeposit && (
                <div className="space-y-4 border-t border-border/60 pt-4">
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="depositType">Deposit type</Label>
                      <Select
                        value={depositType}
                        onValueChange={(value) =>
                          setValue("depositType", value as InvoiceFormValues["depositType"])
                        }
                      >
                        <SelectTrigger id="depositType">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="FIXED">Fixed amount</SelectItem>
                          <SelectItem value="PERCENTAGE">Percentage of total</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="depositDueDate">Deposit due date</Label>
                      <Input type="date" id="depositDueDate" {...register("depositDueDate")} />
                      {formState.errors.depositDueDate?.message && (
                        <p className="text-xs text-destructive">
                          {formState.errors.depositDueDate.message}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="depositValue">
                        {depositType === "PERCENTAGE" ? "Deposit percentage" : "Deposit amount"}
                      </Label>
                      <Input
                        id="depositValue"
                        type="number"
                        min={depositType === "PERCENTAGE" ? 1 : 0.01}
                        max={depositType === "PERCENTAGE" ? 100 : undefined}
                        step={depositType === "PERCENTAGE" ? 1 : 0.01}
                        className="text-right"
                        {...register("depositValue", { valueAsNumber: true })}
                      />
                      {formState.errors.depositValue?.message && (
                        <p className="text-xs text-destructive">
                          {formState.errors.depositValue.message}
                        </p>
                      )}
                      {depositType === "PERCENTAGE" && (
                        <p className="text-xs text-muted-foreground">
                          Need an exact amount? Switch to fixed amount above to type the deposit value.
                        </p>
                      )}
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="depositAmountPreview">Deposit amount</Label>
                      <Input
                        id="depositAmountPreview"
                        readOnly
                        value={formatCurrency(depositAmount)}
                        className="text-right"
                      />
                    </div>
                  </div>

                  <div className="rounded-lg bg-muted/30 p-3 text-xs text-muted-foreground">
                    <p>
                      Customer pays <span className="font-semibold text-foreground">{formatCurrency(depositAmount)}</span> now
                      and <span className="font-semibold text-foreground">{formatCurrency(remainingBalance)}</span> later.
                    </p>
                    {depositType === "FIXED" && numericDepositValue > subtotal && (
                      <p className="mt-2 text-destructive">
                        Deposit exceeds the invoice total. Lower the amount to stay within {formatCurrency(subtotal)}.
                      </p>
                    )}
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Line items</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-[1fr_auto_auto_auto_auto] items-center gap-3 rounded-lg border border-border/60 px-3 py-2 text-xs font-medium uppercase text-muted-foreground">
            <span>Description</span>
            <span className="text-right">Qty</span>
            <span className="text-right">Unit price</span>
            <span className="text-right">Amount</span>
            <span className="sr-only">Actions</span>
          </div>
          <div className="space-y-3">
            {fields.map((field, index) => {
              const quantity = Number(lineItems[index]?.quantity ?? 0);
              const unitPrice = Number(lineItems[index]?.unitPrice ?? 0);
              const amount = quantity * unitPrice;

              return (
                <div
                  key={field.id}
                  className="grid grid-cols-[1fr_auto_auto_auto_auto] items-center gap-3 rounded-lg border border-border/60 px-3 py-3"
                >
                  <Textarea
                    rows={2}
                    placeholder="Describe the work or product"
                    {...register(`lineItems.${index}.description` as const)}
                  />
                  <Input
                    type="number"
                    min={1}
                    step={1}
                    className="text-right"
                    {...register(`lineItems.${index}.quantity` as const, { valueAsNumber: true })}
                  />
                  <Input
                    type="number"
                    min={0}
                    step="0.01"
                    className="text-right"
                    {...register(`lineItems.${index}.unitPrice` as const, { valueAsNumber: true })}
                  />
                  <span className="text-right font-medium">{formatCurrency(amount)}</span>
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    className={cn("justify-self-end", fields.length === 1 && "opacity-40")}
                    onClick={() => removeLineItem(index)}
                    disabled={fields.length === 1}
                    aria-label="Remove line item"
                  >
                    <Icon name="x" className="size-4" />
                  </Button>
                </div>
              );
            })}
          </div>
          {formState.errors.lineItems?.message && (
            <p className="text-xs text-destructive">{formState.errors.lineItems.message}</p>
          )}
          <Button type="button" variant="secondary" onClick={addLineItem} className="gap-2">
            Add line item
          </Button>
        </CardContent>
        <CardFooter className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="text-sm text-muted-foreground">
            Subtotal updates automatically based on quantities and rates.
          </div>
          <div className="text-right text-lg font-semibold text-foreground">
            {formatCurrency(subtotal)}
          </div>
        </CardFooter>
      </Card>

      {formError && <p className="text-sm text-destructive">{formError}</p>}

      <div className="flex items-center justify-end gap-3">
        <Button type="button" variant="outline" onClick={() => router.back()} disabled={isPending}>
          Cancel
        </Button>
        <Button type="submit" disabled={isPending} className="gap-2">
          {isPending ? "Saving..." : isEdit ? "Update invoice" : "Save invoice"}
        </Button>
      </div>
    </form>
  );
}

export type { InvoiceFormInvoice };
