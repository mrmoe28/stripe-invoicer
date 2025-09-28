import { z } from "zod";

export const invoiceLineSchema = z.object({
  id: z.string().optional(),
  description: z.string().min(1, "Description is required"),
  quantity: z.coerce
    .number({ invalid_type_error: "Quantity must be a number" })
    .min(1, "Minimum quantity is 1"),
  unitPrice: z.coerce
    .number({ invalid_type_error: "Unit price must be a number" })
    .min(0, "Unit price cannot be negative"),
  sortOrder: z.number().optional(),
});

export const invoiceFormSchema = z.object({
  customerId: z.string().min(1, "Select a customer"),
  issueDate: z.string().min(1, "Issue date is required"),
  dueDate: z.string().min(1, "Due date is required"),
  currency: z.string().min(1, "Currency is required"),
  status: z
    .enum(["DRAFT", "SENT", "PAID", "OVERDUE", "VOID"], {
      errorMap: () => ({ message: "Select a valid status" }),
    })
    .default("DRAFT"),
  notes: z.string().optional().nullable(),
  lineItems: invoiceLineSchema.array().min(1, "Add at least one line item"),
  enablePaymentLink: z.boolean().default(true),
  requiresDeposit: z.boolean().default(false),
  depositType: z.enum(["PERCENTAGE", "FIXED"]).default("FIXED"),
  depositValue: z.coerce
    .number({ invalid_type_error: "Deposit must be a number" })
    .min(0, "Deposit must be zero or greater")
    .default(0),
  depositDueDate: z.string().optional().nullable(),
}).superRefine((data, ctx) => {
  if (!data.requiresDeposit) {
    return;
  }

  if (data.depositType === "PERCENTAGE") {
    if (data.depositValue <= 0 || data.depositValue > 100) {
      ctx.addIssue({
        path: ["depositValue"],
        code: z.ZodIssueCode.custom,
        message: "Enter a percentage between 1 and 100",
      });
    }
  } else if (data.depositValue <= 0) {
    ctx.addIssue({
      path: ["depositValue"],
      code: z.ZodIssueCode.custom,
      message: "Deposit amount must be greater than 0",
    });
  }

  if (!data.depositDueDate) {
    ctx.addIssue({
      path: ["depositDueDate"],
      code: z.ZodIssueCode.custom,
      message: "Set a deposit due date",
    });
  }
});

export type InvoiceFormValues = z.infer<typeof invoiceFormSchema>;
export type InvoiceLineValues = z.infer<typeof invoiceLineSchema>;
