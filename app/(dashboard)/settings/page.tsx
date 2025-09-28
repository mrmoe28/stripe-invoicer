import { EmailDeliveryCard } from "@/components/settings/email-delivery-card";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { getEmailDomainInfo } from "@/lib/services/email-domain-service";

export default async function SettingsPage() {
  const emailDomainInfo = await getEmailDomainInfo();

  return (
    <div className="flex flex-col gap-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl">Settings</CardTitle>
          <CardDescription>Manage branding, invoice templates, and payment preferences.</CardDescription>
        </CardHeader>
      </Card>

      <EmailDeliveryCard initialInfo={emailDomainInfo} />

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Brand profile</CardTitle>
            <CardDescription>Information displayed on invoices and client emails.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="businessName">Business name</Label>
              <Input id="businessName" placeholder="Ledgerflow Studio" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="replyTo">Billing email</Label>
              <Input id="replyTo" type="email" placeholder="billing@ledgerflow.app" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="footer">Invoice footer</Label>
              <Textarea id="footer" placeholder="Thank you for choosing Ledgerflow." rows={5} />
            </div>
            <Button className="w-full sm:w-auto">Save branding</Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Payments</CardTitle>
            <CardDescription>Stripe options for checkout and reminders.</CardDescription>
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
              <Label htmlFor="webhook">Stripe webhook secret</Label>
              <Input id="webhook" placeholder="whsec_..." type="password" />
            </div>
            <Button className="w-full sm:w-auto">Update payment settings</Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
