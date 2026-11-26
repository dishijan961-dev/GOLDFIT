// @ts-nocheck
"use client";
import { useEffect, useRef, useState } from "react";
import { planOf } from "@/lib/plans";
import { TG, api, bus, say, today, name, Ic, PlanIc, Btn, Switch, Head, Tabs, Stat, boom, useCount, pkSupported, pkEnroll } from "./ui";

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
  const [sup, setSup] = useState(false);
  useEffect(() => setSup(pkSupported()), []);
  if (!sup) return null;
  return (
    <div className="card">
      <div className="row between"><div><b>Face ID / barmoq izi</b><div className="mut">Parolsiz tez kirish</div></div>
        <Btn icon="finger" cls="sm" onClick={async () => { const r = await pkEnroll(); say(r.ok ? "Yoqildi. Endi shu qurilmada Face ID bilan kirasiz" : r.error); }}>Yoqish</Btn></div>
    </div>
  );
}

function Exercises({ list }) {
  const [g, setG] = useState("");
  if (!list?.length) return <p className="mut">Mashqlar hali qo'shilmagan. Trenerdan so'rang.</p>;
  const groups = [...new Set(list.map((x) => x.grp).filter(Boolean))];
  return (
    <>
      <div className="chips">{["", ...groups].map((x) => <button key={x} className={g === x ? "on" : ""} onClick={() => setG(x)}>{x || "Hammasi"}</button>)}</div>
      {list.filter((x) => !g || x.grp === g).map((x) => (
        <div className="card ex fade" key={x.id}>
          {x.image_url && <img src={x.image_url} alt="" />}
          <div style={{ flex: 1 }}>
            <div className="row between"><b>{x.title}</b>{x.grp && <span className="tag">{x.grp}</span>}</div>
            {(x.sets || x.reps) && <div style={{ margin: "6px 0" }}><span className="sr">{x.sets ? x.sets + " yondashuv" : ""}{x.reps ? " × " + x.reps : ""}</span></div>}
            {x.note && <div className="mut">{x.note}</div>}
          </div>
        </div>
      ))}
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
  const [st, setSt] = useState(null), [cart, setCart] = useState({});
  const ld = async () => setSt(await api("/api/store"));
  useEffect(() => { ld(); }, []);
  if (!st) return <p className="mut">Yuklanmoqda…</p>;
  if (!st.enabled) return <p className="mut">Do'kon hozircha yopiq</p>;
  const total = st.products.reduce((a, p) => a + (cart[p.id] || 0) * p.price, 0);
  const add = (id, n) => setCart({ ...cart, [id]: Math.max(0, (cart[id] || 0) + n) });
  const order = async () => {
    const items = Object.entries(cart).filter(([, q]) => q > 0).map(([id, qty]) => ({ id, qty }));
    const r = await api("/api/store", { items });
    say(r.ok ? "Buyurtma qabul qilindi" : r.error);
    if (r.ok) { setCart({}); ld(); boom(); }
  };
  return (
    <>
      {!st.canOrder && <div className="card mut">Buyurtma berish uchun zalga kelib, kirishdagi QR kodni skanerlang.</div>}
      {st.products.map((p) => (
        <div className="card prod fade" key={p.id}>
          {p.image_url && <img src={p.image_url} alt="" />}
          <div style={{ flex: 1 }}><b>{p.name}</b><div className="mut">{p.category}</div><div className="gold">{p.price.toLocaleString()} so'm</div></div>
          {p.stock <= 0 ? <span className="bad">Qolmadi</span> : (
            <div className="row">
              <Btn icon="minus" cls="ghost sm" disabled={!st.canOrder} onClick={() => add(p.id, -1)}>{""}</Btn>
              <b>{cart[p.id] || 0}</b>
              <Btn icon="plus" cls="sm" disabled={!st.canOrder || (cart[p.id] || 0) >= p.stock} onClick={() => add(p.id, 1)}>{""}</Btn>
            </div>
          )}
        </div>
      ))}
      {total > 0 && <Btn icon="cart" onClick={order}>Buyurtma berish: {total.toLocaleString()} so'm</Btn>}
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
        api("/api/checkin", { qr: t }).then((r) => { say(r.ok ? (r.locker ? `Xush kelibsiz! Shkafingiz: №${r.locker}` : "Xush kelibsiz!") : r.error); if (r.ok) boom(); reload(); });
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
      {tab === "ex" && (<><Head icon="dumbbell" title="Mashqlar" sub="Mushak guruhi bo'yicha tanlang" /><Exercises list={d.exercises} /></>)}
      {tab === "notes" && (<><Head icon="bell" title="Xabarlar" /><Notes notes={d.notes} /></>)}
      <Tabs tabs={tabs} tab={tab} setTab={setTab} />
    </div>
  );
}
