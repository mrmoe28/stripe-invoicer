import { headers } from "next/headers";
import { getSenderEmail, getSenderName } from "@/lib/utils/email-helpers";

const RESEND_API_URL = "https://api.resend.com/emails";

export type EmailPayload = {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
  fromEmail?: string;
  fromName?: string;
  headers?: Record<string, string>;
};

export type EmailResult = {
  success: boolean;
  id?: string;
  error?: string;
  status?: number;
};

export async function sendEmail({
  to,
  subject,
  html,
  text,
  fromEmail = getSenderEmail(),
  fromName = getSenderName(),
  headers: customHeaders,
}: EmailPayload): Promise<EmailResult> {
  const apiKey = process.env.RESEND_API_KEY;

  if (!apiKey) {
    console.warn("sendEmail skipped: RESEND_API_KEY is not configured.");
    return { success: false, error: "Missing RESEND_API_KEY" };
  }

  const recipients = Array.isArray(to) ? to : [to];
  if (recipients.length === 0) {
    return { success: false, error: "No recipients provided" };
  }

  const from = `${fromName} <${fromEmail}>`;

  const response = await fetch(RESEND_API_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      ...customHeaders,
    },
    body: JSON.stringify({
      from,
      to: recipients,
      subject,
      html,
      text,
    }),
  });

  if (!response.ok) {
    const error = await safeError(response);
    console.error("sendEmail failed", error);
    return { success: false, error, status: response.status };
  }

  const payload = (await response.json()) as { id?: string };
  return { success: true, id: payload.id, status: response.status };
}

export type SmsPayload = {
  to: string;
  body: string;
  messagingServiceSid?: string;
};

export type SmsResult = {
  success: boolean;
  sid?: string;
  error?: string;
  status?: number;
};

export async function sendSms({
  to,
  body,
  messagingServiceSid = process.env.TWILIO_MESSAGING_SERVICE_SID,
}: SmsPayload): Promise<SmsResult> {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const fromNumber = process.env.TWILIO_FROM_NUMBER;

  if (!accountSid || !authToken) {
    console.warn("sendSms skipped: Twilio credentials are not configured.");
    return { success: false, error: "Missing Twilio credentials" };
  }

  const endpoint = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`;
  const params = new URLSearchParams({ To: to, Body: body });

  if (messagingServiceSid) {
    params.append("MessagingServiceSid", messagingServiceSid);
  } else if (fromNumber) {
    params.append("From", fromNumber);
  } else {
    return { success: false, error: "Missing Twilio messaging service or from number" };
  }

  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      Authorization: `Basic ${Buffer.from(`${accountSid}:${authToken}`).toString("base64")}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: params,
  });

  if (!response.ok) {
    const error = await safeError(response);
    console.error("sendSms failed", error);
    return { success: false, error, status: response.status };
  }

  const payload = (await response.json()) as { sid?: string };
  return { success: true, sid: payload.sid, status: response.status };
}

async function safeError(response: Response) {
  try {
    const data = await response.json();
    return typeof data === "string" ? data : JSON.stringify(data);
  } catch {
    try {
      return await response.text();
    } catch {
      return `Request failed with status ${response.status}`;
    }
  }
}

export async function getRequestIp(): Promise<string | undefined> {
  try {
    const requestHeaders = await headers();
    const forwarded = requestHeaders.get("x-forwarded-for");
    if (forwarded) {
      return forwarded.split(",")[0]?.trim();
    }
    return requestHeaders.get("x-real-ip") ?? undefined;
  } catch {
    return undefined;
  }
}
