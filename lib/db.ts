import { createClient } from "@supabase/supabase-js";

export const db = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_KEY!, {
  auth: { persistSession: false },
});

// Toshkent vaqti (UTC+5) bo'yicha bugungi sana: YYYY-MM-DD
export const tzToday = () => new Date(Date.now() + 5 * 3600e3).toISOString().slice(0, 10);
export const addDays = (d: string, n: number) =>
  new Date(new Date(d).getTime() + n * 864e5).toISOString().slice(0, 10);

let sc: { v: any; at: number } | null = null;
export const clearSettingsCache = () => { sc = null; };

export async function getSettings() {
  if (sc && Date.now() - sc.at < 5000) return { ...sc.v };
  const { data } = await db.from("settings").select("*");
  const s: Record<string, any> = {
    store_enabled: true, theme: "gold", season: "none",
    absent_days: 10, auto_block: true, checkin_hours: 3,
    lockers_enabled: false, lockers_count: 100, remind_on: true, remind_days: 3, bot_welcome: "",
    absent_msg_on: true, absent_msg_days: 7, summary_on: true,
  };
  // "_" bilan boshlanadigan kalitlar maxfiy (masalan bot tokeni), hech qachon qaytarilmaydi
  (data || []).forEach((r: any) => { if (!String(r.key).startsWith("_")) s[r.key] = r.value; });
  sc = { v: s, at: Date.now() };
  return { ...s };
}
