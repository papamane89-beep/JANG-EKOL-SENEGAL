import { NextResponse } from "next/server";
import { destroySession, getTokenFromRequest } from "@/lib/auth";

export async function POST(req: Request) {
  const token = getTokenFromRequest(req);
  destroySession(token);
  const res = NextResponse.json({ ok: true });
  res.cookies.delete("jang_token");
  return res;
}
