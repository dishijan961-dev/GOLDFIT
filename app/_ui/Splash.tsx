"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import "./premium.css";

// Mini app ochilganda logo videosini ko'rsatadi. Bir sessiyada bir marta.
export default function Splash({
  src = "/intro.mp4",
  poster = "/intro-poster.jpg",
  once = true,
}: {
  src?: string;
  poster?: string;
  once?: boolean;
}) {
  const [show, setShow] = useState(false);
  const [out, setOut] = useState(false);
  const ref = useRef<HTMLVideoElement>(null);

  const finish = useCallback(() => {
    setOut(true);
    try {
      sessionStorage.setItem("gf_intro", "1");
    } catch {}
    setTimeout(() => setShow(false), 650);
  }, []);

  useEffect(() => {
    try {
      if (once && sessionStorage.getItem("gf_intro")) return;
    } catch {}
    setShow(true);
  }, [once]);

  useEffect(() => {
    if (!show) return;
    ref.current?.play().catch(() => {});
    const t = setTimeout(finish, 9500);
    return () => clearTimeout(t);
  }, [show, finish]);

  if (!show) return null;
  return (
    <div className={`gfx-splash${out ? " out" : ""}`} role="dialog" aria-label="GOLD FIT">
      <video ref={ref} src={src} poster={poster} muted playsInline autoPlay preload="auto" onEnded={finish} />
      <button type="button" className="skip" onClick={finish}>O&apos;tkazib yuborish</button>
    </div>
  );
}
