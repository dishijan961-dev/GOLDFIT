import crypto from "crypto";
import { db } from "./db";

const key = () => crypto.createHash("sha256").update(process.env.APP_SECRET!).digest();

// Bot tokeni bazada shifrlangan holda saqlanadi (AES-256-GCM)
export function encrypt(text: string) {
  const iv = crypto.randomBytes(12);
  const c = crypto.createCipheriv("aes-256-gcm", key(), iv);
  const enc = Buffer.concat([c.update(text, "utf8"), c.final()]);
  return [iv, c.getAuthTag(), enc].map((b) => b.toString("base64")).join(".");
}
export function decrypt(s: string) {
  const [iv, tag, enc] = s.split(".").map((x) => Buffer.from(x, "base64"));
  const d = crypto.createDecipheriv("aes-256-gcm", key(), iv);
  d.setAuthTag(tag);
  return Buffer.concat([d.update(enc), d.final()]).toString("utf8");
}

let cache: { t: string; at: number } | null = null;
export const clearBotCache = () => { cache = null; };

// Avval bazadagi token (egasi kiritgan), bo'lmasa BOT_TOKEN muhit o'zgaruvchisi
export async function getBotToken() {
  if (cache && Date.now() - cache.at < 60000) return cache.t;
  const { data } = await db.from("settings").select("value").eq("key", "_bot").single();
  let t = process.env.BOT_TOKEN || "";
  try { if (data?.value?.enc) t = decrypt(data.value.enc); } catch {}
  cache = { t, at: Date.now() };
  return t;
}

export const webhookSecret = () =>
  crypto.createHmac("sha256", process.env.APP_SECRET!).update("webhook").digest("hex").slice(0, 32);

// Saytning ochiq manzili (so'rov kelgan manzil, bo'lmasa APP_URL / Render manzili)
export function appUrl(req?: Request) {
  if (req) {
    const h = req.headers;
    const host = h.get("x-forwarded-host") || h.get("host");
    if (host && !host.startsWith("localhost")) return `${h.get("x-forwarded-proto") || "https"}://${host}`;
  }
  return (process.env.APP_URL || process.env.RENDER_EXTERNAL_URL || "").replace(/\/$/, "");
}
