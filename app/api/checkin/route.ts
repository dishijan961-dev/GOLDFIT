import { NextResponse } from "next/server";
import { tzToday } from "@/lib/db";
import { recordVisit } from "@/lib/visit";
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

  const { until, locker } = await recordVisit(u.id, "qr");
  return NextResponse.json({ ok: true, until, locker });
}
