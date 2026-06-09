import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import ApplicationsClient from "./ApplicationsClient";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "ใบสมัครนักแปล | Admin" };

export default async function AdminApplicationsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const session = await auth();
  if (!session?.user || (session.user as { role?: string }).role !== "ADMIN") {
    redirect("/");
  }

  const { status = "PENDING" } = await searchParams;

  const [applications, counts] = await Promise.all([
    prisma.translatorApplication.findMany({
      where: { status },
      orderBy: { createdAt: "asc" },
      include: {
        user: { select: { id: true, username: true, email: true, createdAt: true } },
      },
    }),
    prisma.translatorApplication.groupBy({
      by: ["status"],
      _count: { status: true },
    }),
  ]);

  const countMap = Object.fromEntries(
    counts.map((c: { status: string; _count: { status: number } }) => [c.status, c._count.status])
  );

  return (
    <ApplicationsClient
      applications={applications.map((a) => ({
        ...a,
        preferredGenres: JSON.parse(a.preferredGenres ?? "[]") as string[],
        createdAt: a.createdAt.toISOString(),
        updatedAt: a.updatedAt.toISOString(),
        user: { ...a.user, createdAt: a.user.createdAt.toISOString() },
      }))}
      currentStatus={status}
      counts={countMap}
    />
  );
}
