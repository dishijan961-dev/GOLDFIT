import { NextResponse } from "next/server";
import { assignLocker, lockerOf } from "@/lib/lockers";
import { recordVisit } from "@/lib/visit";
import { db, getSettings, tzToday } from "@/lib/db";

// Eshik/turniket kontrolleri (ESP32 va h.k.) shu manzilga karta raqamini yuboradi:
// POST /api/door   header: x-door-key: <DOOR_KEY>   body: {"card":"A1B2C3D4"}
// Javob: {"open":true|false,...}. open=true bo'lsa kontroller releni yoqadi.
export async function POST(req: Request) {
  const key = process.env.DOOR_KEY;
  if (!key || req.headers.get("x-door-key") !== key) return NextResponse.json({ open: false, error: "key" }, { status: 401 });
  const { card } = await req.json().catch(() => ({}));
  if (!card) return NextResponse.json({ open: false, reason: "no_card" });
  const { data: u } = await db.from("users").select("*").eq("card_uid", String(card).trim()).eq("role", "client").maybeSingle();
  if (!u) return NextResponse.json({ open: false, reason: "unknown_card" });
  if (u.blocked) return NextResponse.json({ open: false, reason: "blocked", name: u.first_name });
  if (!u.paid_until || u.paid_until < tzToday()) return NextResponse.json({ open: false, reason: "expired", name: u.first_name });
  // 1 daqiqa ichida takroran tutilsa, davomat ikki marta yozilmaydi
  if (u.last_visit && Date.now() - new Date(u.last_visit).getTime() < 60000)
    return NextResponse.json({ open: true, name: u.first_name, locker: await lockerOf(u.id) });
  const { locker } = await recordVisit(u.id, "card"); // shkaf raqami: kontroller shu shkafni ochadi
  return NextResponse.json({ open: true, name: u.first_name, locker });
}
