import { NextResponse } from "next/server";
import { getSession, getTokenFromRequest } from "@/lib/auth";

export async function GET(req: Request) {
  const token = getTokenFromRequest(req);
  const session = getSession(token);
  if (!session) {
    return NextResponse.json({ data: null });
  }
  return NextResponse.json({ data: session });
}
