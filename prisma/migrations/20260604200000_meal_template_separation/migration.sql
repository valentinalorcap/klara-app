-- DropIndex
DROP INDEX "Meal_userId_isFavorite_idx";

-- AlterTable
ALTER TABLE "Meal" DROP COLUMN "isFavorite",
ADD COLUMN     "templateId" TEXT;

-- CreateTable
CREATE TABLE "MealTemplate" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" "MealType" NOT NULL,
    "name" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MealTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MealTemplateEntry" (
    "id" TEXT NOT NULL,
    "templateId" TEXT NOT NULL,
    "productId" TEXT,
    "recipeId" TEXT,
    "name" TEXT NOT NULL,
    "grams" DOUBLE PRECISION NOT NULL,
    "kcalPer100g" DOUBLE PRECISION NOT NULL,
    "proteinPer100g" DOUBLE PRECISION NOT NULL,
    "carbsPer100g" DOUBLE PRECISION NOT NULL,
    "fatPer100g" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "MealTemplateEntry_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "MealTemplate_userId_idx" ON "MealTemplate"("userId");

-- CreateIndex
CREATE INDEX "MealTemplateEntry_templateId_idx" ON "MealTemplateEntry"("templateId");

-- CreateIndex
CREATE INDEX "MealTemplateEntry_productId_idx" ON "MealTemplateEntry"("productId");

-- CreateIndex
CREATE INDEX "MealTemplateEntry_recipeId_idx" ON "MealTemplateEntry"("recipeId");

-- CreateIndex
CREATE INDEX "Meal_templateId_idx" ON "Meal"("templateId");

-- AddForeignKey
ALTER TABLE "Meal" ADD CONSTRAINT "Meal_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "MealTemplate"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MealTemplate" ADD CONSTRAINT "MealTemplate_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MealTemplateEntry" ADD CONSTRAINT "MealTemplateEntry_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "MealTemplate"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MealTemplateEntry" ADD CONSTRAINT "MealTemplateEntry_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MealTemplateEntry" ADD CONSTRAINT "MealTemplateEntry_recipeId_fkey" FOREIGN KEY ("recipeId") REFERENCES "Recipe"("id") ON DELETE SET NULL ON UPDATE CASCADE;
