import { db, getSettings } from "./db";
import { assignLocker } from "./lockers";

// Zalga kirishni yozadi: shkaf raqami beriladi, do'kon va shkaf ochiladi
export async function recordVisit(userId: string, method: "qr" | "card" | "manual") {
  const s = await getSettings();
  const now = new Date();
  const until = new Date(now.getTime() + s.checkin_hours * 3600e3).toISOString();
  const locker = await assignLocker(userId, until);
  const { error } = await db.from("visits").insert({ user_id: userId, locker, method });
  if (error) await db.from("visits").insert({ user_id: userId }); // migratsiya qilinmagan bo'lsa ham davomat yoziladi
  await db.from("users").update({ last_visit: now.toISOString(), checked_in_until: until }).eq("id", userId);
  return { until, locker };
}

// Zaldan chiqdi: do'kon yopiladi, shkaf bo'shaydi
export async function recordExit(userId: string) {
  await db.from("users").update({ checked_in_until: new Date().toISOString() }).eq("id", userId);
  await db.from("lockers").update({ user_id: null, until: null, assigned_at: null }).eq("user_id", userId);
}
