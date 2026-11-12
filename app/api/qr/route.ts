import { NextResponse } from "next/server";
import { qrFor, QR_STEP } from "@/lib/auth";

export async function GET(req: Request) {
  const key = new URL(req.url).searchParams.get("key");
  if (!key || key !== process.env.DISPLAY_KEY) return NextResponse.json({ error: "Ruxsat yo'q" }, { status: 403 });
  return NextResponse.json({ qr: qrFor(Math.floor(Date.now() / QR_STEP)), step: QR_STEP / 1000 });
}
