import { mealIconName } from './productIcons';

/** Maps a curated vector icon name → its closest emoji equivalent. */
export const ICON_TO_EMOJI: Record<string, string> = {
  'tabler:coffee': '☕',
  'lucide:drumstick': '🍗',
  'lucide:ham': '🥩',
  'tabler:sausage': '🌭',
  'lucide:shrimp': '🦐',
  'tabler:fish': '🐟',
  'tabler:eggs': '🥚',
  'tabler:egg': '🥚',
  'lucide:bean': '🫘',
  'tabler:nut': '🥜',
  'lucide:vegan': '🌱',
  'tabler:barbell': '💪',
  'lucide:croissant': '🥐',
  'tabler:baguette': '🥖',
  'tabler:bread': '🍞',
  'tabler:pizza': '🍕',
  'tabler:burger': '🍔',
  'lucide:sandwich': '🥪',
  'tabler:dumpling': '🥟',
  'lucide:popcorn': '🍿',
  'tabler:soup': '🍲',
  'tabler:salad': '🥗',
  'tabler:bowl-spoon': '🍝',
  'tabler:grain': '🌾',
  'tabler:wheat': '🌾',
  'tabler:avocado': '🥑',
  'tabler:apple': '🍎',
  'tabler:banana': '🍌',
  'tabler:grape': '🍇',
  'tabler:cherry': '🍒',
  'tabler:lemon': '🍋',
  'tabler:carrot': '🥕',
  'tabler:pepper': '🌶️',
  'tabler:mushroom': '🍄',
  'tabler:chocolate': '🍫',
  'tabler:cookie': '🍪',
  'tabler:ice-cream': '🍦',
  'lucide:donut': '🍩',
  'tabler:cake': '🎂',
  'lucide:dessert': '🍮',
  'tabler:candy': '🍬',
  'tabler:teapot': '🍵',
  'lucide:glass-water': '💧',
  'lucide:cup-soda': '🥤',
  'tabler:beer': '🍺',
  'tabler:glass-champagne': '🥂',
  'lucide:wine': '🍷',
  'lucide:martini': '🍸',
  'tabler:glass-cocktail': '🍹',
  'tabler:milk': '🥛',
  'lucide:utensils-crossed': '🍽️',
};

/** Default emoji for a meal, derived from its content keywords. */
export function mealDefaultEmoji(meal: {
  name?: string | null;
  entries: ReadonlyArray<{ name: string; grams: number; kcalPer100g: number }>;
}): string {
  const iconName = mealIconName(meal);
  return ICON_TO_EMOJI[iconName] ?? '🍽️';
}

/** Detect a single emoji from text typed into the native keyboard. */
export function extractEmoji(text: string): string | null {
  const match = text.match(/\p{Emoji_Presentation}/u);
  return match?.[0] ?? null;
}
