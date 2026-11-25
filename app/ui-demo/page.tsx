import { Btn, BtnLink } from "../_ui/Btn";
import { Toggle } from "../_ui/Toggle";
import { Section } from "../_ui/Section";
import { Icon } from "../_ui/icons";
import Splash from "../_ui/Splash";

export const metadata = { title: "GOLD FIT UI", robots: { index: false, follow: false } };

export default function UiDemo() {
  return (
    <main
      style={{
        minHeight: "100vh",
        padding: "28px 18px 60px",
        background: "radial-gradient(900px 420px at 80% -10%, rgba(255,214,10,.14), transparent 60%), #07080a",
        color: "#f4efe2",
        fontFamily: "system-ui, -apple-system, Segoe UI, sans-serif",
      }}
    >
      <Splash once={false} />
      <div style={{ maxWidth: 760, margin: "0 auto", display: "grid", gap: 16 }}>
        <h1 style={{ margin: 0, fontSize: 28, fontWeight: 800 }}>GOLD FIT dizayn to&apos;plami</h1>

        <Section icon="crown" title="Premium tugmalar" hint="Oltin, kumush, oq va shisha uslublari">
          <Btn variant="gold" icon="crown">PREMIUM</Btn>
          <Btn variant="gold" shape="rect" icon="gem">VIP KARTA</Btn>
          <Btn variant="silver" icon="crown">SILVER</Btn>
          <Btn variant="white" shape="rect" icon="gem">Oddiy</Btn>
          <Btn variant="glass" icon="bolt" iconLeft>Shisha</Btn>
          <Btn variant="dark" icon="card">Tamoyil</Btn>
          <Btn variant="danger" icon="lock" size="sm">Bloklash</Btn>
          <BtnLink href="/ui-demo" variant="gold" size="lg" block icon="door" iconLeft>Eshikni ochish</BtnLink>
        </Section>

        <Section icon="locker" title="Shkaflar" hint="Telefon tutilganda bo'sh raqam beradi" superOnly>
          <Toggle name="auto_locker" defaultChecked iconOn="check" iconOff="power" label="Avto shkaf" />
          <Toggle name="auto_release" iconOn="unlock" iconOff="lock" label="Vaqt tugagach bo'shatish" />
          <Btn variant="dark" icon="unlock" size="sm">Hammasini bo&apos;shatish</Btn>
        </Section>

        <Section icon="users" title="A'zolar" hint="Oddiy admin ham ko'radi">
          <Btn variant="gold" icon="plus" iconLeft size="sm">A&apos;zo qo&apos;shish</Btn>
          <Btn variant="glass" icon="calendar" iconLeft size="sm">Oylik jadval</Btn>
        </Section>

        <Section icon="gear" title="Ikonkalar">
          {(["crown","gem","bolt","door","locker","lock","unlock","user","users","card","nfc","cart","chart","bell","gear","fingerprint","face","calendar","check","power","phone","qr","logout","dumbbell","plus","send","shield","home"] as const).map((n) => (
            <span key={n} title={n} style={{ color: "#ffd60a", display: "inline-flex" }}><Icon name={n} size={26} /></span>
          ))}
        </Section>
      </div>
    </main>
  );
}
