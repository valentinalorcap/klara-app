-- AlterTable
ALTER TABLE "User" ADD COLUMN     "onboardedAt" TIMESTAMP(3);

-- Backfill: every existing user has already been using the app, so mark them
-- onboarded (use their signup time). Only brand-new signups get NULL → onboarding.
UPDATE "User" SET "onboardedAt" = "createdAt" WHERE "onboardedAt" IS NULL;
