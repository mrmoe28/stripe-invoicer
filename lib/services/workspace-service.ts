import { prisma } from "@/lib/prisma";
import type { CompanySettingsValues } from "@/lib/validations/company";

export async function updateWorkspaceCompanySettings(
  workspaceId: string,
  values: CompanySettingsValues
) {
  return prisma.workspace.update({
    where: { id: workspaceId },
    data: {
      companyName: values.companyName,
      companyEmail: values.companyEmail,
      companyPhone: values.companyPhone || null,
      companyWebsite: values.companyWebsite || null,
      companyEin: values.companyEin || null,
      companyAddress: values.companyAddress || null,
      companyCity: values.companyCity || null,
      companyState: values.companyState || null,
      companyZip: values.companyZip || null,
      companyCountry: values.companyCountry || null,
      logoUrl: values.logoUrl || null,
    },
  });
}

export async function getWorkspaceWithCompanyInfo(workspaceId: string) {
  return prisma.workspace.findUnique({
    where: { id: workspaceId },
    select: {
      id: true,
      name: true,
      companyName: true,
      companyEmail: true,
      companyPhone: true,
      companyWebsite: true,
      companyEin: true,
      companyAddress: true,
      companyCity: true,
      companyState: true,
      companyZip: true,
      companyCountry: true,
      logoUrl: true,
    },
  });
}