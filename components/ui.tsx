// @ts-nocheck
"use client";
import { useEffect, useRef, useState } from "react";
import QRCode from "qrcode";
import { startRegistration, startAuthentication } from "@simplewebauthn/browser";

export const TG = () => (typeof window !== "undefined" ? window.Telegram?.WebApp : null);
export async function api(url, body) {
  const ctl = new AbortController();
  const tm = setTimeout(() => ctl.abort(), 30000);
  try {
    const r = await fetch(url, { ...(body ? { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) } : {}), signal: ctl.signal, cache: "no-store" });
    const d = await r.json().catch(() => ({}));
    return { ...d, ok: r.ok };
  } catch (e) { return { ok: false, error: "Server javob bermadi. Qayta urinib ko'ring" }; } finally { clearTimeout(tm); }
}
export const bus = { toast: null, logout: () => {} };
export const say = (t) => (bus.toast ? bus.toast(t) : alert(t));
export const today = () => new Date(Date.now() + 5 * 3600e3).toISOString().slice(0, 10);
export const since = (d) => (d ? Math.floor((Date.now() - new Date(d)) / 864e5) : null);
export const name = (u) => [u?.first_name, u?.last_name].filter(Boolean).join(" ") || u?.login;

// ===== SVG ikonkalar (emoji emas) =====
const P = {
  home: "M3 10.5L12 3l9 7.5|M5 9.5V21h14V9.5|M10 21v-6h4v6",
  users: "M9 11a4 4 0 100-8 4 4 0 000 8|M2 21v-1a6 6 0 0112 0v1|M16 3.5a4 4 0 010 7.5|M18 14.5a6 6 0 014 5.5v1",
  user: "M12 12a4 4 0 100-8 4 4 0 000 8|M4 21a8 8 0 0116 0",
  table: "M3 5h18v14H3z|M3 10h18|M3 15h18|M9 5v14",
  check: "M4 5h16v16H4z|M4 10h16|M8 3v4|M16 3v4|M8.5 15.5l2.5 2.5 4.5-5",
  check2: "M5 12.5l4.5 4.5L19 7",
  x: "M6 6l12 12|M18 6L6 18",
  locker: "M4 3h16v18H4z|M12 3v18|M8 9v2|M16 9v2",
  cart: "M3 4h2l2.5 11h10L20 7H6|M9 20.5h.01|M17 20.5h.01",
  bell: "M6 17V11a6 6 0 0112 0v6l2 2H4z|M10 21a2 2 0 004 0",
  bot: "M5 8h14v11H5z|M12 8V4|M12 3h.01|M9 13h.01|M15 13h.01|M9 16.5h6",
  sliders: "M4 6h10|M18 6h2|M4 12h4|M12 12h8|M4 18h12|M20 18h0|M16 4v4|M10 10v4|M18 16v4",
  crown: "M3 18h18|M4 17L3 7l5 4 4-7 4 7 5-4-1 10z",
  scan: "M4 8V5a1 1 0 011-1h3|M16 4h3a1 1 0 011 1v3|M20 16v3a1 1 0 01-1 1h-3|M8 20H5a1 1 0 01-1-1v-3|M4 12h16",
  finger: "M12 11v3c0 3-1 5-2.5 7|M8 15c0 2-.5 4-1.5 5.5|M16 12c0 4-1 7-3 9|M5.5 10a6.5 6.5 0 0113 0v1|M8.5 11a3.5 3.5 0 017 0v2",
  download: "M12 3v12|M7 10l5 5 5-5|M4 20h16",
  wallet: "M3 7h16a2 2 0 012 2v10H5a2 2 0 01-2-2z|M3 7l2-3h12|M16 14h.01",
  logout: "M9 4H5v16h4|M14 8l4 4-4 4|M18 12H9",
  plus: "M12 5v14|M5 12h14", minus: "M5 12h14",
  shield: "M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z|M9 12l2 2 4-4",
  flame: "M12 3c1 4 5 5 5 10a5 5 0 01-10 0c0-2 1-3 2-4 0 2 1 3 2 3 0-3-1-5 1-9z",
  trophy: "M7 4h10v5a5 5 0 01-10 0z|M7 6H4v2a3 3 0 003 3|M17 6h3v2a3 3 0 01-3 3|M12 14v4|M8 21h8",
  door: "M6 21V4h12v17|M4 21h16|M14 12h.01",
  clock: "M12 21a9 9 0 100-18 9 9 0 000 18|M12 7v5l3 2",
  send: "M21 3L3 11l7 3 3 7z|M10 14l11-11",
  trash: "M4 7h16|M9 7V4h6v3|M6 7l1 13h10l1-13",
  image: "M3 5h18v14H3z|M3 16l5-5 4 4 3-3 6 6|M8.5 9h.01",
  copy: "M9 9h11v11H9z|M5 15V4h11",
  lock: "M5 11h14v10H5z|M8 11V7a4 4 0 018 0v4",
  card: "M3 6h18v12H3z|M3 10h18|M7 15h4",
  chart: "M4 20V10|M10 20V4|M16 20v-7|M22 20H2",
  bolt: "M13 2L4 14h7l-1 8 9-12h-7z",
  medal: "M12 15a6 6 0 100-12 6 6 0 000 12|M8.5 14L7 22l5-3 5 3-1.5-8",
  dumbbell: "M6 7v10|M3 9v6|M18 7v10|M21 9v6|M6 12h12",
  box: "M3 7l9-4 9 4v10l-9 4-9-4z|M3 7l9 4 9-4|M12 11v10",
  bag: "M5 8h14l-1 13H6z|M9 8V6a3 3 0 016 0v2",
  restart: "M4 12a8 8 0 108-8|M4 4v5h5",
  gift: "M3 9h18v4H3z|M5 13v8h14v-8|M12 9v12|M12 9c-3 0-5-4-2-5s3 3 2 5zm0 0c3 0 5-4 2-5s-3 3-2 5z",
};
export const Ic = ({ n, s }) => (
  <svg viewBox="0 0 24 24" width={s} height={s} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    {(P[n] || "").split("|").map((d, i) => <path key={i} d={d} />)}
  </svg>
);
P.palette = "M12 3a9 9 0 100 18c1.5 0 2-1 1.5-2s0-2 1.5-2h2a3 3 0 003-3c0-6-4-11-8-11|M7.5 11h.01|M10 7.5h.01|M14.5 7.5h.01";
P.volume = "M4 9v6h4l5 4V5L8 9z|M16.5 8.5a5 5 0 010 7|M19 6a8.5 8.5 0 010 12";
P.warn = "M12 3l10 18H2z|M12 10v5|M12 18h.01";
P.back = "M15 5l-7 7 7 7";
P.enter = "M10 4h8a2 2 0 012 2v12a2 2 0 01-2 2h-8|M4 12h10|M10 8l4 4-4 4";
P.exit = "M14 4H6a2 2 0 00-2 2v12a2 2 0 002 2h8|M10 12h10|M16 8l4 4-4 4";
P.history = "M3 12a9 9 0 109-9 9 9 0 00-7 3.5L3 8|M3 3v5h5|M12 7v5l3 2";
P.calendar = "M4 5h16v16H4z|M4 10h16|M8 3v4|M16 3v4";
const PIC = { daily: "bolt", monthly: "medal", premium: "crown", trainer: "dumbbell" };
export const PlanIc = ({ id, s }) => <Ic n={PIC[id] || "medal"} s={s} />;

export const Btn = ({ icon, cls = "", children, ...p }) => (
  <button className={"btn " + cls} {...p}>{icon && <Ic n={icon} />}<span>{children}</span></button>
);
export const Switch = ({ on, onClick }) => (
  <button className={"switch" + (on ? " on" : "")} onClick={onClick} role="switch" aria-checked={!!on}><i><Ic n={on ? "check2" : "x"} /></i></button>
);
export const Head = ({ icon, title, sub, right }) => (
  <div className="head fade"><div className="hi"><Ic n={icon} /></div><div><h2>{title}</h2>{sub && <div className="mut">{sub}</div>}</div>{right && <div className="hr">{right}</div>}</div>
);
export const In = ({ f, setF, k, ph, type = "text" }) => (
  <input placeholder={ph} type={type} value={f[k] || ""} onChange={(x) => setF({ ...f, [k]: x.target.value })} />
);
export function Tabs({ tabs, tab, setTab }) {
  return (
    <div className="tabs">
      {tabs.map(([k, ic, t]) => (
        <button key={k} className={tab === k ? "on" : ""} onClick={() => { setTab(k); try { TG()?.HapticFeedback?.selectionChanged(); } catch (e) {} window.scrollTo({ top: 0 }); }}>
          <Ic n={ic} /><span>{t}</span>
        </button>
      ))}
    </div>
  );
}

// ===== Haqiqiy (emojisiz) tushuvchi effektlar: qor, barg, gul bargi, yulduz =====
export function Fall({ icon }) {
  const ref = useRef(null);
  useEffect(() => {
    const kind = icon === "❄" ? "snow" : icon === "🍂" ? "leaf" : icon === "🌸" || icon === "🌷" ? "petal" : "spark";
    const c = ref.current, x = c.getContext("2d");
    const w = (c.width = innerWidth), h = (c.height = innerHeight);
    const pal = { leaf: ["#e4572e", "#f3a712", "#a8501c", "#c97b1a"], petal: ["#ffb7d5", "#ff8fc0", "#ffd1e6"], snow: ["#ffffff"], spark: ["#ffd84d", "#ffffff", "#ffb830"] }[kind];
    const p = Array.from({ length: 34 }, () => ({ x: Math.random() * w, y: Math.random() * h, s: 8 + Math.random() * 14, v: 0.5 + Math.random() * 1.3, d: Math.random() * 6, r: Math.random() * 6, col: pal[(Math.random() * pal.length) | 0] }));
    let raf;
    const draw = (o) => {
      x.save(); x.translate(o.x, o.y); x.rotate(kind === "snow" ? 0 : o.r); x.fillStyle = o.col;
      if (kind === "snow") { const g = x.createRadialGradient(0, 0, 0, 0, 0, o.s / 2.2); g.addColorStop(0, "#fff"); g.addColorStop(1, "#ffffff00"); x.fillStyle = g; x.beginPath(); x.arc(0, 0, o.s / 2.2, 0, 7); x.fill(); }
      else if (kind === "leaf") { x.beginPath(); x.moveTo(0, -o.s / 1.5); x.quadraticCurveTo(o.s / 1.6, 0, 0, o.s / 1.5); x.quadraticCurveTo(-o.s / 1.6, 0, 0, -o.s / 1.5); x.fill(); x.strokeStyle = "#0004"; x.beginPath(); x.moveTo(0, -o.s / 1.5); x.lineTo(0, o.s / 1.5); x.stroke(); }
      else if (kind === "petal") { x.globalAlpha = 0.85; x.beginPath(); x.ellipse(0, 0, o.s / 4, o.s / 2, 0, 0, 7); x.fill(); }
      else { x.shadowColor = o.col; x.shadowBlur = 10; x.beginPath(); const R = o.s / 2, r2 = R / 3.2; for (let i = 0; i < 8; i++) { const a = (i * Math.PI) / 4, rr = i % 2 ? r2 : R; x.lineTo(Math.cos(a) * rr, Math.sin(a) * rr); } x.closePath(); x.fill(); }
      x.restore();
    };
    const loop = () => {
      x.clearRect(0, 0, w, h);
      p.forEach((o) => { o.y += o.v; o.d += 0.02; o.x += Math.sin(o.d) * 0.8; o.r += 0.01; if (o.y > h + 20) { o.y = -20; o.x = Math.random() * w; } draw(o); });
      raf = requestAnimationFrame(loop);
    };
    loop();
    return () => cancelAnimationFrame(raf);
  }, [icon]);
  return <canvas ref={ref} className="fall" />;
}

export function boom() {
  try { TG()?.HapticFeedback?.notificationOccurred("success"); } catch (e) {}
  const c = document.createElement("canvas");
  c.style.cssText = "position:fixed;inset:0;pointer-events:none;z-index:300";
  const w = (c.width = innerWidth), h = (c.height = innerHeight);
  document.body.appendChild(c);
  const x = c.getContext("2d");
  const cols = ["#ffd400", "#ff9d00", "#ffffff", "#ff4d2e", "#3ddc84", "#35c6ff"];
  const p = Array.from({ length: 140 }, () => ({ x: w / 2, y: h * 0.6, vx: (Math.random() - 0.5) * 16, vy: -8 - Math.random() * 12, s: 4 + Math.random() * 6, r: Math.random() * 6, vr: (Math.random() - 0.5) * 0.4, c: cols[(Math.random() * cols.length) | 0] }));
  let t = 0;
  const loop = () => {
    x.clearRect(0, 0, w, h);
    p.forEach((o) => { o.vy += 0.35; o.x += o.vx; o.y += o.vy; o.r += o.vr; x.save(); x.translate(o.x, o.y); x.rotate(o.r); x.fillStyle = o.c; x.fillRect(-o.s / 2, -o.s / 4, o.s, o.s / 2); x.restore(); });
    if (++t < 130) requestAnimationFrame(loop); else c.remove();
  };
  loop();
}

export function useCount(n, ms = 1000) {
  const [v, setV] = useState(0);
  useEffect(() => {
    let raf, t0;
    const f = (t) => { if (t0 === undefined) t0 = t; const k = Math.min(1, (t - t0) / ms); setV(Math.round(n * (1 - Math.pow(1 - k, 3)))); if (k < 1) raf = requestAnimationFrame(f); };
    raf = requestAnimationFrame(f);
    return () => cancelAnimationFrame(raf);
  }, [n]);
  return v;
}
export function Stat({ icon, n, label, suffix = "" }) {
  const v = useCount(n || 0);
  return <div className="stat"><div className="si"><Ic n={icon} /></div><b>{v.toLocaleString()}{suffix}</b><span>{label}</span></div>;
}

export function downloadCsv(rows, file) {
  const csv = "\ufeff" + rows.map((r) => r.map((x) => `"${String(x ?? "").replace(/"/g, '""')}"`).join(";")).join("\n");
  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
  a.download = file;
  a.click();
}

async function shrink(file, max = 800) {
  const url = URL.createObjectURL(file);
  const img = await new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = url; });
  const k = Math.min(1, max / Math.max(img.width, img.height));
  const c = document.createElement("canvas");
  c.width = Math.round(img.width * k); c.height = Math.round(img.height * k);
  c.getContext("2d").drawImage(img, 0, 0, c.width, c.height);
  URL.revokeObjectURL(url);
  return new Promise((r) => c.toBlob(r, "image/jpeg", 0.82));
}
export function Pick({ onUrl, children, cls = "ghost sm", icon = "image" }) {
  const ref = useRef(null);
  const [b, setB] = useState(false);
  const pick = async (e) => {
    const f = e.target.files?.[0];
    e.target.value = "";
    if (!f) return;
    setB(true);
    try {
      const blob = await shrink(f);
      const fd = new FormData();
      fd.append("file", blob, "p.jpg");
      const r = await fetch("/api/upload", { method: "POST", body: fd });
      const d = await r.json().catch(() => ({}));
      if (r.ok) onUrl(d.url); else say(d.error || "Rasm yuklanmadi");
    } catch (err) { say("Rasm yuklanmadi"); }
    setB(false);
  };
  return (<><input ref={ref} type="file" accept="image/*" hidden onChange={pick} /><Btn icon={icon} cls={cls} disabled={b} onClick={() => ref.current.click()}>{b ? "Yuklanmoqda…" : children}</Btn></>);
}

export function QrLive() {
  const [img, setImg] = useState(""), [full, setFull] = useState(false), [err, setErr] = useState("");
  useEffect(() => {
    let on = true;
    const tick = async () => {
      const r = await api("/api/qr");
      if (!on) return;
      if (!r.ok) return setErr(r.error || "QR olinmadi");
      setErr("");
      setImg(await QRCode.toDataURL(r.qr, { width: 640, margin: 1, color: { dark: "#000000", light: "#ffd400" } }));
    };
    tick();
    const t = setInterval(tick, 15000);
    return () => { on = false; clearInterval(t); };
  }, []);
  if (err) return <p className="bad">{err}</p>;
  if (!img) return <p className="mut">QR tayyorlanmoqda…</p>;
  return (
    <>
      <div className="qrbox"><img src={img} alt="QR" /></div>
      <Btn icon="scan" onClick={() => setFull(true)}>To'liq ekranda ko'rsatish</Btn>
      {full && <div className="qrfull" onClick={() => setFull(false)}><img src={img} alt="QR" /><div className="mut">Yopish uchun bosing</div></div>}
    </>
  );
}

// ===== Face ID / barmoq izi (passkey) =====
export const pkSupported = () => typeof window !== "undefined" && !!window.PublicKeyCredential;
export async function pkEnroll() {
  const o = await api("/api/passkey", { step: "regOptions" });
  if (!o.ok) return o;
  let att;
  try { att = await startRegistration({ optionsJSON: o.options }); } catch (e) { return { ok: false, error: "Bekor qilindi yoki bu qurilma qo'llamaydi" }; }
  const v = await api("/api/passkey", { step: "regVerify", response: att });
  if (v.ok) try { localStorage.setItem("gf_pk", "1"); } catch (e) {}
  return v;
}
export async function pkLogin() {
  const o = await api("/api/passkey", { step: "authOptions" });
  if (!o.ok) return o;
  let asr;
  try { asr = await startAuthentication({ optionsJSON: o.options }); } catch (e) { return { ok: false, error: "Bekor qilindi" }; }
  return api("/api/passkey", { step: "authVerify", response: asr });
}

export function downloadJson(obj, file) {
  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob([JSON.stringify(obj, null, 2)], { type: "application/json" }));
  a.download = file;
  a.click();
}

// ===== Tovush (WebAudio, faylsiz) =====
let AC = null;
export const soundOn = () => { try { return localStorage.getItem("gf_snd") !== "0"; } catch (e) { return true; } };
export const setSound = (v) => { try { localStorage.setItem("gf_snd", v ? "1" : "0"); } catch (e) {} };
export function sfx(kind = "ok") {
  if (!soundOn()) return;
  try {
    AC = AC || new (window.AudioContext || window.webkitAudioContext)();
    const seq = { ok: [[660, 0], [880, 0.09]], bad: [[220, 0], [165, 0.12]], badge: [[523, 0], [659, 0.09], [784, 0.18], [1047, 0.27]] }[kind] || [];
    seq.forEach(([f, t]) => {
      const o = AC.createOscillator(), g = AC.createGain(), at = AC.currentTime + t;
      o.type = "sine"; o.frequency.value = f;
      g.gain.setValueAtTime(0.0001, at); g.gain.exponentialRampToValueAtTime(0.18, at + 0.02); g.gain.exponentialRampToValueAtTime(0.0001, at + 0.16);
      o.connect(g); g.connect(AC.destination); o.start(at); o.stop(at + 0.18);
    });
  } catch (e) {}
}
