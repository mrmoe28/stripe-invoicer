import { hash } from "bcryptjs";
import { Prisma } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import { slugify } from "@/lib/utils";

export type CreateAccountInput = {
  email: string;
  password: string;
  workspaceName?: string | null;
};

export type CreateAccountResult =
  | { success: true }
  | {
      success: false;
      error: string;
      fieldErrors?: Record<string, string[]>;
    };

function deriveWorkspaceName(email: string, provided?: string | null) {
  const trimmed = provided?.trim();
  if (trimmed) {
    return trimmed;
  }

  const localPart = email.split("@")[0] ?? "workspace";
  const cleaned = localPart.replace(/[^a-zA-Z0-9]+/g, " ").trim();
  if (!cleaned) {
    return "My Workspace";
  }

  return `${cleaned.replace(/\s+/g, " ").replace(/\b\w/g, (character) => character.toUpperCase())} Workspace`;
}

async function generateUniqueWorkspaceSlug(name: string) {
  const base = slugify(name);
  let candidate = base;
  let attempt = 1;

  while (true) {
    const exists = await prisma.workspace.findUnique({ where: { slug: candidate } });
    if (!exists) {
      return candidate;
    }
    candidate = `${base}-${attempt}`;
    attempt += 1;
  }
}

export async function createAccount({ email, password, workspaceName }: CreateAccountInput): Promise<CreateAccountResult> {
  const normalizedEmail = email.trim().toLowerCase();

  const existingUser = await prisma.user.findUnique({ where: { email: normalizedEmail } });
  if (existingUser) {
    return {
      success: false,
      error: "An account with that email already exists.",
      fieldErrors: { email: ["Choose a different email address"] },
    };
  }

  const finalWorkspaceName = deriveWorkspaceName(normalizedEmail, workspaceName);
  const workspaceSlug = await generateUniqueWorkspaceSlug(finalWorkspaceName);
  const passwordHash = await hash(password, 12);

  try {
    await prisma.$transaction(async (tx) => {
      const workspace = await tx.workspace.create({
        data: {
          name: finalWorkspaceName,
          slug: workspaceSlug,
        },
      });

      await tx.user.create({
        data: {
          email: normalizedEmail,
          name: workspaceName?.trim() ?? null,
          passwordHash,
          defaultWorkspaceId: workspace.id,
          memberships: {
            create: {
              workspaceId: workspace.id,
              role: "OWNER",
            },
          },
        },
      });
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return {
        success: false,
        error: "That email is already registered.",
        fieldErrors: { email: ["Choose a different email address"] },
      };
    }

    console.error("Failed to create account", error);
    return {
      success: false,
      error: "Unable to create account right now. Please try again.",
    };
  }

  return { success: true };
}
