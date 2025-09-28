import { NextResponse } from "next/server";
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

// GET /api/resend/domains - Get domain details and DNS records
export async function GET() {
  try {
    // Check if Resend API key is configured
    if (!process.env.RESEND_API_KEY || process.env.RESEND_API_KEY === 'your-resend-api-key') {
      return NextResponse.json({
        status: "not_configured",
        domain: null,
        records: [],
        message: "Resend API key not configured. Please add RESEND_API_KEY to your environment variables."
      });
    }

    const fromEmail = process.env.NOTIFICATION_FROM_EMAIL ?? "no-reply@localhost";
    const emailDomain = fromEmail.includes("@") ? fromEmail.split("@")[1] : undefined;

    if (!emailDomain || emailDomain === "localhost") {
      return NextResponse.json({
        status: "not_configured",
        domain: null,
        records: []
      });
    }

    // Get all domains from Resend
    const domainsResponse = await resend.domains.list();
    
    // Find our domain
    const domain = domainsResponse.data?.data?.find(d => d.name === emailDomain);
    
    if (!domain) {
      // Domain not added to Resend yet
      return NextResponse.json({
        status: "not_configured",
        domain: emailDomain,
        records: [],
        message: "Domain not found in Resend. Please add it via the Resend dashboard."
      });
    }

    // Get detailed domain info with records
    const domainDetails = await resend.domains.get(domain.id);
    const domainData = domainDetails.data as {
      id: string;
      name: string;
      status: string;
      region?: string;
      created_at: string;
      records?: Array<{
        record?: string;
        type?: string;
        name: string;
        value: string;
        priority?: number;
        status?: string;
      }>;
    };
    
    // Format DNS records for frontend
    const formattedRecords = domainData?.records?.map((record) => ({
      type: record.record || record.type || 'TXT',
      name: record.name,
      value: record.value,
      priority: record.priority,
      status: record.status || "pending"
    })) || [];

    return NextResponse.json({
      status: domainData?.status || domain.status,
      domain: domainData?.name || domain.name,
      records: formattedRecords,
      region: domainData?.region || domain.region,
      createdAt: domainData?.created_at || domain.created_at
    });
  } catch (error) {
    console.error("Error fetching domain info:", error);
    
    // Check if it's an API key error
    if (error instanceof Error && error.message?.includes('API key')) {
      return NextResponse.json({
        status: "not_configured",
        domain: null,
        records: [],
        message: "Invalid Resend API key. Please check your RESEND_API_KEY environment variable."
      });
    }
    
    return NextResponse.json(
      { error: "Failed to fetch domain information" },
      { status: 500 }
    );
  }
}

