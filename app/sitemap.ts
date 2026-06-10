import { MetadataRoute } from "next";
import { prisma } from "@/lib/prisma";

const BASE_URL = process.env.SITE_URL || process.env.NEXTAUTH_URL || "https://inkverse.com";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [mangas, genres] = await Promise.all([
    prisma.manga.findMany({
      select: { slug: true, updatedAt: true },
      orderBy: { updatedAt: "desc" },
    }),
    prisma.genre.findMany({ select: { slug: true } }),
  ]);

  const staticPages: MetadataRoute.Sitemap = [
    { url: BASE_URL, lastModified: new Date(), changeFrequency: "daily", priority: 1.0 },
    { url: `${BASE_URL}/manga`, lastModified: new Date(), changeFrequency: "daily", priority: 0.9 },
    { url: `${BASE_URL}/discover`, lastModified: new Date(), changeFrequency: "daily", priority: 0.8 },
    { url: `${BASE_URL}/topup`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.5 },
  ];

  const genrePages: MetadataRoute.Sitemap = genres.map((g) => ({
    url: `${BASE_URL}/manga/${g.slug}`,
    lastModified: new Date(),
    changeFrequency: "weekly" as const,
    priority: 0.7,
  }));

  const mangaPages: MetadataRoute.Sitemap = mangas.map((m) => ({
    url: `${BASE_URL}/content/${m.slug}`,
    lastModified: m.updatedAt,
    changeFrequency: "weekly" as const,
    priority: 0.8,
  }));

  return [...staticPages, ...genrePages, ...mangaPages];
}
