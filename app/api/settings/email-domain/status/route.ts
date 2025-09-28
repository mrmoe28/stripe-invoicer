import { NextResponse } from "next/server";

import { getEmailDomainInfo } from "@/lib/services/email-domain-service";

export async function GET() {
  try {
    const info = await getEmailDomainInfo();
    return NextResponse.json(info);
  } catch (error) {
    console.error("Failed to refresh Resend domain status", error);
    return NextResponse.json({ error: "Unable to check domain status" }, { status: 500 });
  }
}
