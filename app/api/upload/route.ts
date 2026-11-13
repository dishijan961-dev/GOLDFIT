import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getUser } from "@/lib/auth";

const BUCKET = "products";
const bad = (error: string, status = 400) => NextResponse.json({ error }, { status });

export async function POST(req: Request) {
  const u = await getUser();
  if (!u || u.role !== "owner") return bad("Ruxsat yo'q", 403);

  const file = (await req.formData()).get("file");
  if (!(file instanceof File)) return bad("Fayl topilmadi");
  if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) return bad("Faqat JPG, PNG yoki WEBP rasm yuklang");
  if (file.size > 3 * 1024 * 1024) return bad("Rasm 3 MB dan katta");

  // Omborxona (bucket) birinchi marta avtomatik yaratiladi; mavjud bo'lsa xato e'tiborsiz qoldiriladi
  await db.storage.createBucket(BUCKET, { public: true, fileSizeLimit: 3 * 1024 * 1024 });

  const ext = file.type === "image/png" ? "png" : file.type === "image/webp" ? "webp" : "jpg";
  const path = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
  const { error } = await db.storage.from(BUCKET).upload(path, Buffer.from(await file.arrayBuffer()), { contentType: file.type });
  if (error) return bad("Yuklanmadi: " + error.message, 500);
  return NextResponse.json({ url: db.storage.from(BUCKET).getPublicUrl(path).data.publicUrl });
}
