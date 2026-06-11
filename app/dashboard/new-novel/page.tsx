import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import NewNovelForm from "@/components/ui/NewNovelForm";

export const metadata = { title: "เขียนนิยายเรื่องใหม่ — INKVERSE" };

export default async function NewNovelPage() {
  const session = await auth();
  const role = (session?.user as { role?: string })?.role;
  if (!session?.user) redirect("/auth/signin?callbackUrl=/dashboard/new-novel");
  if (role !== "TRANSLATOR" && role !== "ADMIN") redirect("/apply?as=writer");
  const genres = await prisma.genre.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } });
  return <NewNovelForm genres={genres} />;
}
