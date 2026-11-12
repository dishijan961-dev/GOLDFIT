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
  return NextResponse.json({ enabled: true, canOrder: inGym(u), products: data || [] });
}

export async function POST(req: Request) {
  const u = await getUser();
  if (!u || u.role !== "client") return bad("Kirish kerak", 401);
  const s = await getSettings();
  if (!s.store_enabled) return bad("Do'kon yopiq");
  if (!inGym(u)) return bad("Buyurtma berish uchun zalga kelib QR kodni skanerlang", 403);

  const { items } = await req.json();
  if (!Array.isArray(items) || !items.length) return bad("Savat bo'sh");
  const ids = items.map((i: any) => i.id);
  const { data: ps } = await db.from("products").select("*").in("id", ids);
  const taken: { id: string; qty: number }[] = [];
  let total = 0;
  const lines: any[] = [];

  for (const it of items) {
    const p = ps?.find((x: any) => x.id === it.id);
    const qty = Math.max(1, Math.floor(+it.qty || 0));
    const { data: ok } = p ? await db.rpc("take_stock", { pid: p.id, q: qty }) : { data: false };
    if (!ok) {
      for (const t of taken) {
        const { data: cur } = await db.from("products").select("stock").eq("id", t.id).single();
        await db.from("products").update({ stock: (cur?.stock || 0) + t.qty }).eq("id", t.id);
      }
      return bad(`"${p?.name || "Mahsulot"}" qolmadi`);
    }
    taken.push({ id: p.id, qty });
    total += p.price * qty;
    lines.push({ id: p.id, name: p.name, price: p.price, qty });
  }
  await db.from("orders").insert({ user_id: u.id, items: lines, total });
  return NextResponse.json({ ok: true, total });
}
