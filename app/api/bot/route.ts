import { db } from "@/lib/db";
import { tg } from "@/lib/tg";
import { appUrl, webhookSecret } from "@/lib/bot";

const OK = () => new Response("ok");

async function sendApp(id: number, url: string) {
  await tg("sendMessage", { chat_id: id, text: "✅ Raqamingiz qabul qilindi.", reply_markup: { remove_keyboard: true } });
  await tg("sendMessage", {
    chat_id: id,
    text: "GOLD FIT ilovasini ochish uchun tugmani bosing 👇",
    reply_markup: { inline_keyboard: [[{ text: "🏋️ GOLD FIT", web_app: { url } }]] },
  });
}

export async function POST(req: Request) {
  if (req.headers.get("x-telegram-bot-api-secret-token") !== webhookSecret())
    return new Response("forbidden", { status: 401 });
  const m = (await req.json()).message;
  if (!m?.from) return OK();
  const id: number = m.from.id;
  const url = appUrl(req);

  await db.from("bot_users").upsert({ tg_id: id, username: m.from.username || null, first_name: m.from.first_name || null });
  const { data: bu } = await db.from("bot_users").select("*").eq("tg_id", id).single();
  if (bu?.blocked) return OK();

  if (m.contact) {
    if (m.contact.user_id !== id) {
      await tg("sendMessage", { chat_id: id, text: "Iltimos, faqat o'zingizning raqamingizni ulashing 👇" });
      return OK();
    }
    await db.from("bot_users").update({ phone: m.contact.phone_number }).eq("tg_id", id);
    await sendApp(id, url);
    return OK();
  }
  if (bu?.phone) { await sendApp(id, url); return OK(); }

  await tg("sendMessage", {
    chat_id: id,
    text: "🏋️ GOLD FIT ga xush kelibsiz!\nDavom etish uchun telefon raqamingizni ulashing.",
    reply_markup: { keyboard: [[{ text: "📱 Raqamni ulashish", request_contact: true }]], resize_keyboard: true, one_time_keyboard: true },
  });
  return OK();
}
