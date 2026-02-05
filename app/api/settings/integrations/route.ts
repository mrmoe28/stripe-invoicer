import { createHash, randomBytes } from "crypto";
import { NextResponse } from "next/server";

import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const API_KEY_PREFIX = "lk_";
const API_KEY_BYTES = 24;
const DISPLAY_PREFIX_LEN = 11;

function hashApiKey(key: string): string {
  return createHash("sha256").update(key, "utf8").digest("hex");
}

export async function GET() {
  const user = await getCurrentUser();
  const integrations = await prisma.workspaceIntegration.findMany({
    where: { workspaceId: user.workspaceId },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      name: true,
      slug: true,
      baseUrl: true,
      apiKeyPrefix: true,
      createdAt: true,
    },
  });
  const list = integrations.map((int) => ({
    ...int,
    apiKeyMasked: int.apiKeyPrefix ? `${int.apiKeyPrefix}••••••••` : null,
  }));
  return NextResponse.json(list);
}

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();
    const body = await request.json();
    const name = String(body.name ?? "").trim();
    const slug = (body.slug ?? name.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "")).trim();
    const baseUrl = body.baseUrl ? String(body.baseUrl).trim() : null;

    if (!name || !slug) {
      return NextResponse.json(
        { message: "Name is required" },
        { status: 400 }
      );
    }

    const rawKey = randomBytes(API_KEY_BYTES).toString("base64url");
    const apiKey = `${API_KEY_PREFIX}${rawKey}`;
    const apiKeyHash = hashApiKey(apiKey);
    const apiKeyPrefix = apiKey.slice(0, DISPLAY_PREFIX_LEN);

    const integration = await prisma.workspaceIntegration.create({
      data: {
        workspaceId: user.workspaceId,
        name,
        slug: slug || name.toLowerCase().replace(/\s+/g, "-"),
        baseUrl: baseUrl || undefined,
        apiKeyHash,
        apiKeyPrefix,
      },
      select: {
        id: true,
        name: true,
        slug: true,
        baseUrl: true,
        apiKeyPrefix: true,
        createdAt: true,
      },
    });
    return NextResponse.json(
      {
        integration: {
          ...integration,
          apiKeyMasked: `${apiKeyPrefix}••••••••`,
        },
        apiKey,
      },
      { status: 201 }
    );
  } catch (error) {
    if (error && typeof error === "object" && "code" in error && error.code === "P2002") {
      return NextResponse.json(
        { message: "An integration with this name or slug already exists" },
        { status: 409 }
      );
    }
    console.error("Create integration error:", error);
    return NextResponse.json(
      { message: "Failed to add integration" },
      { status: 500 }
    );
  }
}
