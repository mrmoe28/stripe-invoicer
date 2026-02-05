import { createHash } from "crypto";
import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";

const API_KEY_PREFIX = "lk_";

function hashApiKey(key: string): string {
  return createHash("sha256").update(key, "utf8").digest("hex");
}

/**
 * External apps (e.g. OpenClaw) call this with their API key to verify they can talk to Ledgerflow.
 * Send the key in the Authorization header: Bearer <api_key>
 * or in the header: X-API-Key: <api_key>
 */
export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  const apiKeyHeader = request.headers.get("x-api-key");
  const key = authHeader?.startsWith("Bearer ")
    ? authHeader.slice(7).trim()
    : apiKeyHeader?.trim();

  if (!key || !key.startsWith(API_KEY_PREFIX)) {
    return NextResponse.json({ error: "Missing or invalid API key" }, { status: 401 });
  }

  const hash = hashApiKey(key);
  const integration = await prisma.workspaceIntegration.findFirst({
    where: { apiKeyHash: hash },
    select: { id: true, name: true, workspaceId: true },
  });

  if (!integration) {
    return NextResponse.json({ error: "Invalid API key" }, { status: 401 });
  }

  return NextResponse.json({
    ok: true,
    integration: { id: integration.id, name: integration.name },
  });
}

export async function POST(request: Request) {
  return GET(request);
}
