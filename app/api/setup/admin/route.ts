import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json(
    { message: "Admin setup is disabled. Admins are managed securely." },
    { status: 403 }
  );
}