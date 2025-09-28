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

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    include: {
      defaultWorkspace: true,
      memberships: {
        include: { workspace: true },
        orderBy: { createdAt: "asc" },
        take: 1,
      },
    },
  });

  if (!user) {
    redirect("/sign-in");
  }

  const resolvedWorkspaceId =
    session.user.workspaceId ??
    user.defaultWorkspaceId ??
    user.memberships[0]?.workspaceId ??
    null;

  const resolvedWorkspaceName =
    session.user.workspaceName ??
    user.defaultWorkspace?.name ??
    user.memberships[0]?.workspace?.name ??
    null;

  if (!resolvedWorkspaceId) {
    redirect("/sign-in");
  }

  return {
    ...user,
    workspaceId: resolvedWorkspaceId,
    workspaceName: resolvedWorkspaceName,
  };
});

export const getCurrentWorkspace = cache(async () => {
  const session = await getCurrentSession();
  const user = await prisma.user.findUnique({
    where: { id: session?.user?.id ?? "" },
    include: {
      defaultWorkspace: true,
      memberships: {
        include: { workspace: true },
        orderBy: { createdAt: "asc" },
        take: 1,
      },
    },
  });

  const workspaceRecord =
    (session?.user?.workspaceId &&
      (await prisma.workspace.findUnique({ where: { id: session.user.workspaceId } }))) ??
    user?.defaultWorkspace ??
    user?.memberships[0]?.workspace ??
    null;

  if (!workspaceRecord) {
    redirect("/sign-in");
  }

  return {
    workspace: workspaceRecord,
    session,
  };
});

export type CurrentUser = Awaited<ReturnType<typeof getCurrentUser>>;
