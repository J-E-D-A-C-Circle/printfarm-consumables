import { NextRequest, NextResponse } from "next/server";
import { getSessionFromRequest, destroySession } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const session = await getSessionFromRequest(req);
  if (!session) {
    return NextResponse.json({ user: null }, { status: 401 });
  }
  return NextResponse.json({ user: session });
}

export async function POST() {
  await destroySession();
  return NextResponse.json({ success: true });
}

