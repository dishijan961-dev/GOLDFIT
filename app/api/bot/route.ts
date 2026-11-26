import { db, getSettings, tzToday } from "@/lib/db";
import { tg } from "@/lib/tg";
import { appUrl, webhookSecret } from "@/lib/bot";
import { planOf } from "@/lib/plans";
import { lockerOf } from "@/lib/lockers";

const OK = () => new Response("ok");
const esc = (s: any) => String(s ?? "").replace(/[&<>]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" }[c] as string));
const say = (chat_id: number, text: string, extra: any = {}) => tg("sendMessage", { chat_id, text, parse_mode: "HTML", ...extra });

// Doimiy pastki menyu (emojili tugmalar)
const menu = (url: string) => ({
  reply_markup: {
    keyboard: [
      [{ text: "🏋️ Ilovani ochish", web_app: { url } }],
      [{ text: "💳 Obuna" }, { text: "🔥 Faollik" }],
      [{ text: "🗄 Shkaf" }, { text: "🏆 Reyting" }],
      [{ text: "ℹ️ Yordam" }],
    ],
    resize_keyboard: true, is_persistent: true,
  },
});
const openBtn = (url: string, t = "🏋️ GOLD FIT ni ochish") => ({ reply_markup: { inline_keyboard: [[{ text: t, web_app: { url } }]] } });

const bar = (left: number, total: number) => { const n = Math.max(0, Math.min(10, Math.round((left / Math.max(total, 1)) * 10))); return "█".repeat(n) + "░".repeat(10 - n); };

async function monthVisits(userId: string) {
  const ms = `${tzToday().slice(0, 8)}01T00:00:00+05:00`;
  const { data } = await db.from("visits").select("at").eq("user_id", userId).gte("at", ms);
  return new Set((data || []).map((x: any) => new Date(+new Date(x.at) + 5 * 3600e3).toISOString().slice(0, 10))).size;
}

export async function POST(req: Request) {
  if (req.headers.get("x-telegram-bot-api-secret-token") !== webhookSecret())
    return new Response("forbidden", { status: 401 });
  const m = (await req.json()).message;
  if (!m?.from) return OK();
  const id: number = m.from.id;
  const url = appUrl(req);
  const s = await getSettings();
  const welcome = (s.bot_welcome || "").trim() || "🏋️ <b>GOLD FIT</b> ga xush kelibsiz!\n\nDavom etish uchun telefon raqamingizni ulashing 👇";

  await db.from("bot_users").upsert({ tg_id: id, username: m.from.username || null, first_name: m.from.first_name || null });
  const { data: bu } = await db.from("bot_users").select("*").eq("tg_id", id).single();
  if (bu?.blocked) return OK();

  if (m.contact) {
    if (m.contact.user_id !== id) { await say(id, "Iltimos, faqat <b>o'zingizning</b> raqamingizni ulashing 👇"); return OK(); }
    await db.from("bot_users").update({ phone: m.contact.phone_number }).eq("tg_id", id);
    await say(id, "✅ <b>Raqamingiz tasdiqlandi!</b>\n\nPastdagi menyudan foydalaning yoki ilovani oching 👇", menu(url));
    await say(id, "Ilovaga login va parol bilan kirasiz. Ma'lumotlarni zal ma'muriyatidan oling.", openBtn(url));
    return OK();
  }
  if (!bu?.phone) {
    await say(id, welcome, { reply_markup: { keyboard: [[{ text: "📱 Raqamni ulashish", request_contact: true }]], resize_keyboard: true, one_time_keyboard: true } });
    return OK();
  }

  const t = (m.text || "").trim().toLowerCase();
  const { data: u } = await db.from("users").select("*").eq("tg_id", id).eq("role", "client").maybeSingle();
  const needLogin = async () => say(id, "🔐 Avval ilovani oching va login-parol bilan kiring. Shundan keyin ma'lumotlaringiz shu yerda ko'rinadi.", openBtn(url));

  if (/obuna|profil/.test(t)) {
    if (!u) return (await needLogin(), OK());
    const P = planOf(u.plan);
    const left = u.paid_until ? Math.round((+new Date(u.paid_until) - +new Date(tzToday())) / 864e5) : -1;
    if (u.paid_until && left >= 0) {
      await say(id, `${P.id === "premium" ? "👑" : P.id === "trainer" ? "🏋️" : P.id === "daily" ? "⚡" : "🥇"} <b>${esc(P.name)}</b>\n\n👤 ${esc(u.first_name)} ${esc(u.last_name || "")}\n📅 Amal qiladi: <b>${u.paid_until}</b> gacha\n⏳ Qoldi: <b>${left + 1} kun</b>\n<code>${bar(left + 1, P.days)}</code>`, openBtn(url));
    } else {
      await say(id, `⛔ <b>Obunangiz tugagan</b>\n\nTarif: ${esc(P.name)} — ${P.price.toLocaleString()} so'm\nTo'lovni zalda amalga oshiring.`, openBtn(url));
    }
    return OK();
  }
  if (/faollik|statistika/.test(t)) {
    if (!u) return (await needLogin(), OK());
    const days = await monthVisits(u.id);
    await say(id, `🔥 <b>Shu oydagi faolligingiz</b>\n\n📅 Zalga kelgan kunlar: <b>${days}</b>\n🕒 Oxirgi tashrif: <b>${u.last_visit ? new Date(u.last_visit).toLocaleDateString("uz-UZ") : "hali yo'q"}</b>\n\n${days >= 12 ? "🏆 Ajoyib natija, davom eting!" : "💪 Har kun yangi imkoniyat. Zalda ko'rishguncha!"}`);
    return OK();
  }
  if (/shkaf/.test(t)) {
    if (!u) return (await needLogin(), OK());
    if (!s.lockers_enabled) { await say(id, "🗄 Avto-shkaf hozircha yoqilmagan."); return OK(); }
    const n = await lockerOf(u.id);
    await say(id, n ? `🗄 Sizning shkafingiz: <b>№ ${n}</b>\nZal vaqti tugaguncha sizniki.` : "🗄 Hozir sizga shkaf biriktirilmagan.\nZalga kirganda (QR skaner) bo'sh raqam avtomatik beriladi.");
    return OK();
  }
  if (/reyting|top/.test(t)) {
    const ms = `${tzToday().slice(0, 8)}01T00:00:00+05:00`;
    const { data: vs } = await db.from("visits").select("user_id").gte("at", ms).limit(5000);
    const cnt: Record<string, number> = {};
    (vs || []).forEach((x: any) => { cnt[x.user_id] = (cnt[x.user_id] || 0) + 1; });
    const top = Object.entries(cnt).sort((a, b) => b[1] - a[1]).slice(0, 5);
    if (!top.length) { await say(id, "🏆 Bu oyda hali tashrif yo'q. Birinchi bo'ling!"); return OK(); }
    const { data: us } = await db.from("users").select("id,first_name,last_name").in("id", top.map((x) => x[0]));
    const medals = ["🥇", "🥈", "🥉", "4️⃣", "5️⃣"];
    const lines = top.map(([uid, n], i) => { const x: any = us?.find((q: any) => q.id === uid); return `${medals[i]} ${esc(x?.first_name || "—")} ${esc((x?.last_name || "").slice(0, 1))} — <b>${n}</b>`; });
    await say(id, `🏆 <b>Oyning eng faollari</b>\n\n${lines.join("\n")}`);
    return OK();
  }
  if (/yordam|help/.test(t) || t === "/help") {
    await say(id, "ℹ️ <b>Yordam</b>\n\n🏋️ <b>Ilovani ochish</b> — obuna, QR kirish, do'kon\n💳 <b>Obuna</b> — tarif va qolgan kunlar\n🔥 <b>Faollik</b> — shu oydagi kelganlaringiz\n🗄 <b>Shkaf</b> — shkaf raqamingiz\n🏆 <b>Reyting</b> — oyning eng faollari\n\nSavol bo'lsa zal ma'muriyatiga murojaat qiling.", menu(url));
    return OK();
  }
  await say(id, "Salom! 👋 Pastdagi menyudan tanlang yoki ilovani oching.", menu(url));
  return OK();
}
