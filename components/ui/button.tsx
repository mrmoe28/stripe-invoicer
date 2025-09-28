import * as React from "react";
import { Slot } from "@radix-ui/react-slot";

import { cn } from "@/lib/utils";

const buttonVariants = {
  default:
    "inline-flex items-center justify-center whitespace-nowrap rounded-md font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-60 bg-primary text-primary-foreground hover:bg-primary/90",
  secondary:
    "inline-flex items-center justify-center whitespace-nowrap rounded-md font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-60 bg-muted text-muted-foreground hover:bg-muted/80",
  outline:
    "inline-flex items-center justify-center whitespace-nowrap rounded-md border border-input bg-background font-medium transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-60",
  destructive:
    "inline-flex items-center justify-center whitespace-nowrap rounded-md font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-60 bg-destructive text-destructive-foreground hover:bg-destructive/90",
  ghost:
    "inline-flex items-center justify-center rounded-md font-medium text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2",
  link: "font-medium text-primary underline-offset-4 hover:underline",
};

const buttonSizes = {
  sm: "h-8 rounded-md px-3 text-xs",
  md: "h-10 rounded-md px-4 text-sm",
  lg: "h-12 rounded-lg px-6 text-base",
  icon: "size-9",
};

type Variant = keyof typeof buttonVariants;
type Size = keyof typeof buttonSizes;

type ButtonProps = {
  asChild?: boolean;
  variant?: Variant;
  size?: Size;
} & Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, "size">;

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "default", size = "md", asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";

    return (
      <Comp
        className={cn(buttonVariants[variant], buttonSizes[size], className)}
        ref={ref}
        {...props}
      />
    );
  },
);
Button.displayName = "Button";

export { Button, buttonVariants };
