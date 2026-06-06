import { describe, expect, it } from 'vitest';
import { EvalTone } from '@prisma/client';
import {
  buildSystemPrompt,
  buildUserMessage,
  type EvaluationInput,
  TONE_LABELS,
  TONE_DESCRIPTIONS,
} from './evaluations';

const input: EvaluationInput = {
  meal: {
    typeLabel: 'Breakfast',
    name: 'Oats + eggs',
    entries: [
      { name: 'Oats', grams: 60, kcal: 234, protein: 8.4, carbs: 40, fat: 4 },
      { name: 'Egg', grams: 110, kcal: 154, protein: 14, carbs: 1, fat: 11 },
    ],
    totals: { kcal: 388, protein: 22.4, carbs: 41, fat: 15 },
  },
  dayTotals: { kcal: 388, protein: 22.4, carbs: 41, fat: 15 },
  targets: { kcal: 2100, protein: 145, carbs: 220, fat: 70 },
  tone: EvalTone.MOTIVATIONAL,
};

describe('buildSystemPrompt', () => {
  it('produces a stable prompt per tone (snapshot)', () => {
    expect(buildSystemPrompt(EvalTone.DIRECT)).toMatchSnapshot('direct');
    expect(buildSystemPrompt(EvalTone.MOTIVATIONAL)).toMatchSnapshot('motivational');
    expect(buildSystemPrompt(EvalTone.NEUTRAL)).toMatchSnapshot('neutral');
  });

  it('embeds the tone name so Claude follows the right voice', () => {
    expect(buildSystemPrompt(EvalTone.DIRECT)).toContain('DIRECT');
    expect(buildSystemPrompt(EvalTone.MOTIVATIONAL)).toContain('MOTIVATIONAL');
    expect(buildSystemPrompt(EvalTone.NEUTRAL)).toContain('NEUTRAL');
  });

  it('never embeds dynamic data (so it stays cacheable)', () => {
    const prompt = buildSystemPrompt(EvalTone.MOTIVATIONAL);
    expect(prompt).not.toContain('Breakfast');
    expect(prompt).not.toContain('2100');
  });
});

describe('buildUserMessage', () => {
  it('lists each ingredient with its computed macros', () => {
    const out = buildUserMessage(input);
    expect(out).toContain('Oats: 60g');
    expect(out).toContain('Egg: 110g');
    expect(out).toContain('234 kcal');
  });

  it('shows meal totals and day totals separately', () => {
    const out = buildUserMessage(input);
    expect(out).toMatch(/Totals:.*22\.4g P.*388 kcal/);
    expect(out).toContain('Day so far');
  });

  it('renders an em-dash when a target is unset', () => {
    const out = buildUserMessage({
      ...input,
      targets: { kcal: null, protein: 145, carbs: null, fat: null },
    });
    expect(out).toContain('— · 145g protein · — · —');
  });

  it('uses just the type label when the meal has no name', () => {
    const out = buildUserMessage({
      ...input,
      meal: { ...input.meal, name: null },
    });
    expect(out).toContain('Breakfast:');
    expect(out).not.toContain('Breakfast — Oats + eggs');
  });
});

describe('buildUserMessage — batch', () => {
  const sibling: EvaluationInput['meal'] = {
    typeLabel: 'Pre-workout',
    name: null,
    entries: [{ name: 'Banana', grams: 120, kcal: 107, protein: 1.3, carbs: 27, fat: 0.4 }],
    totals: { kcal: 107, protein: 1.3, carbs: 27, fat: 0.4 },
  };

  it('frames the message as a batch when siblings are present', () => {
    const out = buildUserMessage({
      ...input,
      batchSiblings: [sibling],
      dayTotals: { kcal: 495, protein: 23.7, carbs: 68, fat: 15.4 },
    });
    expect(out).toContain('Batch logged in one session — 2 meals to evaluate together');
    expect(out).toContain('Meal 1 of 2:');
    expect(out).toContain('Meal 2 of 2:');
    expect(out).toContain('Pre-workout:');
    expect(out).toContain('Breakfast — Oats + eggs:');
    expect(out).toContain('Evaluate the batch as a whole');
  });

  it('orders siblings before the focal meal', () => {
    const out = buildUserMessage({
      ...input,
      batchSiblings: [sibling],
    });
    const preIdx = out.indexOf('Pre-workout');
    const breakfastIdx = out.indexOf('Breakfast — Oats + eggs');
    expect(preIdx).toBeGreaterThan(-1);
    expect(breakfastIdx).toBeGreaterThan(preIdx);
  });

  it('changes the "day so far" copy in batch mode', () => {
    const out = buildUserMessage({
      ...input,
      batchSiblings: [sibling],
    });
    expect(out).toContain('Day so far (incl. the whole batch)');
  });
});

describe('label maps', () => {
  it('covers every EvalTone enum value', () => {
    for (const tone of Object.values(EvalTone)) {
      expect(TONE_LABELS[tone]).toBeTruthy();
      expect(TONE_DESCRIPTIONS[tone]).toBeTruthy();
    }
  });
});
