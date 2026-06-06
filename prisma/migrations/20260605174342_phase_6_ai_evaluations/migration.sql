-- CreateEnum
CREATE TYPE "EvalTone" AS ENUM ('DIRECT', 'MOTIVATIONAL', 'NEUTRAL');

-- CreateEnum
CREATE TYPE "EvalStatus" AS ENUM ('PENDING', 'DONE', 'ERROR');

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "defaultEvalTone" "EvalTone" NOT NULL DEFAULT 'MOTIVATIONAL';

-- CreateTable
CREATE TABLE "AIEvaluation" (
    "id" TEXT NOT NULL,
    "mealId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "tone" "EvalTone" NOT NULL,
    "status" "EvalStatus" NOT NULL DEFAULT 'PENDING',
    "markdown" TEXT,
    "errorMessage" TEXT,
    "model" TEXT,
    "tokensIn" INTEGER,
    "tokensOut" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AIEvaluation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "AIEvaluation_mealId_key" ON "AIEvaluation"("mealId");

-- CreateIndex
CREATE INDEX "AIEvaluation_userId_idx" ON "AIEvaluation"("userId");

-- AddForeignKey
ALTER TABLE "AIEvaluation" ADD CONSTRAINT "AIEvaluation_mealId_fkey" FOREIGN KEY ("mealId") REFERENCES "Meal"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AIEvaluation" ADD CONSTRAINT "AIEvaluation_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
