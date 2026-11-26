import { db, getSettings } from "./db";

const nowIso = () => new Date().toISOString();

// Zal vaqti tugagan shkaflarni bo'shatadi
export async function releaseExpired() {
  await db.from("lockers").update({ user_id: null, until: null, assigned_at: null }).lt("until", nowIso());
}

export async function ensureLockers(count: number) {
  const n = Math.max(1, Math.min(500, Math.floor(count) || 100));
  const { data } = await db.from("lockers").select("num");
  const have = new Set((data || []).map((x: any) => x.num));
  const add = [];
  for (let i = 1; i <= n; i++) if (!have.has(i)) add.push({ num: i });
  if (add.length) await db.from("lockers").insert(add);
  await db.from("lockers").delete().gt("num", n);
}

// Mijozga birinchi bo'sh shkafni beradi (funksiya o'chiq bo'lsa null)
export async function assignLocker(userId: string, until: string): Promise<number | null> {
  const s = await getSettings();
  if (!s.lockers_enabled) return null;
  await releaseExpired();
  const { data: mine } = await db.from("lockers").select("num").eq("user_id", userId).maybeSingle();
  if (mine) { await db.from("lockers").update({ until }).eq("num", mine.num); return mine.num; }
  for (let i = 0; i < 4; i++) {
    const { data: free } = await db.from("lockers").select("num").is("user_id", null).order("num").limit(1).maybeSingle();
    if (!free) return null;
    const { data: got } = await db.from("lockers").update({ user_id: userId, until, assigned_at: nowIso() })
      .eq("num", free.num).is("user_id", null).select("num");
    if (got?.length) return free.num;
  }
  return null;
}

export async function lockerOf(userId: string): Promise<number | null> {
  const { data } = await db.from("lockers").select("num").eq("user_id", userId).gt("until", nowIso()).maybeSingle();
  return data?.num ?? null;
}
