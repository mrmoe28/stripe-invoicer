import * as React from "react";

import { cn } from "@/lib/utils";

const badgeVariants = {
  default:
    "inline-flex items-center rounded-full border border-transparent bg-primary px-2.5 py-0.5 text-xs font-medium text-primary-foreground",
  secondary:
    "inline-flex items-center rounded-full border border-transparent bg-muted px-2.5 py-0.5 text-xs font-medium text-muted-foreground",
  outline:
    "inline-flex items-center rounded-full border border-border px-2.5 py-0.5 text-xs font-medium",
  success:
    "inline-flex items-center rounded-full border border-transparent bg-emerald-500/15 px-2.5 py-0.5 text-xs font-medium text-emerald-600",
  warning:
    "inline-flex items-center rounded-full border border-transparent bg-amber-500/15 px-2.5 py-0.5 text-xs font-medium text-amber-600",
  destructive:
    "inline-flex items-center rounded-full border border-transparent bg-destructive/20 px-2.5 py-0.5 text-xs font-medium text-destructive",
};

type Variant = keyof typeof badgeVariants;

type BadgeProps = {
  variant?: Variant;
} & React.HTMLAttributes<HTMLSpanElement>;

export function Badge({ className, variant = "default", ...props }: BadgeProps) {
  return (
    <span className={cn(badgeVariants[variant], className)} {...props} />
  );
}
