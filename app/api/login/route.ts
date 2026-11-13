import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";
import { makeToken, verifyInitData, safe } from "@/lib/auth";

const bad = (error: string, status = 400) => NextResponse.json({ error }, { status });
const last9 = (s: string) => String(s || "").replace(/\D/g, "").slice(-9);
const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

export async function POST(req: Request) {
  const { login, password, initData } = await req.json();
  const t = initData ? await verifyInitData(initData) : null;

  const { data: u } = await db.from("users").select("*").eq("login", String(login || "").trim()).single();
  if (!u || !(await bcrypt.compare(String(password || ""), u.pass_hash))) {
    await wait(800);
    return bad("Login yoki parol xato", 401);
  }

  if (u.role === "client") {
    // Mijozlar faqat Telegram orqali, telefon raqami ulashilgan holda kiradi
    if (!t) return bad("Ilovani Telegram botdan oching", 401);
    const { data: bu } = await db.from("bot_users").select("phone").eq("tg_id", t.id).single();
    if (!bu?.phone) return bad("Avval botda telefon raqamingizni ulashing", 403);
    if (u.blocked) return bad("Hisobingiz bloklangan. Zal egasiga murojaat qiling", 403);
    if (last9(u.phone) !== last9(bu.phone)) return bad("Telefon raqamingiz zalda yozilgan raqamga mos emas", 403);
    if (u.tg_id && Number(u.tg_id) !== t.id) return bad("Bu hisob boshqa Telegramga bog'langan", 403);
  }
  // Zal egasi va trenerlar brauzerdan ham kira oladi (bot ulanishidan oldin ham)

  if (t && u.role === "client") {
    await db.from("users").update({
      tg_id: t.id, tg_username: t.username || null,
      tg_name: [t.first_name, t.last_name].filter(Boolean).join(" "), tg_photo: t.photo_url || null,
    }).eq("id", u.id);
  }

  const res = NextResponse.json({ user: safe(u) });
  res.cookies.set("gf", makeToken(u.id), { httpOnly: true, secure: true, sameSite: "lax", maxAge: 2592000, path: "/" });
  return res;
}
