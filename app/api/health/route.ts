import { NextResponse } from "next/server";
import { db } from "@/lib/db";

// Uptime monitor shu manzilni tekshirib turadi: server va baza uyg'oq turadi
export async function GET() {
  const { error } = await db.from("settings").select("key").limit(1);
  return NextResponse.json({ ok: !error });
}
