import { NextResponse } from "next/server";
import { qrFor, QR_STEP, getUser } from "@/lib/auth";

// Zal ekrani (?key=DISPLAY_KEY) yoki tizimga kirgan egasi/trener QR ni ko'ra oladi
export async function GET(req: Request) {
  const key = new URL(req.url).searchParams.get("key");
  if (!key || key !== process.env.DISPLAY_KEY) {
    const u = await getUser();
    if (!u || u.role === "client") return NextResponse.json({ error: "Ruxsat yo'q" }, { status: 403 });
  }
  return NextResponse.json({ qr: qrFor(Math.floor(Date.now() / QR_STEP)), step: QR_STEP / 1000 });
}
