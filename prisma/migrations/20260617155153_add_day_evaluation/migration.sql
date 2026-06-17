-- CreateTable
CREATE TABLE "DayEvaluation" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "tone" "EvalTone" NOT NULL,
    "status" "EvalStatus" NOT NULL DEFAULT 'PENDING',
    "markdown" TEXT,
    "errorMessage" TEXT,
    "model" TEXT,
    "tokensIn" INTEGER,
    "tokensOut" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DayEvaluation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "DayEvaluation_userId_date_idx" ON "DayEvaluation"("userId", "date");

-- CreateIndex
CREATE UNIQUE INDEX "DayEvaluation_userId_date_key" ON "DayEvaluation"("userId", "date");

-- AddForeignKey
ALTER TABLE "DayEvaluation" ADD CONSTRAINT "DayEvaluation_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
