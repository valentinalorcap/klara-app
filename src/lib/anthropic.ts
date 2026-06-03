import Anthropic from '@anthropic-ai/sdk';

let cached: Anthropic | null = null;

/** Lazily-instantiated Anthropic client. Throws clearly if the env key is missing. */
export function getAnthropic(): Anthropic {
  if (cached) return cached;
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error(
      'ANTHROPIC_API_KEY is not set. Add it to .env locally and to Vercel project env vars.',
    );
  }
  cached = new Anthropic({ apiKey });
  return cached;
}

export const MODELS = {
  /** Smart model with vision — for label extraction, free-text estimation, chat queries. */
  sonnet: 'claude-sonnet-4-6',
  /** Fast cheap model — for per-meal evaluations and high-volume simple calls. */
  haiku: 'claude-haiku-4-5-20251001',
} as const;
