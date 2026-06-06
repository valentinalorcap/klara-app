import { describe, expect, it } from 'vitest';
import { EvalTone } from '@prisma/client';
import { buildChatSystemStable, buildChatSystemDynamic, type ChatContext } from './chat';

const baseContext: ChatContext = {
  user: { firstName: 'Valentina', tone: EvalTone.MOTIVATIONAL },
  targets: { kcal: 2100, protein: 145, carbs: 220, fat: 70 },
  today: {
    date: '2026-06-06',
    totals: { kcal: 880, protein: 55, carbs: 90, fat: 32 },
    meals: [
      {
        typeLabel: 'Breakfast',
        name: 'Oats + berries',
        totals: { kcal: 420, protein: 22, carbs: 60, fat: 12 },
      },
      {
        typeLabel: 'Snack',
        name: null,
        totals: { kcal: 460, protein: 33, carbs: 30, fat: 20 },
      },
    ],
  },
  recentDays: [
    {
      date: '2026-06-05',
      totals: { kcal: 1980, protein: 138, carbs: 200, fat: 60 },
      mealCount: 4,
    },
    {
      date: '2026-06-04',
      totals: { kcal: 1620, protein: 120, carbs: 180, fat: 55 },
      mealCount: 3,
    },
  ],
};

describe('buildChatSystemStable', () => {
  it('embeds the first name, tone, and targets', () => {
    const out = buildChatSystemStable(baseContext);
    expect(out).toContain('User: Valentina.');
    expect(out).toContain('Tone: MOTIVATIONAL');
    expect(out).toContain('2100 kcal');
    expect(out).toContain('145g protein');
  });

  it('renders an em-dash for targets the user has not set', () => {
    const out = buildChatSystemStable({
      ...baseContext,
      targets: { kcal: null, protein: 145, carbs: null, fat: null },
    });
    expect(out).toContain('— · 145g protein · — · —');
  });

  it('produces a stable snapshot per tone', () => {
    expect(buildChatSystemStable(baseContext)).toMatchSnapshot('motivational');
    expect(
      buildChatSystemStable({
        ...baseContext,
        user: { ...baseContext.user, tone: EvalTone.DIRECT },
      }),
    ).toMatchSnapshot('direct');
    expect(
      buildChatSystemStable({
        ...baseContext,
        user: { ...baseContext.user, tone: EvalTone.NEUTRAL },
      }),
    ).toMatchSnapshot('neutral');
  });

  it('never embeds dynamic numbers so the cache stays warm', () => {
    const out = buildChatSystemStable(baseContext);
    expect(out).not.toContain('880');
    expect(out).not.toContain('2026-06-06');
  });
});

describe('buildChatSystemDynamic', () => {
  it("lists today's meals when there are any", () => {
    const out = buildChatSystemDynamic(baseContext);
    expect(out).toContain('Today (2026-06-06):');
    expect(out).toContain('Breakfast — Oats + berries');
    expect(out).toContain('Snack:');
    expect(out).toMatch(/Totals so far:.*55\.0g P/);
  });

  it('falls back to a placeholder when today has no meals', () => {
    const out = buildChatSystemDynamic({
      ...baseContext,
      today: { ...baseContext.today, meals: [], totals: { kcal: 0, protein: 0, carbs: 0, fat: 0 } },
    });
    expect(out).toContain('(no meals logged yet today)');
  });

  it('renders the last 7 days most recent first', () => {
    const out = buildChatSystemDynamic(baseContext);
    const idx5 = out.indexOf('2026-06-05');
    const idx4 = out.indexOf('2026-06-04');
    expect(idx5).toBeGreaterThan(-1);
    expect(idx4).toBeGreaterThan(idx5);
  });

  it('falls back when there is no history', () => {
    const out = buildChatSystemDynamic({ ...baseContext, recentDays: [] });
    expect(out).toContain('(no history yet)');
  });
});
