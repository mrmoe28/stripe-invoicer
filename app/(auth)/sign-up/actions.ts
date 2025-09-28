"use server";

import { hash } from "bcryptjs";
import { Prisma } from "@prisma/client";
import { z } from "zod";

import { prisma } from "@/lib/prisma";
import { slugify } from "@/lib/utils";

const signUpSchema = z.object({
  email: z.string().email("Enter a valid email address"),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .max(100, "Password must be less than 100 characters"),
  workspaceName: z.string().max(60, "Workspace name is too long").optional(),
});

type SignUpInput = z.infer<typeof signUpSchema>;

type SignUpResult =
  | { success: true }
  | {
      success: false;
      error: string;
      fieldErrors?: Record<string, string[]>;
    };

function deriveWorkspaceName(email: string, provided?: string) {
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

  // eslint-disable-next-line no-constant-condition
  while (true) {
    const exists = await prisma.workspace.findUnique({ where: { slug: candidate } });
    if (!exists) {
      return candidate;
    }
    candidate = `${base}-${attempt}`;
    attempt += 1;
  }
}

export async function createAccountAction(input: SignUpInput): Promise<SignUpResult> {
  const parsed = signUpSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      error: "Please fix the highlighted fields",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  const email = parsed.data.email.trim().toLowerCase();
  const password = parsed.data.password;

  const existingUser = await prisma.user.findUnique({ where: { email } });
  if (existingUser) {
    return {
      success: false,
      error: "An account with that email already exists.",
      fieldErrors: { email: ["Choose a different email address"] },
    };
  }

  const workspaceName = deriveWorkspaceName(email, parsed.data.workspaceName);
  const workspaceSlug = await generateUniqueWorkspaceSlug(workspaceName);
  const passwordHash = await hash(password, 12);

  try {
    await prisma.$transaction(async (tx) => {
      const workspace = await tx.workspace.create({
        data: {
          name: workspaceName,
          slug: workspaceSlug,
        },
      });

      await tx.user.create({
        data: {
          email,
          name: parsed.data.workspaceName?.trim() ?? null,
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
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === "P2002") {
        return {
          success: false,
          error: "That email is already registered.",
          fieldErrors: { email: ["Choose a different email address"] },
        };
      }
    }

    console.error("Failed to create account", error);
    return {
      success: false,
      error: "Unable to create account right now. Please try again.",
    };
  }

  return { success: true };
}
