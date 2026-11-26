// @ts-nocheck
"use client";
import { useEffect, useRef, useState } from "react";
import { resolveTheme } from "@/lib/themes";
import { TG, api, bus, Fall, Btn, pkSupported, pkLogin } from "@/components/ui";
import Client from "@/components/Client";
import Owner from "@/components/Owner";

function Splash() {
  return (
    <div className="splash">
      <img src="/logo.jpeg" alt="GOLD FIT" />
      <h1 className="gold">GOLD FIT</h1>
      <div className="bar"><i /></div>
    </div>
  );
}

// Mini app ochilganda logotip videosi (bir sessiyada bir marta)
function Intro({ onDone }) {
  const v = useRef(null);
  const [out, setOut] = useState(false), [skip, setSkip] = useState(false);
  const end = () => {
    setOut(true);
    try { sessionStorage.setItem("gf_intro", "1"); } catch (e) {}
    setTimeout(onDone, 700);
  };
  useEffect(() => {
    const t = setTimeout(end, 9500), t2 = setTimeout(() => setSkip(true), 800);
    const p = v.current?.play?.();
    if (p?.catch) p.catch(end);
    return () => { clearTimeout(t); clearTimeout(t2); };
  }, []);
  return (
    <div className={"intro" + (out ? " out" : "")} onClick={end}>
      <video ref={v} src="/intro.mp4" poster="/logo.jpeg" muted playsInline autoPlay preload="auto" onEnded={end} onError={end} />
      {skip && <button className="skip" onClick={end}>O'tkazish</button>}
    </div>
  );
}

function Login({ onDone }) {
  const [l, setL] = useState(""), [p, setP] = useState(""), [err, setErr] = useState(""), [busy, setBusy] = useState(false), [bio, setBio] = useState(false);
  useEffect(() => { try { setBio(pkSupported() && !!localStorage.getItem("gf_pk")); } catch (e) {} }, []);
  const go = async () => {
    setBusy(true);
    const r = await api("/api/login", { login: l, password: p, initData: TG()?.initData });
    setBusy(false);
    r.ok ? onDone() : setErr(r.error || "Xatolik");
  };
  const face = async () => { setBusy(true); const r = await pkLogin(); setBusy(false); r.ok ? onDone() : setErr(r.error || "Xatolik"); };
  return (
    <div className="center fade">
      <img src="/logo.jpeg" className="logo-top" alt="" />
      <h2 className="gold" style={{ textAlign: "center", letterSpacing: 5, fontSize: 28 }}>GOLD FIT</h2>
      {bio && <Btn icon="finger" disabled={busy} onClick={face}>Face ID / barmoq izi bilan kirish</Btn>}
      <input placeholder="Login" value={l} onChange={(x) => setL(x.target.value)} autoCapitalize="off" autoCorrect="off" />
      <input placeholder="Parol" type="password" value={p} onChange={(x) => setP(x.target.value)} />
      {err && <div className="bad">{err}</div>}
      <Btn icon="lock" cls={bio ? "ghost" : ""} disabled={busy || !l || !p} onClick={go}>Kirish</Btn>
      <div className="mut" style={{ textAlign: "center" }}>Login va parolni zal ma'muriyatidan oling</div>
    </div>
  );
}

export default function Page() {
  const [intro, setIntro] = useState(true);
  const [d, setD] = useState(null);
  const [toast, setToast] = useState("");
  const load = async () => {
    let r = await api("/api/me");
    if (!r.ok) r = await api("/api/me");
    // Telegram ichida: avval kirgan mijoz parolsiz avtomatik kiradi
    if (r.ok && !r.user && TG()?.initData) {
      const a = await api("/api/login", { initData: TG().initData });
      if (a.ok) r = await api("/api/me");
    }
    setD(r);
  };
  useEffect(() => {
    bus.toast = (t) => { setToast(String(t)); setTimeout(() => setToast(""), 3200); };
    TG()?.ready(); TG()?.expand();
    try { if (sessionStorage.getItem("gf_intro")) setIntro(false); } catch (e) {}
    load();
    return () => { bus.toast = null; };
  }, []);
  const s = d?.settings;
  const th = resolveTheme(s || {});
  useEffect(() => {
    const st = document.documentElement.style;
    ["--gold", "--gold2", "--bg", "--card", "--line"].forEach((k) => st.removeProperty(k));
    Object.entries(th.vars).forEach(([k, v]) => st.setProperty(k, v));
  }, [th.id]);
  const icon = { winter: "❄", autumn: "🍂", spring: "🌸" }[s?.season] || th.fall;
  return (
    <>
      {intro && <Intro onDone={() => setIntro(false)} />}
      {!d ? <Splash /> : (
        <>
          {icon && <Fall icon={icon} />}
          {toast && <div className="toast">{toast}</div>}
          {!d.user ? <Login onDone={load} /> : d.user.role === "client" ? <Client d={d} reload={load} th={th} /> : <Owner d={d} reload={load} th={th} />}
        </>
      )}
    </>
  );
}
