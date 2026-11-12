import { NextResponse } from "next/server";
import { db, getSettings, tzToday, addDays } from "@/lib/db";
import { tg } from "@/lib/tg";

export async function GET(req: Request) {
  if (req.headers.get("authorization") !== `Bearer ${process.env.CRON_SECRET}`)
    return new Response("forbidden", { status: 401 });
  const s = await getSettings();
  const today = tzToday();
  const now = Date.now();
  const res = { expired: 0, absent: 0, reminded: 0 };

  // 1) To'lov muddati o'tganlarni bloklash
  const { data: ex } = await db.from("users").update({ blocked: true, block_reason: "expired" })
    .eq("role", "client").eq("blocked", false).lt("paid_until", today).select("id");
  res.expired = ex?.length || 0;

  // 2) Uzoq kelmaganlarni bloklash (sozlamadagi kun soni)
  if (s.auto_block) {
    const { data: act } = await db.from("users").select("id,last_visit,unblocked_at,created_at")
      .eq("role", "client").eq("blocked", false);
    const limit = now - s.absent_days * 864e5;
    const ids = (act || []).filter((c: any) => {
      const ref = Math.max(...[c.last_visit, c.unblocked_at, c.created_at].filter(Boolean).map((d: string) => +new Date(d)));
      return ref < limit;
    }).map((c: any) => c.id);
    if (ids.length) await db.from("users").update({ blocked: true, block_reason: "absent" }).in("id", ids);
    res.absent = ids.length;
  }

  // 3) Muddat tugashiga 3 kun qolganda eslatma
  const { data: soon } = await db.from("users").select("id,tg_id,silent")
    .eq("role", "client").eq("paid_until", addDays(today, 3));
  for (const c of soon || []) {
    const text = "Oylik to'lov muddatingiz 3 kundan keyin tugaydi. Iltimos, zalda to'lovni amalga oshiring.";
    await db.from("notifications").insert({ user_id: c.id, title: "To'lov eslatmasi", body: text });
    if (c.tg_id) await tg("sendMessage", { chat_id: c.tg_id, text: `🔔 ${text}`, disable_notification: !!c.silent });
    res.reminded++;
  }
  return NextResponse.json(res);
}
