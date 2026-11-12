import { NextResponse } from "next/server";
import { db, getSettings, tzToday } from "@/lib/db";
import { getUser, qrFor, QR_STEP } from "@/lib/auth";

const bad = (error: string, status = 400) => NextResponse.json({ error }, { status });

export async function POST(req: Request) {
  const u = await getUser();
  if (!u || u.role !== "client") return bad("Kirish kerak", 401);
  const { qr } = await req.json();
  const m = /^GF\.(\d+)\.([0-9a-f]+)$/.exec(String(qr || ""));
  const cur = Math.floor(Date.now() / QR_STEP);
  if (!m || +m[1] > cur || cur - +m[1] > 2 || qrFor(+m[1]) !== qr) return bad("QR eskirgan yoki noto'g'ri. Qayta skanerlang");
  if (!u.paid_until || u.paid_until < tzToday()) return bad("Oylik to'lov muddati tugagan", 403);

  const s = await getSettings();
  const now = new Date();
  const until = new Date(now.getTime() + s.checkin_hours * 3600e3).toISOString();
  await db.from("visits").insert({ user_id: u.id });
  await db.from("users").update({ last_visit: now.toISOString(), checked_in_until: until }).eq("id", u.id);
  return NextResponse.json({ ok: true, until });
}
