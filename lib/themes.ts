export type Theme = { id: string; name: string; vars: Record<string, string>; fall?: string; banner?: string };

export const THEMES: Theme[] = [
  { id: "gold", name: "Oltin (asosiy)", vars: {} },
  { id: "fire", name: "Olov", vars: { "--gold": "#ff4d2e", "--gold2": "#ff9d00" } },
  { id: "ice", name: "Muz", vars: { "--gold": "#35c6ff", "--gold2": "#7b8cff" } },
  { id: "forest", name: "Yashil", vars: { "--gold": "#3ddc84", "--gold2": "#c6ff4d" } },
];

export const HOLIDAY_THEMES: Theme[] = [
  { id: "newyear", name: "🎄 Yangi yil", fall: "❄", banner: "🎄 Yangi yil bilan! 🎄",
    vars: { "--gold": "#ff5a5f", "--gold2": "#ffd166", "--bg": "#0a0d14", "--card": "#121826", "--line": "#223049" } },
  { id: "ramadan", name: "🌙 Ramazon", fall: "✨", banner: "🌙 Ramazon oyi muborak bo'lsin!",
    vars: { "--gold": "#f2c14e", "--gold2": "#3ddc97", "--bg": "#06100c", "--card": "#0e1b15", "--line": "#1d3328" } },
  { id: "eid_fitr", name: "🕌 Ro'za hayit", fall: "🌙", banner: "🕌 Ro'za hayitingiz muborak!",
    vars: { "--gold": "#f2c14e", "--gold2": "#3ddc97", "--bg": "#07110d", "--card": "#0f1c16", "--line": "#1f3629" } },
  { id: "eid_adha", name: "🕌 Qurbon hayit", fall: "✨", banner: "🕌 Qurbon hayitingiz muborak!",
    vars: { "--gold": "#e8c547", "--gold2": "#5ad17a", "--bg": "#07100b", "--card": "#0f1b13", "--line": "#1f3526" } },
  { id: "navruz", name: "🌷 Navro'z", fall: "🌷", banner: "🌷 Navro'z bayrami muborak!",
    vars: { "--gold": "#8bd450", "--gold2": "#ffd23f", "--bg": "#0a0f08", "--card": "#121b0e", "--line": "#24351b" } },
  { id: "women", name: "🌸 8-mart", fall: "🌸", banner: "🌸 8-mart bayrami bilan!",
    vars: { "--gold": "#ff7eb6", "--gold2": "#ffb86c", "--bg": "#100810", "--card": "#1a1019", "--line": "#33203a" } },
  { id: "independence", name: "🇺🇿 Mustaqillik kuni", fall: "🇺🇿", banner: "🇺🇿 Mustaqillik kuni muborak!",
    vars: { "--gold": "#35c6ff", "--gold2": "#3ddc84", "--bg": "#060c12", "--card": "#0f1822", "--line": "#1f3040" } },
  { id: "defender", name: "🎖 Vatan himoyachilari kuni", banner: "🎖 Vatan himoyachilari kuni muborak!",
    vars: { "--gold": "#7bd88f", "--gold2": "#ffd166", "--bg": "#08100a", "--card": "#101a12", "--line": "#203524" } },
];

const ALL = [...THEMES, ...HOLIDAY_THEMES];

// Sanasi o'zgarmaydigan bayramlar: [oy, kun] (bayram arafasidan boshlanadi)
const FIXED: { id: string; from: [number, number]; to: [number, number] }[] = [
  { id: "newyear", from: [12, 20], to: [1, 5] },
  { id: "defender", from: [1, 13], to: [1, 14] },
  { id: "women", from: [3, 6], to: [3, 8] },
  { id: "navruz", from: [3, 19], to: [3, 23] },
  { id: "independence", from: [8, 30], to: [9, 2] },
];

// Hijriy kalendar bo'yicha bayramlar: TAXMINIY sanalar (Ramazon/hayit har yili o'zgaradi)
const HIJRI = [
  { id: "ramadan", from: "2027-02-08", to: "2027-03-09" },
  { id: "eid_fitr", from: "2027-03-10", to: "2027-03-12" },
  { id: "eid_adha", from: "2027-05-16", to: "2027-05-19" },
  { id: "ramadan", from: "2028-01-28", to: "2028-02-26" },
  { id: "eid_fitr", from: "2028-02-27", to: "2028-02-29" },
  { id: "eid_adha", from: "2028-05-05", to: "2028-05-08" },
];

export function activeHoliday(now: Date = new Date()): string | null {
  const t = new Date(now.getTime() + 5 * 3600e3); // Toshkent vaqti
  const ymd = t.toISOString().slice(0, 10);
  for (const h of HIJRI) if (ymd >= h.from && ymd <= h.to) return h.id;
  const md = (t.getUTCMonth() + 1) * 100 + t.getUTCDate();
  for (const h of FIXED) {
    const a = h.from[0] * 100 + h.from[1];
    const b = h.to[0] * 100 + h.to[1];
    if (a <= b ? md >= a && md <= b : md >= a || md <= b) return h.id;
  }
  return null;
}

export function resolveTheme(s: { theme?: string }, now: Date = new Date()): Theme {
  let id = s?.theme || "gold";
  if (id === "auto") id = activeHoliday(now) || "gold";
  return ALL.find((x) => x.id === id) || ALL[0];
}
