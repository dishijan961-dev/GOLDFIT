import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { db, tzToday, addDays, clearSettingsCache } from "@/lib/db";
import { getUser } from "@/lib/auth";
import { tg } from "@/lib/tg";
import { planOf, TRAINER_FEE } from "@/lib/plans";
import { recordVisit, recordExit } from "@/lib/visit";
import { ensureLockers, releaseExpired } from "@/lib/lockers";
import { encrypt, clearBotCache, getBotToken, webhookSecret, appUrl } from "@/lib/bot";

const bad = (error: string, status = 400) => NextResponse.json({ error }, { status });
const ok = () => NextResponse.json({ ok: true });
const MANAGER_KEYS = ["store_enabled", "lockers_enabled", "lockers_count"]; // zal egasi o'zgartira oladigan sozlamalar
const SUPER_ONLY = ["connectBot", "disconnectBot", "setMenuButton", "backup", "restart"];
const SETTING_KEYS = ["store_enabled", "theme", "season", "absent_days", "auto_block", "checkin_hours", "lockers_enabled", "lockers_count", "remind_on", "remind_days", "bot_welcome", "absent_msg_on", "absent_msg_days", "summary_on"];

export async function GET(req: Request) {
  const u = await getUser();
  if (!u || u.role === "client") return bad("Ruxsat yo'q", 403);
  const start = `${tzToday()}T00:00:00+05:00`;
  const url = new URL(req.url);
  const range = url.searchParams.get("history");
  if (range) {
    // Davomat tarixi: kun / hafta / oy
    const date = url.searchParams.get("date") || tzToday();
    let from = date, to = date;
    if (range === "week") { const dow = (new Date(date).getUTCDay() + 6) % 7; from = addDays(date, -dow); to = addDays(from, 6); }
    if (range === "month") { from = date.slice(0, 8) + "01"; const m = new Date(from); m.setUTCMonth(m.getUTCMonth() + 1); to = addDays(m.toISOString().slice(0, 10), -1); }
    const q = (cols: string) => db.from("visits").select(cols).gte("at", `${from}T00:00:00+05:00`).lt("at", `${addDays(to, 1)}T00:00:00+05:00`).order("at", { ascending: false }).limit(2000);
    let r: any = await q("id, at, locker, method, user_id, users(first_name,last_name,phone,plan,trainer)");
    if (r.error) r = await q("id, at, user_id, users(first_name,last_name,phone,plan)");
    return NextResponse.json({ from, to, rows: r.data || [] });
  }
  await releaseExpired();
  const mstart = `${tzToday().slice(0, 8)}01T00:00:00+05:00`;
  const [c, p, v, b, mv, mp, od, lk, ex] = await Promise.all([
    (u.role === "trainer"
      ? db.from("users").select("*").eq("role", "client").eq("trainer_id", u.id)
      : db.from("users").select("*").eq("role", "client")).order("created_at", { ascending: false }),
    db.from("products").select("*").order("created_at", { ascending: false }),
    db.from("visits").select("at, users(first_name,last_name)").gte("at", start).order("at", { ascending: false }),
    db.from("bot_users").select("*").order("created_at", { ascending: false }),
    db.from("visits").select("user_id, at").gte("at", mstart).limit(5000),
    db.from("payments").select("user_id, amount").gte("paid_at", mstart),
    db.from("orders").select("id, total, items, created_at, users(first_name,last_name,phone)").order("created_at", { ascending: false }).limit(100),
    db.from("lockers").select("num, user_id, until, users(first_name,last_name)").order("num"),
    db.from("exercises").select("*").order("grp").order("title"),
  ]);
  const hours = Array(24).fill(0);
  (mv.data || []).forEach((x: any) => { hours[new Date(+new Date(x.at) + 5 * 3600e3).getUTCHours()]++; });
  const monthVisits: Record<string, number> = {}, paidMonth: Record<string, number> = {};
  (mv.data || []).forEach((x: any) => { monthVisits[x.user_id] = (monthVisits[x.user_id] || 0) + 1; });
  (mp.data || []).forEach((x: any) => { paidMonth[x.user_id] = (paidMonth[x.user_id] || 0) + (x.amount || 0); });
  const income = (mp.data || []).reduce((a: number, x: any) => a + (x.amount || 0), 0);
  const stf = u.role === "trainer" ? { data: [] as any[] } : await db.from("users").select("*").in("role", u.role === "owner" ? ["trainer", "manager"] : ["trainer"]).order("created_at");
  const hide = u.role === "trainer"; // trener faqat o'z mijozlarini ko'radi, pul ma'lumotlarini emas
  const strip = (x: any) => { const { pass_hash, ...r } = x; return r; };
  return NextResponse.json({
    staff: (stf.data || []).map(strip), clients: (c.data || []).map(strip), products: p.data || [], visits: v.data || [], botUsers: b.data || [], monthVisits, paidMonth: hide ? {} : paidMonth, income: hide ? 0 : income, orders: hide ? [] : od.data || [], lockers: lk.data || [], exercises: ex.data || [], hours, ownerTg: u.tg_id || null,
    displayUrl: u.role !== "trainer" && process.env.DISPLAY_KEY ? `${appUrl(req)}/display?key=${process.env.DISPLAY_KEY}` : null,
  });
}

export async function POST(req: Request) {
  const u = await getUser();
  if (!u || !["owner", "manager"].includes(u.role)) return bad("Ruxsat yo'q", 403);
  const b = await req.json();
  if (u.role !== "owner" && SUPER_ONLY.includes(b.action)) return bad("Bu amal faqat super admin uchun", 403);
  const today = tzToday();

  switch (b.action) {
    case "addClient": {
      if (!b.first_name || !b.phone || !b.login || !b.password) return bad("Ism, telefon, login va parol majburiy");
      const P = planOf(b.plan);
      const days = +b.days || P.days;
      const gym = +b.gym_fee || P.price;                                   // zal puli
      const tr = b.trainer ? +b.trainer_fee || TRAINER_FEE : 0;            // trener puli (alohida)
      const tName = async (id: any) => { if (!id) return null; const { data: t } = await db.from("users").select("first_name,last_name").eq("id", id).maybeSingle(); return t ? [t.first_name, t.last_name].filter(Boolean).join(" ") : null; };
      const tid = b.trainer && b.trainer_id ? b.trainer_id : null;
      const { data, error } = await db.from("users").insert({
        role: "client", first_name: b.first_name, last_name: b.last_name || null, phone: b.phone,
        login: String(b.login).trim(), pass_hash: await bcrypt.hash(String(b.password), 10),
        monthly_fee: gym + tr, gym_fee: gym, trainer: !!b.trainer, trainer_fee: tr, trainer_name: (await tName(tid)) || b.trainer_name || null, ...(tid ? { trainer_id: tid } : {}),
        paid_until: days ? addDays(today, days) : null, plan: P.id, card_uid: b.card_uid ? String(b.card_uid).trim() : null,
      }).select().single();
      if (error) return bad(error.code === "23505" ? "Bu login band" : error.message);
      if (days) await db.from("payments").insert({ user_id: data.id, amount: gym + tr, gym_amount: gym, trainer_amount: tr, days, plan: P.id });
      return NextResponse.json({ ok: true, total: gym + tr });
    }
    case "pay": {
      const { data: c } = await db.from("users").select("paid_until,plan,gym_fee,trainer,trainer_fee").eq("id", b.id).single();
      const P = planOf(b.plan || c?.plan);
      const days = +b.days || P.days;
      const gym = +b.gym_fee || (c?.plan === P.id && c?.gym_fee ? c.gym_fee : P.price);
      const tr = c?.trainer ? c.trainer_fee || TRAINER_FEE : 0;
      const base = c?.paid_until && c.paid_until > today ? c.paid_until : today;
      await db.from("users").update({
        paid_until: addDays(base, days), blocked: false, block_reason: null, unblocked_at: new Date().toISOString(),
        plan: P.id, gym_fee: gym, monthly_fee: gym + tr,
      }).eq("id", b.id);
      await db.from("payments").insert({ user_id: b.id, amount: +b.amount || gym + tr, gym_amount: gym, trainer_amount: tr, days, plan: P.id });
      return NextResponse.json({ ok: true, total: +b.amount || gym + tr });
    }
    case "setTrainer": {
      const { data: c } = await db.from("users").select("gym_fee,plan").eq("id", b.id).single();
      const tr = b.trainer ? +b.trainer_fee || TRAINER_FEE : 0;
      const gym = c?.gym_fee || planOf(c?.plan).price;
      let tn = b.trainer ? b.trainer_name || null : null;
      if (b.trainer && b.trainer_id) { const { data: t } = await db.from("users").select("first_name,last_name").eq("id", b.trainer_id).maybeSingle(); if (t) tn = [t.first_name, t.last_name].filter(Boolean).join(" "); }
      const base = { trainer: !!b.trainer, trainer_fee: tr, trainer_name: tn, monthly_fee: gym + tr };
      const r1 = await db.from("users").update({ ...base, trainer_id: b.trainer ? b.trainer_id || null : null }).eq("id", b.id);
      if (r1.error) await db.from("users").update(base).eq("id", b.id); // migration_v5 hali ishga tushmagan bo'lsa ham trener saqlanadi
      if (b.trainer && b.charge) await db.from("payments").insert({ user_id: b.id, amount: tr, gym_amount: 0, trainer_amount: tr, days: 0, plan: c?.plan });
      return ok();
    }
    case "addStaff": {
      // Trener yoki zal egasi (faqat super admin zal egasini qo'sha oladi)
      const role = b.role === "manager" ? "manager" : "trainer";
      if (role === "manager" && u.role !== "owner") return bad("Zal egasini faqat super admin qo'sha oladi", 403);
      if (!b.first_name || !b.login || !b.password) return bad("Ism, login va parol majburiy");
      if (String(b.password).length < 6) return bad("Parol kamida 6 belgi bo'lsin");
      const { error } = await db.from("users").insert({
        role, first_name: b.first_name, last_name: b.last_name || null, phone: b.phone || null,
        login: String(b.login).trim(), pass_hash: await bcrypt.hash(String(b.password), 10),
      });
      return error ? bad(error.code === "23505" ? "Bu login band" : error.message.includes("users_role_check") ? "Avval migration_v5.sql ni ishga tushiring" : error.message) : ok();
    }
    case "delStaff": {
      const { data: t } = await db.from("users").select("role").eq("id", b.id).single();
      if (!t || !["trainer", "manager"].includes(t.role)) return bad("Topilmadi");
      if (t.role === "manager" && u.role !== "owner") return bad("Faqat super admin", 403);
      await db.from("users").delete().eq("id", b.id);
      return ok();
    }
    case "manualIn": {
      // Zal egasi qo'lda "zalga kirdi" qiladi: do'kon va shkaf raqami ochiladi
      const { data: c } = await db.from("users").select("*").eq("id", b.id).eq("role", "client").single();
      if (!c) return bad("Mijoz topilmadi");
      const expired = !c.paid_until || c.paid_until < today;
      if ((c.blocked || expired) && !b.force)
        return NextResponse.json({ error: c.blocked ? "Mijoz bloklangan" : "Obunasi tugagan", needForce: true }, { status: 409 });
      const { locker } = await recordVisit(c.id, "manual", { force: true, num: +b.locker || undefined }); // qo'lda kirganda shkaf albatta beriladi
      return NextResponse.json({ ok: true, locker });
    }
    case "manualOut":
      await recordExit(b.id);
      return ok();
    case "saveExercise": {
      const row = { title: b.title, grp: b.grp || null, sets: +b.sets || null, reps: b.reps || null, note: b.note || null, image_url: b.image_url || null, active: b.active !== false };
      if (!row.title) return bad("Mashq nomi kerak");
      const r = b.id ? await db.from("exercises").update(row).eq("id", b.id) : await db.from("exercises").insert(row);
      return r.error ? bad(r.error.message) : ok();
    }
    case "delExercise":
      await db.from("exercises").delete().eq("id", b.id);
      return ok();
    case "seedExercises": {
      const E = [
        ["Yotib shtanga siqish", "Ko'krak", 4, "8-10", "Yelka kuraklarini jipslang, shtangani ko'krak o'rtasigacha tushiring."],
        ["Gantel bilan yotib siqish", "Ko'krak", 3, "10-12", "Gantellarni yuqorida birlashtirmasdan, sekin tushiring."],
        ["Turnikda tortilish", "Orqa", 4, "6-10", "Tirsaklarni tanaga tomon torting, tanani tebratmang."],
        ["Shtanga bilan tortish", "Orqa", 4, "10", "Orqani to'g'ri ushlab, shtangani qoringa tortib keling."],
        ["Squat", "Oyoq", 4, "10-12", "Tizzalar oyoq uchi bilan bir yo'nalishda, orqa to'g'ri."],
        ["Oyoq pressi", "Oyoq", 4, "12", "Tizzani to'liq yozib qo'ymang, yuklamani nazorat qiling."],
        ["Yelka pressi", "Yelka", 4, "10", "Gantelni bosh ustiga ko'taring, belni egmang."],
        ["Yon tomonga gantel ko'tarish", "Yelka", 3, "15", "Yengil vazn bilan, yelka balandligigacha ko'taring."],
        ["Biceps gantel bilan", "Qo'l", 3, "12", "Tirsaklar qimirlamasin, sekin tushiring."],
        ["Triceps blokda", "Qo'l", 3, "12", "Tirsaklar tanaga yopishgan holda pastga torting."],
        ["Plank", "Press", 3, "45 soniya", "Tana to'g'ri chiziqda, qorin tarang."],
        ["Yugurish yo'lakchasi", "Kardio", 1, "20 daqiqa", "Qadamni o'rtacha tezlikda boshlang, oxirida sekinlashtiring."],
      ].map(([title, grp, sets, reps, note]) => ({ title, grp, sets, reps, note }));
      const r = await db.from("exercises").insert(E);
      return r.error ? bad(r.error.message) : ok();
    }
    case "backup": {
      const dump = async (t: string) => (await db.from(t).select("*").limit(50000)).data || [];
      const users = (await dump("users")).map(({ pass_hash, ...r }: any) => r);
      const settings = (await dump("settings")).filter((x: any) => !String(x.key).startsWith("_"));
      return NextResponse.json({ ok: true, data: {
        date: new Date().toISOString(), users, payments: await dump("payments"), visits: await dump("visits"), orders: await dump("orders"),
        notifications: await dump("notifications"), bot_users: await dump("bot_users"), products: await dump("products"), exercises: await dump("exercises"), settings,
      } });
    }
    case "restart": {
      if (b.confirm !== "RESTART") return bad("RESTART so'zini yozing");
      if (!b.password || !(await bcrypt.compare(String(b.password), u.pass_hash))) return bad("Parol noto'g'ri", 403);
      await db.from("lockers").update({ user_id: null, until: null, assigned_at: null }).not("num", "is", null);
      await db.from("visits").delete().gt("id", 0);
      await db.from("payments").delete().gt("id", 0);
      await db.from("notifications").delete().gt("id", 0);
      await db.from("orders").delete().not("id", "is", null);
      await db.from("bot_users").delete().gt("tg_id", 0);
      await db.from("users").delete().eq("role", "client");
      if (b.products) await db.from("products").delete().not("id", "is", null);
      return ok();
    }
    case "setCard": {
      const { error } = await db.from("users").update({ card_uid: b.card_uid ? String(b.card_uid).trim() : null }).eq("id", b.id);
      return error ? bad(error.code === "23505" ? "Bu karta boshqa mijozga biriktirilgan" : error.message) : ok();
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
      if (u.role !== "owner" && !MANAGER_KEYS.includes(b.key)) return bad("Bu sozlama faqat super admin uchun", 403);
      await db.from("settings").upsert({ key: b.key, value: b.value });
      clearSettingsCache();
      if (b.key === "lockers_enabled" && b.value) await ensureLockers((await db.from("settings").select("value").eq("key", "lockers_count").maybeSingle()).data?.value || 100);
      if (b.key === "lockers_count") await ensureLockers(+b.value || 100);
      return ok();
    case "releaseAll":
      await db.from("lockers").update({ user_id: null, until: null, assigned_at: null }).not("num", "is", null);
      return ok();
    case "releaseLocker":
      await db.from("lockers").update({ user_id: null, until: null, assigned_at: null }).eq("num", +b.num);
      return ok();
    case "setMenuButton": {
      await tg("setMyCommands", { commands: [
        { command: "start", description: "Boshlash" }, { command: "obuna", description: "Obuna holati" }, { command: "faollik", description: "Shu oydagi faollik" },
        { command: "shkaf", description: "Shkaf raqami" }, { command: "reyting", description: "Oyning eng faollari" }, { command: "yordam", description: "Yordam" } ] });
      const r = await tg("setChatMenuButton", { menu_button: { type: "web_app", text: "GOLD FIT", web_app: { url: appUrl(req) } } });
      return r?.ok ? ok() : bad("Bot ulanmagan yoki Telegram rad etdi");
    }
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
      await tg("setMyCommands", { commands: [
        { command: "start", description: "Boshlash" }, { command: "obuna", description: "Obuna holati" }, { command: "faollik", description: "Shu oydagi faollik" },
        { command: "shkaf", description: "Shkaf raqami" }, { command: "reyting", description: "Oyning eng faollari" }, { command: "yordam", description: "Yordam" } ] });
      await tg("setChatMenuButton", { menu_button: { type: "web_app", text: "GOLD FIT", web_app: { url } } });
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
      const { data: cl } = await db.from("users").select("id,tg_id,paid_until,silent,plan,trainer,checked_in_until").eq("role", "client");
      const all = cl || [];
      const nowT = Date.now();
      const pick: Record<string, (x: any) => boolean> = {
        all: () => true, botall: () => true,
        unpaid: (x) => !x.paid_until || x.paid_until < today,
        active: (x) => !!x.paid_until && x.paid_until >= today,
        premium: (x) => x.plan === "premium",
        trainer: (x) => !!x.trainer,
        ingym: (x) => !!x.checked_in_until && +new Date(x.checked_in_until) > nowT,
      };
      const list = pick[b.target] ? all.filter(pick[b.target]) : all.filter((x: any) => x.id === b.target);
      const global = b.target === "all" || b.target === "botall";
      const rows = global ? [{ user_id: null, title: b.title, body: b.body || "" }] : list.map((x: any) => ({ user_id: x.id, title: b.title, body: b.body || "" }));
      if (rows.length) await db.from("notifications").insert(rows);
      const ids = new Set<number>(list.filter((x: any) => x.tg_id).map((x: any) => Number(x.tg_id)));
      if (b.target === "botall") (await db.from("bot_users").select("tg_id").eq("blocked", false)).data?.forEach((x: any) => ids.add(Number(x.tg_id)));
      const silent = new Map(all.map((x: any) => [Number(x.tg_id), !!x.silent]));
      const targets = [...ids];
      for (let i = 0; i < targets.length; i += 25)
        await Promise.allSettled(targets.slice(i, i + 25).map((id) => tg("sendMessage", {
          chat_id: id, text: `🔔 ${b.title}\n${b.body || ""}`, disable_notification: !!b.silent || !!silent.get(id),
        })));
      return NextResponse.json({ ok: true, sent: targets.length });
    }
  }
  return bad("Noma'lum amal");
}
