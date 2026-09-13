import { clearCustomerCookie } from "@/lib/auth";
import { NextResponse } from "next/server";

export async function POST() {
  try {
    await clearCustomerCookie();

    return NextResponse.json({
      success: true,
      message: "Logged out successfully.",
    });
  } catch (error) {
    console.error("Customer logout error:", error);
    return NextResponse.json(
      { error: "Something went wrong." },
      { status: 500 }
    );
  }
}