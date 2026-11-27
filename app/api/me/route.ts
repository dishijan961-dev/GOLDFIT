import { NextResponse } from "next/server";
import { db, getSettings, tzToday } from "@/lib/db";
import { lockerOf } from "@/lib/lockers";
import { getUser, safe } from "@/lib/auth";
import { processDue } from "@/lib/scheduled";

export async function GET() {
  const u = await getUser();
  const settings = await getSettings();
  if (!u) return NextResponse.json({ user: null, settings });
  processDue(); // vaqti kelgan rejalashtirilgan xabarlar fonda yuboriladi
  const ms = `${tzToday().slice(0, 8)}01T00:00:00+05:00`;
  const isClient = u.role === "client";
  // Hamma so'rov bir vaqtda (ketma-ket emas): ilova tez ochiladi
  const [notesR, lk, mv, vs] = await Promise.all([
    db.from("notifications").select("*").or(`user_id.is.null,user_id.eq.${u.id}`).order("created_at", { ascending: false }).limit(30),
    isClient ? lockerOf(u.id) : Promise.resolve(null),
    isClient ? db.from("visits").select("user_id").gte("at", ms).limit(5000) : Promise.resolve({ data: [] as any[] }),
    isClient ? db.from("visits").select("at").eq("user_id", u.id).order("at", { ascending: false }).limit(500) : Promise.resolve({ data: [] as any[] }),
  ]);
  let stats = null, top: any[] = [];
  if (isClient) {
    const cnt: Record<string, number> = {};
    (mv.data || []).forEach((x: any) => { cnt[x.user_id] = (cnt[x.user_id] || 0) + 1; });
    const ids = Object.entries(cnt).sort((a, b) => b[1] - a[1]).slice(0, 5);
    if (ids.length) {
      const { data: us } = await db.from("users").select("id,first_name,last_name").in("id", ids.map((x) => x[0]));
      top = ids.map(([id, n]) => { const x: any = us?.find((q: any) => q.id === id); return { me: id === u.id, name: x ? `${x.first_name || ""} ${(x.last_name || "").slice(0, 1)}`.trim() : "—", n }; });
    }
    const days = new Set<string>((vs.data || []).map((x: any) => new Date(+new Date(x.at) + 5 * 3600e3).toISOString().slice(0, 10)));
    const t = tzToday();
    let streak = 0, d = days.has(t) ? t : new Date(+new Date(t) - 864e5).toISOString().slice(0, 10);
    while (days.has(d)) { streak++; d = new Date(+new Date(d) - 864e5).toISOString().slice(0, 10); }
    stats = { streak, month: [...days].filter((x) => x.slice(0, 7) === t.slice(0, 7)).length, total: vs.data?.length || 0 };
  }
  return NextResponse.json({ user: safe(u), settings, notes: notesR.data, stats, locker: lk, top });
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
