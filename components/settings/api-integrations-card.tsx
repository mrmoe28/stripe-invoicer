"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";

type Integration = {
  id: string;
  name: string;
  slug: string;
  baseUrl: string | null;
  createdAt: string;
};

export function ApiIntegrationsCard() {
  const [integrations, setIntegrations] = useState<Integration[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState("");
  const [baseUrl, setBaseUrl] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [removingId, setRemovingId] = useState<string | null>(null);

  const fetchIntegrations = async () => {
    try {
      const res = await fetch("/api/settings/integrations");
      if (res.ok) {
        const data = await res.json();
        setIntegrations(data);
      }
    } catch {
      setIntegrations([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchIntegrations();
  }, []);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedName = name.trim();
    if (!trimmedName) return;
    setSubmitting(true);
    try {
      const res = await fetch("/api/settings/integrations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: trimmedName,
          baseUrl: baseUrl.trim() || undefined,
        }),
      });
      if (res.ok) {
        setName("");
        setBaseUrl("");
        setShowForm(false);
        await fetchIntegrations();
      } else {
        const data = await res.json();
        alert(data.message || "Failed to add integration");
      }
    } catch {
      alert("Network error");
    } finally {
      setSubmitting(false);
    }
  };

  const handleRemove = async (id: string) => {
    setRemovingId(id);
    try {
      const res = await fetch(`/api/settings/integrations/${id}`, {
        method: "DELETE",
      });
      if (res.ok) {
        await fetchIntegrations();
      } else {
        alert("Failed to remove integration");
      }
    } catch {
      alert("Network error");
    } finally {
      setRemovingId(null);
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              API integrations
              {integrations.length > 0 && (
                <Badge variant="secondary">{integrations.length} connected</Badge>
              )}
            </CardTitle>
            <CardDescription>
              Link Ledgerflow to other apps like OpenClaw using API keys or webhooks.
            </CardDescription>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowForm(!showForm)}
          >
            {showForm ? "Cancel" : "Add integration"}
          </Button>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {showForm && (
          <form onSubmit={handleAdd} className="rounded-lg border border-border/60 p-4 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="integration-name">App name</Label>
              <Input
                id="integration-name"
                placeholder="e.g. OpenClaw"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="integration-baseurl">Base URL (optional)</Label>
              <Input
                id="integration-baseurl"
                type="url"
                placeholder="https://api.example.com"
                value={baseUrl}
                onChange={(e) => setBaseUrl(e.target.value)}
              />
            </div>
            <Button type="submit" disabled={!name.trim() || submitting}>
              {submitting ? "Adding…" : "Connect"}
            </Button>
          </form>
        )}

        {loading ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : integrations.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No integrations yet. Add one to link Ledgerflow to apps like OpenClaw.
          </p>
        ) : (
          <ul className="space-y-2">
            {integrations.map((int) => (
              <li
                key={int.id}
                className="flex items-center justify-between gap-4 rounded-lg border border-border/60 p-4"
              >
                <div>
                  <p className="font-medium text-foreground">{int.name}</p>
                  {int.baseUrl && (
                    <p className="text-xs text-muted-foreground truncate max-w-md" title={int.baseUrl}>
                      {int.baseUrl}
                    </p>
                  )}
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-muted-foreground hover:text-destructive"
                  onClick={() => handleRemove(int.id)}
                  disabled={removingId === int.id}
                >
                  {removingId === int.id ? "Removing…" : "Remove"}
                </Button>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
