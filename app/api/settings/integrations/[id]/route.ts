import { NextResponse } from "next/server";

import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser();
  const { id } = await params;

  const integration = await prisma.workspaceIntegration.findFirst({
    where: { id, workspaceId: user.workspaceId },
  });

  if (!integration) {
    return NextResponse.json({ message: "Integration not found" }, { status: 404 });
  }

  await prisma.workspaceIntegration.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
