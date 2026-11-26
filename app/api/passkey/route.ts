import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { generateRegistrationOptions, verifyRegistrationResponse, generateAuthenticationOptions, verifyAuthenticationResponse } from "@simplewebauthn/server";
import { db } from "@/lib/db";
import { getUser, makeToken, hmac, sessionCookie } from "@/lib/auth";
import { appUrl } from "@/lib/bot";

const bad = (error: string, status = 400) => NextResponse.json({ error }, { status });
const b64u = (u: Uint8Array) => Buffer.from(u).toString("base64url");
const unb64u = (s: string) => new Uint8Array(Buffer.from(s, "base64url"));

function withChallenge(body: any, ch: string) {
  const res = NextResponse.json(body);
  const p = `${ch}.${Date.now() + 5 * 60e3}`;
  res.cookies.set("gfc", `${p}.${hmac(p)}`, { httpOnly: true, secure: true, sameSite: "lax", maxAge: 300, path: "/" });
  return res;
}
async function readChallenge() {
  const t = (await cookies()).get("gfc")?.value;
  if (!t) return null;
  const [ch, exp, sig] = t.split(".");
  return sig && hmac(`${ch}.${exp}`) === sig && Date.now() < +exp ? ch : null;
}

// Face ID / barmoq izi (WebAuthn passkey): ro'yxatdan o'tkazish va kirish
export async function POST(req: Request) {
  const base = appUrl(req);
  const rpID = new URL(base).hostname;
  const b = await req.json();

  if (b.step === "regOptions") {
    const u = await getUser();
    if (!u) return bad("Kirish kerak", 401);
    const { data: ex } = await db.from("passkeys").select("id").eq("user_id", u.id);
    const options = await generateRegistrationOptions({
      rpName: "GOLD FIT", rpID, userName: u.login, userID: new TextEncoder().encode(u.id), attestationType: "none",
      excludeCredentials: (ex || []).map((x: any) => ({ id: x.id })),
      authenticatorSelection: { residentKey: "required", userVerification: "required", authenticatorAttachment: "platform" },
    });
    return withChallenge({ options }, options.challenge);
  }

  if (b.step === "regVerify") {
    const u = await getUser();
    const ch = await readChallenge();
    if (!u || !ch) return bad("Vaqt tugadi, qayta urinib ko'ring");
    try {
      const v = await verifyRegistrationResponse({ response: b.response, expectedChallenge: ch, expectedOrigin: base, expectedRPID: rpID, requireUserVerification: true });
      if (!v.verified) return bad("Tasdiqlanmadi");
      const c = v.registrationInfo.credential;
      await db.from("passkeys").upsert({ id: c.id, user_id: u.id, public_key: b64u(c.publicKey), counter: c.counter, transports: c.transports || null });
      return NextResponse.json({ ok: true });
    } catch (e: any) { return bad("Yoqilmadi: " + (e?.message || "xato")); }
  }

  if (b.step === "authOptions") {
    const options = await generateAuthenticationOptions({ rpID, userVerification: "required" });
    return withChallenge({ options }, options.challenge);
  }

  if (b.step === "authVerify") {
    const ch = await readChallenge();
    if (!ch) return bad("Vaqt tugadi, qayta urinib ko'ring");
    const { data: row } = await db.from("passkeys").select("*").eq("id", b.response?.id || "").maybeSingle();
    if (!row) return bad("Bu qurilma ulanmagan. Avval parol bilan kirib, Sozlamalardan yoqing", 401);
    try {
      const v = await verifyAuthenticationResponse({
        response: b.response, expectedChallenge: ch, expectedOrigin: base, expectedRPID: rpID, requireUserVerification: true,
        credential: { id: row.id, publicKey: unb64u(row.public_key), counter: Number(row.counter), transports: row.transports || undefined },
      });
      if (!v.verified) return bad("Tasdiqlanmadi", 401);
      await db.from("passkeys").update({ counter: v.authenticationInfo.newCounter }).eq("id", row.id);
      const { data: u } = await db.from("users").select("id,blocked,role").eq("id", row.user_id).single();
      if (!u || (u.blocked && u.role !== "owner")) return bad("Hisob bloklangan", 403);
      const res = NextResponse.json({ ok: true });
      res.cookies.set("gf", makeToken(u.id), sessionCookie);
      return res;
    } catch (e: any) { return bad("Kirish bo'lmadi: " + (e?.message || "xato"), 401); }
  }
  return bad("Noma'lum amal");
}
