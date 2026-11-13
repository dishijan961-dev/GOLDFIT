// @ts-nocheck
"use client";
import { useEffect, useRef, useState } from "react";

const TG = () => (typeof window !== "undefined" ? window.Telegram?.WebApp : null);
async function api(url, body) {
  const r = await fetch(url, body ? { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) } : undefined);
  const d = await r.json().catch(() => ({}));
  return { ...d, ok: r.ok };
}
const say = (t) => { try { if (TG()?.initData && TG().showAlert) return TG().showAlert(t); } catch (e) {} alert(t); };
const today = () => new Date(Date.now() + 5 * 3600e3).toISOString().slice(0, 10);
const since = (d) => (d ? Math.floor((Date.now() - new Date(d)) / 864e5) : null);
const name = (u) => [u?.first_name, u?.last_name].filter(Boolean).join(" ") || u?.login;

function Fall({ icon }) {
  const ref = useRef(null);
  useEffect(() => {
    const c = ref.current, x = c.getContext("2d");
    const w = (c.width = innerWidth), h = (c.height = innerHeight);
    const p = Array.from({ length: 36 }, () => ({ x: Math.random() * w, y: Math.random() * h, s: 10 + Math.random() * 12, v: 0.5 + Math.random() * 1.2, d: Math.random() * 6 }));
    let raf;
    const loop = () => {
      x.clearRect(0, 0, w, h);
      p.forEach((o) => { o.y += o.v; o.x += Math.sin((o.d += 0.02)); if (o.y > h) { o.y = -20; o.x = Math.random() * w; } x.font = o.s + "px serif"; x.fillText(icon, o.x, o.y); });
      raf = requestAnimationFrame(loop);
    };
    loop();
    return () => cancelAnimationFrame(raf);
  }, [icon]);
  return <canvas ref={ref} className="fall" />;
}

function Splash() {
  return (
    <div className="splash">
      <img src="/logo.jpeg" alt="GOLD FIT" />
      <h1 className="gold">GOLD FIT</h1>
      <div className="bar"><i /></div>
    </div>
  );
}

export default function Page() {
  const [boot, setBoot] = useState(true);
  const [d, setD] = useState(null);
  const load = async () => setD(await api("/api/me"));
  useEffect(() => { TG()?.ready(); TG()?.expand(); load(); setTimeout(() => setBoot(false), 2300); }, []);
  const s = d?.settings;
  useEffect(() => { document.documentElement.dataset.theme = s?.theme || "gold"; }, [s?.theme]);
  if (boot || !d) return <Splash />;
  const icon = { winter: "❄", autumn: "🍂", spring: "🌸" }[s?.season];
  return (
    <>
      {icon && <Fall icon={icon} />}
      {!d.user ? <Login onDone={load} /> : d.user.role === "client" ? <Client d={d} reload={load} /> : <Owner d={d} reload={load} />}
    </>
  );
}

function Login({ onDone }) {
  const [l, setL] = useState(""), [p, setP] = useState(""), [err, setErr] = useState(""), [busy, setBusy] = useState(false);
  const go = async () => {
    setBusy(true);
    const r = await api("/api/login", { login: l, password: p, initData: TG()?.initData });
    setBusy(false);
    r.ok ? onDone() : setErr(r.error || "Xatolik");
  };
  return (
    <div className="center fade">
      <img src="/logo.jpeg" className="logo-top" alt="" />
      <h2 className="gold" style={{ textAlign: "center" }}>GOLD FIT</h2>
      <input placeholder="Login" value={l} onChange={(x) => setL(x.target.value)} autoCapitalize="off" autoCorrect="off" />
      <input placeholder="Parol" type="password" value={p} onChange={(x) => setP(x.target.value)} />
      {err && <div className="bad">{err}</div>}
      <button className="btn" disabled={busy || !l || !p} onClick={go}>Kirish</button>
      <div className="mut" style={{ textAlign: "center" }}>Login va parolni zal ma'muriyatidan oling</div>
    </div>
  );
}

function Tabs({ tabs, tab, setTab }) {
  return <div className="tabs">{tabs.map(([k, t]) => <button key={k} className={tab === k ? "on" : ""} onClick={() => setTab(k)}>{t}</button>)}</div>;
}

function Notes({ notes }) {
  if (!notes?.length) return <p className="mut">Hozircha xabarlar yo'q</p>;
  return notes.map((n) => (
    <div className="card" key={n.id}>
      <b>{n.title}</b><div>{n.body}</div>
      <div className="mut">{new Date(n.created_at).toLocaleString("uz-UZ")}</div>
    </div>
  ));
}

function Store({ reload }) {
  const [st, setSt] = useState(null), [cart, setCart] = useState({});
  const ld = async () => setSt(await api("/api/store"));
  useEffect(() => { ld(); }, []);
  if (!st) return null;
  if (!st.enabled) return <p className="mut">Do'kon hozircha yopiq</p>;
  const total = st.products.reduce((a, p) => a + (cart[p.id] || 0) * p.price, 0);
  const add = (id, n) => setCart({ ...cart, [id]: Math.max(0, (cart[id] || 0) + n) });
  const order = async () => {
    const items = Object.entries(cart).filter(([, q]) => q > 0).map(([id, qty]) => ({ id, qty }));
    const r = await api("/api/store", { items });
    say(r.ok ? "✅ Buyurtma qabul qilindi" : r.error);
    if (r.ok) { setCart({}); ld(); }
  };
  return (
    <>
      {!st.canOrder && <div className="card mut">Buyurtma berish uchun zalga kelib, kirishdagi QR kodni skanerlang.</div>}
      {st.products.map((p) => (
        <div className="card prod" key={p.id}>
          {p.image_url && <img src={p.image_url} alt="" />}
          <div style={{ flex: 1 }}>
            <b>{p.name}</b>
            <div className="mut">{p.category}</div>
            <div className="gold">{p.price.toLocaleString()} so'm</div>
          </div>
          {p.stock <= 0 ? <span className="bad">Mahsulot qolmadi</span> : (
            <div className="row">
              <button className="btn ghost sm" disabled={!st.canOrder} onClick={() => add(p.id, -1)}>−</button>
              <b>{cart[p.id] || 0}</b>
              <button className="btn sm" disabled={!st.canOrder || (cart[p.id] || 0) >= p.stock} onClick={() => add(p.id, 1)}>+</button>
            </div>
          )}
        </div>
      ))}
      {total > 0 && <button className="btn" onClick={order}>Buyurtma berish: {total.toLocaleString()} so'm</button>}
    </>
  );
}

function Client({ d, reload }) {
  const [tab, setTab] = useState("home");
  const u = d.user, s = d.settings;
  const active = u.paid_until && u.paid_until >= today();
  const inGym = u.checked_in_until && new Date(u.checked_in_until) > new Date();
  const scan = () => TG()?.showScanQrPopup
    ? TG().showScanQrPopup({ text: "Zaldagi QR kodni skanerlang" }, (t) => {
        TG().closeScanQrPopup();
        api("/api/checkin", { qr: t }).then((r) => { say(r.ok ? "✅ Xush kelibsiz!" : r.error); reload(); });
        return true;
      })
    : say("Skaner faqat Telegram ichida ishlaydi");
  const tabs = [["home", "🏠 Bosh"], ...(s.store_enabled ? [["store", "🛒 Do'kon"]] : []), ["notes", "🔔 Xabarlar"]];
  return (
    <div className="wrap fade">
      <div className="row between"><h2 className="gold">GOLD FIT</h2><span className={"tag " + (active ? "on" : "off")}>{active ? "Faol" : "To'lov kerak"}</span></div>
      {tab === "home" && (
        <>
          <div className="card row">
            {u.tg_photo && <img src={u.tg_photo} width="56" height="56" style={{ borderRadius: "50%" }} alt="" />}
            <div><b>{name(u)}</b><div className="mut">{u.phone}</div>{u.tg_username && <div className="mut">@{u.tg_username}</div>}</div>
          </div>
          <div className="card">
            <div className="mut">Obuna muddati</div>
            <b>{u.paid_until || "—"}</b>
          </div>
          <button className="btn" onClick={scan}>📷 Zalga kirdim (QR skaner)</button>
          <p className="mut">{inGym ? "✅ Siz zaldasiz, do'kondan buyurtma bera olasiz" : "Do'kondan buyurtma berish uchun avval QR kodni skanerlang"}</p>
          <div className="card row between">
            <span>Bildirishnoma ovozi</span>
            <button className={"switch " + (!u.silent ? "on" : "")} onClick={async () => { await api("/api/me", { silent: !u.silent }); reload(); }} />
          </div>
          <button className="btn ghost" onClick={async () => { await api("/api/me", { logout: true }); reload(); }}>Hisobdan chiqish</button>
        </>
      )}
      {tab === "store" && <Store reload={reload} />}
      {tab === "notes" && <Notes notes={d.notes} />}
      <Tabs tabs={tabs} tab={tab} setTab={setTab} />
    </div>
  );
}

function In({ f, setF, k, ph, type = "text" }) {
  return <input placeholder={ph} type={type} value={f[k] || ""} onChange={(x) => setF({ ...f, [k]: x.target.value })} />;
}

function Owner({ d, reload }) {
  const [tab, setTab] = useState("clients");
  const [o, setO] = useState(null);
  const [f, setF] = useState({}), [pf, setPf] = useState({}), [nf, setNf] = useState({ target: "all" }), [cf, setCf] = useState({}), [bf, setBf] = useState({});
  const [payDays, setPayDays] = useState(30);
  const s = d.settings, isOwner = d.user.role === "owner";
  const ld = async () => setO(await api("/api/owner"));
  useEffect(() => { ld(); }, []);
  const act = async (body, msg) => {
    const r = await api("/api/owner", body);
    say(r.ok ? msg || "✅ Saqlandi" : r.error);
    await ld();
    if (r.ok && ["setSetting", "changeCreds"].includes(body.action)) reload();
    return r;
  };
  const set = (key, value) => act({ action: "setSetting", key, value }, "✅ Sozlama saqlandi");
  if (!o) return <div className="wrap mut">Yuklanmoqda…</div>;
  if (d.user.must_change)
    return (
      <div className="wrap fade">
        <h2 className="gold">Xavfsizlik</h2>
        <div className="card">
          <b>Avval login va parolni o'zgartiring</b>
          <p className="mut">Standart parol hammaga ma'lum. Yangi login va kamida 6 belgili parol yozing.</p>
          <In f={cf} setF={setCf} k="login" ph="Yangi login" />
          <In f={cf} setF={setCf} k="password" ph="Yangi parol (kamida 6 belgi)" type="password" />
          <button className="btn" onClick={async () => { const r = await act({ action: "changeCreds", ...cf }); if (r.ok) setCf({}); }}>Saqlash</button>
        </div>
      </div>
    );

  const absent = o.clients.filter((c) => !c.blocked).map((c) => ({ c, n: since(c.last_visit ?? c.created_at) })).sort((a, b) => b.n - a.n).filter((x) => x.n >= 3);
  const tabs = [["clients", "👥 Mijozlar"], ["att", "✅ Davomat"], ["shop", "🛒 Do'kon"], ["msg", "🔔 Xabar"], ["set", "⚙️ Sozlama"]];

  return (
    <div className="wrap fade">
      <h2 className="gold">GOLD FIT boshqaruv</h2>
      {d.user.must_change && <div className="card bad">Xavfsizlik uchun "Sozlama" bo'limida login va parolni o'zgartiring.</div>}

      {tab === "clients" && (
        <>
          {isOwner && (
            <div className="card">
              <b>Yangi mijoz</b>
              <In f={f} setF={setF} k="first_name" ph="Ism *" /><In f={f} setF={setF} k="last_name" ph="Familiya" />
              <In f={f} setF={setF} k="phone" ph="Telefon raqami *" type="tel" />
              <In f={f} setF={setF} k="login" ph="Login *" /><In f={f} setF={setF} k="password" ph="Parol *" />
              <In f={f} setF={setF} k="monthly_fee" ph="Oylik to'lov (so'm)" type="number" />
              <In f={f} setF={setF} k="days" ph="Necha kunlik (masalan 30)" type="number" />
              <button className="btn" onClick={async () => { const r = await act({ action: "addClient", ...f }); if (r.ok) setF({}); }}>Mijozni qo'shish</button>
            </div>
          )}
          {isOwner && <div className="row" style={{ marginBottom: 8 }}><span className="mut">To'lov muddati (kun):</span><input style={{ width: 80, margin: 0 }} type="number" value={payDays} onChange={(x) => setPayDays(x.target.value)} /></div>}
          {o.clients.map((c) => (
            <div className="card" key={c.id}>
              <div className="row between"><b>{name(c)}</b><span className={"tag " + (c.blocked ? "off" : "on")}>{c.blocked ? "Bloklangan" : "Faol"}</span></div>
              <div className="mut">{c.phone} · login: {c.login}{c.tg_username ? " · @" + c.tg_username : ""}</div>
              <div className="mut">To'langan: {c.paid_until || "—"} · Oxirgi kelgan: {c.last_visit ? since(c.last_visit) + " kun oldin" : "hali kelmagan"}</div>
              {isOwner && (
                <div className="row" style={{ marginTop: 8 }}>
                  <button className="btn sm" onClick={() => act({ action: "pay", id: c.id, amount: c.monthly_fee, days: payDays }, "✅ To'lov yozildi")}>+{payDays} kun to'lov</button>
                  <button className={"btn sm " + (c.blocked ? "" : "red")} onClick={() => act({ action: "block", id: c.id, blocked: !c.blocked })}>{c.blocked ? "Blokdan ochish" : "Bloklash"}</button>
                </div>
              )}
            </div>
          ))}
        </>
      )}

      {tab === "att" && (
        <>
          <h3>Bugun kelganlar ({o.visits.length})</h3>
          {o.visits.length === 0 && <p className="mut">Bugun hali hech kim kelmagan</p>}
          {o.visits.map((v, i) => <div className="card row between" key={i}><span>{name(v.users)}</span><span className="mut">{new Date(v.at).toLocaleTimeString("uz-UZ", { hour: "2-digit", minute: "2-digit" })}</span></div>)}
          <h3 style={{ marginTop: 16 }}>Uzoq kelmaganlar</h3>
          <p className="mut">{s.auto_block ? `${s.absent_days} kun kelmaganlar avtomatik bloklanadi` : "Avto-blok o'chirilgan"}</p>
          {absent.length === 0 && <p className="mut">Hamma yaqinda kelgan</p>}
          {absent.map(({ c, n }) => <div className="card row between" key={c.id}><span>{name(c)}</span><span className={n >= s.absent_days ? "bad" : "mut"}>{n} kun</span></div>)}
        </>
      )}

      {tab === "shop" && isOwner && (
        <>
          <div className="card row between"><b>Do'kon mijozlarga ko'rinsin</b><button className={"switch " + (s.store_enabled ? "on" : "")} onClick={() => set("store_enabled", !s.store_enabled)} /></div>
          <div className="card">
            <b>Mahsulot qo'shish</b>
            <In f={pf} setF={setPf} k="name" ph="Nomi *" /><In f={pf} setF={setPf} k="price" ph="Narxi (so'm)" type="number" />
            <In f={pf} setF={setPf} k="stock" ph="Ombordagi soni" type="number" /><In f={pf} setF={setPf} k="category" ph="Kategoriya" />
            <In f={pf} setF={setPf} k="image_url" ph="Rasm havolasi (URL)" />
            <button className="btn" onClick={async () => { const r = await act({ action: "saveProduct", ...pf }); if (r.ok) setPf({}); }}>Qo'shish</button>
          </div>
          {o.products.map((p) => (
            <div className="card" key={p.id}>
              <div className="row between"><b>{p.name}</b><span className={p.stock > 0 ? "mut" : "bad"}>{p.stock > 0 ? `Ombor: ${p.stock}` : "Qolmadi"}</span></div>
              <div className="mut">{p.category} · {p.price.toLocaleString()} so'm</div>
              <div className="row" style={{ marginTop: 8 }}>
                <button className="btn sm" onClick={() => act({ action: "saveProduct", ...p, stock: p.stock + 10 }, "✅ +10 qo'shildi")}>+10 ombor</button>
                <button className="btn ghost sm" onClick={() => act({ action: "saveProduct", ...p, active: !p.active })}>{p.active ? "Yashirish" : "Ko'rsatish"}</button>
                <button className="btn red sm" onClick={() => act({ action: "delProduct", id: p.id }, "O'chirildi")}>O'chirish</button>
              </div>
            </div>
          ))}
        </>
      )}

      {tab === "msg" && isOwner && (
        <div className="card">
          <b>Bildirishnoma yuborish</b>
          <select value={nf.target} onChange={(x) => setNf({ ...nf, target: x.target.value })}>
            <option value="all">Hammaga</option><option value="unpaid">To'lamaganlarga</option>
            {o.clients.map((c) => <option key={c.id} value={c.id}>{name(c)} ({c.phone})</option>)}
          </select>
          <In f={nf} setF={setNf} k="title" ph="Sarlavha" />
          <textarea rows={4} placeholder="Xabar matni" value={nf.body || ""} onChange={(x) => setNf({ ...nf, body: x.target.value })} />
          <label className="row mut"><input type="checkbox" style={{ width: 20, margin: 0 }} checked={!!nf.silent} onChange={(x) => setNf({ ...nf, silent: x.target.checked })} /> Ovozsiz yuborish</label>
          <button className="btn" style={{ marginTop: 8 }} onClick={async () => { const r = await act({ action: "notify", ...nf }, "✅ Yuborildi"); if (r.ok) setNf({ target: "all" }); }}>Yuborish</button>
        </div>
      )}

      {tab === "set" && isOwner && (
        <>
          <div className="card">
            <b>Telegram bot</b>
            {s.bot_username ? <div className="good" style={{ margin: "6px 0" }}>✅ Ulangan: <a href={"https://t.me/" + s.bot_username} style={{ color: "inherit" }}>@{s.bot_username}</a></div> : <p className="mut">Bot hali ulanmagan. @BotFather → /newbot orqali bot oching va tokenini shu yerga yozing.</p>}
            <In f={bf} setF={setBf} k="token" ph="Bot tokeni (123456:AAH...)" />
            <button className="btn" disabled={!bf.token} onClick={async () => { const r = await act({ action: "connectBot", token: bf.token }, "✅ Bot ulandi!"); if (r.ok) setBf({}); }}>{s.bot_username ? "Tokenni almashtirish" : "Botni ulash"}</button>
            {s.bot_username && <button className="btn red" style={{ marginTop: 8 }} onClick={() => act({ action: "disconnectBot" }, "Bot uzildi")}>Botni uzish</button>}
          </div>
          <div className="card">
            <b>Ilova dizayni</b>
            <select value={s.theme} onChange={(x) => set("theme", x.target.value)}>
              <option value="gold">Oltin (asosiy)</option><option value="fire">Olov</option><option value="ice">Muz</option><option value="forest">Yashil</option>
            </select>
            <select value={s.season} onChange={(x) => set("season", x.target.value)}>
              <option value="none">Fasl effekti yo'q</option><option value="winter">❄ Qish (qor)</option><option value="autumn">🍂 Kuz (barglar)</option><option value="spring">🌸 Bahor</option>
            </select>
          </div>
          <div className="card">
            <b>Avtomatik bloklash</b>
            <div className="row between" style={{ margin: "8px 0" }}><span>Kelmaganlarni bloklash</span><button className={"switch " + (s.auto_block ? "on" : "")} onClick={() => set("auto_block", !s.auto_block)} /></div>
            <div className="mut">Necha kun kelmasa bloklansin</div>
            <input type="number" defaultValue={s.absent_days} onBlur={(x) => set("absent_days", +x.target.value || 10)} />
            <div className="mut">QR skanerlangach do'kon necha soat ochiq</div>
            <input type="number" defaultValue={s.checkin_hours} onBlur={(x) => set("checkin_hours", +x.target.value || 3)} />
          </div>
          <div className="card">
            <b>Kirish ma'lumotlarini o'zgartirish</b>
            <In f={cf} setF={setCf} k="login" ph="Yangi login" /><In f={cf} setF={setCf} k="password" ph="Yangi parol (kamida 6 belgi)" type="password" />
            <button className="btn" onClick={async () => { const r = await act({ action: "changeCreds", ...cf }); if (r.ok) setCf({}); }}>Saqlash</button>
          </div>
          <div className="card">
            <b>Bot foydalanuvchilari ({o.botUsers.length})</b>
            {o.botUsers.map((b) => (
              <div className="row between" key={b.tg_id} style={{ marginTop: 8 }}>
                <div><div>{b.first_name || "—"} {b.username ? "@" + b.username : ""}</div><div className="mut">ID {b.tg_id} · {b.phone || "raqamsiz"}</div></div>
                <button className={"btn sm " + (b.blocked ? "" : "red")} onClick={() => act({ action: "blockBot", tg_id: b.tg_id, blocked: !b.blocked })}>{b.blocked ? "Ochish" : "Bloklash"}</button>
              </div>
            ))}
          </div>
          <button className="btn ghost" onClick={async () => { await api("/api/me", { logout: true }); reload(); }}>Hisobdan chiqish</button>
        </>
      )}
      <Tabs tabs={isOwner ? tabs : tabs.slice(0, 2)} tab={tab} setTab={setTab} />
    </div>
  );
}
