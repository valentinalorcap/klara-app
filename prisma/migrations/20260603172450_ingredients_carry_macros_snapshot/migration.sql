/*
  Warnings:

  - Added the required column `carbsPer100g` to the `RecipeIngredient` table without a default value. This is not possible if the table is not empty.
  - Added the required column `fatPer100g` to the `RecipeIngredient` table without a default value. This is not possible if the table is not empty.
  - Added the required column `kcalPer100g` to the `RecipeIngredient` table without a default value. This is not possible if the table is not empty.
  - Added the required column `name` to the `RecipeIngredient` table without a default value. This is not possible if the table is not empty.
  - Added the required column `proteinPer100g` to the `RecipeIngredient` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "RecipeIngredient" DROP CONSTRAINT "RecipeIngredient_productId_fkey";

-- AlterTable
ALTER TABLE "RecipeIngredient" ADD COLUMN     "carbsPer100g" DOUBLE PRECISION NOT NULL,
ADD COLUMN     "fatPer100g" DOUBLE PRECISION NOT NULL,
ADD COLUMN     "kcalPer100g" DOUBLE PRECISION NOT NULL,
ADD COLUMN     "name" TEXT NOT NULL,
ADD COLUMN     "proteinPer100g" DOUBLE PRECISION NOT NULL,
ALTER COLUMN "productId" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "RecipeIngredient" ADD CONSTRAINT "RecipeIngredient_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE SET NULL ON UPDATE CASCADE;
