import { PrismaClient } from "@prisma/client";

function databaseUrlWithPoolLimit() {
  const url = process.env.DATABASE_URL;
  if (!url) return url;

  try {
    const parsed = new URL(url);
    if (!parsed.searchParams.has("connection_limit")) {
      parsed.searchParams.set("connection_limit", process.env.PRISMA_CONNECTION_LIMIT || "1");
    }
    if (!parsed.searchParams.has("pool_timeout")) {
      parsed.searchParams.set("pool_timeout", process.env.PRISMA_POOL_TIMEOUT || "20");
    }
    return parsed.toString();
  } catch {
    return url;
  }
}

const prisma = globalThis.prisma || new PrismaClient({
  datasources: {
    db: {
      url: databaseUrlWithPoolLimit(),
    },
  },
});

if (process.env.NODE_ENV !== "production") {
  globalThis.prisma = prisma;
}

export default prisma;
