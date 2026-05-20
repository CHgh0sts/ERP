import { prisma, ensureWal } from "@/lib/db";

/** Indique si le wizard /setup a deja ete termine (AppConfig.initialized). */
export async function isAppInitialized(): Promise<boolean> {
  await ensureWal();
  const cfg = await prisma.appConfig.findUnique({
    where: { id: 1 },
    select: { initialized: true },
  });
  return !!cfg?.initialized;
}
