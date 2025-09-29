import Link from "next/link";

import { SignInForm } from "@/components/forms/sign-in-form";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { LinkButton } from "@/components/ui/link-button";
import { siteConfig } from "@/lib/site-config";

export default async function SignInPage({
  searchParams,
}: {
  searchParams?: Promise<{ error?: string }>;
}) {
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
          <SignInForm />
          <div className="mt-6 space-y-4 text-center">
            <LinkButton href="/sign-up" variant="outline" className="w-full">
              Sign up
            </LinkButton>
            <p className="text-sm text-muted-foreground">
              Need help onboarding?{" "}
              <Link className="font-medium text-primary hover:underline" href="mailto:hello@ledgerflow.app">
                Contact us
              </Link>
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
