-- CreateEnum
CREATE TYPE "public"."NotificationType" AS ENUM ('SYSTEM', 'WORKFLOW', 'SECURITY', 'USER_MESSAGE');

-- CreateEnum
CREATE TYPE "public"."NotificationPriority" AS ENUM ('HIGH', 'MEDIUM', 'LOW');

-- CreateTable
CREATE TABLE "public"."Service" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "label" TEXT,
    "description" TEXT,
    "host" TEXT,
    "port" INTEGER,
    "database" TEXT NOT NULL,
    "username" TEXT,
    "passwordEncrypted" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "failoverHost" TEXT,
    "objects" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "organizationId" TEXT NOT NULL,
    "createdBy" TEXT NOT NULL,
    "connectionId" TEXT,

    CONSTRAINT "Service_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Application" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "apiKeyHash" TEXT NOT NULL,
    "apiKeyEncrypted" TEXT NOT NULL,
    "apiKeyPrefix" TEXT NOT NULL,
    "apiKeyHint" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "organizationId" TEXT NOT NULL,
    "createdBy" TEXT NOT NULL,
    "defaultRoleId" TEXT NOT NULL,

    CONSTRAINT "Application_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Role" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "permissions" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "organizationId" TEXT NOT NULL,
    "serviceId" TEXT NOT NULL,

    CONSTRAINT "Role_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Notification" (
    "id" TEXT NOT NULL,
    "type" "public"."NotificationType" NOT NULL,
    "priority" "public"."NotificationPriority" NOT NULL DEFAULT 'MEDIUM',
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "readAt" TIMESTAMP(3),
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "organizationId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."ApiActivityLog" (
    "id" TEXT NOT NULL,
    "requestId" TEXT NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "method" "public"."HttpMethod" NOT NULL,
    "url" TEXT NOT NULL,
    "endpoint" TEXT,
    "statusCode" INTEGER NOT NULL,
    "responseTime" INTEGER,
    "userAgent" TEXT,
    "ipAddress" TEXT,
    "category" TEXT,
    "endpointType" TEXT,
    "importance" TEXT,
    "error" TEXT,
    "metadata" JSONB,
    "organizationId" TEXT NOT NULL,
    "userId" TEXT,

    CONSTRAINT "ApiActivityLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."DatabaseObject" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "schema" TEXT,
    "type" TEXT NOT NULL,
    "path" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "organizationId" TEXT NOT NULL,
    "serviceId" TEXT,

    CONSTRAINT "DatabaseObject_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Service_organizationId_idx" ON "public"."Service"("organizationId");

-- CreateIndex
CREATE INDEX "Service_isActive_idx" ON "public"."Service"("isActive");

-- CreateIndex
CREATE INDEX "Service_createdBy_idx" ON "public"."Service"("createdBy");

-- CreateIndex
CREATE UNIQUE INDEX "Service_organizationId_name_key" ON "public"."Service"("organizationId", "name");

-- CreateIndex
CREATE INDEX "Application_organizationId_idx" ON "public"."Application"("organizationId");

-- CreateIndex
CREATE INDEX "Application_isActive_idx" ON "public"."Application"("isActive");

-- CreateIndex
CREATE INDEX "Application_createdBy_idx" ON "public"."Application"("createdBy");

-- CreateIndex
CREATE UNIQUE INDEX "Application_organizationId_name_key" ON "public"."Application"("organizationId", "name");

-- CreateIndex
CREATE UNIQUE INDEX "Application_apiKeyHash_key" ON "public"."Application"("apiKeyHash");

-- CreateIndex
CREATE INDEX "Role_organizationId_idx" ON "public"."Role"("organizationId");

-- CreateIndex
CREATE INDEX "Role_serviceId_idx" ON "public"."Role"("serviceId");

-- CreateIndex
CREATE INDEX "Role_isActive_idx" ON "public"."Role"("isActive");

-- CreateIndex
CREATE UNIQUE INDEX "Role_organizationId_serviceId_name_key" ON "public"."Role"("organizationId", "serviceId", "name");

-- CreateIndex
CREATE INDEX "Notification_organizationId_userId_idx" ON "public"."Notification"("organizationId", "userId");

-- CreateIndex
CREATE INDEX "Notification_isRead_idx" ON "public"."Notification"("isRead");

-- CreateIndex
CREATE INDEX "Notification_createdAt_idx" ON "public"."Notification"("createdAt");

-- CreateIndex
CREATE INDEX "Notification_type_idx" ON "public"."Notification"("type");

-- CreateIndex
CREATE UNIQUE INDEX "ApiActivityLog_requestId_key" ON "public"."ApiActivityLog"("requestId");

-- CreateIndex
CREATE INDEX "ApiActivityLog_organizationId_timestamp_idx" ON "public"."ApiActivityLog"("organizationId", "timestamp");

-- CreateIndex
CREATE INDEX "ApiActivityLog_userId_idx" ON "public"."ApiActivityLog"("userId");

-- CreateIndex
CREATE INDEX "ApiActivityLog_timestamp_idx" ON "public"."ApiActivityLog"("timestamp");

-- CreateIndex
CREATE INDEX "ApiActivityLog_endpoint_idx" ON "public"."ApiActivityLog"("endpoint");

-- CreateIndex
CREATE INDEX "ApiActivityLog_statusCode_idx" ON "public"."ApiActivityLog"("statusCode");

-- CreateIndex
CREATE INDEX "DatabaseObject_organizationId_idx" ON "public"."DatabaseObject"("organizationId");

-- CreateIndex
CREATE INDEX "DatabaseObject_serviceId_idx" ON "public"."DatabaseObject"("serviceId");

-- CreateIndex
CREATE INDEX "DatabaseObject_type_idx" ON "public"."DatabaseObject"("type");

-- CreateIndex
CREATE UNIQUE INDEX "DatabaseObject_organizationId_serviceId_schema_name_key" ON "public"."DatabaseObject"("organizationId", "serviceId", "schema", "name");

-- AddForeignKey
ALTER TABLE "public"."Service" ADD CONSTRAINT "Service_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "public"."Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Service" ADD CONSTRAINT "Service_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Service" ADD CONSTRAINT "Service_connectionId_fkey" FOREIGN KEY ("connectionId") REFERENCES "public"."DatabaseConnection"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Application" ADD CONSTRAINT "Application_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "public"."Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Application" ADD CONSTRAINT "Application_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Application" ADD CONSTRAINT "Application_defaultRoleId_fkey" FOREIGN KEY ("defaultRoleId") REFERENCES "public"."Role"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Role" ADD CONSTRAINT "Role_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "public"."Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Role" ADD CONSTRAINT "Role_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "public"."Service"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Notification" ADD CONSTRAINT "Notification_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "public"."Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Notification" ADD CONSTRAINT "Notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ApiActivityLog" ADD CONSTRAINT "ApiActivityLog_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "public"."Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ApiActivityLog" ADD CONSTRAINT "ApiActivityLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."DatabaseObject" ADD CONSTRAINT "DatabaseObject_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "public"."Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."DatabaseObject" ADD CONSTRAINT "DatabaseObject_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "public"."Service"("id") ON DELETE CASCADE ON UPDATE CASCADE;
