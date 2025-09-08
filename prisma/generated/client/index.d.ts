// Minimal TypeScript declarations to satisfy imports during consolidation.
// For full typings, run `npx prisma generate --schema prisma/schema.prisma` to regenerate the client here.

export class PrismaClient {
  constructor(...args: any[])
  $connect(): Promise<void>
  $disconnect(): Promise<void>
  [key: string]: any
}

export namespace Prisma {
  // Placeholder namespace to avoid type errors in consuming code
}

