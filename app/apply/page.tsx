import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import ApplyClient from "./ApplyClient";
import ApplyProvider from "./ApplyProvider";
import ApplyStatus from "./ApplyStatus";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "สมัครนักแปล / นักเขียน | INKVERSE",
  description:
    "สมัครเป็นนักแปลหรือนักเขียนกับ INKVERSE ลงมังงะแปลหรือเขียนนิยายของคุณเอง รับส่วนแบ่งรายได้ 80% พร้อมเครื่องมือเขียนระดับโปรและระบบถอนเงินจริง",
};

export default async function ApplyPage({
  searchParams,
}: {
  searchParams: Promise<{ as?: string }>;
}) {
  const session = await auth();
  const { as } = await searchParams;
  const mode: "translator" | "writer" = as === "writer" ? "writer" : "translator";
  if (!session?.user) {
    redirect(`/auth/signin?callbackUrl=/apply${as ? `?as=${as}` : ""}`);
  }

  const userId = (session.user as { id: string }).id;
  const role = (session.user as { role?: string }).role;

  // Already a creator → straight to the dashboard
  if (role === "TRANSLATOR" || role === "ADMIN") {
    redirect("/dashboard");
  }

  const application = await prisma.translatorApplication.findUnique({
    where: { userId },
  });

  const genres = await prisma.genre.findMany({ orderBy: { name: "asc" } });

  // Has an active/pending application → show status
  if (application && application.status !== "REJECTED") {
    return <ApplyStatus application={application} />;
  }

  // New application or re-apply after rejection
  return (
    <ApplyProvider>
      <ApplyClient
        genres={genres.map((g) => ({ id: g.id, name: g.name, slug: g.slug }))}
        prevApplication={application}
        mode={mode}
      />
    </ApplyProvider>
  );
}
