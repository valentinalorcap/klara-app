import 'server-only';
import { prisma } from './prisma';
import { isoDate, MEAL_TYPE_LABELS, sumEntries } from './meals';
import type { ChatContext, ChatDaySummary, ChatMealSummary } from './chat';

const RECENT_DAY_COUNT = 7;

/**
 * Load the user's profile, today's state, and the last 7 days of
 * roll-ups so the chat endpoint can build a fresh context every turn.
 */
export async function loadChatContext(userId: string): Promise<ChatContext> {
  const user = await prisma.user.findUniqueOrThrow({
    where: { id: userId },
    select: {
      name: true,
      defaultEvalTone: true,
      dailyKcalGoal: true,
      dailyProteinGoal: true,
      dailyCarbsGoal: true,
      dailyFatGoal: true,
    },
  });

  const todayKey = isoDate(new Date());
  const todayDate = new Date(todayKey + 'T00:00:00Z');

  // Pull both today's meals and the prior 7 days in one go.
  const sevenDaysAgo = new Date(todayDate);
  sevenDaysAgo.setUTCDate(sevenDaysAgo.getUTCDate() - RECENT_DAY_COUNT);

  const meals = await prisma.meal.findMany({
    where: {
      userId,
      date: { gte: sevenDaysAgo, lte: todayDate },
    },
    orderBy: { createdAt: 'asc' },
    include: { entries: true },
  });

  const todayMeals: ChatMealSummary[] = meals
    .filter((m) => m.date.getTime() === todayDate.getTime())
    .map((m) => ({
      typeLabel: MEAL_TYPE_LABELS[m.type],
      name: m.name,
      totals: sumEntries(m.entries),
    }));

  const todayTotals = sumEntries(
    meals.filter((m) => m.date.getTime() === todayDate.getTime()).flatMap((m) => m.entries),
  );

  // Group meals from the past 7 days (excluding today) by date.
  const byDay = new Map<string, { totals: ReturnType<typeof sumEntries>; mealCount: number }>();
  for (const m of meals) {
    if (m.date.getTime() === todayDate.getTime()) continue;
    const key = m.date.toISOString().slice(0, 10);
    const totals = sumEntries(m.entries);
    const prev = byDay.get(key);
    if (prev) {
      prev.totals.kcal += totals.kcal;
      prev.totals.protein += totals.protein;
      prev.totals.carbs += totals.carbs;
      prev.totals.fat += totals.fat;
      prev.mealCount += 1;
    } else {
      byDay.set(key, { totals, mealCount: 1 });
    }
  }

  const recentDays: ChatDaySummary[] = Array.from(byDay.entries())
    .map(([date, { totals, mealCount }]) => ({ date, totals, mealCount }))
    .sort((a, b) => (a.date < b.date ? 1 : -1));

  return {
    user: {
      firstName: user.name?.split(' ')[0] ?? 'friend',
      tone: user.defaultEvalTone,
    },
    targets: {
      kcal: user.dailyKcalGoal,
      protein: user.dailyProteinGoal,
      carbs: user.dailyCarbsGoal,
      fat: user.dailyFatGoal,
    },
    today: {
      date: todayKey,
      totals: todayTotals,
      meals: todayMeals,
    },
    recentDays,
  };
}
