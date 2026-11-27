// @ts-nocheck
"use client";
import { useEffect, useRef, useState } from "react";
import { planOf } from "@/lib/plans";
import { TG, api, bus, say, today, name, Ic, PlanIc, Btn, Switch, Head, Tabs, Stat, boom, useCount, pkSupported, pkEnroll, LockSwitch, MUSCLES, BodyMap, VideoBox, sfx, money } from "./ui";

function VipCard({ u, active }) {
  const P = planOf(u.plan), ref = useRef(null);
  const left = u.paid_until ? Math.max(0, Math.round((new Date(u.paid_until) - new Date(today())) / 864e5)) : 0;
  const pct = !active ? 0 : Math.max(0.07, Math.min(1, left / Math.max(P.days, 1)));
  const C = 2 * Math.PI * 44, shown = useCount(left);
  const mv = (e) => {
    const r = ref.current.getBoundingClientRect(), a = (e.clientX - r.left) / r.width - 0.5, b = (e.clientY - r.top) / r.height - 0.5;
    ref.current.style.transform = `perspective(800px) rotateY(${a * 16}deg) rotateX(${-b * 16}deg)`;
    ref.current.style.setProperty("--mx", (a + 0.5) * 100 + "%");
  };
  return (
    <>
      <div ref={ref} className={"vip " + P.id + (active ? "" : " dead")} onPointerMove={mv} onPointerLeave={() => (ref.current.style.transform = "")} onClick={boom}>
        <div className="vip-top"><img src="/logo.jpeg" alt="" /><span className="plan-chip"><PlanIc id={P.id} />{P.name}{u.trainer ? " + Trener" : ""}</span></div>
        <div className="vip-mid">
          <div><div className="vip-name">{name(u)}</div><div className="vip-sub">{u.tg_username ? "@" + u.tg_username : u.phone}</div></div>
          <div className="ring">
            <svg viewBox="0 0 100 100"><circle cx="50" cy="50" r="44" className="rb" /><circle cx="50" cy="50" r="44" className="rf" style={{ strokeDasharray: C, strokeDashoffset: C * (1 - pct) }} /></svg>
            <div className="rn"><b>{shown}</b><span>kun</span></div>
          </div>
        </div>
        <div className="vip-bot"><span>{active ? "Amal qiladi: " + u.paid_until : "Obuna tugagan"}</span><span>{P.price.toLocaleString()} so'm</span></div>
      </div>
      <div className="perks">{P.perks.map((x) => <span key={x}><Ic n="check2" />{x}</span>)}</div>
    </>
  );
}

function Locker({ d, inGym }) {
  const u = d.user;
  if (!d.settings.lockers_enabled && !d.locker) return null;
  const till = u.checked_in_until ? new Date(u.checked_in_until).toLocaleTimeString("uz-UZ", { hour: "2-digit", minute: "2-digit" }) : "";
  if (d.locker) return (
    <div className="card locker">
      <div className="mut">Sizning shkafingiz</div>
      <div className="no gold">{d.locker}</div>
      <div className="mut" style={{ marginTop: 6 }}>Zal vaqti tugaguncha ({till} gacha) sizniki</div>
    </div>
  );
  return (
    <div className="card row" style={{ gap: 14 }}>
      <div className="head" style={{ margin: 0 }}><div className="hi"><Ic n="locker" /></div></div>
      <div className="mut" style={{ flex: 1 }}>{inGym ? "Hozir bo'sh shkaf qolmadi. Administratorga murojaat qiling." : "QR kodni skanerlasangiz, bo'sh shkaf raqami avtomatik beriladi."}</div>
    </div>
  );
}

function Leaderboard({ top }) {
  if (!top?.length) return null;
  return (
    <div className="card">
      <div className="row" style={{ marginBottom: 10 }}><Ic n="trophy" s={22} /><b>Oyning eng faollari</b></div>
      {top.map((x, i) => <div key={i} className={"lb" + (x.me ? " me" : "")}><span className="rk">{i + 1}</span><span>{x.name}{x.me ? " (siz)" : ""}</span><span className="n">{x.n} kun</span></div>)}
    </div>
  );
}

function Bio() {
  const [sup, setSup] = useState(false), [fail, setFail] = useState(false);
  useEffect(() => setSup(pkSupported()), []);
  return (
    <div className="card">
      <b>Tez va xavfsiz kirish</b>
      <LockSwitch />
      {sup && (
        <div className="row between" style={{ margin: "10px 0" }}>
          <div><b>Parolsiz kirish</b><div className="mut">Brauzerda Face ID / barmoq izi (passkey)</div></div>
          <Btn icon="finger" cls="sm" onClick={async () => { const r = await pkEnroll(); if (r.ok) say("Yoqildi. Endi shu qurilmada Face ID bilan kirasiz"); else { setFail(true); say(r.error); } }}>Yoqish</Btn>
        </div>
      )}
      {fail && TG()?.openLink && <Btn icon="door" cls="ghost sm" onClick={() => TG().openLink(location.origin)}>Brauzerda ochib yoqish</Btn>}
    </div>
  );
}

function ExSheet({ x, onClose }) {
  const [tab, setTab] = useState("m");
  const steps = String(x.steps || x.note || "").split("\n").filter(Boolean);
  return (
    <div className="sheet">
      <button className="back" onClick={onClose}><Ic n="back" />Orqaga</button>
      <h1>{x.title}</h1>
      <VideoBox url={x.video_url} poster={x.image_url} />
      <div className="segw"><button className={tab === "m" ? "on" : ""} onClick={() => setTab("m")}>Mushaklar</button><button className={tab === "h" ? "on" : ""} onClick={() => setTab("h")}>Qanday bajariladi</button></div>
      {tab === "m" ? (
        <>
          <div className="panel">
            <h4>Asosiy mushaklar</h4>
            <div className="mchips">{(x.muscles || []).map((m) => <span key={m}>{MUSCLES[m] || m}</span>)}{!(x.muscles || []).length && <span style={{ background: "#ececf0" }}>Belgilanmagan</span>}</div>
            <BodyMap muscles={x.muscles || []} />
          </div>
          {x.equipment && <div className="panel"><h4>Jihoz</h4>{x.equipment}</div>}
        </>
      ) : (
        <div className="panel">
          {(x.sets || x.reps) && <h4>{x.sets ? x.sets + " yondashuv" : ""}{x.reps ? " × " + x.reps : ""}</h4>}
          <ol className="steps">{steps.map((t, i) => <li key={i}>{t}</li>)}</ol>
          {!steps.length && <span>Tavsif qo'shilmagan</span>}
        </div>
      )}
      <button className="donebtn" onClick={onClose}>Tayyor</button>
    </div>
  );
}

function Exercises() {
  const [d, setD] = useState(null), [g, setG] = useState(""), [open, setOpen] = useState(null), [v, setV] = useState("prog");
  const ld = async () => { const r = await api("/api/exercises"); setD(r); if (r.ok && !r.assigned?.length) setV("lib"); };
  useEffect(() => { ld(); }, []);
  if (!d) return <p className="mut">Yuklanmoqda…</p>;
  const lib = d.library || [], mine = d.assigned || [];
  const groups = [...new Set(lib.map((x) => x.grp).filter(Boolean))];
  const card = (x, extra) => (
    <div className="card exc fade" key={x.id + (extra?.key || "")} onClick={() => setOpen(x)}>
      <div className="th" style={x.image_url ? { backgroundImage: `url(${x.image_url})` } : {}}>{!x.image_url && <Ic n="dumbbell" s={30} />}</div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div className="row between"><b>{x.title}</b>{x.grp && <span className="tag">{x.grp}</span>}</div>
        <div className="mut">{x.sets ? x.sets + " yondashuv" : ""}{x.reps ? " × " + x.reps : ""}</div>
        {(x.muscles || []).length > 0 && <div className="mut">{x.muscles.map((m) => MUSCLES[m] || m).join(", ")}</div>}
        {extra?.node}
      </div>
    </div>
  );
  return (
    <>
      {open && <ExSheet x={open} onClose={() => setOpen(null)} />}
      <div className="seg"><button className={v === "prog" ? "on" : ""} onClick={() => setV("prog")}>Mening dasturim{mine.length ? ` (${mine.length})` : ""}</button><button className={v === "lib" ? "on" : ""} onClick={() => setV("lib")}>Hamma mashqlar</button></div>
      {v === "prog" && (mine.length === 0
        ? <p className="mut">Trener hali sizga mashq yubormagan. "Hamma mashqlar" bo'limidan ko'rishingiz mumkin.</p>
        : mine.map((a) => card(a.exercise, { key: a.id, node: (
            <div onClick={(e) => e.stopPropagation()}>
              {a.note && <div style={{ margin: "6px 0" }}>{a.note}</div>}
              <div className="row between"><span className="mut">{a.by ? a.by + " · " : ""}{new Date(a.created_at).toLocaleDateString("uz-UZ")}</span>
                <Switch on={a.done} onClick={async () => { await api("/api/exercises", { id: a.id, done: !a.done }); if (!a.done) sfx("ok"); setD({ ...d, assigned: mine.map((z) => (z.id === a.id ? { ...z, done: !a.done } : z)) }); }} /></div>
            </div>
          ) })))}
      {v === "lib" && (
        <>
          {lib.length === 0 && <p className="mut">Mashqlar hali qo'shilmagan.</p>}
          <div className="chips">{["", ...groups].map((x) => <button key={x} className={g === x ? "on" : ""} onClick={() => setG(x)}>{x || "Hammasi"}</button>)}</div>
          {lib.filter((x) => !g || x.grp === g).map((x) => card(x))}
        </>
      )}
    </>
  );
}

function Notes({ notes }) {
  if (!notes?.length) return <p className="mut">Hozircha xabarlar yo'q</p>;
  return notes.map((n) => (
    <div className="card fade" key={n.id}><b>{n.title}</b><div>{n.body}</div><div className="mut">{new Date(n.created_at).toLocaleString("uz-UZ")}</div></div>
  ));
}

function Store({ reload }) {
  const [st, setSt] = useState(null), [cart, setCart] = useState({}), [useCoins, setUse] = useState(true);
  const ld = async () => setSt(await api("/api/store"));
  useEffect(() => { ld(); }, []);
  if (!st) return <p className="mut">Yuklanmoqda…</p>;
  if (!st.enabled) return <p className="mut">Do'kon hozircha yopiq</p>;
  const rate = st.rate || 1000, coins = st.coins || 0;
  const total = st.products.reduce((a, p) => a + (cart[p.id] || 0) * p.price, 0);
  const coinsUsed = useCoins ? Math.min(coins, Math.ceil(total / rate)) : 0;
  const cash = Math.max(0, total - coinsUsed * rate);
  const add = (id, n) => setCart({ ...cart, [id]: Math.max(0, (cart[id] || 0) + n) });
  const order = async () => {
    const items = Object.entries(cart).filter(([, q]) => q > 0).map(([id, qty]) => ({ id, qty }));
    const r = await api("/api/store", { items, useCoins });
    if (r.ok) { sfx("ok"); boom(); say(r.coinsUsed ? `Buyurtma qabul qilindi. ${r.coinsUsed} tanga ishlatildi${r.cashLeft ? `, zalda ${money(r.cashLeft)} to'lang` : ""}` : "Buyurtma qabul qilindi"); setCart({}); ld(); reload(); }
    else { sfx("bad"); say(r.error); }
  };
  return (
    <>
      <div className="coinbar"><div className="ci"><Ic n="coin" /></div><div><b>{coins} tanga</b><span className="mut">1 tanga = {money(rate)}</span></div></div>
      {!st.canOrder && <div className="card mut">Buyurtma berish uchun zalga kelib, kirishdagi QR kodni skanerlang.</div>}
      {st.products.map((p) => (
        <div className="card prod fade" key={p.id}>
          {p.image_url && <img src={p.image_url} alt="" />}
          <div style={{ flex: 1 }}><b>{p.name}</b><div className="mut">{p.category}</div><div className="gold">{money(p.price)}</div><div className="mut">≈ {Math.ceil(p.price / rate)} tanga</div></div>
          {p.stock <= 0 ? <span className="bad">Qolmadi</span> : (
            <div className="row">
              <Btn icon="minus" cls="ghost sm" disabled={!st.canOrder} onClick={() => add(p.id, -1)}>{""}</Btn>
              <b>{cart[p.id] || 0}</b>
              <Btn icon="plus" cls="sm" disabled={!st.canOrder || (cart[p.id] || 0) >= p.stock} onClick={() => add(p.id, 1)}>{""}</Btn>
            </div>
          )}
        </div>
      ))}
      {total > 0 && (
        <div className="card">
          {coins > 0 && <div className="row between" style={{ marginBottom: 8 }}><div><b>Tanga bilan to'lash</b><div className="mut">{coinsUsed} tanga ishlatiladi</div></div><Switch on={useCoins} onClick={() => setUse(!useCoins)} /></div>}
          <div className="row between" style={{ marginBottom: 10 }}><span className="mut">Jami {money(total)}</span><b className="gold">Zalda to'lanadi: {money(cash)}</b></div>
          <Btn icon="cart" disabled={!st.canOrder} onClick={order}>Buyurtma berish</Btn>
        </div>
      )}
    </>
  );
}

export default function Client({ d, reload, th }) {
  const [tab, setTab] = useState("home");
  const u = d.user, s = d.settings;
  const active = u.paid_until && u.paid_until >= today();
  const inGym = u.checked_in_until && new Date(u.checked_in_until) > new Date();
  const scan = () => TG()?.showScanQrPopup
    ? TG().showScanQrPopup({ text: "Zaldagi QR kodni skanerlang" }, (t) => {
        TG().closeScanQrPopup();
        api("/api/checkin", { qr: t }).then((r) => { say(r.ok ? (r.locker ? `Xush kelibsiz! Shkafingiz: №${r.locker}` : "Xush kelibsiz!") + (r.coin ? ` +${r.coin} tanga` : "") : r.error); if (r.ok) { boom(); sfx("ok"); } else sfx("bad"); reload(); });
        return true;
      })
    : say("Skaner faqat Telegram ichida ishlaydi");
  const tabs = [["home", "home", "Bosh"], ...(s.store_enabled ? [["store", "cart", "Do'kon"]] : []), ["ex", "dumbbell", "Mashqlar"], ["notes", "bell", "Xabarlar"]];
  return (
    <div className="wrap fade">
      <div className="row between" style={{ marginBottom: 6 }}>
        <div className="row"><img src="/logo.jpeg" alt="" width="40" height="40" style={{ borderRadius: "50%" }} /><h2 className="gold" style={{ margin: 0, letterSpacing: 3 }}>GOLD FIT</h2></div>
        <Btn icon="logout" cls="ghost sm" onClick={() => bus.logout()}>Chiqish</Btn>
      </div>
      {tab === "home" && th.banner && <div className="banner">{th.banner}</div>}
      {tab === "home" && (
        <>
          <VipCard u={u} active={active} />
          <Btn icon="scan" onClick={scan}>Zalga kirdim: QR skaner</Btn>
          <p className="mut">{inGym ? "Siz zaldasiz, do'kondan buyurtma bera olasiz" : "Do'kondan buyurtma berish uchun avval QR kodni skanerlang"}</p>
          <div className="coinbar"><div className="ci"><Ic n="coin" /></div><div><b>{u.coins || 0} tanga</b><span className="mut">Har kelganingizga +1 tanga. Do'konda ishlating</span></div></div>
          <Locker d={d} inGym={inGym} />
          <div className="stats">
            <Stat icon="flame" n={d.stats?.streak} label="ketma-ket kun" />
            <Stat icon="check" n={d.stats?.month} label="shu oy" />
            <Stat icon="trophy" n={d.stats?.total} label="jami kelish" />
          </div>
          <Leaderboard top={d.top} />
          <Bio />
          <div className="card row between">
            <div><b>Bildirishnoma ovozi</b><div className="mut">Telegram xabarlari ovozi</div></div>
            <Switch on={!u.silent} onClick={async () => { await api("/api/me", { silent: !u.silent }); reload(); }} />
          </div>
        </>
      )}
      {tab === "store" && (<><Head icon="cart" title="Do'kon" sub="Zaldan chiqmasdan buyurtma bering" /><Store reload={reload} /></>)}
      {tab === "ex" && (<><Head icon="dumbbell" title="Mashqlar" sub="Mushak guruhi bo'yicha tanlang" /><Exercises /></>)}
      {tab === "notes" && (<><Head icon="bell" title="Xabarlar" /><Notes notes={d.notes} /></>)}
      <Tabs tabs={tabs} tab={tab} setTab={setTab} />
    </div>
  );
}
