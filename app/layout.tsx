import type { Metadata } from "next";
import { Bebas_Neue, Noto_Sans_Thai } from "next/font/google";
import "./globals.css";
import Navbar from "@/components/ui/Navbar";
import Footer from "@/components/layout/Footer";
import { auth } from "@/lib/auth";
import { getUserCoins } from "@/lib/coins";

const bebasNeue = Bebas_Neue({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-bebas",
  display: "swap",
});

const notoSansThai = Noto_Sans_Thai({
  subsets: ["thai", "latin"],
  variable: "--font-noto",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "INKVERSE — อ่านมังงะออนไลน์",
    template: "%s | INKVERSE",
  },
  description:
    "แพลตฟอร์มอ่านการ์ตูนออนไลน์ มังงะ มันฮวา มานฮวา ที่ใหญ่ที่สุดในไทย",
  keywords: ["มังงะ", "manhwa", "manhua", "webtoon", "อ่านการ์ตูน"],
  openGraph: {
    siteName: "INKVERSE",
    type: "website",
    locale: "th_TH",
  },
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  const userId = session?.user ? (session.user as { id: string }).id : null;
  const userCoins = userId ? await getUserCoins(userId) : 0;

  return (
    <html
      lang="th"
      className={`${bebasNeue.variable} ${notoSansThai.variable}`}
    >
      <body className="min-h-screen flex flex-col bg-[#080a10] text-white font-[family-name:var(--font-noto)]">
        <Navbar user={session?.user} userCoins={userCoins} />
        <main className="flex-1">{children}</main>
        <Footer />
      </body>
    </html>
  );
}
