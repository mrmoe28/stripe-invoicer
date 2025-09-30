"use client";

import * as React from "react";
import { signIn } from "next-auth/react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const signUpFormSchema = z
  .object({
    email: z.string().email("Enter a valid email address"),
    password: z.string().min(8, "Password must be at least 8 characters"),
    confirmPassword: z.string(),
  })
  .refine((values) => values.password === values.confirmPassword, {
    path: ["confirmPassword"],
    message: "Passwords do not match",
  });

type SignUpFormValues = z.infer<typeof signUpFormSchema>;

export function SignUpForm() {
  const [formError, setFormError] = React.useState<string | null>(null);
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<SignUpFormValues>({
    resolver: zodResolver(signUpFormSchema),
    defaultValues: {
      email: "",
      password: "",
      confirmPassword: "",
    },
  });

  const onSubmit = async (values: SignUpFormValues) => {
    setFormError(null);
    const email = values.email.trim().toLowerCase();

    try {
      const response = await fetch("/api/sign-up", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password: values.password }),
      });

      const payload = (await response.json()) as {
        success: boolean;
        error?: string;
        fieldErrors?: Record<string, string[]>;
      };

      if (!response.ok || !payload.success) {
        setFormError(payload.error ?? "Unable to create account right now. Please try again.");
        if (payload.fieldErrors) {
          Object.entries(payload.fieldErrors).forEach(([field, messages]) => {
            const message = messages?.[0];
            if (message) {
              setError(field as keyof SignUpFormValues, { message });
            }
          });
        }
        return;
      }
    } catch (error) {
      console.error("Sign-up request failed", error);
      setFormError("Unable to create account right now. Please try again.");
      return;
    }

    const signInResult = await signIn("credentials", {
      redirect: false,
      email,
      password: values.password,
      callbackUrl: "/dashboard",
    });

    if (signInResult?.error) {
      setFormError("Account created, but automatic sign-in failed. Please sign in manually.");
      return;
    }

    if (signInResult?.ok) {
      // Force navigation to dashboard after successful sign-in
      window.location.href = "/dashboard";
    } else {
      setFormError("Account created, but automatic sign-in failed. Please sign in manually.");
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="email">Email</Label>
        <Input id="email" type="email" autoComplete="email" {...register("email")} />
        {errors.email && <p className="text-sm text-destructive">{errors.email.message}</p>}
      </div>
      <div className="space-y-2">
        <Label htmlFor="password">Password</Label>
        <Input id="password" type="password" autoComplete="new-password" {...register("password")} />
        {errors.password && <p className="text-sm text-destructive">{errors.password.message}</p>}
      </div>
      <div className="space-y-2">
        <Label htmlFor="confirmPassword">Confirm password</Label>
        <Input id="confirmPassword" type="password" autoComplete="new-password" {...register("confirmPassword")} />
        {errors.confirmPassword && <p className="text-sm text-destructive">{errors.confirmPassword.message}</p>}
      </div>
      {formError && <p className="text-sm text-destructive">{formError}</p>}
      <Button type="submit" className="w-full" disabled={isSubmitting}>
        {isSubmitting ? "Creating account..." : "Create account"}
      </Button>
    </form>
  );
}
