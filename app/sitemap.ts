import type { MetadataRoute } from "next";
import { prisma } from "@/lib/prisma";
import { SITE_URL } from "@/lib/site";
import { LEGAL_LAST_UPDATED } from "@/lib/legal";

// Le sitemap dépend du contenu de la base : il ne doit pas être figé au build.
export const dynamic = "force-dynamic";

async function getArchivedDates(): Promise<string[]> {
  try {
    const briefs = await prisma.dailyBrief.findMany({
      orderBy: { date: "desc" },
      select: { date: true },
      distinct: ["date"],
    });
    return briefs.map((b) => b.date);
  } catch {
    // Base indisponible : on renvoie au moins les pages statiques plutôt que
    // de faire échouer /sitemap.xml.
    return [];
  }
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const dates = await getArchivedDates();
  const now = new Date();

  return [
    {
      url: SITE_URL,
      lastModified: now,
      changeFrequency: "daily",
      priority: 1,
    },
    {
      url: `${SITE_URL}/archive`,
      lastModified: now,
      changeFrequency: "daily",
      priority: 0.8,
    },
    {
      url: `${SITE_URL}/mentions-legales`,
      lastModified: new Date(LEGAL_LAST_UPDATED),
      changeFrequency: "yearly",
      priority: 0.2,
    },
    {
      url: `${SITE_URL}/confidentialite`,
      lastModified: new Date(LEGAL_LAST_UPDATED),
      changeFrequency: "yearly",
      priority: 0.2,
    },
    ...dates.map((date) => ({
      url: `${SITE_URL}/archive/${date}`,
      // Le briefing d'une date donnée ne change plus une fois la journée close.
      lastModified: new Date(`${date}T22:30:00Z`),
      changeFrequency: "never" as const,
      priority: 0.5,
    })),
  ];
}
