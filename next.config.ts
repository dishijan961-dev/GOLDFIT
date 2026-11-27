import type { NextConfig } from "next";
// Sahifa HTML keshlanmaydi: yangilanish chiqqach mini app darrov yangi versiyani oladi.
// (/_next/static fayllari nomi har versiyada o'zgaradi, shuning uchun ular keshlanaveradi.)
const nextConfig: NextConfig = {
  allowedDevOrigins: ["*.trycloudflare.com"],
  async headers() {
    return [{ source: "/:path((?!_next/static|_next/image|favicon.ico|logo.jpeg|intro.mp4).*)", headers: [{ key: "Cache-Control", value: "no-store, must-revalidate" }] }];
  },
};
export default nextConfig;
