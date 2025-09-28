import { NextResponse } from "next/server";
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

// POST /api/resend/domains/verify - Trigger domain verification
export async function POST() {
  try {
    const fromEmail = process.env.NOTIFICATION_FROM_EMAIL ?? "no-reply@localhost";
    const emailDomain = fromEmail.includes("@") ? fromEmail.split("@")[1] : undefined;

    if (!emailDomain || emailDomain === "localhost") {
      return NextResponse.json(
        { error: "No domain configured" },
        { status: 400 }
      );
    }

    // Get all domains to find the domain ID
    const domainsResponse = await resend.domains.list();
    const domain = domainsResponse.data?.data?.find(d => d.name === emailDomain);
    
    if (!domain) {
      return NextResponse.json(
        { error: "Domain not found in Resend" },
        { status: 404 }
      );
    }

    // Trigger verification
    const verificationResponse = await resend.domains.verify(domain.id);
    const responseData = verificationResponse.data as { status?: string };
    
    return NextResponse.json({
      success: true,
      status: responseData?.status,
      message: "Verification check initiated"
    });
  } catch (error) {
    console.error("Error verifying domain:", error);
    return NextResponse.json(
      { error: "Failed to verify domain" },
      { status: 500 }
    );
  }
}