import { db, tzToday } from "./db";
import { tg } from "./tg";

export const fill = (tpl: string, v: Record<string, any>) => String(tpl || "").replace(/\{(\w+)\}/g, (_, k) => (v[k] ?? ""));

// Xabarni ilovaga (bildirishnoma) va Telegramga yuboradi. Nechta kishiga ketganini qaytaradi.
export async function broadcast(b: { target?: string; title: string; body?: string; silent?: boolean }) {
  const today = tzToday();
  const { data: cl } = await db.from("users").select("id,tg_id,paid_until,silent,plan,trainer,checked_in_until").eq("role", "client");
  const all = cl || [];
  const nowT = Date.now();
  const pick: Record<string, (x: any) => boolean> = {
    all: () => true, botall: () => true,
    unpaid: (x) => !x.paid_until || x.paid_until < today,
    active: (x) => !!x.paid_until && x.paid_until >= today,
    premium: (x) => x.plan === "premium",
    trainer: (x) => !!x.trainer,
    ingym: (x) => !!x.checked_in_until && +new Date(x.checked_in_until) > nowT,
  };
  const target = b.target || "all";
  const list = pick[target] ? all.filter(pick[target]) : all.filter((x: any) => x.id === target);
  const global = target === "all" || target === "botall";
  const rows = global ? [{ user_id: null, title: b.title, body: b.body || "" }] : list.map((x: any) => ({ user_id: x.id, title: b.title, body: b.body || "" }));
  if (rows.length) await db.from("notifications").insert(rows);
  const ids = new Set<number>(list.filter((x: any) => x.tg_id).map((x: any) => Number(x.tg_id)));
  if (target === "botall") (await db.from("bot_users").select("tg_id").eq("blocked", false)).data?.forEach((x: any) => ids.add(Number(x.tg_id)));
  const silent = new Map(all.map((x: any) => [Number(x.tg_id), !!x.silent]));
  const targets = [...ids];
  for (let i = 0; i < targets.length; i += 25)
    await Promise.allSettled(targets.slice(i, i + 25).map((id) => tg("sendMessage", {
      chat_id: id, text: `🔔 ${b.title}\n${b.body || ""}`, disable_notification: !!b.silent || !!silent.get(id),
    })));
  return targets.length;
}
