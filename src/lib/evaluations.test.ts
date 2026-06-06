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

  it('makes the OVER-target rule explicit so Claude never tells an over user to eat more of that macro', () => {
    const prompt = buildSystemPrompt(EvalTone.MOTIVATIONAL);
    expect(prompt).toMatch(/OVER/);
    expect(prompt).toMatch(/never|NEVER/i);
  });

  it('never embeds dynamic data (so it stays cacheable)', () => {
    const prompt = buildSystemPrompt(EvalTone.MOTIVATIONAL);
    expect(prompt).not.toContain('Breakfast');
    expect(prompt).not.toContain('2100');
  });
});

describe('buildUserMessage — single meal', () => {
  it('leads with the Day status block so Claude anchors on the day', () => {
    const out = buildUserMessage(input);
    const statusIdx = out.indexOf('Day status');
    const triggerIdx = out.indexOf('Just logged');
    expect(statusIdx).toBeGreaterThanOrEqual(0);
    expect(triggerIdx).toBeGreaterThan(statusIdx);
  });

  it('tags each macro with OVER / UNDER / ON-TRACK relative to its target', () => {
    const out = buildUserMessage({
      ...input,
      dayTotals: { kcal: 2400, protein: 160, carbs: 230, fat: 65 },
    });
    expect(out).toMatch(/Calories: .* \(114% — OVER\)/);
    expect(out).toMatch(/Protein: .* \(110% — OVER\)/);
    // 230/220 = 105% → ON-TRACK
    expect(out).toMatch(/Carbs: .* \(105% — ON-TRACK\)/);
    // 65/70 = 93% → ON-TRACK
    expect(out).toMatch(/Fat: .* \(93% — ON-TRACK\)/);
  });

  it('marks UNDER when day totals are well below target', () => {
    const out = buildUserMessage(input); // day totals are tiny vs targets
    expect(out).toMatch(/Protein:.*UNDER/);
    expect(out).toMatch(/Calories:.*UNDER/);
  });

  it('marks unset targets as UNSET and tells Claude to skip them', () => {
    const out = buildUserMessage({
      ...input,
      targets: { kcal: null, protein: 145, carbs: null, fat: null },
    });
    expect(out).toContain('Calories:');
    expect(out).toContain('target UNSET');
    expect(out).toContain('Protein:');
    expect(out).not.toMatch(/Protein:.*UNSET/);
  });

  it('lists each ingredient in the trigger block', () => {
    const out = buildUserMessage(input);
    expect(out).toContain('Oats: 60g');
    expect(out).toContain('Egg: 110g');
    expect(out).toContain('234 kcal');
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

  it('frames the trigger as a batch when siblings are present', () => {
    const out = buildUserMessage({
      ...input,
      batchSiblings: [sibling],
      dayTotals: { kcal: 495, protein: 23.7, carbs: 68, fat: 15.4 },
    });
    expect(out).toContain('Just logged: a batch of 2 meals');
    expect(out).toContain('Meal 1 of 2:');
    expect(out).toContain('Meal 2 of 2:');
    expect(out).toContain('Pre-workout:');
    expect(out).toContain('Breakfast — Oats + eggs:');
  });

  it('still leads with the Day status block in batch mode', () => {
    const out = buildUserMessage({ ...input, batchSiblings: [sibling] });
    const statusIdx = out.indexOf('Day status');
    const triggerIdx = out.indexOf('Just logged');
    expect(statusIdx).toBeGreaterThanOrEqual(0);
    expect(triggerIdx).toBeGreaterThan(statusIdx);
  });

  it('orders siblings before the focal meal', () => {
    const out = buildUserMessage({ ...input, batchSiblings: [sibling] });
    const preIdx = out.indexOf('Pre-workout');
    const breakfastIdx = out.indexOf('Breakfast — Oats + eggs');
    expect(preIdx).toBeGreaterThan(-1);
    expect(breakfastIdx).toBeGreaterThan(preIdx);
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
