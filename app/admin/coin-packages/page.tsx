import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import CoinPackagesAdmin from "./CoinPackagesAdmin";

export const metadata = { title: "จัดการแพ็กเหรียญ" };

export default async function AdminCoinPackagesPage() {
  const session = await auth();
  if (!session?.user || (session.user as { role?: string }).role !== "ADMIN") {
    redirect("/");
  }

  const packages = await prisma.coinPackage.findMany({ orderBy: { price: "asc" } });

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
      <h1 className="font-bebas text-4xl text-[var(--text-primary)] tracking-wider mb-1">
        จัดการแพ็กเหรียญ
      </h1>
      <p className="text-[var(--text-secondary)] text-sm mb-8">
        แก้ราคา/โบนัส/VIP โดยไม่ต้อง re-seed · 1 เหรียญ = 1 บาท
      </p>
      <CoinPackagesAdmin initial={packages} />
    </div>
  );
}
