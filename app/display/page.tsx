// @ts-nocheck
"use client";
import { useEffect, useState } from "react";
import QRCode from "qrcode";

// Zal kirishidagi ekran: /display?key=DISPLAY_KEY
export default function Display() {
  const [img, setImg] = useState("");
  const [err, setErr] = useState("");
  useEffect(() => {
    const key = new URLSearchParams(location.search).get("key") || "";
    const tick = async () => {
      const r = await fetch("/api/qr?key=" + encodeURIComponent(key));
      const d = await r.json();
      if (!r.ok) return setErr(d.error || "Xatolik");
      setErr("");
      setImg(await QRCode.toDataURL(d.qr, { width: 520, margin: 2, color: { dark: "#000000", light: "#ffd400" } }));
    };
    tick();
    const t = setInterval(tick, 15000);
    return () => clearInterval(t);
  }, []);
  return (
    <div className="splash" style={{ gap: 14 }}>
      <img src="/logo.jpeg" alt="" style={{ width: 90, height: 90, animation: "none" }} />
      <h1 className="gold" style={{ animation: "none" }}>GOLD FIT</h1>
      {err ? <p className="bad">{err}</p> : img && <img src={img} alt="QR" style={{ width: "min(80vw,70vh)", height: "auto", borderRadius: 24, animation: "none" }} />}
      <p className="mut">Ilovada "Zalga kirdim" tugmasini bosib shu kodni skanerlang</p>
    </div>
  );
}
