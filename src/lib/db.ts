// Deprecated: the app migrated from SQLite (better-sqlite3) to Postgres via Prisma.
// Kept only to avoid import-path breakage in old branches.

export function getDb(): never {
  throw new Error('SQLite getDb() is deprecated. Use prisma client from src/lib/prisma.ts')
}
