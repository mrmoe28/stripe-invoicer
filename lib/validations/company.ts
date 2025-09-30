import { z } from "zod";

export const companySettingsSchema = z.object({
  companyName: z.string().min(1, "Company name is required"),
  companyEmail: z.string().email("Valid email is required"),
  companyPhone: z.string().optional(),
  companyWebsite: z.string().url("Valid website URL").optional().or(z.literal("")),
  companyEin: z.string().optional(),
  companyAddress: z.string().optional(),
  companyCity: z.string().optional(),
  companyState: z.string().optional(),
  companyZip: z.string().optional(),
  companyCountry: z.string().optional(),
  logoUrl: z.string().optional(),
});

export type CompanySettingsValues = z.infer<typeof companySettingsSchema>;