import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json(
    { message: "Setup is disabled. Database has already been initialized." },
    { status: 403 }
  );
}