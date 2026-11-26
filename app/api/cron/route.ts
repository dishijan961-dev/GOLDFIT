import { NextResponse } from "next/server";
import { db, getSettings, tzToday, addDays } from "@/lib/db";
import { tg } from "@/lib/tg";
import { releaseExpired } from "@/lib/lockers";

export async function GET(req: Request) {
  const key = new URL(req.url).searchParams.get("key");
  if (req.headers.get("authorization") !== `Bearer ${process.env.CRON_SECRET}` && key !== process.env.CRON_SECRET)
    return new Response("forbidden", { status: 401 });
  const s = await getSettings();
  const today = tzToday();
  const now = Date.now();
  await releaseExpired();
  const res = { expired: 0, absent: 0, reminded: 0, missed: 0, summary: false };

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
    .eq("role", "client").eq("paid_until", addDays(today, +s.remind_days || 3));
  for (const c of s.remind_on === false ? [] : soon || []) {
    const text = `Obuna muddatingiz ${+s.remind_days || 3} kundan keyin tugaydi. Iltimos, zalda to'lovni amalga oshiring.`;
    await db.from("notifications").insert({ user_id: c.id, title: "To'lov eslatmasi", body: text });
    if (c.tg_id) await tg("sendMessage", { chat_id: c.tg_id, text: `🔔 ${text}`, disable_notification: !!c.silent });
    res.reminded++;
  }

  // 4) "Sog'indik" xabari: aynan N kun kelmaganlarga bir marta
  if (s.absent_msg_on !== false) {
    const N = +s.absent_msg_days || 7;
    const dayOf = (iso: string) => new Date(+new Date(iso) + 5 * 3600e3).toISOString().slice(0, 10);
    const { data: act } = await db.from("users").select("id,first_name,tg_id,silent,last_visit,created_at")
      .eq("role", "client").eq("blocked", false).gte("paid_until", today);
    for (const c of act || []) {
      const ref = c.last_visit || c.created_at;
      if (!ref) continue;
      const diff = Math.round((+new Date(today) - +new Date(dayOf(ref))) / 864e5);
      if (diff !== N) continue;
      const text = `${c.first_name || "Do'stim"}, ${N} kundan beri zalga kelmadingiz. Sizni sog'indik! Bugun mashq qilamizmi?`;
      await db.from("notifications").insert({ user_id: c.id, title: "Sizni sog'indik", body: text });
      if (c.tg_id) await tg("sendMessage", { chat_id: c.tg_id, text: `💪 ${text}`, disable_notification: !!c.silent });
      res.missed++;
    }
  }

  // 5) Zal egasiga kunlik xulosa (Toshkent vaqti bilan 21:00 dan keyin, kuniga bir marta)
  const hour = new Date(now + 5 * 3600e3).getUTCHours();
  if (s.summary_on !== false && hour >= 21) {
    const { data: last } = await db.from("settings").select("value").eq("key", "_summary_last").maybeSingle();
    const { data: own } = await db.from("settings").select("value").eq("key", "_owner_tg").maybeSingle();
    const chat = own?.value?.id;
    if (chat && last?.value !== today) {
      const start = `${today}T00:00:00+05:00`;
      const [v, p, a, e] = await Promise.all([
        db.from("visits").select("id", { count: "exact", head: true }).gte("at", start),
        db.from("payments").select("amount").gte("paid_at", start),
        db.from("users").select("id", { count: "exact", head: true }).eq("role", "client").eq("blocked", false).gte("paid_until", today),
        db.from("users").select("id", { count: "exact", head: true }).eq("role", "client").gte("paid_until", today).lte("paid_until", addDays(today, 3)),
      ]);
      const income = (p.data || []).reduce((x: number, r: any) => x + (r.amount || 0), 0);
      await tg("sendMessage", { chat_id: chat, text: `📊 GOLD FIT: bugungi xulosa\n\n👥 Kelganlar: ${v.count || 0}\n💰 Tushum: ${income.toLocaleString("ru-RU")} so'm\n✅ Faol a'zolar: ${a.count || 0}\n⏳ 3 kunda tugaydi: ${e.count || 0}` });
      await db.from("settings").upsert({ key: "_summary_last", value: today });
      res.summary = true;
    }
  }
  return NextResponse.json(res);
}
