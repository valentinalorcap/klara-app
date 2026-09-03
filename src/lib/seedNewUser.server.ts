import { EvalStatus, EvalTone, MealType } from '@prisma/client';
import { prisma } from '@/lib/prisma';

function daysAgo(n: number): Date {
  const d = new Date();
  d.setDate(d.getDate() - n);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  // new Date('YYYY-MM-DD') parses as UTC midnight — matches @db.Date storage.
  return new Date(`${y}-${m}-${day}`);
}

/**
 * Populate a brand-new account with demo data so the app feels alive on
 * first login. Non-fatal: a failure is logged but never surfaces to the user.
 *
 * Creates:
 *  - 2 recipes (Banana oat pancakes, Lentil soup)
 *  - 3 meal templates / favourites (Oat bowl, Quinoa bowl, Afternoon snack)
 *  - 2 completed past days with meals and AI evaluations
 */
export async function seedNewUser(userId: string): Promise<void> {
  try {
    await prisma.$transaction(async (tx) => {
      // ── Recipes ────────────────────────────────────────────────────────────

      await tx.recipe.create({
        data: {
          userId,
          name: 'Banana oat pancakes',
          portions: 1,
          totalKcal: 460,
          totalProtein: 21,
          totalCarbs: 71,
          totalFat: 12,
          totalGrams: 230,
          suggestedPortionGrams: 230,
          ingredients: {
            create: [
              {
                name: 'Rolled oats',
                grams: 80,
                kcalPer100g: 366,
                proteinPer100g: 13,
                carbsPer100g: 58,
                fatPer100g: 7,
              },
              {
                name: 'Banana',
                grams: 100,
                kcalPer100g: 89,
                proteinPer100g: 1.1,
                carbsPer100g: 23,
                fatPer100g: 0.3,
              },
              {
                name: 'Egg',
                grams: 50,
                kcalPer100g: 155,
                proteinPer100g: 13,
                carbsPer100g: 1.1,
                fatPer100g: 11,
              },
            ],
          },
        },
      });

      const lentilSoup = await tx.recipe.create({
        data: {
          userId,
          name: 'Lentil soup',
          portions: 4,
          totalKcal: 984,
          totalProtein: 54,
          totalCarbs: 162,
          totalFat: 24,
          totalGrams: 1200,
          suggestedPortionGrams: 300,
          ingredients: {
            create: [
              {
                name: 'Red lentils',
                grams: 200,
                kcalPer100g: 353,
                proteinPer100g: 25.8,
                carbsPer100g: 63.5,
                fatPer100g: 1.1,
              },
              {
                name: 'Carrot',
                grams: 150,
                kcalPer100g: 41,
                proteinPer100g: 0.9,
                carbsPer100g: 9.6,
                fatPer100g: 0.2,
              },
              {
                name: 'Onion',
                grams: 100,
                kcalPer100g: 40,
                proteinPer100g: 1.1,
                carbsPer100g: 9.3,
                fatPer100g: 0.1,
              },
              {
                name: 'Olive oil',
                grams: 20,
                kcalPer100g: 884,
                proteinPer100g: 0,
                carbsPer100g: 0,
                fatPer100g: 100,
              },
            ],
          },
        },
      });

      // ── Meal templates (favourites) ────────────────────────────────────────

      await tx.mealTemplate.create({
        data: {
          userId,
          type: MealType.BREAKFAST,
          name: 'Oat bowl',
          entries: {
            create: [
              {
                name: 'Rolled oats',
                grams: 70,
                kcalPer100g: 366,
                proteinPer100g: 13,
                carbsPer100g: 58,
                fatPer100g: 7,
              },
              {
                name: 'Banana',
                grams: 120,
                kcalPer100g: 89,
                proteinPer100g: 1.1,
                carbsPer100g: 23,
                fatPer100g: 0.3,
              },
              {
                name: 'Greek yogurt',
                grams: 200,
                kcalPer100g: 59,
                proteinPer100g: 10,
                carbsPer100g: 3.6,
                fatPer100g: 0.4,
              },
            ],
          },
        },
      });

      await tx.mealTemplate.create({
        data: {
          userId,
          type: MealType.LUNCH,
          name: 'Quinoa bowl',
          entries: {
            create: [
              {
                name: 'Quinoa (cooked)',
                grams: 200,
                kcalPer100g: 120,
                proteinPer100g: 4.4,
                carbsPer100g: 21.3,
                fatPer100g: 1.9,
              },
              {
                name: 'Chickpeas',
                grams: 100,
                kcalPer100g: 164,
                proteinPer100g: 8.9,
                carbsPer100g: 27.4,
                fatPer100g: 2.6,
              },
              {
                name: 'Olive oil',
                grams: 10,
                kcalPer100g: 884,
                proteinPer100g: 0,
                carbsPer100g: 0,
                fatPer100g: 100,
              },
            ],
          },
        },
      });

      await tx.mealTemplate.create({
        data: {
          userId,
          type: MealType.SNACK,
          name: 'Afternoon snack',
          entries: {
            create: [
              {
                name: 'Apple',
                grams: 180,
                kcalPer100g: 52,
                proteinPer100g: 0.3,
                carbsPer100g: 13.8,
                fatPer100g: 0.2,
              },
              {
                name: 'Peanut butter',
                grams: 20,
                kcalPer100g: 598,
                proteinPer100g: 25,
                carbsPer100g: 20,
                fatPer100g: 50,
              },
            ],
          },
        },
      });

      // ── Past days ──────────────────────────────────────────────────────────

      const day1 = daysAgo(2);
      const day2 = daysAgo(1);

      // Day 1 — breakfast / lunch / dinner

      const d1b = await tx.meal.create({
        data: {
          userId,
          date: day1,
          type: MealType.BREAKFAST,
          name: 'Oat bowl',
          entries: {
            create: [
              {
                name: 'Rolled oats',
                grams: 70,
                kcalPer100g: 366,
                proteinPer100g: 13,
                carbsPer100g: 58,
                fatPer100g: 7,
              },
              {
                name: 'Banana',
                grams: 120,
                kcalPer100g: 89,
                proteinPer100g: 1.1,
                carbsPer100g: 23,
                fatPer100g: 0.3,
              },
              {
                name: 'Greek yogurt',
                grams: 200,
                kcalPer100g: 59,
                proteinPer100g: 10,
                carbsPer100g: 3.6,
                fatPer100g: 0.4,
              },
            ],
          },
        },
      });

      await tx.aIEvaluation.create({
        data: {
          mealId: d1b.id,
          userId,
          tone: EvalTone.MOTIVATIONAL,
          status: EvalStatus.DONE,
          markdown:
            "Solid breakfast. The oats and banana give you sustained energy through the morning, and the yogurt adds a good protein base. You're starting the day right.",
        },
      });

      const d1l = await tx.meal.create({
        data: {
          userId,
          date: day1,
          type: MealType.LUNCH,
          name: 'Quinoa bowl',
          entries: {
            create: [
              {
                name: 'Quinoa (cooked)',
                grams: 200,
                kcalPer100g: 120,
                proteinPer100g: 4.4,
                carbsPer100g: 21.3,
                fatPer100g: 1.9,
              },
              {
                name: 'Chickpeas',
                grams: 100,
                kcalPer100g: 164,
                proteinPer100g: 8.9,
                carbsPer100g: 27.4,
                fatPer100g: 2.6,
              },
              {
                name: 'Feta cheese',
                grams: 30,
                kcalPer100g: 264,
                proteinPer100g: 14.2,
                carbsPer100g: 4.1,
                fatPer100g: 21.3,
              },
              {
                name: 'Olive oil',
                grams: 10,
                kcalPer100g: 884,
                proteinPer100g: 0,
                carbsPer100g: 0,
                fatPer100g: 100,
              },
            ],
          },
        },
      });

      await tx.aIEvaluation.create({
        data: {
          mealId: d1l.id,
          userId,
          tone: EvalTone.MOTIVATIONAL,
          status: EvalStatus.DONE,
          markdown:
            'Great lunch. Quinoa and chickpeas together cover your essential amino acids, and the feta adds calcium without going overboard on fat. This is the kind of meal that keeps protein climbing without spiking anything else.',
        },
      });

      const d1d = await tx.meal.create({
        data: {
          userId,
          date: day1,
          type: MealType.DINNER,
          entries: {
            create: [
              {
                name: 'Pasta',
                grams: 100,
                kcalPer100g: 371,
                proteinPer100g: 13,
                carbsPer100g: 74,
                fatPer100g: 1.5,
              },
              {
                name: 'Tomato sauce',
                grams: 150,
                kcalPer100g: 39,
                proteinPer100g: 1.9,
                carbsPer100g: 8,
                fatPer100g: 0.5,
              },
              {
                name: 'Parmesan',
                grams: 20,
                kcalPer100g: 392,
                proteinPer100g: 35.8,
                carbsPer100g: 3.2,
                fatPer100g: 25.8,
              },
            ],
          },
        },
      });

      await tx.aIEvaluation.create({
        data: {
          mealId: d1d.id,
          userId,
          tone: EvalTone.MOTIVATIONAL,
          status: EvalStatus.DONE,
          markdown:
            "Light dinner, good carb-loading for recovery. You're closing the day within range — protein could be a touch higher but this works well as an evening meal.",
        },
      });

      await tx.dayEvaluation.create({
        data: {
          userId,
          date: day1,
          tone: EvalTone.MOTIVATIONAL,
          status: EvalStatus.DONE,
          markdown:
            'Strong day overall. You distributed your macros well across three meals. Protein came in slightly under — consider adding another protein source at dinner next time. Consistency like this is how you make progress.',
        },
      });

      // Day 2 — breakfast / lunch / snack

      const d2b = await tx.meal.create({
        data: {
          userId,
          date: day2,
          type: MealType.BREAKFAST,
          entries: {
            create: [
              {
                name: 'Scrambled eggs',
                grams: 150,
                kcalPer100g: 155,
                proteinPer100g: 13,
                carbsPer100g: 1.1,
                fatPer100g: 11,
              },
              {
                name: 'Whole grain toast',
                grams: 60,
                kcalPer100g: 247,
                proteinPer100g: 9,
                carbsPer100g: 47,
                fatPer100g: 3.3,
              },
              {
                name: 'Avocado',
                grams: 80,
                kcalPer100g: 160,
                proteinPer100g: 2,
                carbsPer100g: 9,
                fatPer100g: 14.7,
              },
            ],
          },
        },
      });

      await tx.aIEvaluation.create({
        data: {
          mealId: d2b.id,
          userId,
          tone: EvalTone.MOTIVATIONAL,
          status: EvalStatus.DONE,
          markdown:
            'Excellent protein start. Eggs and avocado on toast hit all the right notes — quality fat, solid protein, and enough carbs to get going. This breakfast sets a strong base for the day.',
        },
      });

      const d2l = await tx.meal.create({
        data: {
          userId,
          date: day2,
          type: MealType.LUNCH,
          name: 'Lentil soup',
          entries: {
            create: [
              {
                name: 'Lentil soup',
                grams: 300,
                kcalPer100g: 82,
                proteinPer100g: 4.5,
                carbsPer100g: 13.5,
                fatPer100g: 2,
                recipeId: lentilSoup.id,
              },
            ],
          },
        },
      });

      await tx.aIEvaluation.create({
        data: {
          mealId: d2l.id,
          userId,
          tone: EvalTone.MOTIVATIONAL,
          status: EvalStatus.DONE,
          markdown:
            "Great choice for lunch. Lentils are one of the best plant-based protein sources — you're getting fiber and iron alongside the macros. This kind of meal keeps you full through the afternoon.",
        },
      });

      const d2s = await tx.meal.create({
        data: {
          userId,
          date: day2,
          type: MealType.SNACK,
          name: 'Afternoon snack',
          entries: {
            create: [
              {
                name: 'Apple',
                grams: 180,
                kcalPer100g: 52,
                proteinPer100g: 0.3,
                carbsPer100g: 13.8,
                fatPer100g: 0.2,
              },
              {
                name: 'Peanut butter',
                grams: 20,
                kcalPer100g: 598,
                proteinPer100g: 25,
                carbsPer100g: 20,
                fatPer100g: 50,
              },
            ],
          },
        },
      });

      await tx.aIEvaluation.create({
        data: {
          mealId: d2s.id,
          userId,
          tone: EvalTone.MOTIVATIONAL,
          status: EvalStatus.DONE,
          markdown:
            'Smart snack. The apple gives you natural sugars and fiber; the peanut butter slows the absorption and adds a protein boost. Classic combination.',
        },
      });

      await tx.dayEvaluation.create({
        data: {
          userId,
          date: day2,
          tone: EvalTone.MOTIVATIONAL,
          status: EvalStatus.DONE,
          markdown:
            'Good day. Protein was on point and you kept calories balanced across the meals. The lentil soup at lunch shows solid meal habits — cooking in batches like that makes logging easier and keeps you on track.',
        },
      });
    });
  } catch (err) {
    console.error('[seedNewUser] failed — continuing without demo data:', err);
  }
}
