import bcrypt from "bcryptjs";
import { createClient } from "@supabase/supabase-js";

const db = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);
const { error } = await db.from("users").upsert(
  { role: "owner", login: "GOLDFIT", pass_hash: await bcrypt.hash("000000", 10), first_name: "Zal egasi", must_change: true },
  { onConflict: "login" }
);
console.log(error ?? "✅ Zal egasi yaratildi: GOLDFIT / 000000 (kirgach darhol o'zgartiring)");
