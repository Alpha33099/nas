import { neon } from "@neondatabase/serverless";

function getDatabase() {
  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) {
    throw new Error(
      "DATABASE_URL is not set. Check your .env.local file."
    );
  }

  return neon(databaseUrl);
}

export const sql = getDatabase();