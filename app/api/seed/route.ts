import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json(
    { message: "Seed route is disabled. Database catalog has already been seeded." },
    { status: 403 }
  );
}