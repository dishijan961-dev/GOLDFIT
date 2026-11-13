import { getBotToken } from "./bot";

export async function tg(method: string, body: any) {
  const token = await getBotToken();
  if (!token) return { ok: false };
  return fetch(`https://api.telegram.org/bot${token}/${method}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  }).then((r) => r.json()).catch(() => ({ ok: false }));
}
