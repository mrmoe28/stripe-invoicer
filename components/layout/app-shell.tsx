"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut, useSession } from "next-auth/react";

import { dashboardNav, siteConfig } from "@/lib/site-config";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/icons";

export function AppShell({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = React.useState(false);
  const pathname = usePathname();
  const { data: session } = useSession();
  const userName = session?.user?.name;
  const workspaceName = session?.user?.workspaceName;

  React.useEffect(() => {
    setOpen(false);
  }, [pathname]);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="mx-auto flex w-full max-w-[1440px]">
        <aside
          className={cn(
            "fixed inset-y-0 z-30 w-64 shrink-0 border-r border-border bg-muted/20 px-4 py-6 transition-all duration-200 lg:static lg:translate-x-0 lg:opacity-100",
            open ? "translate-x-0 opacity-100" : "-translate-x-full opacity-0 lg:opacity-100 lg:translate-x-0",
          )}
        >
          <div className="flex items-center justify-between">
            <Link href="/dashboard" className="flex items-center gap-2 text-lg font-semibold">
              <span className="inline-flex size-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <Icon name="invoices" className="size-5" />
              </span>
              {siteConfig.name}
            </Link>
            <Button
              variant="ghost"
              className="size-9 p-0 lg:hidden"
              onClick={() => setOpen(false)}
            >
              <Icon name="arrowRight" className="size-4" />
              <span className="sr-only">Close menu</span>
            </Button>
          </div>
          <nav className="mt-8 flex flex-col gap-1 text-sm">
            {dashboardNav.map((item) => {
              const isActive = pathname.startsWith(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "flex items-center gap-3 rounded-lg px-3 py-2 font-medium transition-colors",
                    isActive
                      ? "bg-primary/10 text-primary"
                      : "text-muted-foreground hover:bg-muted/40 hover:text-foreground",
                  )}
                >
                  <Icon name={item.icon} className="size-4" aria-hidden="true" />
                  {item.label}
                </Link>
              );
            })}
          </nav>
          <div className="mt-auto hidden flex-col gap-2 rounded-lg bg-muted/40 p-4 text-sm text-muted-foreground lg:flex">
            <div className="flex items-center gap-3">
              <Icon name="shield" className="size-4" aria-hidden="true" />
              Stripe Secure Payments
            </div>
            <p>Collect card payments instantly with auto-reconciliation.</p>
          </div>
        </aside>
        <div className="flex min-h-screen flex-1 flex-col lg:pl-0">
          <header className="sticky top-0 z-20 border-b border-border bg-background/80 backdrop-blur">
            <div className="flex h-16 items-center gap-3 px-4">
              <Button
                variant="ghost"
                className="size-9 shrink-0 p-0 lg:hidden"
                onClick={() => setOpen((prev) => !prev)}
              >
                <Icon name="menu" className="size-5" />
                <span className="sr-only">Toggle navigation</span>
              </Button>
              <div className="flex flex-1 items-center justify-end gap-3">
                <div className="hidden flex-col text-right text-xs text-muted-foreground sm:flex">
                  <span className="text-sm font-medium text-foreground">{workspaceName ?? siteConfig.name}</span>
                  <span>{userName ?? session?.user?.email ?? ""}</span>
                </div>
                <Button variant="secondary" className="hidden gap-2 lg:inline-flex" asChild>
                  <Link href="/invoices/new">
                    <Icon name="plus" className="size-4" />
                    New invoice
                  </Link>
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  className="gap-2"
                  onClick={() => signOut({ callbackUrl: "/sign-in" })}
                >
                  <Icon name="logout" className="size-4" />
                  Sign out
                </Button>
              </div>
            </div>
          </header>
          <main className="flex-1 px-4 py-6 lg:px-8 lg:py-10">{children}</main>
        </div>
      </div>
    </div>
  );
}
