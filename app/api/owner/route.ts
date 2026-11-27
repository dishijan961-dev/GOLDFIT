import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { db, tzToday, addDays, clearSettingsCache } from "@/lib/db";
import { getUser } from "@/lib/auth";
import { tg } from "@/lib/tg";
import { planOf, TRAINER_FEE } from "@/lib/plans";
import { recordVisit, recordExit } from "@/lib/visit";
import { broadcast } from "@/lib/broadcast";
import { tg as tgCall } from "@/lib/tg";
import { ensureLockers, releaseExpired } from "@/lib/lockers";
import { encrypt, clearBotCache, getBotToken, webhookSecret, appUrl } from "@/lib/bot";

const bad = (error: string, status = 400) => NextResponse.json({ error }, { status });
const ok = () => NextResponse.json({ ok: true });
const MANAGER_KEYS = ["store_enabled", "lockers_enabled", "lockers_count", "coin_rate", "coin_per_visit", "tpl_remind", "tpl_absent"]; // zal egasi o'zgartira oladigan sozlamalar
const SUPER_ONLY = ["connectBot", "disconnectBot", "setMenuButton", "backup", "restart"];
const SETTING_KEYS = ["store_enabled", "theme", "season", "absent_days", "auto_block", "checkin_hours", "lockers_enabled", "lockers_count", "remind_on", "remind_days", "bot_welcome", "absent_msg_on", "absent_msg_days", "summary_on", "coin_rate", "coin_per_visit", "tpl_remind", "tpl_absent"];

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
  const [c, p, v, b, mv, mp, od, lk, ex, pa, oa, sc] = await Promise.all([
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
    db.from("payments").select("user_id, amount, gym_amount, trainer_amount, plan").limit(50000),
    db.from("orders").select("user_id, total").limit(50000),
    db.from("scheduled").select("*").order("send_at", { ascending: false }).limit(40),
  ]);
  // Har bir mijozning umumiy hisobi: zal + trener + tanga to'ldirish + do'kon
  const totals: Record<string, any> = {};
  const T = (id: string) => (totals[id] = totals[id] || { gym: 0, trainer: 0, coins: 0, shop: 0 });
  (pa.data || []).forEach((x: any) => { if (!x.user_id) return; const t = T(x.user_id); if (x.plan === "coins") t.coins += x.amount || 0; else { t.trainer += x.trainer_amount || 0; t.gym += x.gym_amount || Math.max(0, (x.amount || 0) - (x.trainer_amount || 0)); } });
  (oa.data || []).forEach((x: any) => { if (x.user_id) T(x.user_id).shop += x.total || 0; });
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
    staff: (stf.data || []).map(strip), clients: (c.data || []).map(strip), products: p.data || [], visits: v.data || [], botUsers: b.data || [], monthVisits, paidMonth: hide ? {} : paidMonth, income: hide ? 0 : income, orders: hide ? [] : od.data || [], lockers: lk.data || [], exercises: ex.data || [], scheduled: sc.data || [], totals: hide ? {} : totals, hours, ownerTg: u.tg_id || null,
    displayUrl: u.role !== "trainer" && process.env.DISPLAY_KEY ? `${appUrl(req)}/display?key=${process.env.DISPLAY_KEY}` : null,
  });
}

export async function POST(req: Request) {
  const u = await getUser();
  if (!u || u.role === "client") return bad("Ruxsat yo'q", 403);
  const b = await req.json();
  if (u.role === "trainer" && b.action !== "assignExercises") return bad("Ruxsat yo'q", 403);
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
      const row: any = { title: b.title, grp: b.grp || null, sets: +b.sets || null, reps: b.reps || null, note: b.note || null, image_url: b.image_url || null, active: b.active !== false, muscles: Array.isArray(b.muscles) ? b.muscles : [], equipment: b.equipment || null, steps: b.steps || null, video_url: b.video_url || null };
      if (!row.title) return bad("Mashq nomi kerak");
      let r = b.id ? await db.from("exercises").update(row).eq("id", b.id) : await db.from("exercises").insert(row);
      if (r.error) { // migration_v6 hali ishga tushmagan bo'lsa ham asosiy maydonlar saqlansin
        const { muscles, equipment, steps, video_url, ...base } = row;
        r = b.id ? await db.from("exercises").update(base).eq("id", b.id) : await db.from("exercises").insert(base);
      }
      return r.error ? bad(r.error.message) : ok();
    }
    case "delExercise":
      await db.from("exercises").delete().eq("id", b.id);
      return ok();
    case "seedExercises": {
      const E: any[] = [
        ["Yotib shtanga siqish", "Ko'krak", 4, "8-10", ["chest", "shoulders", "triceps"], "Shtanga, skameyka", "Skameykaga yoting, yelka kuraklarini jipslang.\nShtangani yelka kengligidan sal kengroq ushlang.\nShtangani ko'krak o'rtasigacha sekin tushiring.\nNafas chiqarib, yuqoriga itaring."],
        ["Gantel bilan yotib siqish", "Ko'krak", 3, "10-12", ["chest", "shoulders", "triceps"], "Gantellar, skameyka", "Skameykada yotib, gantellarni ko'krak ustida ushlang.\nTirsaklarni yon tomonga ochib, sekin tushiring.\nGantellarni yuqoriga siqib qaytaring."],
        ["Turnikda tortilish", "Orqa", 4, "6-10", ["lats", "biceps", "forearms"], "Turnik", "Turnikni yelkadan kengroq ushlang.\nTanani tebratmasdan yuqoriga torting.\nVoronkani turnikka tegizing, sekin tushing."],
        ["Shtanga bilan tortish", "Orqa", 4, "10", ["lats", "traps", "biceps", "lowback"], "Shtanga", "Oyoqlarni yelka kengligida qo'ying, tanani oldinga egib turing.\nShtangani qoringa tomon torting.\nOrqani to'g'ri ushlang, sekin tushiring."],
        ["Squat", "Oyoq", 4, "10-12", ["quads", "glutes", "hamstrings"], "Shtanga yoki o'z vazni", "Oyoqlarni yelka kengligida qo'ying.\nO'tirganday pastga tushing, tizzalar oyoq uchidan o'tmasin.\nTovon bilan itarib, tik turing."],
        ["Oyoq pressi", "Oyoq", 4, "12", ["quads", "glutes"], "Oyoq press trenajyori", "Orqangizni o'rindiqqa tekis qo'ying.\nPlatformani tizzalar 90 daraja bo'lguncha tushiring.\nTizzani to'liq yozmasdan itaring."],
        ["Yelka pressi", "Yelka", 4, "10", ["shoulders", "triceps", "traps"], "Gantellar", "Gantellarni yelka balandligida ushlang.\nBosh ustiga siqib ko'taring.\nSekin pastga tushiring, belni egmang."],
        ["Yon tomonga gantel ko'tarish", "Yelka", 3, "15", ["shoulders"], "Yengil gantellar", "Gantellarni yon tomonda ushlang.\nTirsakni sal bukib, yelka balandligigacha ko'taring.\nSekin tushiring."],
        ["Biceps gantel bilan", "Qo'l", 3, "12", ["biceps", "forearms"], "Gantellar", "Tirsaklarni tanaga yopishtiring.\nGantelni yelkaga qarab buking.\nSekin tushiring."],
        ["Triceps blokda", "Qo'l", 3, "12", ["triceps"], "Blok trenajyor", "Tirsaklar tanaga yopishgan holda turing.\nDastani pastga to'liq yozing.\nSekin yuqoriga qaytaring."],
        ["Plank", "Press", 3, "45 soniya", ["abs", "lowback", "shoulders"], "Gilamcha", "Tirsaklarga tayanib, tanani to'g'ri chiziqda ushlang.\nQorinni tarang qiling.\nBelni bukmang, nafas oling."],
        ["Yugurish yo'lakchasi", "Kardio", 1, "20 daqiqa", ["quads", "calves", "hamstrings"], "Yugurish yo'lakchasi", "O'rtacha tezlikda boshlang.\nQadamni bir tekis ushlang.\nOxirida sekinlashtirib to'xtang."],
      ].map(([title, grp, sets, reps, muscles, equipment, steps]) => ({ title, grp, sets, reps, muscles, equipment, steps }));
      let r = await db.from("exercises").insert(E);
      if (r.error) r = await db.from("exercises").insert(E.map(({ muscles, equipment, steps, ...x }) => ({ ...x, note: String(steps).split("\n")[0] })));
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
      return NextResponse.json({ ok: true, sent: await broadcast(b) });
    }
    case "saveScheduled": {
      if (!b.title || !b.send_at) return bad("Sarlavha va vaqt kerak");
      const at = new Date(b.send_at);
      if (isNaN(+at)) return bad("Vaqt noto'g'ri");
      const r = await db.from("scheduled").insert({ title: b.title, body: b.body || "", target: b.target || "all", send_at: at.toISOString(), repeat: ["daily", "weekly"].includes(b.repeat) ? b.repeat : "none", silent: !!b.silent });
      return r.error ? bad(r.error.message.includes("scheduled") ? "Avval migration_v6.sql ni ishga tushiring" : r.error.message) : ok();
    }
    case "delScheduled":
      await db.from("scheduled").delete().eq("id", b.id);
      return ok();
    case "topup": {
      // Mijoz naqd pul beradi, zal egasi shu summaga yarasha tanga soladi
      const rate = Math.max(1, +(await db.from("settings").select("value").eq("key", "coin_rate").maybeSingle()).data?.value || 1000);
      const coins = Math.floor(+b.coins || 0) || Math.floor((+b.cash || 0) / rate);
      const cash = b.coins ? Math.max(0, Math.floor(+b.cash || 0)) : Math.max(0, Math.floor(+b.cash || 0));
      if (!coins) return bad("Summa yoki tanga sonini kiriting");
      const { data: c, error: ce } = await db.from("users").select("*").eq("id", b.id).eq("role", "client").maybeSingle();
      if (!c) return bad(ce ? "Bazada xato: " + ce.message : "Mijoz topilmadi");
      const r = await db.from("users").update({ coins: Math.max(0, (c.coins || 0) + coins) }).eq("id", b.id);
      if (r.error) return bad("Tanga ustuni yo'q. Supabase'da migration_v6.sql ni ishga tushiring");
      await db.from("coin_log").insert({ user_id: b.id, delta: coins, reason: cash ? `Naqd to'lov: ${cash} so'm` : "Bonus", cash });
      if (cash) await db.from("payments").insert({ user_id: b.id, amount: cash, days: 0, plan: "coins" });
      const text = `Hisobingizga ${coins} tanga qo'shildi. Balans: ${(c.coins || 0) + coins}. Do'kondan mahsulot olishda ishlating.`;
      await db.from("notifications").insert({ user_id: b.id, title: "Tanga qo'shildi", body: text });
      if (c.tg_id) await tgCall("sendMessage", { chat_id: c.tg_id, text: `🪙 ${text}`, disable_notification: !!c.silent });
      return NextResponse.json({ ok: true, coins });
    }
    case "assignExercises": {
      // Zal egasi yoki trener tanlangan mashqlarni mijozga yuboradi (trener faqat o'z mijoziga)
      const ids = Array.isArray(b.exercise_ids) ? b.exercise_ids : [];
      if (!b.user_id || !ids.length) return bad("Mijoz va mashqlarni tanlang");
      const { data: c } = await db.from("users").select("id,tg_id,silent,trainer_id,first_name").eq("id", b.user_id).eq("role", "client").single();
      if (!c) return bad("Mijoz topilmadi");
      if (u.role === "trainer" && c.trainer_id !== u.id) return bad("Bu mijoz sizga biriktirilmagan", 403);
      const r = await db.from("assignments").insert(ids.map((exercise_id: string) => ({ user_id: c.id, exercise_id, by_id: u.id, note: b.note || null })));
      if (r.error) return bad(r.error.message.includes("assignments") ? "Avval migration_v6.sql ni ishga tushiring" : r.error.message);
      const who = [u.first_name, u.last_name].filter(Boolean).join(" ") || "Trener";
      const text = `${who} sizga ${ids.length} ta mashq yubordi.${b.note ? "\n" + b.note : ""}\nIlovada Mashqlar bo'limini oching.`;
      await db.from("notifications").insert({ user_id: c.id, title: "Yangi mashqlar dasturi", body: text });
      if (c.tg_id) await tgCall("sendMessage", { chat_id: c.tg_id, text: `💪 ${text}`, disable_notification: !!c.silent });
      return ok();
    }
  }
  return bad("Noma'lum amal");
}
