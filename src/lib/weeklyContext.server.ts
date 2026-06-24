import 'server-only';
import { prisma } from './prisma';
import { MEAL_TYPE_LABELS, sumEntries } from './meals';
import { dayScore } from './dayScore';

type Goals = {
  dailyKcalGoal: number | null;
  dailyProteinGoal: number | null;
  dailyCarbsGoal: number | null;
  dailyFatGoal: number | null;
};

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTH_NAMES = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
];

function fmtDate(d: Date): string {
  return `${DAY_NAMES[d.getUTCDay()]} ${MONTH_NAMES[d.getUTCMonth()]} ${d.getUTCDate()}`;
}

/**
 * Fetches the last `daysBack` days of meals before `beforeDate` and builds
 * a compact history string suitable for use as a cached system-prompt block.
 * Returns an empty string if no history exists yet.
 */
export async function fetchWeeklyContext(
  userId: string,
  beforeDate: Date,
  goals: Goals,
  daysBack = 6,
): Promise<string> {
  const startDate = new Date(beforeDate.getTime() - daysBack * 24 * 60 * 60 * 1000);

  const meals = await prisma.meal.findMany({
    where: { userId, date: { gte: startDate, lt: beforeDate } },
    orderBy: [{ date: 'asc' }, { createdAt: 'asc' }],
    include: { entries: true },
  });

  if (meals.length === 0) return '';

  // Group by ISO date key
  const byDay = new Map<string, typeof meals>();
  for (const m of meals) {
    const key = m.date.toISOString().slice(0, 10);
    const arr = byDay.get(key) ?? [];
    arr.push(m);
    byDay.set(key, arr);
  }

  // Most recent first
  const lines: string[] = [
    'User meal history — past days (use this to spot structural patterns only; do NOT repeat full meal names as recommendations):',
    '',
  ];

  for (const [, dayMeals] of [...byDay.entries()].sort(([a], [b]) => b.localeCompare(a))) {
    const date = dayMeals[0].date;
    const totals = sumEntries(dayMeals.flatMap((m) => m.entries));
    const score = dayScore(totals, goals)?.score ?? null;
    const scoreStr = score != null ? `score ${score}/100` : 'no goals set';
    const tag = dayMeals.length <= 1 ? ' — incomplete day' : '';

    lines.push(`${fmtDate(date)} (${scoreStr}${tag}):`);
    for (const m of dayMeals) {
      const label = m.name ? `${MEAL_TYPE_LABELS[m.type]} — ${m.name}` : MEAL_TYPE_LABELS[m.type];
      const t = sumEntries(m.entries);
      lines.push(
        `  ${label}: ${Math.round(t.kcal)}kcal · P${t.protein.toFixed(0)}g C${t.carbs.toFixed(0)}g F${t.fat.toFixed(0)}g`,
      );
    }
    lines.push('');
  }

  return lines.join('\n').trimEnd();
}
