import { NextResponse } from "next/server";
import { db, getSettings, tzToday, addDays } from "@/lib/db";
import { tg } from "@/lib/tg";
import { releaseExpired } from "@/lib/lockers";
import { fill } from "@/lib/broadcast";
import { processDue } from "@/lib/scheduled";

export async function GET(req: Request) {
  const key = new URL(req.url).searchParams.get("key");
  if (req.headers.get("authorization") !== `Bearer ${process.env.CRON_SECRET}` && key !== process.env.CRON_SECRET)
    return new Response("forbidden", { status: 401 });
  const s = await getSettings();
  const today = tzToday();
  const now = Date.now();
  await releaseExpired();
  const res: any = { expired: 0, absent: 0, reminded: 0, missed: 0, summary: false };

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
  const { data: soon } = await db.from("users").select("id,tg_id,silent,first_name")
    .eq("role", "client").eq("paid_until", addDays(today, +s.remind_days || 3));
  for (const c of s.remind_on === false ? [] : soon || []) {
    const text = fill(s.tpl_remind, { ism: c.first_name || "Do'stim", kun: +s.remind_days || 3 });
    await db.from("notifications").insert({ user_id: c.id, title: "To'lov eslatmasi", body: text });
    if (c.tg_id) await tg("sendMessage", { chat_id: c.tg_id, text: `🔔 ${text}`, disable_notification: !!c.silent });
    res.reminded++;
  }

  // 4) "Sizni sog'indik": uzoq kelmaganlarga (obunasi bor) bir marta xabar
  if (s.absent_msg_on !== false) {
    const lim = new Date(now - (+s.absent_msg_days || 7) * 864e5).toISOString();
    const { data: ab } = await db.from("users").select("id,tg_id,silent,first_name,last_visit,created_at,absent_msg_at")
      .eq("role", "client").eq("blocked", false).gte("paid_until", today);
    for (const c of ab || []) {
      const ref = c.last_visit || c.created_at;
      if (!ref || ref >= lim || (c.absent_msg_at && c.absent_msg_at >= ref)) continue;
      const text = fill(s.tpl_absent, { ism: c.first_name || "Do'stim", kun: +s.absent_msg_days || 7 });
      await db.from("notifications").insert({ user_id: c.id, title: "Sizni sog'indik", body: text });
      if (c.tg_id) await tg("sendMessage", { chat_id: c.tg_id, text: `💪 ${text}`, disable_notification: !!c.silent });
      await db.from("users").update({ absent_msg_at: new Date().toISOString() }).eq("id", c.id);
      res.missed++;
    }
  }

  // 5) Kunlik xulosa: kechqurun 21:00 dan keyin zal egasiga (kuniga bir marta)
  const hourT = new Date(now + 5 * 3600e3).getUTCHours();
  if (s.summary_on !== false && hourT >= 21) {
    const { data: done } = await db.from("settings").select("value").eq("key", "_summary_day").maybeSingle();
    if (done?.value !== today) {
      const from = `${today}T00:00:00+05:00`;
      const [vi, pa, nw, ow] = await Promise.all([
        db.from("visits").select("user_id").gte("at", from),
        db.from("payments").select("amount").gte("paid_at", from),
        db.from("users").select("id").eq("role", "client").gte("created_at", from),
        db.from("users").select("tg_id").in("role", ["owner", "manager"]).not("tg_id", "is", null),
      ]);
      const income = (pa.data || []).reduce((a: number, x: any) => a + (x.amount || 0), 0);
      const text = `📊 Bugungi xulosa (${today})\n\n👥 Kelganlar: ${new Set((vi.data || []).map((x: any) => x.user_id)).size}\n💰 Tushum: ${income.toLocaleString()} so'm\n🆕 Yangi a'zolar: ${nw.data?.length || 0}`;
      for (const o of ow.data || []) await tg("sendMessage", { chat_id: o.tg_id, text });
      await db.from("settings").upsert({ key: "_summary_day", value: today });
      res.summary = true;
    }
  }
  res.scheduled = await processDue(true);
  return NextResponse.json(res);
}
