-- Add SUPER_ADMIN role and tables for admin authorization and login activity tracking.
ALTER TYPE "UserRole" ADD VALUE IF NOT EXISTS 'SUPER_ADMIN';

CREATE TABLE IF NOT EXISTS "AuthorizedAdminNumber" (
  "id" TEXT NOT NULL,
  "mobile" TEXT NOT NULL,
  "isSuperAdmin" BOOLEAN NOT NULL DEFAULT false,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdBy" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "AuthorizedAdminNumber_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "AuthorizedAdminNumber_mobile_key" ON "AuthorizedAdminNumber"("mobile");

CREATE TABLE IF NOT EXISTS "LoginActivity" (
  "id" TEXT NOT NULL,
  "userId" TEXT,
  "mobile" TEXT NOT NULL,
  "role" "UserRole" NOT NULL,
  "loginAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "logoutAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "LoginActivity_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "LoginActivity_mobile_loginAt_idx" ON "LoginActivity"("mobile", "loginAt");
CREATE INDEX IF NOT EXISTS "LoginActivity_role_loginAt_idx" ON "LoginActivity"("role", "loginAt");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.table_constraints
    WHERE constraint_name = 'LoginActivity_userId_fkey'
  ) THEN
    ALTER TABLE "LoginActivity"
      ADD CONSTRAINT "LoginActivity_userId_fkey"
      FOREIGN KEY ("userId") REFERENCES "User"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;
