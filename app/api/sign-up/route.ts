import { NextResponse } from "next/server";
import { z } from "zod";

import { createAccount } from "@/lib/services/account-service";

const requestSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = requestSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid request",
          fieldErrors: parsed.error.flatten().fieldErrors,
        },
        { status: 400 },
      );
    }

    const result = await createAccount(parsed.data);
    if (!result.success) {
      return NextResponse.json(result, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Sign-up request failed", error);
    return NextResponse.json(
      { success: false, error: "Unable to create account right now. Please try again." },
      { status: 500 },
    );
  }
}
