import prisma from "./prisma.js";

export async function connectDatabase() {
  try {
    await prisma.$connect();
    console.log("PostgreSQL connected through Prisma");
  } catch (error) {
    if (error.code === "P1001") {
      console.error("\nDatabase connection failed: Prisma cannot reach your PostgreSQL host.");
      console.error("Check that DATABASE_URL in server/.env is copied from an active Supabase project.");
      console.error("If the URL uses db.<project-ref>.supabase.co:5432 and fails locally, use Supabase's Session Pooler connection string instead.\n");
    }
    throw error;
  }
}
