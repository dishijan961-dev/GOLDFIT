import { NextResponse } from "next/server";
import { db, getSettings } from "@/lib/db";
import { getUser, safe } from "@/lib/auth";

export async function GET() {
  const u = await getUser();
  const settings = await getSettings();
  if (!u) return NextResponse.json({ user: null, settings });
  const { data: notes } = await db.from("notifications").select("*")
    .or(`user_id.is.null,user_id.eq.${u.id}`).order("created_at", { ascending: false }).limit(30);
  return NextResponse.json({ user: safe(u), settings, notes });
}

export async function POST(req: Request) {
  const b = await req.json();
  if (b.logout) {
    const res = NextResponse.json({ ok: true });
    res.cookies.delete("gf");
    return res;
  }
  const u = await getUser();
  if (!u) return NextResponse.json({ error: "Kirish kerak" }, { status: 401 });
  if (typeof b.silent === "boolean") await db.from("users").update({ silent: b.silent }).eq("id", u.id);
  return NextResponse.json({ ok: true });
}
