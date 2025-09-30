"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import { createCustomerAction } from "@/app/(dashboard)/customers/actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { customerFormSchema, type CustomerFormValues } from "@/lib/validations/customer";

export function CustomerForm() {
  const router = useRouter();
  const [formError, setFormError] = React.useState<string | null>(null);
  const [isPending, startTransition] = React.useTransition();

  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
  } = useForm<CustomerFormValues>({
    resolver: zodResolver(customerFormSchema),
    defaultValues: {
      businessName: "",
      primaryContact: "",
      email: "",
      phone: "",
      customerType: "BUSINESS",
      taxId: "",
      addressLine1: "",
      addressLine2: "",
      city: "",
      state: "",
      postalCode: "",
      country: "",
      notes: "",
    },
  });

  const onSubmit = (values: CustomerFormValues) => {
    startTransition(async () => {
      try {
        await createCustomerAction(values);
      } catch (error) {
        if (error && typeof error === "object" && "digest" in error) {
          throw error;
        }
        console.error(error);
        setFormError("Unable to save customer. Please try again.");
      }
    });
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Business details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="customerType">Customer Type</Label>
              <Controller
                name="customerType"
                control={control}
                render={({ field }) => (
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <SelectTrigger id="customerType">
                      <SelectValue placeholder="Select customer type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="BUSINESS">Business</SelectItem>
                      <SelectItem value="INDIVIDUAL">Individual</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              />
              {errors.customerType && (
                <p className="text-xs text-destructive">{errors.customerType.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="taxId">Tax ID / VAT Number</Label>
              <Input id="taxId" {...register("taxId")} placeholder="Optional" />
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="businessName">Name</Label>
              <Input id="businessName" {...register("businessName")} placeholder="Business or individual name" />
              {errors.businessName && (
                <p className="text-xs text-destructive">{errors.businessName.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Billing email</Label>
              <Input id="email" type="email" {...register("email")} />
              {errors.email && <p className="text-xs text-destructive">{errors.email.message}</p>}
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="primaryContact">Primary contact</Label>
              <Input id="primaryContact" {...register("primaryContact")} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Phone</Label>
              <Input id="phone" {...register("phone")} />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Billing address</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="addressLine1">Address line 1</Label>
            <Input id="addressLine1" {...register("addressLine1")} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="addressLine2">Address line 2</Label>
            <Input id="addressLine2" {...register("addressLine2")} />
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="city">City</Label>
              <Input id="city" {...register("city")} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="state">State / Region</Label>
              <Input id="state" {...register("state")} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="postalCode">Postal code</Label>
              <Input id="postalCode" {...register("postalCode")} />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="country">Country</Label>
            <Input id="country" {...register("country")} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Notes</CardTitle>
        </CardHeader>
        <CardContent>
          <Textarea id="notes" rows={4} placeholder="Collection preferences, reminder schedule, etc." {...register("notes")} />
        </CardContent>
        <CardFooter className="flex items-center justify-end gap-3">
          {formError && <p className="text-sm text-destructive">{formError}</p>}
          <Button type="button" variant="outline" onClick={() => router.back()} disabled={isPending}>
            Cancel
          </Button>
          <Button type="submit" disabled={isPending}>
            {isPending ? "Saving..." : "Save customer"}
          </Button>
        </CardFooter>
      </Card>
    </form>
  );
}
