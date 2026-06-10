import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import UploadForm from "@/components/ui/UploadForm";

export const metadata = { title: "อัปโหลดผลงาน" };

export default async function UploadPage() {
  const session = await auth();

  if (!session?.user) redirect("/auth/signin");
  if (
    (session.user as { role?: string }).role !== "TRANSLATOR" &&
    (session.user as { role?: string }).role !== "ADMIN"
  ) {
    redirect("/");
  }

  const genres = await prisma.genre.findMany({ orderBy: { name: "asc" } });

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
      <h1 className="font-bebas text-4xl text-[var(--text-primary)] tracking-wider mb-2">
        อัปโหลดผลงาน
      </h1>
      <p className="text-[var(--text-secondary)] mb-8">
        เพิ่มมังงะใหม่หรืออัปโหลดตอนใหม่ให้กับผลงานที่มีอยู่
      </p>
      <UploadForm genres={genres} />
    </div>
  );
}
