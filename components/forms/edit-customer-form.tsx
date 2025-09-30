"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import type { Customer } from "@prisma/client";

import { updateCustomerAction } from "@/app/(dashboard)/customers/actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { customerFormSchema, type CustomerFormValues } from "@/lib/validations/customer";

interface EditCustomerFormProps {
  customer: Customer;
}

export function EditCustomerForm({ customer }: EditCustomerFormProps) {
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
      businessName: customer.businessName,
      primaryContact: customer.primaryContact || "",
      email: customer.email,
      phone: customer.phone || "",
      customerType: ("customerType" in customer ? customer.customerType : "BUSINESS") as "BUSINESS" | "INDIVIDUAL",
      taxId: "taxId" in customer ? (customer.taxId as string) || "" : "",
      addressLine1: customer.addressLine1 || "",
      addressLine2: customer.addressLine2 || "",
      city: customer.city || "",
      state: customer.state || "",
      postalCode: customer.postalCode || "",
      country: customer.country || "",
      notes: customer.notes || "",
    },
  });

  const onSubmit = (values: CustomerFormValues) => {
    startTransition(async () => {
      try {
        await updateCustomerAction(customer.id, values);
      } catch (error) {
        if (error && typeof error === "object" && "digest" in error) {
          throw error;
        }
        console.error(error);
        setFormError("Failed to update customer.");
      }
    });
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <Card>
        <CardHeader>
          <CardTitle>Edit Customer</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4">
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
                <p className="text-sm text-destructive">{errors.customerType.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="taxId">Tax ID / VAT Number</Label>
              <Input id="taxId" {...register("taxId")} placeholder="Optional" />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="businessName">Name *</Label>
              <Input id="businessName" {...register("businessName")} placeholder="Business or individual name" />
              {errors.businessName && (
                <p className="text-sm text-destructive">{errors.businessName.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="primaryContact">Primary contact</Label>
              <Input id="primaryContact" {...register("primaryContact")} />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="email">Email *</Label>
              <Input id="email" type="email" {...register("email")} />
              {errors.email && <p className="text-sm text-destructive">{errors.email.message}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Phone</Label>
              <Input id="phone" type="tel" {...register("phone")} />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="addressLine1">Address line 1</Label>
            <Input id="addressLine1" {...register("addressLine1")} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="addressLine2">Address line 2</Label>
            <Input id="addressLine2" {...register("addressLine2")} />
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="city">City</Label>
              <Input id="city" {...register("city")} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="state">State</Label>
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

          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea id="notes" {...register("notes")} rows={4} />
          </div>

          {formError && <p className="text-sm text-destructive">{formError}</p>}
        </CardContent>
        <CardFooter className="flex justify-between">
          <Button
            type="button"
            variant="outline"
            onClick={() => router.back()}
            disabled={isPending}
          >
            Cancel
          </Button>
          <Button type="submit" disabled={isPending}>
            {isPending ? "Updating..." : "Update customer"}
          </Button>
        </CardFooter>
      </Card>
    </form>
  );
}