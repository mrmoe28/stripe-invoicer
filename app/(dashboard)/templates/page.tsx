import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

const templates = [
  {
    id: "standard-invoice",
    name: "Standard Invoice",
    description: "A clean, professional invoice template suitable for most businesses",
    category: "General",
    preview: "/templates/standard-invoice.png",
    features: ["Company branding", "Line items", "Tax calculations", "Payment terms"],
  },
  {
    id: "service-invoice",
    name: "Service Invoice",
    description: "Perfect for consultants, freelancers, and service-based businesses",
    category: "Services",
    preview: "/templates/service-invoice.png",
    features: ["Hourly rates", "Time tracking", "Project descriptions", "Milestone billing"],
  },
  {
    id: "product-invoice",
    name: "Product Invoice",
    description: "Optimized for businesses selling physical products",
    category: "Products",
    preview: "/templates/product-invoice.png",
    features: ["Product catalog", "Quantity discounts", "Shipping details", "Inventory tracking"],
  },
  {
    id: "recurring-invoice",
    name: "Recurring Invoice",
    description: "Ideal for subscription services and recurring billing",
    category: "Subscription",
    preview: "/templates/recurring-invoice.png",
    features: ["Subscription details", "Auto-billing", "Payment schedules", "Usage tracking"],
  },
  {
    id: "deposit-invoice",
    name: "Deposit Invoice",
    description: "For projects requiring upfront deposits or partial payments",
    category: "Deposits",
    preview: "/templates/deposit-invoice.png",
    features: ["Deposit amounts", "Payment milestones", "Balance tracking", "Project phases"],
  },
  {
    id: "minimal-invoice",
    name: "Minimal Invoice",
    description: "A simple, clean template with just the essentials",
    category: "Simple",
    preview: "/templates/minimal-invoice.png",
    features: ["Basic details", "Clean layout", "Quick creation", "Mobile friendly"],
  },
];

const categoryColors = {
  General: "default",
  Services: "secondary",
  Products: "outline",
  Subscription: "success",
  Deposits: "warning",
  Simple: "outline",
} as const;

export default async function InvoiceTemplatesPage() {
  return (
    <div className="flex flex-col gap-6">
      <Card>
        <CardHeader>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle className="text-2xl">Invoice Templates</CardTitle>
              <CardDescription>
                Choose from our professionally designed invoice templates to get started quickly
              </CardDescription>
            </div>
            <Button variant="outline" asChild>
              <Link href="/templates/custom">Create Custom Template</Link>
            </Button>
          </div>
        </CardHeader>
      </Card>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {templates.map((template) => (
          <Card key={template.id} className="overflow-hidden hover:shadow-lg transition-shadow">
            <div className="aspect-[4/3] bg-muted relative">
              {/* Preview image placeholder */}
              <div className="absolute inset-0 flex items-center justify-center text-muted-foreground">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="h-12 w-12"
                >
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                  <polyline points="14 2 14 8 20 8" />
                  <line x1="16" y1="13" x2="8" y2="13" />
                  <line x1="16" y1="17" x2="8" y2="17" />
                  <polyline points="10 9 9 9 8 9" />
                </svg>
              </div>
            </div>
            <CardHeader>
              <div className="flex items-start justify-between">
                <CardTitle className="text-lg">{template.name}</CardTitle>
                <Badge variant={categoryColors[template.category as keyof typeof categoryColors]}>
                  {template.category}
                </Badge>
              </div>
              <CardDescription>{template.description}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <p className="text-sm font-medium">Features:</p>
                <ul className="text-sm text-muted-foreground space-y-1">
                  {template.features.map((feature, index) => (
                    <li key={index} className="flex items-center gap-2">
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className="h-3 w-3 text-primary"
                      >
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                      {feature}
                    </li>
                  ))}
                </ul>
              </div>
            </CardContent>
            <CardFooter className="flex gap-2">
              <Button variant="outline" size="sm" className="flex-1" asChild>
                <Link href={`/templates/${template.id}/preview`}>Preview</Link>
              </Button>
              <Button size="sm" className="flex-1" asChild>
                <Link href={`/invoices/new?template=${template.id}`}>Use Template</Link>
              </Button>
            </CardFooter>
          </Card>
        ))}
      </div>

      <Card>
        <CardContent className="py-8">
          <div className="text-center space-y-4">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="h-12 w-12 mx-auto text-muted-foreground"
            >
              <rect x="3" y="11" width="18" height="10" rx="2" ry="2" />
              <text x="12" y="16" textAnchor="middle" className="text-xs">
                CUSTOM
              </text>
            </svg>
            <div>
              <h3 className="font-semibold text-lg">Need a Custom Template?</h3>
              <p className="text-sm text-muted-foreground mt-1">
                Create your own template with our template builder or import your existing design
              </p>
            </div>
            <div className="flex gap-2 justify-center">
              <Button variant="outline" asChild>
                <Link href="/templates/import">Import Template</Link>
              </Button>
              <Button asChild>
                <Link href="/templates/custom">Build Custom Template</Link>
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}