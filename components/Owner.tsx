// @ts-nocheck
"use client";
import { useEffect, useState } from "react";
import { PLANS, planOf, TRAINER_FEE, GYM_PLANS } from "@/lib/plans";
import { THEMES, HOLIDAY_THEMES } from "@/lib/themes";
import { fmt, money, MUSCLES, LockSwitch, TG, api, bus, say, today, since, name, Ic, PlanIc, Btn, Switch, Head, In, Tabs, Stat, Pick, QrLive, downloadCsv, downloadJson, pkSupported, pkEnroll, sfx, soundOn, setSound } from "./ui";

const Row = ({ title, sub, children }) => (
  <div className="row between" style={{ margin: "10px 0" }}><div><b>{title}</b>{sub && <div className="mut">{sub}</div>}</div>{children}</div>
);

export default function Owner({ d, reload, th }) {
  const [tab, setTab] = useState("home");
  const [o, setO] = useState(null);
  const [f, setF] = useState({}), [pf, setPf] = useState({}), [nf, setNf] = useState({ target: "all" }), [cf, setCf] = useState({}), [bf, setBf] = useState({});
  const [payDays, setPayDays] = useState(0), [showAll, setShowAll] = useState(false), [showForm, setShowForm] = useState(false), [q, setQ] = useState("");
  const [busy, setBusy] = useState(false), [sup, setSup] = useState(false);
  const [sel, setSel] = useState([]), [ac, setAc] = useState(""), [an, setAn] = useState(""), [msgTab, setMsgTab] = useState("now"), [sm, setSm] = useState({ target: "all", repeat: "none" }), [pl, setPl] = useState(""), [hist, setHist] = useState(null), [hr, setHr] = useState("day"), [hd, setHd] = useState(today()), [mi, setMi] = useState(""), [ef, setEf] = useState({}), [eg, setEg] = useState("");
  const [sec, setSec] = useState(null), [bk, setBk] = useState(false), [rf, setRf] = useState({}), [snd, setSnd] = useState(true), [rmsg, setRmsg] = useState("");
  const s = d.settings, isSuper = d.user.role === "owner", isOwner = isSuper || d.user.role === "manager";
  const ld = async () => setO(await api("/api/owner"));
  useEffect(() => { ld(); setSup(pkSupported()); setSnd(soundOn()); }, []);
  const loadHist = async () => setHist(await api(`/api/owner?history=${hr}&date=${hd}`));
  useEffect(() => { if (tab === "att") loadHist(); }, [tab, hr, hd]);
  const manual = async (c, out, num) => {
    setBusy(true);
    let r = await api("/api/owner", { action: out ? "manualOut" : "manualIn", id: c.id, locker: num || undefined });
    if (!out && r.needForce) {
      setBusy(false);
      if (!confirm(`${r.error}. Baribir zalga kirgizamizmi?`)) return;
      setBusy(true);
      r = await api("/api/owner", { action: "manualIn", id: c.id, force: true, locker: num || undefined });
    }
    setBusy(false);
    sfx(r.ok ? "ok" : "bad");
    say(r.ok ? (out ? `${name(c)} zaldan chiqdi` : r.locker ? `${name(c)} zalga kirdi. Shkaf №${r.locker} berildi` : `${name(c)} zalga kirdi, lekin bo'sh shkaf qolmadi`) : r.error);
    await ld();
    if (tab === "att") loadHist();
  };
  const act = async (body, msg) => {
    setBusy(true);
    const r = await api("/api/owner", body);
    setBusy(false);
    say(r.ok ? msg || "Saqlandi" : r.error);
    sfx(r.ok ? "ok" : "bad");
    await ld();
    if (r.ok && ["setSetting", "changeCreds", "restart"].includes(body.action)) reload();
    return r;
  };
  const set = (key, value) => act({ action: "setSetting", key, value }, "Sozlama saqlandi");
  if (!o) return <div className="wrap"><div className="topbar" /><p className="mut">Yuklanmoqda…</p></div>;

  if (d.user.must_change) return (
    <div className="wrap fade">
      <Head icon="shield" title="Xavfsizlik" sub="Avval login va parolni o'zgartiring" />
      <div className="card">
        <p className="mut">Standart parol hammaga ma'lum. Yangi login va kamida 6 belgili parol yozing.</p>
        <In f={cf} setF={setCf} k="login" ph="Yangi login" />
        <In f={cf} setF={setCf} k="password" ph="Yangi parol (kamida 6 belgi)" type="password" />
        <Btn icon="lock" onClick={async () => { const r = await act({ action: "changeCreds", ...cf }); if (r.ok) setCf({}); }}>Saqlash</Btn>
      </div>
    </div>
  );

  const trainers = (o.staff || []).filter((x) => x.role === "trainer");
  const managers = (o.staff || []).filter((x) => x.role === "manager");
  const lkOf = Object.fromEntries((o.lockers || []).filter((l) => l.user_id).map((l) => [l.user_id, l.num]));
  const inGym = (c) => c.checked_in_until && new Date(c.checked_in_until) > new Date();
  const gymNow = o.clients.filter(inGym);
  const isActive = (c) => !c.blocked && c.paid_until && c.paid_until >= today();
  const actives = o.clients.filter(isActive);
  const soon = o.clients.filter((c) => !c.blocked && c.paid_until && c.paid_until >= today() && since(c.paid_until) >= -3);
  const absent = o.clients.filter((c) => !c.blocked).map((c) => ({ c, n: since(c.last_visit ?? c.created_at) })).sort((a, b) => b.n - a.n).filter((x) => x.n >= 3);
  const lockers = o.lockers || [];
  const busyL = lockers.filter((l) => l.user_id).length;
  const T = isOwner
    ? [["home", "home", "Bosh"], ["clients", "users", "Mijozlar"], ["table", "table", "Jadval"], ["att", "check", "Davomat"], ["lockers", "locker", "Shkaflar"], ["shop", "cart", "Do'kon"], ["exercises", "dumbbell", "Mashq"], ["msg", "bell", "Xabar"], ...(isSuper ? [["bot", "bot", "Bot"], ["set", "sliders", "Sozlama"]] : [])]
    : [["clients", "users", "Mijozlar"], ["att", "check", "Davomat"], ["exercises", "dumbbell", "Mashq"]];
  const cur = isOwner ? (["bot", "set"].includes(tab) && !isSuper ? "home" : tab) : ["clients", "att", "exercises"].includes(tab) ? tab : "clients";
  const mon = today().slice(0, 7);

  return (
    <div className={"wrap" + (busy ? " busy" : "")}>
      {busy && <div className="topbar" />}
      <div className="row between" style={{ marginBottom: 8 }}>
        <div className="row"><img src="/logo.jpeg" alt="" width="40" height="40" style={{ borderRadius: "50%" }} /><h2 className="gold" style={{ margin: 0, letterSpacing: 3 }}>GOLD FIT</h2></div>
        <div className="row" style={{ gap: 8 }}>
          {isSuper && <Btn icon="sliders" cls="sm" onClick={() => { setSec(null); setTab("set"); window.scrollTo({ top: 0 }); }}>Sozlama</Btn>}
          <Btn icon="logout" cls="ghost sm" onClick={() => bus.logout()}>{""}</Btn>
        </div>
      </div>
      {th.banner && <div className="banner">{th.banner}</div>}

      {cur === "home" && (
        <div className="fade">
          <Head icon="home" title="Bosh panel" sub="Zalning bugungi holati" />
          <div className="stats four">
            <Stat icon="users" n={actives.length} label="faol a'zo" />
            <Stat icon="check" n={o.visits.length} label="bugun keldi" />
            <Stat icon="wallet" text={money(o.income || 0)} label="oy tushumi" />
            <Stat icon="locker" n={s.lockers_enabled ? busyL : 0} label={s.lockers_enabled ? `band shkaf / ${lockers.length}` : "shkaf o'chiq"} />
          </div>
          <div className="card">
            <div className="row" style={{ marginBottom: 12 }}><Ic n="chart" s={22} /><b>Tariflar bo'yicha a'zolar</b></div>
            <div className="bars">
              {Object.values(PLANS).map((p) => { const n = actives.filter((c) => (c.plan || "monthly") === p.id).length; return (
                <div className="bar2" key={p.id}><span className="t"><PlanIc id={p.id} />{p.name}</span><span className="b"><i style={{ width: (actives.length ? (n / actives.length) * 100 : 0) + "%" }} /></span><b>{n}</b></div>
              ); })}
            </div>
          </div>
          <div className="card">
            <div className="row" style={{ marginBottom: 12 }}><Ic n="flame" s={22} /><b>Gavjum soatlar (shu oy)</b></div>
            <div className="hours">
              {Array.from({ length: 18 }, (_, i) => i + 6).map((h) => {
                const n = o.hours?.[h] || 0, mx = Math.max(1, ...(o.hours || [1]));
                return <div key={h} className="hb"><i style={{ height: Math.max(4, (n / mx) * 88) + "%" }} title={n + " ta"} /><span>{h}</span></div>;
              })}
            </div>
            <p className="mut" style={{ margin: "8px 0 0" }}>Soat bo'yicha kelishlar soni. Eng baland ustun: eng gavjum vaqt.</p>
          </div>
          <div className="card">
            <div className="row" style={{ marginBottom: 10 }}><Ic n="clock" s={22} /><b>3 kunda obunasi tugaydi ({soon.length})</b></div>
            {soon.length === 0 && <p className="mut">Hozircha yo'q</p>}
            {soon.map((c) => (
              <div className="row between" key={c.id} style={{ marginBottom: 8 }}>
                <div><div>{name(c)}</div><div className="mut">{c.paid_until} gacha</div></div>
                {isOwner && <Btn icon="send" cls="sm" onClick={() => act({ action: "notify", target: c.id, title: "Obuna eslatmasi", body: `Obunangiz ${c.paid_until} da tugaydi. Zalda to'lovni amalga oshiring.` }, "Eslatma yuborildi")}>Eslatma</Btn>}
              </div>
            ))}
          </div>
          <div className="row">
            <Btn icon="plus" onClick={() => { setTab("clients"); setShowForm(true); }}>Yangi mijoz</Btn>
            <Btn icon="download" cls="ghost" onClick={() => setTab("table")}>Oylik jadval</Btn>
          </div>
        </div>
      )}

      {cur === "clients" && (
        <div className="fade">
          <Head icon="users" title="Mijozlar" sub={`${o.clients.length} ta a'zo`} right={isOwner && <Btn icon={showForm ? "x" : "plus"} cls="sm" onClick={() => setShowForm(!showForm)}>{showForm ? "Yopish" : "Yangi"}</Btn>} />
          {isOwner && showForm && (
            <div className="seg" style={{ marginBottom: 12 }}>
              {[["client", "Mijoz"], ["trainer", "Trener"], ...(isSuper ? [["manager", "Zal egasi"]] : [])].map(([k, t]) => <button key={k} className={(f.type || "client") === k ? "on" : ""} onClick={() => setF({ ...f, type: k })}>{t}</button>)}
            </div>
          )}
          {isOwner && showForm && (f.type === "trainer" || f.type === "manager") && (
            <div className="card">
              <b>{f.type === "manager" ? "Yangi zal egasi" : "Yangi trener"}</b>
              <p className="mut">{f.type === "manager" ? "Zal egasi mijozlar, davomat, shkaf, do'kon va xabarlarni boshqaradi. Bot va sozlamalar faqat sizda qoladi." : "Trener faqat o'ziga biriktirilgan mijozlarni va ularning davomatini ko'radi."}</p>
              <In f={f} setF={setF} k="first_name" ph="Ism *" /><In f={f} setF={setF} k="last_name" ph="Familiya" />
              <In f={f} setF={setF} k="phone" ph="Telefon raqami" type="tel" />
              <In f={f} setF={setF} k="login" ph="Login *" /><In f={f} setF={setF} k="password" ph="Parol * (kamida 6 belgi)" />
              <Btn icon="plus" onClick={async () => { const r = await act({ action: "addStaff", role: f.type, ...f }, f.type === "manager" ? "Zal egasi qo'shildi" : "Trener qo'shildi"); if (r.ok) { setF({}); setShowForm(false); } }}>{f.type === "manager" ? "Zal egasini qo'shish" : "Trenerni qo'shish"}</Btn>
            </div>
          )}
          {isOwner && showForm && (f.type || "client") === "client" && (
            <div className="card">
              <In f={f} setF={setF} k="first_name" ph="Ism *" /><In f={f} setF={setF} k="last_name" ph="Familiya" />
              <In f={f} setF={setF} k="phone" ph="Telefon raqami *" type="tel" />
              <In f={f} setF={setF} k="login" ph="Login *" /><In f={f} setF={setF} k="password" ph="Parol *" />
              <div className="mut">Zal tarifi</div>
              <select value={f.plan || "monthly"} onChange={(x) => setF({ ...f, plan: x.target.value })}>
                {GYM_PLANS.map((id) => PLANS[id]).map((p) => <option key={p.id} value={p.id}>{p.name} — {p.price.toLocaleString()} so'm / {p.days} kun</option>)}
              </select>
              <In f={f} setF={setF} k="gym_fee" ph={`Zal puli (bo'sh = ${planOf(f.plan || "monthly").price.toLocaleString()} so'm)`} type="number" />
              <Row title="Trener bilan" sub="Trener puli zal pulidan alohida hisoblanadi"><Switch on={!!f.trainer} onClick={() => setF({ ...f, trainer: !f.trainer })} /></Row>
              {f.trainer && (<>
                {trainers.length > 0
                  ? <select value={f.trainer_id || ""} onChange={(x) => setF({ ...f, trainer_id: x.target.value })}><option value="">Trenerni tanlang…</option>{trainers.map((t) => <option key={t.id} value={t.id}>{name(t)}</option>)}</select>
                  : <In f={f} setF={setF} k="trainer_name" ph="Trener ismi (ixtiyoriy)" />}<In f={f} setF={setF} k="trainer_fee" ph={`Trener puli (bo'sh = ${TRAINER_FEE.toLocaleString()} so'm)`} type="number" /></>)}
              {(() => { const g = +f.gym_fee || planOf(f.plan || "monthly").price, t = f.trainer ? +f.trainer_fee || TRAINER_FEE : 0; return (
                <div className="total"><div className="mut">Zal: {g.toLocaleString()}{f.trainer ? ` + Trener: ${t.toLocaleString()}` : ""}<br />JAMI to'lov</div><b>{(g + t).toLocaleString()} so'm</b></div>
              ); })()}
              <In f={f} setF={setF} k="card_uid" ph="Braslet/karta raqami (ixtiyoriy)" />
              <Btn icon="plus" onClick={async () => { const r = await act({ action: "addClient", ...f }, "Mijoz qo'shildi"); if (r.ok) { setF({}); setShowForm(false); } }}>Mijozni qo'shish</Btn>
            </div>
          )}
          {isOwner && trainers.length > 0 && (
            <div className="card">
              <div className="row" style={{ marginBottom: 8 }}><Ic n="dumbbell" s={20} /><b>Trenerlar ({trainers.length})</b></div>
              {trainers.map((t) => (
                <div className="row between" key={t.id} style={{ marginBottom: 8 }}>
                  <div><div>{name(t)}</div><div className="mut">{o.clients.filter((c) => c.trainer_id === t.id).length} ta mijoz · login: {t.login}</div></div>
                  <Btn icon="trash" cls="red sm" onClick={() => confirm(`${name(t)} o'chirilsinmi?`) && act({ action: "delStaff", id: t.id }, "Trener o'chirildi")}>{""}</Btn>
                </div>
              ))}
            </div>
          )}
          <input placeholder="Qidirish: ism, telefon, username" value={q} onChange={(x) => setQ(x.target.value)} />
          {isOwner && <div className="row" style={{ marginBottom: 10 }}><span className="mut">Kun soni (0 = tarif bo'yicha):</span><input style={{ width: 80, margin: 0 }} type="number" value={payDays} onChange={(x) => setPayDays(x.target.value)} /></div>}
          {o.clients.filter((c) => !q || [name(c), c.phone, c.tg_username, c.login].join(" ").toLowerCase().includes(q.toLowerCase())).map((c) => (
            <div className="card" key={c.id}>
              <div className="row between"><b>{name(c)}</b><div className="row">
                <span className="tag"><PlanIc id={c.plan || "monthly"} />{planOf(c.plan).name}</span>
                {c.trainer && <span className="tag"><PlanIc id="trainer" />Trener</span>}
                {inGym(c) ? <span className="tag on">Zalda{lkOf[c.id] ? ` · №${lkOf[c.id]}` : ""}</span> : <span className={"tag " + (c.blocked ? "off" : "on")}>{c.blocked ? "Bloklangan" : "Faol"}</span>}
              </div></div>
              <div className="mut">{c.phone} · login: {c.login}{c.tg_username ? " · @" + c.tg_username : ""}</div>
              <div className="mut">To'langan: {c.paid_until || "—"} · Oxirgi kelgan: {c.last_visit ? since(c.last_visit) + " kun oldin" : "hali kelmagan"}</div>
              {isOwner && (() => { const g = c.gym_fee || planOf(c.plan).price, t = c.trainer ? c.trainer_fee || TRAINER_FEE : 0, tt = o.totals?.[c.id] || { gym: 0, trainer: 0, coins: 0, shop: 0 }; return (
                <>
                  <div className="mut">Joriy tarif: zal {fmt(g)}{c.trainer ? ` + trener${c.trainer_name ? " (" + c.trainer_name + ")" : ""} ${fmt(t)}` : ""} = <b className="gold">{money(g + t)}</b></div>
                  <div className="mut">Umumiy hisob: zal {fmt(tt.gym)} · trener {fmt(tt.trainer)} · do'kon {fmt(tt.shop)} · tanga {fmt(tt.coins)} = <b className="gold">{money(tt.gym + tt.trainer + tt.shop + tt.coins)}</b></div>
                  <div className="mut">Tanga balansi: <b>{c.coins || 0}</b></div>
                </>
              ); })()}
              {isOwner && (
                <>
                  <div className="row" style={{ marginTop: 10 }}>
                    {inGym(c)
                      ? <Btn icon="exit" cls="dark sm" onClick={() => manual(c, true)}>Zaldan chiqdi</Btn>
                      : <Btn icon="enter" cls="sm" onClick={() => manual(c, false)}>Zalga kirdi</Btn>}
                    <Btn icon="wallet" cls="sm" onClick={() => act({ action: "pay", id: c.id, plan: c.plan, days: +payDays || undefined }, "To'lov yozildi")}>To'lov: {((c.gym_fee || planOf(c.plan).price) + (c.trainer ? c.trainer_fee || TRAINER_FEE : 0)).toLocaleString()}</Btn>
                  </div>
                  <div className="row" style={{ marginTop: 8 }}>
                    <Btn icon="coin" cls="ghost sm" onClick={() => { const v = prompt(`${name(c)} naqd necha so'm berdi? (1 tanga = ${s.coin_rate || 1000} so'm)`); const n = +String(v || "").replace(/\D/g, ""); if (n) act({ action: "topup", id: c.id, cash: n }, "Tanga qo'shildi"); }}>Tanga solish</Btn>
                  </div>
                  <div className="row" style={{ marginTop: 8 }}>
                    {c.trainer && trainers.length > 0 && (
                      <select style={{ margin: 0, minHeight: 46, flex: "1 1 100%" }} value={c.trainer_id || ""} onChange={(x) => act({ action: "setTrainer", id: c.id, trainer: true, trainer_id: x.target.value || null }, "Trener biriktirildi")}>
                        <option value="">Trenerni tanlang…</option>{trainers.map((t) => <option key={t.id} value={t.id}>{name(t)}</option>)}
                      </select>
                    )}
                    <Btn icon="dumbbell" cls="ghost sm" onClick={() => act({ action: "setTrainer", id: c.id, trainer: !c.trainer, charge: !c.trainer && isActive(c) && confirm("Trener puli hozir to'lansinmi?") }, c.trainer ? "Trener olib tashlandi" : "Trener qo'shildi")}>{c.trainer ? "Trenersiz qilish" : "Trener qo'shish"}</Btn>
                    <Btn icon={c.blocked ? "check2" : "lock"} cls={"sm " + (c.blocked ? "dark" : "red")} onClick={() => act({ action: "block", id: c.id, blocked: !c.blocked })}>{c.blocked ? "Ochish" : "Bloklash"}</Btn>
                  </div>
                </>
              )}
            </div>
          ))}
        </div>
      )}

      {cur === "table" && isOwner && (() => {
        const list = o.clients.filter((c) => showAll || isActive(c));
        const sum = list.reduce((a, c) => a + (o.paidMonth?.[c.id] || 0), 0);
        const csv = () => downloadCsv([["F.I.Sh", "Username", "TG ID", "Telefon", "Tarif", "To'lov (oy)", "Amal qiladi", "Davomat (oy)", "Karta"], ...list.map((c) => [name(c), c.tg_username ? "@" + c.tg_username : "", c.tg_id || "", c.phone, planOf(c.plan).name, o.paidMonth?.[c.id] || 0, c.paid_until || "", o.monthVisits?.[c.id] || 0, c.card_uid || ""]), ["", "", "", "", "JAMI", sum, "", "", ""]], `goldfit-${mon}.csv`);
        return (
          <div className="fade">
            <Head icon="table" title="Oylik jadval" sub={mon} right={<Btn icon="download" cls="sm" onClick={csv}>Excel</Btn>} />
            <Row title="Hammasini ko'rsatish" sub="Kelmaganlar va bloklanganlar ham"><Switch on={showAll} onClick={() => setShowAll(!showAll)} /></Row>
            <div className="tbl"><table>
              <thead><tr><th>#</th><th>F.I.Sh</th><th>Username</th><th>TG ID</th><th>Telefon</th><th>Tarif</th><th>To'lov</th><th>Muddat</th><th>Davomat</th><th>Karta</th></tr></thead>
              <tbody>
                {list.map((c, i) => (
                  <tr key={c.id} className={c.blocked ? "dim" : ""}>
                    <td>{i + 1}</td><td>{name(c)}</td><td>{c.tg_username ? "@" + c.tg_username : "—"}</td><td>{c.tg_id || "—"}</td>
                    <td>{c.phone} {c.tg_id ? <span className="good">tasdiqlangan</span> : <span className="mut">kutilmoqda</span>}</td><td>{planOf(c.plan).name}</td>
                    <td>{(o.paidMonth?.[c.id] || 0).toLocaleString()}</td><td>{c.paid_until || "—"}</td><td>{o.monthVisits?.[c.id] || 0} kun</td>
                    <td><input className="cardin" defaultValue={c.card_uid || ""} placeholder="—" onBlur={(x) => x.target.value !== (c.card_uid || "") && act({ action: "setCard", id: c.id, card_uid: x.target.value }, "Karta biriktirildi")} /></td>
                  </tr>
                ))}
                <tr className="sum"><td colSpan={6}>JAMI</td><td>{sum.toLocaleString()}</td><td colSpan={3}></td></tr>
              </tbody>
            </table></div>
            <p className="mut">Telefon Telegram bot orqali tasdiqlanganda "tasdiqlangan" chiqadi. Obunasi tugaganlar jadvaldan avtomatik chiqib ketadi.</p>
          </div>
        );
      })()}

      {cur === "att" && (
        <div className="fade">
          <Head icon="check" title="Davomat" sub="Zalga kirish, kim qaysi shkafda, tarix" />
          {isOwner && (
            <div className="card">
              <b>Qo'lda zalga kirgizish</b>
              <p className="mut">Mijoz QR skaner qila olmasa, siz kirgizasiz. Unga do'kon va shkaf raqami avtomatik ochiladi.</p>
              <select value={mi} onChange={(x) => setMi(x.target.value)}>
                <option value="">Mijozni tanlang…</option>
                {o.clients.filter((c) => !inGym(c)).map((c) => <option key={c.id} value={c.id}>{name(c)} ({c.phone}){isActive(c) ? "" : " — obunasi tugagan"}</option>)}
              </select>
              <select value={pl} onChange={(x) => setPl(x.target.value)}>
                <option value="">Shkaf: avtomatik (birinchi bo'sh)</option>
                {(o.lockers || []).filter((l) => !l.user_id).map((l) => <option key={l.num} value={l.num}>Shkaf №{l.num}</option>)}
              </select>
              <Btn icon="enter" disabled={!mi} onClick={async () => { const c = o.clients.find((x) => x.id === mi); if (c) { await manual(c, false, +pl || undefined); setMi(""); setPl(""); } }}>Zalga kirdi va shkaf berish</Btn>
            </div>
          )}
          <div className="card">
            <div className="row between" style={{ marginBottom: 10 }}><b>Hozir zaldagilar ({gymNow.length})</b></div>
            {gymNow.length === 0 && <p className="mut">Hozir zalda hech kim yo'q</p>}
            {gymNow.map((c) => (
              <div className="hrow" key={c.id}>
                <div className="nm">{name(c)}<small>{planOf(c.plan).name}{c.trainer ? " + trener" : ""} · {new Date(c.checked_in_until).toLocaleTimeString("uz-UZ", { hour: "2-digit", minute: "2-digit" })} gacha</small></div>
                {lkOf[c.id] ? <span className="lkb">№{lkOf[c.id]}</span> : <span className="mut">shkafsiz</span>}
                {isOwner && <Btn icon="exit" cls="dark sm" onClick={() => manual(c, true)}>{""}</Btn>}
              </div>
            ))}
          </div>

          <Head icon="history" title="Davomat tarixi" sub="Kim kelgan, qaysi raqamli braslet/shkafni olgan" />
          <div className="seg">{[["day", "Kunlik"], ["week", "Haftalik"], ["month", "Oylik"]].map(([k, t]) => <button key={k} className={hr === k ? "on" : ""} onClick={() => setHr(k)}>{t}</button>)}</div>
          <input type="date" value={hd} onChange={(x) => setHd(x.target.value || today())} />
          {!hist && <p className="mut">Yuklanmoqda…</p>}
          {hist && (() => {
            const rows = hist.rows || [];
            const dkey = (at) => new Date(+new Date(at) + 5 * 3600e3).toISOString().slice(0, 10);
            const by = {};
            rows.forEach((r) => { (by[dkey(r.at)] = by[dkey(r.at)] || []).push(r); });
            const days = Object.keys(by).sort().reverse();
            const uniq = new Set(rows.map((r) => r.user_id)).size;
            const mx = Math.max(1, ...days.map((k) => by[k].length));
            const M = { qr: "QR", card: "Karta", manual: "Qo'lda" };
            return (
              <>
                <div className="stats">
                  <Stat icon="check" n={rows.length} label="jami kirish" />
                  <Stat icon="users" n={uniq} label="alohida a'zo" />
                  <Stat icon="calendar" n={days.length} label="faol kun" />
                </div>
                {hr !== "day" && days.length > 0 && (
                  <div className="card"><div className="mut">{hist.from} — {hist.to}</div>
                    <div className="dbar">{[...days].reverse().map((k) => <div key={k}><i style={{ height: Math.max(4, (by[k].length / mx) * 100) + "%" }} /><span>{k.slice(8)}</span></div>)}</div>
                  </div>
                )}
                {rows.length === 0 && <p className="mut">Bu davrda hech kim kelmagan</p>}
                {days.map((k) => (
                  <div key={k}>
                    <div className="dayh"><span>{k}</span><span className="gold">{by[k].length} ta kirish</span></div>
                    {by[k].map((r) => (
                      <div className="hrow" key={r.id}>
                        <span className="tm">{new Date(r.at).toLocaleTimeString("uz-UZ", { hour: "2-digit", minute: "2-digit", timeZone: "Asia/Tashkent" })}</span>
                        <div className="nm">{name(r.users) || "—"}<small>{planOf(r.users?.plan).name}{r.users?.trainer ? " + trener" : ""}{r.method ? " · " + (M[r.method] || r.method) : ""}</small></div>
                        {r.locker ? <span className="lkb">№{r.locker}</span> : <span className="mut">—</span>}
                      </div>
                    ))}
                  </div>
                ))}
              </>
            );
          })()}

          <div className="card" style={{ marginTop: 16 }}>
            <b>Zal kirishi uchun QR kod</b>
            <p className="mut">Kod har 30 soniyada yangilanadi. Mijozlar ilovadagi "Zalga kirdim" tugmasi bilan shuni skanerlaydi.</p>
            <QrLive />
            {o.displayUrl && (
              <div className="row" style={{ marginTop: 10 }}>
                <Btn icon="door" cls="ghost sm" onClick={() => (TG()?.openLink ? TG().openLink(o.displayUrl) : window.open(o.displayUrl, "_blank"))}>Zal ekrani</Btn>
                <Btn icon="copy" cls="ghost sm" onClick={() => { try { navigator.clipboard?.writeText(o.displayUrl); } catch (e) {} say("Havola nusxalandi"); }}>Havola</Btn>
              </div>
            )}
          </div>
          <h3 style={{ marginTop: 16 }}>Uzoq kelmaganlar</h3>
          <p className="mut">{s.auto_block ? `${s.absent_days} kun kelmaganlar avtomatik bloklanadi` : "Avto-blok o'chirilgan"}</p>
          {absent.length === 0 && <p className="mut">Hamma yaqinda kelgan</p>}
          {absent.map(({ c, n }) => <div className="card row between" key={c.id}><span>{name(c)}</span><span className={n >= s.absent_days ? "bad" : "mut"}>{n} kun</span></div>)}
        </div>
      )}

      {cur === "lockers" && isOwner && (
        <div className="fade">
          <Head icon="locker" title="Shkaflar" sub={s.lockers_enabled ? `${busyL} ta band, ${lockers.length - busyL} ta bo'sh` : "Avto-shkaf o'chiq"} />
          <div className="card">
            <Row title="Avto-shkaf tayinlash" sub="Zalga kirganda bo'sh raqam beriladi, zal vaqti tugagach bo'shaydi"><Switch on={s.lockers_enabled} onClick={() => set("lockers_enabled", !s.lockers_enabled)} /></Row>
            <div className="mut">Shkaflar soni</div>
            <input type="number" defaultValue={s.lockers_count} onBlur={(x) => +x.target.value !== s.lockers_count && set("lockers_count", +x.target.value || 100)} />
            <div className="mut">Shkaf muddati "QR skanerlangach necha soat" sozlamasiga bog'liq: {s.checkin_hours} soat.</div>
            {s.lockers_enabled && busyL > 0 && <Btn icon="restart" cls="red" onClick={() => confirm("Hamma shkafni bo'shatamizmi?") && act({ action: "releaseAll" }, "Hamma shkaf bo'shatildi")}>Hammasini bo'shatish</Btn>}
          </div>
          {s.lockers_enabled && (
            <div className="card">
              <div className="lgrid">
                {lockers.map((l) => (
                  <div key={l.num} className={"lk" + (l.user_id ? " busy2" : "")} onClick={() => l.user_id && confirm(`${l.num}-shkafni bo'shatamizmi?`) && act({ action: "releaseLocker", num: l.num }, "Bo'shatildi")}>
                    {l.num}{l.user_id && <small>{l.users?.first_name || ""}</small>}
                  </div>
                ))}
              </div>
              <p className="mut">Band shkafni bosib qo'lda bo'shatish mumkin.</p>
            </div>
          )}
          <div className="card"><b>Haqiqiy qulfni ochish</b><p className="mut">Raqam ilovada avtomatik beriladi. Shkaf qulfini elektron ochish uchun qulf kontrolleri kerak: u <code>POST /api/door</code> javobidagi <code>locker</code> raqamini o'qib, shu shkafni ochadi.</p></div>
        </div>
      )}

      {cur === "shop" && isOwner && (
        <div className="fade">
          <Head icon="cart" title="Do'kon" sub="Mahsulotlar va xaridlar" />
          <div className="card"><Row title="Do'kon mijozlarga ko'rinsin"><Switch on={s.store_enabled} onClick={() => set("store_enabled", !s.store_enabled)} /></Row></div>
          <div className="card">
            <b>Tanga (ball) tizimi</b>
            <p className="mut">Mijoz har kelgan kuni tanga oladi. Tangani do'kondan mahsulot olishda ishlatadi. Naqd pul bergan mijozga "Mijozlar" bo'limidan tanga solasiz.</p>
            <div className="mut">1 tanga necha so'm</div>
            <input type="number" defaultValue={s.coin_rate} onBlur={(x) => +x.target.value !== s.coin_rate && set("coin_rate", +x.target.value || 1000)} />
            <div className="mut">Har kelganiga necha tanga</div>
            <input type="number" defaultValue={s.coin_per_visit} onBlur={(x) => +x.target.value !== s.coin_per_visit && set("coin_per_visit", +x.target.value || 1)} />
          </div>
          <div className="card">
            <b>Mahsulot qo'shish</b>
            <In f={pf} setF={setPf} k="name" ph="Nomi *" /><In f={pf} setF={setPf} k="price" ph="Narxi (so'm)" type="number" />
            <In f={pf} setF={setPf} k="stock" ph="Ombordagi soni" type="number" /><In f={pf} setF={setPf} k="category" ph="Kategoriya" />
            <div className="row" style={{ marginBottom: 10 }}>
              {pf.image_url && <img src={pf.image_url} alt="" style={{ width: 56, height: 56, borderRadius: 12, objectFit: "cover" }} />}
              <Pick onUrl={(u) => setPf({ ...pf, image_url: u })}>Rasm tanlash</Pick>
            </div>
            <Btn icon="plus" onClick={async () => { const r = await act({ action: "saveProduct", ...pf }); if (r.ok) setPf({}); }}>Qo'shish</Btn>
          </div>
          <h3>Kim nima xarid qildi</h3>
          {(o.orders || []).length === 0 && <p className="mut">Hozircha buyurtma yo'q</p>}
          {(o.orders || []).slice(0, 30).map((x) => (
            <div className="card" key={x.id}>
              <div className="row between"><b>{name(x.users) || "—"}</b><span className="gold">{(x.total || 0).toLocaleString()} so'm</span></div>
              <div className="mut">{(x.items || []).map((i) => `${i.name} ×${i.qty}`).join(", ")}</div>
              <div className="mut">{x.users?.phone} · {new Date(x.created_at).toLocaleString("uz-UZ")}</div>
            </div>
          ))}
          <h3 style={{ marginTop: 16 }}>Mahsulotlar</h3>
          {o.products.map((p) => (
            <div className="card" key={p.id}>
              {p.image_url && <img src={p.image_url} alt="" style={{ width: "100%", maxHeight: 150, objectFit: "cover", borderRadius: 12, marginBottom: 8 }} />}
              <div className="row between"><b>{p.name}</b><span className={p.stock > 0 ? "mut" : "bad"}>{p.stock > 0 ? `Ombor: ${p.stock}` : "Qolmadi"}</span></div>
              <div className="mut">{p.category} · {p.price.toLocaleString()} so'm</div>
              <div className="row prod" style={{ marginTop: 10 }}>
                <Btn icon="box" cls="sm" onClick={() => act({ action: "saveProduct", ...p, stock: p.stock + 10 }, "+10 qo'shildi")}>+10</Btn>
                <Pick cls="ghost sm" onUrl={(u) => act({ action: "saveProduct", ...p, image_url: u }, "Rasm yangilandi")}>Rasm</Pick>
                <Btn icon="lock" cls="ghost sm" onClick={() => act({ action: "saveProduct", ...p, active: !p.active })}>{p.active ? "Yashirish" : "Ko'rsatish"}</Btn>
                <Btn icon="trash" cls="red sm" onClick={() => act({ action: "delProduct", id: p.id }, "O'chirildi")}>{""}</Btn>
              </div>
            </div>
          ))}
        </div>
      )}

      {cur === "exercises" && (
        <div className="fade">
          <Head icon="dumbbell" title="Mashqlar" sub={isOwner ? "Kutubxona va mijozga dastur yuborish" : "Mijozlaringizga dastur yuboring"} />
          {isOwner && (
            <div className="card">
              <b>{ef.id ? "Mashqni tahrirlash" : "Yangi mashq"}</b>
              <In f={ef} setF={setEf} k="title" ph="Mashq nomi *" />
              <select value={ef.grp || ""} onChange={(x) => setEf({ ...ef, grp: x.target.value })}>
                <option value="">Kategoriya…</option>
                {["Ko'krak", "Orqa", "Oyoq", "Yelka", "Qo'l", "Press", "Kardio", "Boshqa"].map((g) => <option key={g} value={g}>{g}</option>)}
              </select>
              <div className="mut">Ishlaydigan mushaklar (mushak xaritasida qizil bo'ladi)</div>
              <div className="chips" style={{ marginTop: 8 }}>
                {Object.entries(MUSCLES).map(([k, t]) => { const on = (ef.muscles || []).includes(k); return <button key={k} className={on ? "on" : ""} onClick={() => setEf({ ...ef, muscles: on ? ef.muscles.filter((m) => m !== k) : [...(ef.muscles || []), k] })}>{t}</button>; })}
              </div>
              <div className="row"><input style={{ flex: 1 }} placeholder="Yondashuv" type="number" value={ef.sets || ""} onChange={(x) => setEf({ ...ef, sets: x.target.value })} /><input style={{ flex: 1 }} placeholder="Takror (10-12)" value={ef.reps || ""} onChange={(x) => setEf({ ...ef, reps: x.target.value })} /></div>
              <In f={ef} setF={setEf} k="equipment" ph="Jihoz (shtanga, skameyka…)" />
              <textarea rows={5} placeholder={"Qanday bajariladi: har qadamni yangi qatordan yozing\n1-qadam…\n2-qadam…"} value={ef.steps || ""} onChange={(x) => setEf({ ...ef, steps: x.target.value })} />
              <In f={ef} setF={setEf} k="video_url" ph="Video havolasi (YouTube yoki mp4), ixtiyoriy" />
              <div className="row" style={{ marginBottom: 10 }}>
                {ef.image_url && <img src={ef.image_url} alt="" style={{ width: 56, height: 56, borderRadius: 12, objectFit: "cover" }} />}
                <Pick onUrl={(u) => setEf({ ...ef, image_url: u })}>Rasm tanlash</Pick>
              </div>
              <Btn icon={ef.id ? "check2" : "plus"} onClick={async () => { const r = await act({ action: "saveExercise", ...ef }, ef.id ? "Saqlandi" : "Mashq qo'shildi"); if (r.ok) setEf({}); }}>{ef.id ? "Saqlash" : "Qo'shish"}</Btn>
              {ef.id && <Btn icon="x" cls="ghost" style={{ marginTop: 8 }} onClick={() => setEf({})}>Bekor qilish</Btn>}
            </div>
          )}
          {(o.exercises || []).length === 0 && isOwner && <Btn icon="download" cls="ghost" onClick={() => act({ action: "seedExercises" }, "Standart mashqlar qo'shildi")}>Standart mashqlarni qo'shish (12 ta)</Btn>}

          <div className="card" style={{ marginTop: 12 }}>
            <b>Mijozga mashq yuborish</b>
            <p className="mut">Mashqlarni tanlang va mijozga yuboring. Mijoz ilovada "Mening dasturim"da ko'radi, Telegramga xabar boradi.</p>
            <select value={ac} onChange={(x) => setAc(x.target.value)}>
              <option value="">Mijozni tanlang…</option>
              {o.clients.map((c) => <option key={c.id} value={c.id}>{name(c)} ({c.phone})</option>)}
            </select>
            <div className="chips">{["", ...new Set((o.exercises || []).map((x) => x.grp).filter(Boolean))].map((g) => <button key={g} className={eg === g ? "on" : ""} onClick={() => setEg(g)}>{g || "Hammasi"}</button>)}</div>
            <div className="chips">
              {(o.exercises || []).filter((x) => x.active && (!eg || x.grp === eg)).map((x) => { const on = sel.includes(x.id); return <button key={x.id} className={on ? "on" : ""} onClick={() => setSel(on ? sel.filter((i) => i !== x.id) : [...sel, x.id])}>{x.title}</button>; })}
            </div>
            <textarea rows={2} placeholder="Izoh (masalan: haftasiga 3 marta)" value={an} onChange={(x) => setAn(x.target.value)} />
            <Btn icon="send" disabled={!ac || !sel.length} onClick={async () => { const r = await act({ action: "assignExercises", user_id: ac, exercise_ids: sel, note: an }, "Mashqlar yuborildi"); if (r.ok) { setSel([]); setAn(""); } }}>{sel.length ? `${sel.length} ta mashqni yuborish` : "Mashqlarni tanlang"}</Btn>
          </div>

          <h3>Kutubxona</h3>
          {(o.exercises || []).filter((x) => !eg || x.grp === eg).map((x) => (
            <div className="card ex" key={x.id}>
              {x.image_url && <img src={x.image_url} alt="" />}
              <div style={{ flex: 1 }}>
                <div className="row between"><b>{x.title}</b><span className="tag">{x.grp || "—"}</span></div>
                <div className="mut">{x.sets ? x.sets + " yondashuv" : ""}{x.reps ? " × " + x.reps : ""}{(x.muscles || []).length ? " · " + x.muscles.map((m) => MUSCLES[m] || m).join(", ") : ""}</div>
                {isOwner && (
                  <div className="row" style={{ marginTop: 8 }}>
                    <Btn icon="edit" cls="sm" onClick={() => { setEf({ ...x, muscles: x.muscles || [] }); window.scrollTo({ top: 0 }); }}>{""}</Btn>
                    <Btn icon="lock" cls="ghost sm" onClick={() => act({ action: "saveExercise", ...x, active: !x.active })}>{x.active ? "Yashirish" : "Ko'rsatish"}</Btn>
                    <Btn icon="trash" cls="red sm" onClick={() => confirm("O'chiramizmi?") && act({ action: "delExercise", id: x.id }, "O'chirildi")}>{""}</Btn>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {cur === "msg" && isOwner && (() => {
        const TPL = [
          ["Dam olish kuni", "Zal ish vaqti haqida", "Aziz a'zolarimiz! Bayram munosabati bilan zal ertaga dam oladi. Ko'rishguncha!"],
          ["Yangi aksiya", "Yangi aksiya!", "Shu hafta oylik obunaga chegirma bor. Zalda administratorga murojaat qiling."],
          ["Obuna eslatmasi", "Obuna eslatmasi", "Obuna muddatingiz tugayapti. Uzilib qolmaslik uchun zalda to'lovni amalga oshiring."],
          ["Yangi mahsulot", "Do'konda yangilik", "Zal do'konida yangi mahsulotlar paydo bo'ldi. Ilovadan buyurtma bering!"],
        ];
        const TG_ = [["all", "Hammaga"], ["active", "Faol a'zolar"], ["unpaid", "To'lamaganlar"], ["premium", "Premium"], ["trainer", "Trener bilan"], ["ingym", "Hozir zaldagilar"], ["botall", "Bot foydalanuvchilari ham"]];
        return (
          <div className="fade">
            <Head icon="send" title="Hammaga xabar" sub="Ilovaga va Telegramga yuboriladi" />
            <div className="seg"><button className={msgTab === "now" ? "on" : ""} onClick={() => setMsgTab("now")}>Hozir yuborish</button><button className={msgTab === "auto" ? "on" : ""} onClick={() => setMsgTab("auto")}>Avto va reja</button></div>
            {msgTab === "now" && (<div className="card">
              <b>Kimga</b>
              <div className="chips" style={{ marginTop: 8 }}>{TG_.map(([k, t]) => <button key={k} className={nf.target === k ? "on" : ""} onClick={() => setNf({ ...nf, target: k })}>{t}</button>)}</div>
              <select value={TG_.some(([k]) => k === nf.target) ? "" : nf.target} onChange={(x) => x.target.value && setNf({ ...nf, target: x.target.value })}>
                <option value="">Yoki bitta mijozni tanlang…</option>
                {o.clients.map((c) => <option key={c.id} value={c.id}>{name(c)} ({c.phone})</option>)}
              </select>
              <b>Namunalar</b>
              <div className="chips" style={{ marginTop: 8 }}>{TPL.map(([t, ti, bo]) => <button key={t} onClick={() => setNf({ ...nf, title: ti, body: bo })}>{t}</button>)}</div>
              <In f={nf} setF={setNf} k="title" ph="Sarlavha *" />
              <textarea rows={6} placeholder="Xabar matnini shu yerga yozing…" maxLength={1000} value={nf.body || ""} onChange={(x) => setNf({ ...nf, body: x.target.value })} />
              <div className="mut" style={{ textAlign: "right", marginTop: -6, marginBottom: 8 }}>{(nf.body || "").length}/1000</div>
              <Row title="Ovozsiz yuborish" sub="Telegramda tovush chiqmaydi"><Switch on={!!nf.silent} onClick={() => setNf({ ...nf, silent: !nf.silent })} /></Row>
              <Btn icon="send" disabled={!nf.title} onClick={async () => {
                const who = TG_.find(([k]) => k === nf.target)?.[1] || "tanlangan mijozga";
                if (!confirm(`"${who}" xabar yuboriladi. Davom etamizmi?`)) return;
                const r = await act({ action: "notify", ...nf }, "Yuborildi");
                if (r.ok) { setNf({ target: nf.target }); say(`Yuborildi. Telegramga: ${r.sent || 0} kishi`); }
              }}>Yuborish</Btn>
            </div>)}
            {msgTab === "auto" && (
              <>
                <div className="card">
                  <b>Avtomatik xabar matnlari</b>
                  <p className="mut">Tizim o'zi yuboradi. <code>{"{ism}"}</code> mijoz ismi, <code>{"{kun}"}</code> kunlar soni.</p>
                  <Row title="Obuna tugashi eslatmasi" sub={`${s.remind_days} kun oldin`}><Switch on={s.remind_on !== false} onClick={() => set("remind_on", !(s.remind_on !== false))} /></Row>
                  <textarea rows={3} defaultValue={s.tpl_remind} onBlur={(x) => x.target.value !== s.tpl_remind && set("tpl_remind", x.target.value)} />
                  <Row title="Kelmaganlarga xabar" sub={`${s.absent_msg_days} kun kelmasa`}><Switch on={s.absent_msg_on !== false} onClick={() => set("absent_msg_on", !(s.absent_msg_on !== false))} /></Row>
                  <textarea rows={3} defaultValue={s.tpl_absent} onBlur={(x) => x.target.value !== s.tpl_absent && set("tpl_absent", x.target.value)} />
                  <div className="mut">Necha kun kelmasa yuborilsin</div>
                  <input type="number" defaultValue={s.absent_msg_days} onBlur={(x) => set("absent_msg_days", +x.target.value || 7)} />
                </div>
                <div className="card">
                  <b>Rejalashtirilgan xabar</b>
                  <p className="mut">Xabarni hozir yozib saqlab qo'ying, tizim belgilangan vaqtda o'zi yuboradi.</p>
                  <div className="chips">{TG_.map(([k, t]) => <button key={k} className={sm.target === k ? "on" : ""} onClick={() => setSm({ ...sm, target: k })}>{t}</button>)}</div>
                  <In f={sm} setF={setSm} k="title" ph="Sarlavha *" />
                  <textarea rows={4} placeholder="Xabar matni" value={sm.body || ""} onChange={(x) => setSm({ ...sm, body: x.target.value })} />
                  <div className="mut">Yuborish vaqti (Toshkent)</div>
                  <input type="datetime-local" value={sm.at || ""} onChange={(x) => setSm({ ...sm, at: x.target.value })} />
                  <select value={sm.repeat} onChange={(x) => setSm({ ...sm, repeat: x.target.value })}><option value="none">Bir marta</option><option value="daily">Har kuni</option><option value="weekly">Har hafta</option></select>
                  <Btn icon="clock" disabled={!sm.title || !sm.at} onClick={async () => { const r = await act({ action: "saveScheduled", ...sm, send_at: new Date(sm.at + ":00+05:00").toISOString() }, "Saqlandi. Tizim o'zi yuboradi"); if (r.ok) setSm({ target: "all", repeat: "none" }); }}>Saqlab qo'yish</Btn>
                </div>
                {(o.scheduled || []).map((m) => (
                  <div className="card" key={m.id}>
                    <div className="row between"><b>{m.title}</b><span className={"tag " + (m.sent ? "on" : "")}>{m.sent ? "Yuborilgan" : m.repeat === "daily" ? "Har kuni" : m.repeat === "weekly" ? "Har hafta" : "Kutilmoqda"}</span></div>
                    <div className="mut">{m.body}</div>
                    <div className="row between"><span className="mut">{new Date(m.send_at).toLocaleString("uz-UZ", { timeZone: "Asia/Tashkent" })} · {TG_.find(([k]) => k === m.target)?.[1] || "mijoz"}</span>
                      <Btn icon="trash" cls="red sm" onClick={() => act({ action: "delScheduled", id: m.id }, "O'chirildi")}>{""}</Btn></div>
                  </div>
                ))}
              </>
            )}
          </div>
        );
      })()}

      {cur === "bot" && isSuper && (
        <div className="fade">
          <Head icon="bot" title="Bot sozlamalari" sub={s.bot_username ? "@" + s.bot_username : "Ulanmagan"} />
          <div className="card">
            <b>Ulanish</b>
            {s.bot_username ? <div className="good" style={{ margin: "6px 0" }}>Ulangan: <a href={"https://t.me/" + s.bot_username} style={{ color: "inherit" }}>@{s.bot_username}</a></div> : <p className="mut">@BotFather orqali bot oching va tokenini yozing.</p>}
            <In f={bf} setF={setBf} k="token" ph="Bot tokeni (123456:AAH...)" />
            <Btn icon="bot" disabled={!bf.token} onClick={async () => { const r = await act({ action: "connectBot", token: bf.token }, "Bot ulandi!"); if (r.ok) setBf({}); }}>{s.bot_username ? "Tokenni almashtirish" : "Botni ulash"}</Btn>
            {s.bot_username && <div className="row" style={{ marginTop: 8 }}>
              <Btn icon="door" cls="ghost sm" onClick={() => act({ action: "setMenuButton" }, "Menyu tugmasi yangilandi")}>Menyu tugmasi</Btn>
              <Btn icon="x" cls="red sm" onClick={() => confirm("Botni uzamizmi?") && act({ action: "disconnectBot" }, "Bot uzildi")}>Uzish</Btn>
            </div>}
          </div>
          <div className="card">
            <b>Salomlashuv matni</b>
            <p className="mut">Bot yangi foydalanuvchiga birinchi shu matnni yuboradi. Bo'sh qoldirsangiz, standart matn ishlaydi.</p>
            <textarea rows={3} defaultValue={s.bot_welcome || ""} placeholder="GOLD FIT ga xush kelibsiz!" onBlur={(x) => x.target.value !== (s.bot_welcome || "") && set("bot_welcome", x.target.value)} />
          </div>
          <div className="card">
            <b>Avtomatik eslatma</b>
            <Row title="Obuna tugashi eslatmasi" sub="Bot o'zi xabar yuboradi"><Switch on={s.remind_on !== false} onClick={() => set("remind_on", !(s.remind_on !== false))} /></Row>
            <div className="mut">Necha kun oldin eslatilsin</div>
            <input type="number" defaultValue={s.remind_days} onBlur={(x) => set("remind_days", +x.target.value || 3)} />
          </div>
          <div className="card" style={{ borderColor: "#ff3b3b66" }}>
            <b>Zaxira va restart</b>
            <p className="mut">Hamma ma'lumotni o'chirib, ilovani yangidan boshlash. Avval zaxira nusxa olinadi.</p>
            <Btn icon="warn" cls="red" onClick={() => { setSec("danger"); setTab("set"); window.scrollTo({ top: 0 }); }}>Zaxira va restart</Btn>
          </div>
          <div className="card">
            <b>Bot foydalanuvchilari ({o.botUsers.length})</b>
            {o.botUsers.map((b) => (
              <div className="row between" key={b.tg_id} style={{ marginTop: 10 }}>
                <div><div>{b.first_name || "—"} {b.username ? "@" + b.username : ""}</div><div className="mut">ID {b.tg_id} · {b.phone || "raqamsiz"}</div></div>
                <Btn icon={b.blocked ? "check2" : "lock"} cls={"sm " + (b.blocked ? "dark" : "red")} onClick={() => act({ action: "blockBot", tg_id: b.tg_id, blocked: !b.blocked })}>{b.blocked ? "Ochish" : "Bloklash"}</Btn>
              </div>
            ))}
          </div>
        </div>
      )}

      {cur === "set" && isSuper && (
        <div className="fade">
          {!sec && (
            <>
              <Head icon="sliders" title="Super admin" sub="Har bir boshqaruv alohida bo'limda" />
              <div className="hubgrid">
                {[
                  ["staff", "users", "Xodimlar", `${managers.length} zal egasi · ${trainers.length} trener`],
                  ["design", "palette", "Dizayn", "Rang va bayram shablonlari"],
                  ["access", "clock", "Avto-blok va vaqt", `${s.absent_days} kun · ${s.checkin_hours} soat`],
                  ["lockers", "locker", "Shkaflar", s.lockers_enabled ? "Yoqilgan" : "O'chiq"],
                  ["door", "door", "Eshik va kartalar", "Turniket ulanishi"],
                  ["bot", "bot", "Bot sozlamalari", s.bot_username ? "@" + s.bot_username : "Ulanmagan"],
                  ["alerts", "volume", "Xabar va ovoz", "Eslatma, xulosa, tovush"],
                  ["security", "shield", "Xavfsizlik", "Face ID, login, parol"],
                  ["danger", "warn", "Zaxira va restart", "Xavfli zona"],
                ].map(([id, ic, t, sub]) => (
                  <button key={id} className={"hub" + (id === "danger" ? " danger" : "")} onClick={() => (id === "lockers" || id === "bot" ? setTab(id) : setSec(id))}>
                    <div className="hi"><Ic n={ic} /></div><b>{t}</b><span className="mut">{sub}</span>
                  </button>
                ))}
              </div>
            </>
          )}
          {sec && <div style={{ marginBottom: 12 }}><Btn icon="back" cls="ghost sm" onClick={() => setSec(null)}>Orqaga</Btn></div>}

          {sec === "staff" && (
            <>
              <Head icon="users" title="Xodimlar" sub="Zal egasi va trenerlar" />
              <div className="card">
                <b>Zal egasi ({managers.length})</b>
                <p className="mut">Mijozlar, davomat, shkaf, do'kon, xabar va mashqlarni boshqaradi. Bot, dizayn, xavfsizlik va restart faqat sizda.</p>
                {managers.map((m) => (
                  <div className="row between" key={m.id} style={{ marginBottom: 8 }}>
                    <div><div>{name(m)}</div><div className="mut">login: {m.login}</div></div>
                    <Btn icon="trash" cls="red sm" onClick={() => confirm(`${name(m)} o'chirilsinmi?`) && act({ action: "delStaff", id: m.id }, "O'chirildi")}>{""}</Btn>
                  </div>
                ))}
                <Btn icon="plus" onClick={() => { setF({ type: "manager" }); setShowForm(true); setSec(null); setTab("clients"); window.scrollTo({ top: 0 }); }}>Zal egasini qo'shish</Btn>
              </div>
              <div className="card">
                <b>Trenerlar ({trainers.length})</b>
                {trainers.map((t) => (
                  <div className="row between" key={t.id} style={{ marginBottom: 8 }}>
                    <div><div>{name(t)}</div><div className="mut">{o.clients.filter((c) => c.trainer_id === t.id).length} ta mijoz · login: {t.login}</div></div>
                    <Btn icon="trash" cls="red sm" onClick={() => confirm(`${name(t)} o'chirilsinmi?`) && act({ action: "delStaff", id: t.id }, "O'chirildi")}>{""}</Btn>
                  </div>
                ))}
                <Btn icon="plus" cls="ghost" onClick={() => { setF({ type: "trainer" }); setShowForm(true); setSec(null); setTab("clients"); window.scrollTo({ top: 0 }); }}>Trener qo'shish</Btn>
              </div>
            </>
          )}

          {sec === "design" && (
            <>
              <Head icon="palette" title="Dizayn" sub="Ilova ko'rinishi" />
              <div className="card">
                <b>Ilova dizayni</b>
                <select value={s.theme} onChange={(x) => set("theme", x.target.value)} style={{ marginTop: 8 }}>
                  <option value="auto">Avtomatik (bayramga qarab)</option>
                  <optgroup label="Asosiy dizaynlar">{THEMES.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}</optgroup>
                  <optgroup label="Bayram shablonlari">{HOLIDAY_THEMES.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}</optgroup>
                </select>
                <p className="mut">Hozir: {th.name}. Ramazon va hayit sanalari taxminiy, o'zgarsa qo'lda tanlang.</p>
                <select value={s.season} onChange={(x) => set("season", x.target.value)}>
                  <option value="none">Fasl effekti yo'q</option><option value="winter">Qish (qor)</option><option value="autumn">Kuz (barglar)</option><option value="spring">Bahor (gul barglari)</option>
                </select>
              </div>
            </>
          )}

          {sec === "access" && (
            <>
              <Head icon="clock" title="Avto-blok va vaqt" sub="Kelmaganlar va zal vaqti" />
              <div className="card">
                <b>Avtomatik bloklash</b>
                <Row title="Kelmaganlarni bloklash"><Switch on={s.auto_block} onClick={() => set("auto_block", !s.auto_block)} /></Row>
                <div className="mut">Necha kun kelmasa bloklansin</div>
                <input type="number" defaultValue={s.absent_days} onBlur={(x) => set("absent_days", +x.target.value || 10)} />
                <div className="mut">QR skanerlangach do'kon va shkaf necha soat ochiq</div>
                <input type="number" defaultValue={s.checkin_hours} onBlur={(x) => set("checkin_hours", +x.target.value || 3)} />
              </div>
            </>
          )}

          {sec === "door" && (
            <>
              <Head icon="door" title="Eshik va kartalar" sub="Turniket ulanishi" />
              <div className="card">
                <b>Eshik / turniket</b>
                <p className="mut">Kontroller karta raqamini <code>POST /api/door</code> ga yuboradi (header: <code>x-door-key</code>, body: {'{"card":"..."}'}). Javobda <code>open:true</code> bo'lsa eshik ochiladi. Render'da <code>DOOR_KEY</code> o'zgaruvchisi kerak.</p>
                <p className="mut">Braslet raqamini mijozga "Jadval" bo'limida biriktirasiz.</p>
                <Btn icon="table" cls="dark" onClick={() => setTab("table")}>Jadvalga o'tish</Btn>
              </div>
            </>
          )}

          {sec === "alerts" && (
            <>
              <Head icon="volume" title="Xabar va ovoz" sub="Avtomatik eslatmalar va tovush" />
              <div className="card">
                <b>Avtomatik xabarlar</b>
                <Row title="Obuna tugashi eslatmasi" sub="Bot mijozga o'zi yozadi"><Switch on={s.remind_on !== false} onClick={() => set("remind_on", !(s.remind_on !== false))} /></Row>
                <div className="mut">Necha kun oldin eslatilsin</div>
                <input type="number" defaultValue={s.remind_days} onBlur={(x) => set("remind_days", +x.target.value || 3)} />
                <Row title="Sizni sog'indik xabari" sub="Uzoq kelmaganlarga bir marta yuboriladi"><Switch on={s.absent_msg_on !== false} onClick={() => set("absent_msg_on", !(s.absent_msg_on !== false))} /></Row>
                <div className="mut">Necha kun kelmasa yuborilsin</div>
                <input type="number" defaultValue={s.absent_msg_days} onBlur={(x) => set("absent_msg_days", +x.target.value || 7)} />
                <Row title="Kunlik xulosa" sub="Kechqurun 21:00 dan keyin sizga Telegramda keladi"><Switch on={s.summary_on !== false} onClick={() => set("summary_on", !(s.summary_on !== false))} /></Row>
                {s.summary_on !== false && !o.ownerTg && <p className="bad">Xulosa kelishi uchun mini appga bir marta Telegram ichidan kiring.</p>}
                <p className="mut">Bu xabarlar cron ishlaganda yuboriladi. Cron manzili: <code>/api/cron?key=CRON_SECRET</code> (soatiga bir marta chaqirilsa yetarli).</p>
              </div>
              <div className="card">
                <b>Tovush</b>
                <Row title="Ilova tovushi" sub="Muvaffaqiyat va xato tovushlari (shu qurilmada)"><Switch on={snd} onClick={() => { const v = !snd; setSound(v); setSnd(v); if (v) sfx("badge"); }} /></Row>
                <Btn icon="volume" cls="dark sm" onClick={() => sfx("badge")}>Sinab ko'rish</Btn>
              </div>
            </>
          )}

          {sec === "security" && (
            <>
              <Head icon="shield" title="Xavfsizlik" sub="Kirish usullari" />
              <div className="card">
                <b>Xavfsizlik</b>
                <LockSwitch />
            {sup && <Row title="Face ID / barmoq izi" sub="Shu qurilmada parolsiz kirish"><Btn icon="finger" cls="sm" onClick={async () => { const r = await pkEnroll(); say(r.ok ? "Yoqildi" : r.error); }}>Yoqish</Btn></Row>}
                <div className="mut" style={{ marginTop: 10 }}>Kirish ma'lumotlarini o'zgartirish</div>
                <In f={cf} setF={setCf} k="login" ph="Yangi login" /><In f={cf} setF={setCf} k="password" ph="Yangi parol (kamida 6 belgi)" type="password" />
                <Btn icon="lock" onClick={async () => { const r = await act({ action: "changeCreds", ...cf }); if (r.ok) setCf({}); }}>Saqlash</Btn>
              </div>
            </>
          )}

          {sec === "danger" && (
            <>
              <Head icon="warn" title="Zaxira va restart" sub="Xavfli zona" />
              <div className="dz">
                <b>Restart nima qiladi?</b>
                <p className="mut">Ilova yangi o'rnatilgandek bo'ladi. <b>O'chadi:</b> barcha mijozlar, to'lovlar, davomat, buyurtmalar, xabarlar, bot foydalanuvchilari va shkaf band qilishlari. <b>Qoladi:</b> sizning hisobingiz, treynerlar, tariflar, sozlamalar va bot ulanishi. Qaytarib bo'lmaydi.</p>
                <div className="step"><i>1</i><b>Zaxira nusxa oling</b></div>
                <Btn icon="download" cls="dark" onClick={async () => { const r = await api("/api/owner", { action: "backup" }); if (r.ok) { downloadJson(r.data, `goldfit-zaxira-${today()}.json`); setBk(true); say("Zaxira yuklandi"); sfx("ok"); } else say(r.error); }}>{bk ? "Zaxira olindi. Yana olish" : "Zaxira faylini yuklab olish"}</Btn>
                <p className="mut">Telegram ichida fayl yuklanmasa, saytni brauzerda oching.</p>
                <div className="step"><i>2</i><b>Tasdiqlang</b></div>
                <Row title="Do'kon mahsulotlari ham o'chsin"><Switch on={!!rf.products} onClick={() => setRf({ ...rf, products: !rf.products })} /></Row>
                <In f={rf} setF={setRf} k="confirm" ph="RESTART so'zini yozing" />
                <In f={rf} setF={setRf} k="password" ph="Parolingiz" type="password" />
                <div className="step"><i>3</i><b>Restart</b></div>
                <Btn icon="restart" cls="red" disabled={!bk || rf.confirm !== "RESTART" || !rf.password} onClick={async () => {
                  setRmsg("Bajarilmoqda…");
                  const r = await act({ action: "restart", ...rf }, "Restart bajarildi");
                  if (r.ok) { setRf({}); setBk(false); setRmsg("Tayyor: ma'lumotlar o'chirildi"); }
                  else setRmsg("Xato: " + (r.error || "noma'lum"));
                }}>Hamma ma'lumotni o'chirish</Btn>
                <div className="mut" style={{ marginTop: 10, lineHeight: 1.8 }}>
                  <div className={bk ? "good" : "bad"}>{bk ? "✓" : "✗"} 1. Zaxira olindi</div>
                  <div className={rf.confirm === "RESTART" ? "good" : "bad"}>{rf.confirm === "RESTART" ? "✓" : "✗"} 2. RESTART so'zi yozildi (katta harflar bilan)</div>
                  <div className={rf.password ? "good" : "bad"}>{rf.password ? "✓" : "✗"} 3. Parol yozildi</div>
                </div>
                {rmsg && <p><b>{rmsg}</b></p>}
              </div>
            </>
          )}
        </div>
      )}
      <Tabs tabs={T} tab={cur} setTab={setTab} />
    </div>
  );
}
