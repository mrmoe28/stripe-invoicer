"use client";

import * as React from "react";
import Link from "next/link";
import { Button } from "./button";

interface LinkButtonProps {
  href: string;
  children: React.ReactNode;
  variant?: "default" | "secondary" | "outline" | "destructive" | "ghost" | "link";
  size?: "sm" | "md" | "lg" | "icon";
  className?: string;
}

export function LinkButton({ href, children, variant = "outline", size = "md", className }: LinkButtonProps) {
  return (
    <Link href={href} passHref legacyBehavior>
      <Button variant={variant} size={size} className={className} asChild>
        <a>{children}</a>
      </Button>
    </Link>
  );
}