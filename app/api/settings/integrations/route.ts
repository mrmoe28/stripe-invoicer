import { NextResponse } from "next/server";

import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const user = await getCurrentUser();
  const integrations = await prisma.workspaceIntegration.findMany({
    where: { workspaceId: user.workspaceId },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json(integrations);
}

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();
    const body = await request.json();
    const name = String(body.name ?? "").trim();
    const slug = String(body.slug ?? name.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "")).trim();
    const baseUrl = body.baseUrl ? String(body.baseUrl).trim() : null;

    if (!name || !slug) {
      return NextResponse.json(
        { message: "Name is required" },
        { status: 400 }
      );
    }

    const integration = await prisma.workspaceIntegration.create({
      data: {
        workspaceId: user.workspaceId,
        name,
        slug: slug || name.toLowerCase().replace(/\s+/g, "-"),
        baseUrl: baseUrl || undefined,
      },
    });
    return NextResponse.json(integration, { status: 201 });
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
