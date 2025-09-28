import Link from "next/link";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";

import { SignInForm } from "@/components/forms/sign-in-form";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { authOptions } from "@/lib/auth-options";
import { siteConfig } from "@/lib/site-config";

export default async function SignInPage({
  searchParams,
}: {
  searchParams?: Promise<{ error?: string }>;
}) {
  const session = await getServerSession(authOptions);
  if (session) {
    redirect("/dashboard");
  }

  const resolvedSearchParams = await searchParams;
  const error = resolvedSearchParams?.error;

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/50 px-4 py-8">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-4 text-center">
          <CardTitle className="text-2xl">Sign in to {siteConfig.name}</CardTitle>
          <CardDescription>
            Manage invoices, customers, and Stripe payments from one workspace.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {error && (
            <p className="mb-4 rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {error === "CredentialsSignin"
                ? "Invalid email or password."
                : "Something went wrong. Please try again."}
            </p>
          )}
          <p className="mb-4 text-sm text-muted-foreground">
            Demo access: <span className="font-medium text-foreground">founder@ledgerflow.app</span> /
            <span className="font-medium text-foreground"> Passw0rd!</span>
          </p>
          <SignInForm />
          <p className="mt-6 text-center text-sm text-muted-foreground">
            Need help onboarding? <Link className="font-medium text-primary" href="mailto:hello@ledgerflow.app">Contact us</Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
