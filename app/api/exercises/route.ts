import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getUser } from "@/lib/auth";

const bad = (error: string, status = 400) => NextResponse.json({ error }, { status });

// Mashqlar kutubxonasi + mijozga yuborilgan dastur
export async function GET() {
  const u = await getUser();
  if (!u) return bad("Kirish kerak", 401);
  const [lib, mine] = await Promise.all([
    db.from("exercises").select("*").eq("active", true).order("grp").order("title"),
    u.role === "client" ? db.from("assignments").select("id,note,done,created_at,by_id,exercise_id").eq("user_id", u.id).order("created_at", { ascending: false }).limit(60) : Promise.resolve({ data: [] as any[] }),
  ]);
  const library = lib.data || [];
  const byIds = [...new Set((mine.data || []).map((x: any) => x.by_id).filter(Boolean))];
  const { data: by } = byIds.length ? await db.from("users").select("id,first_name,last_name").in("id", byIds) : { data: [] as any[] };
  const assigned = (mine.data || []).map((a: any) => {
    const t: any = by?.find((x: any) => x.id === a.by_id);
    return { ...a, exercise: library.find((e: any) => e.id === a.exercise_id) || null, by: t ? [t.first_name, t.last_name].filter(Boolean).join(" ") : null };
  }).filter((a: any) => a.exercise);
  return NextResponse.json({ library, assigned });
}

// Mijoz mashqni bajarildi deb belgilaydi
export async function POST(req: Request) {
  const u = await getUser();
  if (!u || u.role !== "client") return bad("Kirish kerak", 401);
  const b = await req.json();
  await db.from("assignments").update({ done: !!b.done }).eq("id", b.id).eq("user_id", u.id);
  return NextResponse.json({ ok: true });
}
