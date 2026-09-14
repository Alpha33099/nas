import { NextRequest, NextResponse } from "next/server";
import { getCountryFromHeaders, getCurrencyForCountry } from "@/lib/currency";

export async function GET(req: NextRequest) {
  const country = getCountryFromHeaders(req.headers);
  const currency = getCurrencyForCountry(country);

  return NextResponse.json({
    country,
    currency,
  });
}
