import { ApiIntegrationsCard } from "@/components/settings/api-integrations-card";
import { EmailDeliveryCard } from "@/components/settings/email-delivery-card";
import { SquareSetupCard } from "@/components/settings/square-setup-card";
import { CompanySettingsForm } from "@/components/forms/company-settings-form";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { getCurrentUser } from "@/lib/auth";
import { getEmailDomainInfo } from "@/lib/services/email-domain-service";
import { getWorkspaceWithCompanyInfo } from "@/lib/services/workspace-service";
import { getSquareConnectionStatus } from "@/lib/services/square-setup-service";
import { updateCompanySettingsAction } from "./actions";

export default async function SettingsPage() {
  const user = await getCurrentUser();
  const emailDomainInfo = await getEmailDomainInfo();
  const workspace = await getWorkspaceWithCompanyInfo(user.workspaceId);
  const squareStatus = await getSquareConnectionStatus(user.workspaceId);

  if (!workspace) {
    throw new Error("Workspace not found");
  }

  return (
    <div className="flex flex-col gap-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl">Settings</CardTitle>
          <CardDescription>Manage branding, invoice templates, and payment preferences.</CardDescription>
        </CardHeader>
      </Card>

      <SquareSetupCard 
        isConnected={squareStatus.isConnected}
        connectionStatus={squareStatus.locationName ? `${squareStatus.locationName} (${squareStatus.environment})` : squareStatus.error}
      />

      <EmailDeliveryCard initialInfo={emailDomainInfo} />

      <ApiIntegrationsCard />

      <CompanySettingsForm 
        workspace={workspace} 
        onSave={updateCompanySettingsAction} 
      />

      <div className="grid gap-6 lg:grid-cols-2">

        <Card>
          <CardHeader>
            <CardTitle>Payments</CardTitle>
            <CardDescription>Square options for checkout and reminders.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between gap-4 rounded-lg border border-border/60 p-4">
              <div>
                <p className="text-sm font-medium text-foreground">Automatic reminders</p>
                <p className="text-xs text-muted-foreground">
                  Send follow-ups 1, 3, and 7 days after the due date.
                </p>
              </div>
              <Switch defaultChecked />
            </div>
            <div className="flex items-center justify-between gap-4 rounded-lg border border-border/60 p-4">
              <div>
                <p className="text-sm font-medium text-foreground">Allow ACH payments</p>
                <p className="text-xs text-muted-foreground">
                  Give clients a bank transfer option with lower fees.
                </p>
              </div>
              <Switch />
            </div>
            <div className="space-y-2">
              <Label htmlFor="webhook">Square webhook secret</Label>
              <Input id="webhook" placeholder="whsec_..." type="password" />
            </div>
            <Button className="w-full sm:w-auto">Update payment settings</Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
