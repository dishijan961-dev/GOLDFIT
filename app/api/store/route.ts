import { NextResponse } from "next/server";
import { db, getSettings } from "@/lib/db";
import { getUser } from "@/lib/auth";

const bad = (error: string, status = 400) => NextResponse.json({ error }, { status });
const inGym = (u: any) => !!u.checked_in_until && new Date(u.checked_in_until) > new Date();

export async function GET() {
  const u = await getUser();
  if (!u) return bad("Kirish kerak", 401);
  const s = await getSettings();
  if (!s.store_enabled) return NextResponse.json({ enabled: false, products: [] });
  const { data } = await db.from("products").select("*").eq("active", true).order("category").order("name");
  return NextResponse.json({ enabled: true, canOrder: inGym(u), products: data || [], coins: u.coins || 0, rate: Math.max(1, +s.coin_rate || 1000) });
}

export async function POST(req: Request) {
  const u = await getUser();
  if (!u || u.role !== "client") return bad("Kirish kerak", 401);
  const s = await getSettings();
  if (!s.store_enabled) return bad("Do'kon yopiq");
  if (!inGym(u)) return bad("Buyurtma berish uchun zalga kelib QR kodni skanerlang", 403);

  const { items, useCoins } = await req.json();
  if (!Array.isArray(items) || !items.length) return bad("Savat bo'sh");
  const ids = items.map((i: any) => i.id);
  const { data: ps } = await db.from("products").select("*").in("id", ids);
  const taken: { id: string; qty: number }[] = [];
  const rollback = async () => {
    for (const t of taken) {
      const { data: cur } = await db.from("products").select("stock").eq("id", t.id).single();
      await db.from("products").update({ stock: (cur?.stock || 0) + t.qty }).eq("id", t.id);
    }
  };
  let total = 0;
  const lines: any[] = [];

  for (const it of items) {
    const p = ps?.find((x: any) => x.id === it.id);
    const qty = Math.max(1, Math.floor(+it.qty || 0));
    const { data: ok } = p ? await db.rpc("take_stock", { pid: p.id, q: qty }) : { data: false };
    if (!ok) {
      await rollback();
      return bad(`"${p?.name || "Mahsulot"}" qolmadi`);
    }
    taken.push({ id: p.id, qty });
    total += p.price * qty;
    lines.push({ id: p.id, name: p.name, price: p.price, qty });
  }
  // Tanga bilan to'lash: 1 tanga = coin_rate so'm. Yetmagan qismini zalda naqd to'laysiz.
  const rate = Math.max(1, +s.coin_rate || 1000);
  let coinsUsed = 0;
  if (useCoins && (u.coins || 0) > 0) {
    coinsUsed = Math.min(u.coins, Math.ceil(total / rate));
    const r = await db.from("users").update({ coins: u.coins - coinsUsed }).eq("id", u.id).eq("coins", u.coins).select("id");
    if (!r.data?.length) { await rollback(); return bad("Tanga balansi o'zgargan, qayta urinib ko'ring"); }
    await db.from("coin_log").insert({ user_id: u.id, delta: -coinsUsed, reason: "Do'kon xaridi" });
  }
  const ins = await db.from("orders").insert({ user_id: u.id, items: lines, total, paid_coins: coinsUsed });
  if (ins.error) await db.from("orders").insert({ user_id: u.id, items: lines, total });
  return NextResponse.json({ ok: true, total, coinsUsed, cashLeft: Math.max(0, total - coinsUsed * rate) });
}
