import { cookies } from "next/headers";
import { NextResponse } from "next/server";

export async function GET() {
  cookies().delete("session");
  return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL}/`);
}
