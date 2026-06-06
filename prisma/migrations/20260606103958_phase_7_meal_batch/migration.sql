-- AlterTable
ALTER TABLE "Meal" ADD COLUMN     "batchId" TEXT;

-- CreateIndex
CREATE INDEX "Meal_batchId_idx" ON "Meal"("batchId");
