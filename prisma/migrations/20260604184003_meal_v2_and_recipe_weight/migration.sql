-- AlterTable
ALTER TABLE "Meal" ADD COLUMN     "isFavorite" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "name" TEXT;

-- AlterTable
ALTER TABLE "Recipe" ADD COLUMN     "suggestedPortionGrams" DOUBLE PRECISION,
ADD COLUMN     "totalGrams" DOUBLE PRECISION;

-- CreateIndex
CREATE INDEX "Meal_userId_isFavorite_idx" ON "Meal"("userId", "isFavorite");
