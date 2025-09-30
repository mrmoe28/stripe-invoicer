"use server";

import { revalidatePath } from "next/cache";

import { getCurrentUser } from "@/lib/auth";
import { updateWorkspaceCompanySettings } from "@/lib/services/workspace-service";
import { companySettingsSchema, type CompanySettingsValues } from "@/lib/validations/company";

export async function updateCompanySettingsAction(rawValues: CompanySettingsValues) {
  const user = await getCurrentUser();
  const values = companySettingsSchema.parse(rawValues);

  await updateWorkspaceCompanySettings(user.workspaceId, values);

  revalidatePath("/settings");
  revalidatePath("/dashboard");
}