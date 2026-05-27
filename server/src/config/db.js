import prisma from "./prisma.js";

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function connectDatabase() {
  const maxAttempts = Number(process.env.DATABASE_CONNECT_RETRIES || 8);

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      await prisma.$connect();
      console.log("PostgreSQL connected through Prisma");
      return;
    } catch (error) {
      const isLastAttempt = attempt === maxAttempts;

      if (error.code === "P1001") {
        console.error(`Database connection attempt ${attempt}/${maxAttempts} failed: Prisma cannot reach your PostgreSQL host.`);
      } else {
        console.error(`Database connection attempt ${attempt}/${maxAttempts} failed`, error);
      }

      if (isLastAttempt) {
        if (error.code === "P1001") {
          console.error("\nDatabase connection failed: Prisma cannot reach your PostgreSQL host.");
          console.error("Check that DATABASE_URL in server/.env is copied from an active Supabase project.");
          console.error("If the URL uses db.<project-ref>.supabase.co:5432 and fails locally, use Supabase's Session Pooler connection string instead.");
          console.error("If you already use the pooler, try another network because local firewalls often block Postgres ports 5432/6543.\n");
        }
        throw error;
      }

      await wait(Math.min(1000 * attempt, 5000));
    }
  }
}
