const RESEND_API_BASE = "https://api.resend.com";

type ResendDomainRecord = {
  type: string;
  name: string;
  value: string;
};

type ResendDomain = {
  id: string;
  name: string;
  status: string;
  records?: ResendDomainRecord[];
};

export type EmailDomainInfo = {
  domainName: string | null;
  status: "not_configured" | "pending" | "verified" | "failed";
  message: string;
  records: ResendDomainRecord[];
  lastCheckedAt: string;
  canCheck: boolean;
  canCopyRecords: boolean;
  providerDashboardUrl: string;
};

type ResendListResponse = {
  data: ResendDomain[];
};

type ResendDomainDetailResponse = ResendDomain & {
  created_at?: string;
  updated_at?: string;
  records: ResendDomainRecord[];
};

function mapStatus(status?: string): "pending" | "verified" | "failed" {
  if (!status) {
    return "pending";
  }

  if (status.toLowerCase() === "verified") {
    return "verified";
  }

  if (status.toLowerCase() === "failed") {
    return "failed";
  }

  return "pending";
}

async function fetchFromResend<T>(path: string): Promise<T | null> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    return null;
  }

  const response = await fetch(`${RESEND_API_BASE}${path}`, {
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    cache: "no-store",
  });

  if (!response.ok) {
    console.error(`Resend API error for ${path}`, response.status, await response.text().catch(() => ""));
    return null;
  }

  return (await response.json()) as T;
}

function getDomainFromEnv(): string | null {
  const fromEmail = process.env.NOTIFICATION_FROM_EMAIL;
  if (!fromEmail || !fromEmail.includes("@")) {
    return null;
  }

  const [, domain] = fromEmail.split("@");
  if (!domain || domain.trim() === "") {
    return null;
  }

  const trimmed = domain.trim().toLowerCase();
  if (trimmed === "localhost") {
    return null;
  }

  return trimmed;
}

export async function getEmailDomainInfo(): Promise<EmailDomainInfo> {
  const now = new Date().toISOString();
  const domainName = getDomainFromEnv();
  const dashboardUrl = "https://resend.com/domains";

  if (!domainName) {
    return {
      domainName: null,
      status: "not_configured",
      message: "No domain configured. Add one in Resend to unlock branded sending.",
      records: [],
      lastCheckedAt: now,
      canCheck: true,
      canCopyRecords: false,
      providerDashboardUrl: dashboardUrl,
    };
  }

  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    return {
      domainName,
      status: "pending",
      message: "RESEND_API_KEY not configured. Add it to your environment to check status.",
      records: [],
      lastCheckedAt: now,
      canCheck: false,
      canCopyRecords: false,
      providerDashboardUrl: dashboardUrl,
    };
  }

  const list = await fetchFromResend<ResendListResponse>("/domains");

  if (!list) {
    return {
      domainName,
      status: "pending",
      message: "Unable to reach Resend. Try again in a moment.",
      records: [],
      lastCheckedAt: now,
      canCheck: true,
      canCopyRecords: false,
      providerDashboardUrl: dashboardUrl,
    };
  }

  const domainEntries = Array.isArray(list.data)
    ? list.data
    : Array.isArray((list as unknown as { domains?: ResendDomain[] }).domains)
    ? ((list as unknown as { domains?: ResendDomain[] }).domains as ResendDomain[])
    : [];

  const domain = domainEntries.find((item) => item.name.toLowerCase() === domainName.toLowerCase());

  if (!domain) {
    return {
      domainName,
      status: "pending",
      message: "Domain not found in Resend. Please add it via the Resend dashboard.",
      records: [],
      lastCheckedAt: now,
      canCheck: true,
      canCopyRecords: false,
      providerDashboardUrl: dashboardUrl,
    };
  }

  let detail: ResendDomainDetailResponse | null = null;
  if (domain.id) {
    detail = await fetchFromResend<ResendDomainDetailResponse>(`/domains/${domain.id}`);
  }

  const status = mapStatus(detail?.status ?? domain.status);
  const records =
    detail?.records ??
    (Array.isArray((detail as unknown as { dns?: { records?: ResendDomainRecord[] } })?.dns?.records)
      ? ((detail as unknown as { dns?: { records?: ResendDomainRecord[] } }).dns!.records as ResendDomainRecord[])
      : undefined) ??
    domain.records ??
    [];

  const messageByStatus: Record<typeof status, string> = {
    pending: "Your DNS changes are propagating. This can take up to 24 hours depending on your provider.",
    verified: "Outgoing invoice emails now use your branded address.",
    failed: "Resend could not validate the DNS records. Review the values in your DNS provider and try again.",
  };

  return {
    domainName,
    status,
    message: messageByStatus[status],
    records,
    lastCheckedAt: now,
    canCheck: true,
    canCopyRecords: records.length > 0,
    providerDashboardUrl: dashboardUrl,
  };
}
