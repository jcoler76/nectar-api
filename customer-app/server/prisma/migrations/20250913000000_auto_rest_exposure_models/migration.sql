-- CreateEnum
CREATE TYPE "public"."ExposedEntityType" AS ENUM ('TABLE', 'VIEW');

-- CreateTable: ExposedEntity
CREATE TABLE "public"."ExposedEntity" (
    "id" TEXT NOT NULL,
    "serviceId" TEXT NOT NULL,
    "connectionId" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "database" TEXT NOT NULL,
    "schema" TEXT,
    "name" TEXT NOT NULL,
    "type" "public"."ExposedEntityType" NOT NULL,
    "primaryKey" TEXT,
    "allowRead" BOOLEAN NOT NULL DEFAULT true,
    "allowCreate" BOOLEAN NOT NULL DEFAULT false,
    "allowUpdate" BOOLEAN NOT NULL DEFAULT false,
    "allowDelete" BOOLEAN NOT NULL DEFAULT false,
    "defaultSort" TEXT,
    "softDeleteEnabled" BOOLEAN NOT NULL DEFAULT false,
    "softDeleteColumn" TEXT,
    "softDeleteValue" TEXT,
    "pathSlug" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdBy" TEXT,

    CONSTRAINT "ExposedEntity_pkey" PRIMARY KEY ("id")
);

-- CreateTable: ExposedFieldPolicy
CREATE TABLE "public"."ExposedFieldPolicy" (
    "id" TEXT NOT NULL,
    "exposedEntityId" TEXT NOT NULL,
    "roleId" TEXT,
    "includeFields" TEXT[],
    "excludeFields" TEXT[],
    "writeProtected" TEXT[],
    "maskedFields" TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ExposedFieldPolicy_pkey" PRIMARY KEY ("id")
);

-- CreateTable: ExposedRowPolicy
CREATE TABLE "public"."ExposedRowPolicy" (
    "id" TEXT NOT NULL,
    "exposedEntityId" TEXT NOT NULL,
    "roleId" TEXT,
    "filterTemplate" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ExposedRowPolicy_pkey" PRIMARY KEY ("id")
);

-- Indexes & Uniques
CREATE UNIQUE INDEX "ExposedEntity_service_schema_name_unique" ON "public"."ExposedEntity" ("serviceId", "schema", "name");
CREATE INDEX "ExposedEntity_organization_idx" ON "public"."ExposedEntity" ("organizationId");
CREATE INDEX "ExposedFieldPolicy_entity_idx" ON "public"."ExposedFieldPolicy" ("exposedEntityId");
CREATE INDEX "ExposedFieldPolicy_role_idx" ON "public"."ExposedFieldPolicy" ("roleId");
CREATE INDEX "ExposedRowPolicy_entity_idx" ON "public"."ExposedRowPolicy" ("exposedEntityId");
CREATE INDEX "ExposedRowPolicy_role_idx" ON "public"."ExposedRowPolicy" ("roleId");

-- Foreign Keys
ALTER TABLE "public"."ExposedEntity"
  ADD CONSTRAINT "ExposedEntity_service_fkey" FOREIGN KEY ("serviceId") REFERENCES "public"."Service"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "public"."ExposedEntity"
  ADD CONSTRAINT "ExposedEntity_connection_fkey" FOREIGN KEY ("connectionId") REFERENCES "public"."DatabaseConnection"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "public"."ExposedEntity"
  ADD CONSTRAINT "ExposedEntity_organization_fkey" FOREIGN KEY ("organizationId") REFERENCES "public"."Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "public"."ExposedEntity"
  ADD CONSTRAINT "ExposedEntity_creator_fkey" FOREIGN KEY ("createdBy") REFERENCES "public"."User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "public"."ExposedFieldPolicy"
  ADD CONSTRAINT "ExposedFieldPolicy_entity_fkey" FOREIGN KEY ("exposedEntityId") REFERENCES "public"."ExposedEntity"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "public"."ExposedFieldPolicy"
  ADD CONSTRAINT "ExposedFieldPolicy_role_fkey" FOREIGN KEY ("roleId") REFERENCES "public"."Role"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "public"."ExposedRowPolicy"
  ADD CONSTRAINT "ExposedRowPolicy_entity_fkey" FOREIGN KEY ("exposedEntityId") REFERENCES "public"."ExposedEntity"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "public"."ExposedRowPolicy"
  ADD CONSTRAINT "ExposedRowPolicy_role_fkey" FOREIGN KEY ("roleId") REFERENCES "public"."Role"("id") ON DELETE SET NULL ON UPDATE CASCADE;

