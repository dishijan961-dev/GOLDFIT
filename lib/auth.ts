import crypto from "crypto";
import { cookies } from "next/headers";
import { db } from "./db";

const SECRET = process.env.APP_SECRET!;
const hmac = (s: string) => crypto.createHmac("sha256", SECRET).update(s).digest("hex");

export function makeToken(uid: string) {
  const p = `${uid}.${Date.now() + 30 * 864e5}`;
  return `${p}.${hmac(p)}`;
}

export async function getUser() {
  const t = (await cookies()).get("gf")?.value;
  if (!t) return null;
  const [uid, exp, sig] = t.split(".");
  if (!sig || hmac(`${uid}.${exp}`) !== sig || Date.now() > +exp) return null;
  const { data } = await db.from("users").select("*").eq("id", uid).single();
  if (!data || (data.blocked && data.role === "client")) return null;
  return data;
}

// Telegram Mini App initData imzosini tekshirish
export function verifyInitData(initData: string) {
  const p = new URLSearchParams(initData);
  const hash = p.get("hash");
  p.delete("hash");
  const str = [...p.entries()].map(([k, v]) => `${k}=${v}`).sort().join("\n");
  const key = crypto.createHmac("sha256", "WebAppData").update(process.env.BOT_TOKEN!).digest();
  if (crypto.createHmac("sha256", key).update(str).digest("hex") !== hash) return null;
  if (Date.now() / 1000 - +(p.get("auth_date") || 0) > 86400) return null;
  try { return JSON.parse(p.get("user") || ""); } catch { return null; }
}

// Zal ekranidagi aylanuvchi QR (har 30 soniyada yangilanadi)
export const QR_STEP = 30000;
export const qrFor = (n: number) => `GF.${n}.${hmac("qr" + n).slice(0, 16)}`;

export const safe = (u: any) => { const { pass_hash, ...r } = u; return r; };
