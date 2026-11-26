// Tariflar. Narxni shu yerda o'zgartirsangiz bo'ladi.
export const PLANS: Record<string, { id: string; name: string; icon: string; price: number; days: number; perks: string[] }> = {
  daily:   { id: "daily",   name: "Kunlik",       icon: "⚡", price: 40000,  days: 1,  perks: ["1 kunlik kirish", "Do'kondan xarid"] },
  monthly: { id: "monthly", name: "Oylik",        icon: "🥇", price: 400000, days: 30, perks: ["Zalga cheksiz kirish", "Do'kondan xarid", "Davomat statistikasi"] },
  premium: { id: "premium", name: "Premium VIP",  icon: "👑", price: 700000, days: 30, perks: ["Cheksiz kirish", "VIP belgisi", "Ustuvor xizmat", "Maxsus e'lonlar"] },
  trainer: { id: "trainer", name: "Trener bilan", icon: "🏋️", price: 500000, days: 30, perks: ["Shaxsiy trener", "Cheksiz kirish", "Mashg'ulot rejasi"] },
};
export const TRAINER_FEE = 500000; // trener puli (zal pulidan alohida)
export const GYM_PLANS = ["daily", "monthly", "premium"];
export const planOf = (id?: string | null) => PLANS[id || ""] || PLANS.monthly;
