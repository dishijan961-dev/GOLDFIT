import { NextResponse } from "next/server";
import { db, getSettings, tzToday } from "@/lib/db";
import { getUser, safe } from "@/lib/auth";

export async function GET() {
  const u = await getUser();
  const settings = await getSettings();
  if (!u) return NextResponse.json({ user: null, settings });
  const { data: notes } = await db.from("notifications").select("*")
    .or(`user_id.is.null,user_id.eq.${u.id}`).order("created_at", { ascending: false }).limit(30);
  let stats = null;
  if (u.role === "client") {
    const { data: vs } = await db.from("visits").select("at").eq("user_id", u.id).order("at", { ascending: false }).limit(500);
    const days = new Set<string>((vs || []).map((x: any) => new Date(+new Date(x.at) + 5 * 3600e3).toISOString().slice(0, 10)));
    const t = tzToday();
    let streak = 0, d = days.has(t) ? t : new Date(+new Date(t) - 864e5).toISOString().slice(0, 10);
    while (days.has(d)) { streak++; d = new Date(+new Date(d) - 864e5).toISOString().slice(0, 10); }
    stats = { streak, month: [...days].filter((x) => x.slice(0, 7) === t.slice(0, 7)).length, total: vs?.length || 0 };
  }
  return NextResponse.json({ user: safe(u), settings, notes, stats });
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
