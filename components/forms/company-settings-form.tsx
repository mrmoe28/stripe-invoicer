"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Upload, X } from "lucide-react";
import Image from "next/image";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { companySettingsSchema, type CompanySettingsValues } from "@/lib/validations/company";

type Workspace = {
  id: string;
  name: string;
  companyName?: string | null;
  companyEmail?: string | null;
  companyPhone?: string | null;
  companyWebsite?: string | null;
  companyEin?: string | null;
  companyAddress?: string | null;
  companyCity?: string | null;
  companyState?: string | null;
  companyZip?: string | null;
  companyCountry?: string | null;
  logoUrl?: string | null;
};

interface CompanySettingsFormProps {
  workspace: Workspace;
  onSave: (values: CompanySettingsValues) => Promise<void>;
}

export function CompanySettingsForm({ workspace, onSave }: CompanySettingsFormProps) {
  const router = useRouter();
  const [formError, setFormError] = React.useState<string | null>(null);
  const [isPending, startTransition] = React.useTransition();
  const [logoPreview, setLogoPreview] = React.useState<string | null>(workspace.logoUrl || null);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<CompanySettingsValues>({
    resolver: zodResolver(companySettingsSchema),
    defaultValues: {
      companyName: workspace.companyName || workspace.name,
      companyEmail: workspace.companyEmail || "",
      companyPhone: workspace.companyPhone || "",
      companyWebsite: workspace.companyWebsite || "",
      companyEin: workspace.companyEin || "",
      companyAddress: workspace.companyAddress || "",
      companyCity: workspace.companyCity || "",
      companyState: workspace.companyState || "",
      companyZip: workspace.companyZip || "",
      companyCountry: workspace.companyCountry || "",
      logoUrl: workspace.logoUrl || "",
    },
  });


  const handleLogoUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // In a real app, you'd upload to a cloud storage service
      // For now, we'll create a local URL for preview
      const reader = new FileReader();
      reader.onload = (e) => {
        const dataUrl = e.target?.result as string;
        setLogoPreview(dataUrl);
        setValue("logoUrl", dataUrl);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRemoveLogo = () => {
    setLogoPreview(null);
    setValue("logoUrl", "");
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const onSubmit = (values: CompanySettingsValues) => {
    startTransition(async () => {
      try {
        await onSave(values);
        router.refresh();
      } catch (error) {
        console.error(error);
        setFormError("Failed to save company settings. Please try again.");
      }
    });
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Company Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Logo Upload Section */}
          <div className="space-y-4">
            <Label>Company Logo</Label>
            <div className="flex items-start gap-4">
              <div className="flex-1">
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                  {logoPreview ? (
                    <div className="space-y-4">
                      <div className="relative inline-block">
                        <Image
                          src={logoPreview}
                          alt="Company logo preview"
                          className="max-w-xs max-h-32 object-contain mx-auto"
                          width={300}
                          height={128}
                        />
                        <Button
                          type="button"
                          variant="destructive"
                          size="sm"
                          className="absolute -top-2 -right-2 h-6 w-6 rounded-full p-0"
                          onClick={handleRemoveLogo}
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => fileInputRef.current?.click()}
                      >
                        Change Logo
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <Upload className="h-12 w-12 mx-auto text-gray-400" />
                      <div>
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => fileInputRef.current?.click()}
                        >
                          Upload Logo
                        </Button>
                        <p className="text-sm text-gray-500 mt-2">
                          PNG, JPG, SVG up to 5MB. Recommended size: 300x100px
                        </p>
                      </div>
                    </div>
                  )}
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleLogoUpload}
                  className="hidden"
                />
              </div>
            </div>
          </div>

          {/* Company Details */}
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="companyName">Company Name *</Label>
              <Input id="companyName" {...register("companyName")} />
              {errors.companyName && (
                <p className="text-xs text-destructive">{errors.companyName.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="companyEmail">Company Email *</Label>
              <Input id="companyEmail" type="email" {...register("companyEmail")} />
              {errors.companyEmail && (
                <p className="text-xs text-destructive">{errors.companyEmail.message}</p>
              )}
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="companyPhone">Phone Number</Label>
              <Input id="companyPhone" type="tel" {...register("companyPhone")} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="companyWebsite">Website</Label>
              <Input id="companyWebsite" type="url" placeholder="https://example.com" {...register("companyWebsite")} />
              {errors.companyWebsite && (
                <p className="text-xs text-destructive">{errors.companyWebsite.message}</p>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="companyEin">EIN / Tax ID</Label>
            <Input id="companyEin" placeholder="XX-XXXXXXX" {...register("companyEin")} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Business Address</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="companyAddress">Street Address</Label>
            <Textarea id="companyAddress" rows={2} {...register("companyAddress")} />
          </div>
          
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="companyCity">City</Label>
              <Input id="companyCity" {...register("companyCity")} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="companyState">State / Province</Label>
              <Input id="companyState" {...register("companyState")} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="companyZip">ZIP / Postal Code</Label>
              <Input id="companyZip" {...register("companyZip")} />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="companyCountry">Country</Label>
            <Input id="companyCountry" defaultValue="United States" {...register("companyCountry")} />
          </div>
        </CardContent>
        
        <CardFooter className="flex items-center justify-end gap-3">
          {formError && <p className="text-sm text-destructive">{formError}</p>}
          <Button type="button" variant="outline" onClick={() => router.back()} disabled={isPending}>
            Cancel
          </Button>
          <Button type="submit" disabled={isPending}>
            {isPending ? "Saving..." : "Save Company Settings"}
          </Button>
        </CardFooter>
      </Card>
    </form>
  );
}