import { cache } from "react";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";

import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/prisma";

export const getCurrentSession = cache(async () => {
  return getServerSession(authOptions);
});

export const getCurrentUser = cache(async () => {
  const session = await getCurrentSession();
  if (!session?.user?.id) {
    redirect("/sign-in");
  }

  const user = await prisma.user.findUnique({ where: { id: session.user.id } });
  if (!user || !session.user.workspaceId) {
    redirect("/sign-in");
  }

  return {
    ...user,
    workspaceId: session.user.workspaceId,
    workspaceName: session.user.workspaceName ?? null,
  };
});

export const getCurrentWorkspace = cache(async () => {
  const session = await getCurrentSession();
  if (!session?.user?.workspaceId) {
    redirect("/sign-in");
  }

  const workspace = await prisma.workspace.findUnique({
    where: { id: session.user.workspaceId },
  });

  if (!workspace) {
    redirect("/sign-in");
  }

  return {
    workspace,
    session,
  };
});

export type CurrentUser = Awaited<ReturnType<typeof getCurrentUser>>;
