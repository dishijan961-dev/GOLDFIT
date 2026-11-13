import { createClient } from "@supabase/supabase-js";

export const db = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_KEY!, {
  auth: { persistSession: false },
});

// Toshkent vaqti (UTC+5) bo'yicha bugungi sana: YYYY-MM-DD
export const tzToday = () => new Date(Date.now() + 5 * 3600e3).toISOString().slice(0, 10);
export const addDays = (d: string, n: number) =>
  new Date(new Date(d).getTime() + n * 864e5).toISOString().slice(0, 10);

export async function getSettings() {
  const { data } = await db.from("settings").select("*");
  const s: Record<string, any> = {
    store_enabled: true, theme: "gold", season: "none",
    absent_days: 10, auto_block: true, checkin_hours: 3,
  };
  // "_" bilan boshlanadigan kalitlar maxfiy (masalan bot tokeni), hech qachon qaytarilmaydi
  (data || []).forEach((r: any) => { if (!String(r.key).startsWith("_")) s[r.key] = r.value; });
  return s;
}
