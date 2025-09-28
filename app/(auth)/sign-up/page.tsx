import Link from "next/link";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";

import { SignUpForm } from "@/components/forms/sign-up-form";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { authOptions } from "@/lib/auth-options";
import { siteConfig } from "@/lib/site-config";

export default async function SignUpPage() {
  const session = await getServerSession(authOptions);
  if (session) {
    redirect("/dashboard");
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/50 px-4 py-8">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-4 text-center">
          <CardTitle className="text-2xl">Create your {siteConfig.name} account</CardTitle>
          <CardDescription>Set up your workspace and start sending invoices in minutes.</CardDescription>
        </CardHeader>
        <CardContent>
          <SignUpForm />
          <p className="mt-6 text-center text-sm text-muted-foreground">
            Already have an account? <Link className="font-medium text-primary" href="/sign-in">Sign in</Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
