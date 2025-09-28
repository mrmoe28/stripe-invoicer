"use client";

import * as React from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { EmailDomainInfo } from "@/lib/services/email-domain-service";

const statusMeta: Record<EmailDomainInfo["status"], { label: string; badge: "success" | "warning" | "destructive" | "secondary" }> = {
  not_configured: {
    label: "No domain configured",
    badge: "secondary",
  },
  pending: {
    label: "Pending verification",
    badge: "warning",
  },
  verified: {
    label: "Domain verified",
    badge: "success",
  },
  failed: {
    label: "Verification failed",
    badge: "destructive",
  },
};

const stepsByStatus: Record<EmailDomainInfo["status"], string[]> = {
  not_configured: [
    "Choose or purchase the domain you want to send from.",
    "Add the domain in the Resend dashboard to receive the DNS records.",
    "Create the TXT and CNAME records with your DNS provider, then check status here.",
  ],
  pending: [
    "Double-check that the TXT and CNAME records from Resend are present and public.",
    "Wait for DNS propagation, then request another status check.",
    "Send a test invoice once verified to confirm deliverability.",
  ],
  verified: [
    "Send yourself a test invoice to confirm the branding.",
    "Create a runbook to monitor domain status periodically.",
    "Rotate the domain or records if DNS ownership changes.",
  ],
  failed: [
    "Confirm the DNS values match exactly what Resend provided.",
    "Remove conflicting SPF or DKIM entries for this domain.",
    "Trigger another verification from the Resend dashboard after updating DNS.",
  ],
};

function formatRecords(records: EmailDomainInfo["records"]) {
  if (records.length === 0) {
    return "";
  }

  return records
    .map((record) => `${record.type}\t${record.name}\t${record.value}`)
    .join("\n");
}

type Props = {
  initialInfo: EmailDomainInfo;
};

export function EmailDeliveryCard({ initialInfo }: Props) {
  const [info, setInfo] = React.useState(initialInfo);
  const [isChecking, startTransition] = React.useTransition();
  const [copyState, setCopyState] = React.useState<"idle" | "copied" | "error">("idle");
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);

  const statusConfig = statusMeta[info.status];
  const steps = stepsByStatus[info.status];

  const handleRefresh = () => {
    startTransition(async () => {
      setErrorMessage(null);
      setCopyState("idle");
      try {
        const response = await fetch("/api/settings/email-domain/status", { cache: "no-store" });
        if (!response.ok) {
          throw new Error(`Request failed with status ${response.status}`);
        }
        const payload = (await response.json()) as EmailDomainInfo;
        setInfo(payload);
      } catch (error) {
        console.error("Failed to refresh domain status", error);
        setErrorMessage("Unable to refresh status. Try again in a moment.");
      }
    });
  };

  const handleCopy = async () => {
    if (!info.canCopyRecords || info.records.length === 0) {
      return;
    }

    try {
      await navigator.clipboard.writeText(formatRecords(info.records));
      setCopyState("copied");
      setTimeout(() => setCopyState("idle"), 2000);
    } catch (error) {
      console.error("Failed to copy DNS records", error);
      setCopyState("error");
      setTimeout(() => setCopyState("idle"), 2000);
    }
  };

  const activeDomain = info.domainName ?? "Add a domain";
  const dnsRecords = info.records;

  return (
    <Card>
      <CardHeader className="gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <CardTitle>Email delivery</CardTitle>
          <CardDescription>
            Connect your sending domain so invoice emails come from your workspace address.
          </CardDescription>
        </div>
        <Badge variant={statusConfig.badge}>{statusConfig.label}</Badge>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-2">
          <p className="text-sm font-medium text-foreground">Active domain</p>
          <div className="rounded-lg border border-border/60 bg-muted/30 p-4">
            <p className="text-sm font-semibold text-foreground">{activeDomain}</p>
            <p className="text-sm text-muted-foreground">{info.message}</p>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <div className="space-y-3">
            <p className="text-sm font-medium text-foreground">What to do next</p>
            <ul className="list-disc space-y-2 pl-5 text-sm text-muted-foreground">
              {steps.map((step) => (
                <li key={step}>{step}</li>
              ))}
            </ul>
          </div>
          <div className="space-y-3">
            <p className="text-sm font-medium text-foreground">DNS records</p>
            {dnsRecords.length > 0 ? (
              <div className="space-y-2">
                {dnsRecords.map((record) => (
                  <div
                    key={`${record.type}-${record.name}`}
                    className="grid grid-cols-[80px_1fr] gap-3 rounded-lg border border-border/60 bg-background p-4 text-xs"
                  >
                    <div>
                      <p className="font-semibold uppercase tracking-wide text-muted-foreground">{record.type}</p>
                      <p className="text-muted-foreground/80">{record.name}</p>
                    </div>
                    <p className="break-all text-foreground/80">{record.value}</p>
                  </div>
                ))}
              </div>
            ) : (
              <div className="rounded-lg border border-dashed border-border/60 bg-muted/30 p-4 text-sm text-muted-foreground">
                Add your domain in Resend to receive the TXT and CNAME records you need here.
              </div>
            )}
          </div>
        </div>

        {errorMessage && <p className="text-sm text-destructive">{errorMessage}</p>}

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <Button className="w-full sm:w-auto" onClick={handleRefresh} disabled={isChecking || !info.canCheck}>
            {isChecking ? "Checking..." : "Check status"}
          </Button>
          <Button
            variant="outline"
            className="w-full sm:w-auto"
            onClick={handleCopy}
            disabled={!info.canCopyRecords}
          >
            {copyState === "copied" ? "Copied" : copyState === "error" ? "Copy failed" : "Copy DNS details"}
          </Button>
          <Button variant="ghost" className="w-full sm:w-auto" asChild>
            <a href={info.providerDashboardUrl} target="_blank" rel="noreferrer">
              Open Resend dashboard
            </a>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
