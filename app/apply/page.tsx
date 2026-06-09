import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import ApplyClient from "./ApplyClient";
import ApplyStatus from "./ApplyStatus";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "สมัครเป็นนักแปล | INKVERSE" };

export default async function ApplyPage() {
  const session = await auth();
  if (!session?.user) redirect("/auth/signin?callbackUrl=/apply");

  const userId = (session.user as { id: string }).id;
  const role = (session.user as { role?: string }).role;

  // Already a translator/admin
  if (role === "TRANSLATOR" || role === "ADMIN") {
    redirect("/upload");
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
    <ApplyClient
      genres={genres.map((g) => ({ id: g.id, name: g.name, slug: g.slug }))}
      prevApplication={application}
    />
  );
}
