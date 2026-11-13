import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { db, tzToday, addDays } from "@/lib/db";
import { getUser } from "@/lib/auth";
import { tg } from "@/lib/tg";
import { encrypt, clearBotCache, getBotToken, webhookSecret, appUrl } from "@/lib/bot";

const bad = (error: string, status = 400) => NextResponse.json({ error }, { status });
const ok = () => NextResponse.json({ ok: true });
const SETTING_KEYS = ["store_enabled", "theme", "season", "absent_days", "auto_block", "checkin_hours"];

export async function GET(req: Request) {
  const u = await getUser();
  if (!u || u.role === "client") return bad("Ruxsat yo'q", 403);
  const start = `${tzToday()}T00:00:00+05:00`;
  const [c, p, v, b] = await Promise.all([
    db.from("users").select("*").eq("role", "client").order("created_at", { ascending: false }),
    db.from("products").select("*").order("created_at", { ascending: false }),
    db.from("visits").select("at, users(first_name,last_name)").gte("at", start).order("at", { ascending: false }),
    db.from("bot_users").select("*").order("created_at", { ascending: false }),
  ]);
  const strip = (x: any) => { const { pass_hash, ...r } = x; return r; };
  return NextResponse.json({
    clients: (c.data || []).map(strip), products: p.data || [], visits: v.data || [], botUsers: b.data || [],
    displayUrl: u.role === "owner" && process.env.DISPLAY_KEY ? `${appUrl(req)}/display?key=${process.env.DISPLAY_KEY}` : null,
  });
}

export async function POST(req: Request) {
  const u = await getUser();
  if (!u || u.role !== "owner") return bad("Ruxsat yo'q", 403);
  const b = await req.json();
  const today = tzToday();

  switch (b.action) {
    case "addClient": {
      if (!b.first_name || !b.phone || !b.login || !b.password) return bad("Ism, telefon, login va parol majburiy");
      const days = +b.days || 0;
      const { data, error } = await db.from("users").insert({
        role: "client", first_name: b.first_name, last_name: b.last_name || null, phone: b.phone,
        login: String(b.login).trim(), pass_hash: await bcrypt.hash(String(b.password), 10),
        monthly_fee: +b.monthly_fee || 0, paid_until: days ? addDays(today, days) : null,
      }).select().single();
      if (error) return bad(error.code === "23505" ? "Bu login band" : error.message);
      if (days) await db.from("payments").insert({ user_id: data.id, amount: +b.monthly_fee || 0, days });
      return ok();
    }
    case "pay": {
      const { data: c } = await db.from("users").select("paid_until").eq("id", b.id).single();
      const days = +b.days || 30;
      const base = c?.paid_until && c.paid_until > today ? c.paid_until : today;
      await db.from("users").update({
        paid_until: addDays(base, days), blocked: false, block_reason: null, unblocked_at: new Date().toISOString(),
      }).eq("id", b.id);
      await db.from("payments").insert({ user_id: b.id, amount: +b.amount || 0, days });
      return ok();
    }
    case "block":
      await db.from("users").update(b.blocked
        ? { blocked: true, block_reason: "manual" }
        : { blocked: false, block_reason: null, unblocked_at: new Date().toISOString() }).eq("id", b.id);
      return ok();
    case "blockBot":
      await db.from("bot_users").update({ blocked: !!b.blocked }).eq("tg_id", b.tg_id);
      return ok();
    case "saveProduct": {
      const row = { name: b.name, price: +b.price || 0, stock: +b.stock || 0, category: b.category || null,
        image_url: b.image_url || null, active: b.active !== false };
      if (!row.name) return bad("Mahsulot nomi kerak");
      if (b.id) await db.from("products").update(row).eq("id", b.id); else await db.from("products").insert(row);
      return ok();
    }
    case "delProduct":
      await db.from("products").delete().eq("id", b.id);
      return ok();
    case "setSetting":
      if (!SETTING_KEYS.includes(b.key)) return bad("Noma'lum sozlama");
      await db.from("settings").upsert({ key: b.key, value: b.value });
      return ok();
    case "changeCreds": {
      const upd: any = { must_change: false };
      if (b.login) upd.login = String(b.login).trim();
      if (b.password) {
        if (String(b.password).length < 6) return bad("Parol kamida 6 belgi bo'lsin");
        upd.pass_hash = await bcrypt.hash(String(b.password), 10);
      }
      const { error } = await db.from("users").update(upd).eq("id", u.id);
      return error ? bad(error.code === "23505" ? "Bu login band" : error.message) : ok();
    }
    case "connectBot": {
      const token = String(b.token || "").trim();
      if (!/^\d+:[\w-]{30,}$/.test(token)) return bad("Token noto'g'ri ko'rinadi. Namuna: 123456789:AAH... (BotFather'dan nusxalang)");
      const me = await fetch(`https://api.telegram.org/bot${token}/getMe`).then((r) => r.json()).catch(() => null);
      if (!me?.ok) return bad("Bu token Telegram'da topilmadi. BotFather'dan qayta nusxalang");
      const url = appUrl(req);
      if (!url.startsWith("https://")) return bad("Sayt manzili https bo'lishi kerak (APP_URL aniqlanmadi)");
      const wh = await fetch(`https://api.telegram.org/bot${token}/setWebhook`, {
        method: "POST", headers: { "content-type": "application/json" },
        body: JSON.stringify({ url: `${url}/api/bot`, secret_token: webhookSecret(), allowed_updates: ["message"] }),
      }).then((r) => r.json()).catch(() => null);
      if (!wh?.ok) return bad("Webhook ulanmadi: " + (wh?.description || "noma'lum xato"));
      await db.from("settings").upsert([
        { key: "_bot", value: { enc: encrypt(token) } },
        { key: "bot_username", value: me.result.username },
      ]);
      clearBotCache();
      return ok();
    }
    case "disconnectBot": {
      const token = await getBotToken();
      if (token) await fetch(`https://api.telegram.org/bot${token}/deleteWebhook`).catch(() => {});
      await db.from("settings").delete().in("key", ["_bot", "bot_username"]);
      clearBotCache();
      return ok();
    }
    case "notify": {
      if (!b.title) return bad("Sarlavha kerak");
      const { data: cl } = await db.from("users").select("id,tg_id,paid_until,silent").eq("role", "client");
      const all = cl || [];
      const list = b.target === "all" ? all
        : b.target === "unpaid" ? all.filter((x: any) => !x.paid_until || x.paid_until < today)
        : all.filter((x: any) => x.id === b.target);
      const rows = b.target === "all"
        ? [{ user_id: null, title: b.title, body: b.body || "" }]
        : list.map((x: any) => ({ user_id: x.id, title: b.title, body: b.body || "" }));
      if (rows.length) await db.from("notifications").insert(rows);
      const targets = list.filter((x: any) => x.tg_id);
      for (let i = 0; i < targets.length; i += 25)
        await Promise.allSettled(targets.slice(i, i + 25).map((x: any) => tg("sendMessage", {
          chat_id: x.tg_id, text: `🔔 ${b.title}\n${b.body || ""}`, disable_notification: !!b.silent || !!x.silent,
        })));
      return ok();
    }
  }
  return bad("Noma'lum amal");
}
