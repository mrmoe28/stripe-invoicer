import type { IconName } from "@/components/icons";

export const siteConfig = {
  name: "Ledgerflow",
  description:
    "Modern invoicing for service businesses with Stripe-powered payments.",
  links: {
    github: "https://github.com/",
    docs: "https://stripe.com/docs/invoicing",
  },
};

type NavItem = {
  label: string;
  href: string;
  icon: IconName;
};

export const dashboardNav: NavItem[] = [
  { label: "Dashboard", href: "/dashboard", icon: "dashboard" },
  { label: "Invoices", href: "/invoices", icon: "invoices" },
  { label: "Templates", href: "/templates", icon: "fileText" },
  { label: "Customers", href: "/customers", icon: "users" },
  { label: "Payments", href: "/payments", icon: "payments" },
  { label: "Settings", href: "/settings", icon: "settings" },
];
