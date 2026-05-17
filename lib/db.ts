import { PrismaClient } from "@prisma/client";
import "@/lib/zod-fr";

declare global {
  // eslint-disable-next-line no-var
  var __prisma: PrismaClient | undefined;
}

export const prisma =
  global.__prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") {
  global.__prisma = prisma;
}

let walEnabled = false;
export async function ensureWal(): Promise<void> {
  // No-op pour PostgreSQL : ces PRAGMA n'existent que sur SQLite.
  // La fonction est conservee pour compatibilite des appels existants.
  if (walEnabled) return;
  const url = process.env.DATABASE_URL ?? "";
  if (!url.startsWith("file:") && !url.startsWith("sqlite:")) {
    walEnabled = true;
    return;
  }
  try {
    await prisma.$queryRawUnsafe("PRAGMA journal_mode=WAL;");
    await prisma.$queryRawUnsafe("PRAGMA foreign_keys=ON;");
    walEnabled = true;
  } catch {
    // best effort
  }
}
