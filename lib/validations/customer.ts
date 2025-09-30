import { z } from "zod";

export const customerFormSchema = z.object({
  businessName: z.string().min(1, "Business name is required"),
  primaryContact: z.string().optional(),
  email: z.string().email("Provide a valid email"),
  phone: z.string().optional(),
  customerType: z.enum(["BUSINESS", "INDIVIDUAL"]),
  taxId: z.string().optional(),
  addressLine1: z.string().optional(),
  addressLine2: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  postalCode: z.string().optional(),
  country: z.string().optional(),
  notes: z.string().optional(),
});

export type CustomerFormValues = z.infer<typeof customerFormSchema>;
