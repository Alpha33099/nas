import { verifyCustomerToken } from "@/lib/auth";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const customer = await verifyCustomerToken();
    if (!customer) {
      return NextResponse.json({ loggedIn: false });
    }

    return NextResponse.json({
      loggedIn: true,
      customer: {
        id: customer.id,
        username: customer.username,
      },
    });
  } catch {
    return NextResponse.json({ loggedIn: false });
  }
}
