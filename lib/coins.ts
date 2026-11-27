import { db, getSettings, tzToday } from "./db";

// Har kelgan kuni 1 ball (tanga). Bir kunda bir marta.
export async function awardVisitCoin(userId: string): Promise<number> {
  try {
    const s = await getSettings();
    const pts = Math.max(0, Math.floor(+s.coin_per_visit || 1));
    const t = tzToday();
    const { data: u, error } = await db.from("users").select("coins,point_day").eq("id", userId).single();
    if (error || !u || u.point_day === t || !pts) return 0;
    const r = await db.from("users").update({ coins: (u.coins || 0) + pts, point_day: t }).eq("id", userId);
    if (r.error) return 0;
    await db.from("coin_log").insert({ user_id: userId, delta: pts, reason: "Zalga kelgani uchun" });
    return pts;
  } catch (e) { return 0; }
}
