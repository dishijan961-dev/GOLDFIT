import { db } from "./db";
import { broadcast } from "./broadcast";

let last = 0;
// Vaqti kelgan rejalashtirilgan xabarlarni yuboradi. Ilova ochilganda ham, cron'dan ham chaqiriladi.
export async function processDue(force = false) {
  if (!force && Date.now() - last < 60000) return 0;
  last = Date.now();
  try {
    const { data } = await db.from("scheduled").select("*").eq("sent", false).lte("send_at", new Date().toISOString()).limit(20);
    for (const m of data || []) {
      const step = m.repeat === "daily" ? 864e5 : m.repeat === "weekly" ? 7 * 864e5 : 0;
      let claim;
      if (step) { let t = +new Date(m.send_at); while (t <= Date.now()) t += step; claim = await db.from("scheduled").update({ send_at: new Date(t).toISOString() }).eq("id", m.id).eq("send_at", m.send_at).select("id"); }
      else claim = await db.from("scheduled").update({ sent: true, sent_at: new Date().toISOString() }).eq("id", m.id).eq("sent", false).select("id");
      if (claim.data?.length) await broadcast(m);
    }
    return data?.length || 0;
  } catch (e) { return 0; }
}
