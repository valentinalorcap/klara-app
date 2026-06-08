import { ICON_SVGS, type IconSvg } from './productIcons.generated';

/** Fallback when nothing else matches. Always present in the baked set. */
export const GENERIC_ICON = 'lucide:utensils-crossed';

/** The full curated palette — these are the only valid icon names. */
export const ICON_NAMES = Object.keys(ICON_SVGS);

export function getIconSvg(name: string): IconSvg {
  return ICON_SVGS[name] ?? ICON_SVGS[GENERIC_ICON];
}

export function isValidIcon(name: string | null | undefined): name is string {
  return typeof name === 'string' && name in ICON_SVGS;
}

/**
 * Keyword → icon rules (Spanish + English), checked in order; first match wins.
 * Keep specific rules above generic ones (e.g. "panceta" before "pan").
 * Only target icons that exist in the palette.
 */
const KEYWORD_RULES: Array<[string[], string]> = [
  // --- composite overrides: must beat greedy single-word rules (e.g. "leche") ---
  [['dulce de leche'], 'tabler:candy'],
  [['cafe', 'coffee', 'espresso', 'capuccino', 'capuchino', 'latte'], 'tabler:coffee'],

  // --- protein ---
  [['pollo', 'pechuga', 'muslo', 'chicken', 'pavo', 'turkey', 'ave'], 'lucide:drumstick'],
  [['jamon', 'panceta', 'tocino', 'bacon', 'pork', 'cerdo', 'ham'], 'lucide:ham'],
  [
    ['chorizo', 'salchicha', 'salame', 'salami', 'sausage', 'embutido', 'morcilla'],
    'tabler:sausage',
  ],
  [
    ['camaron', 'gamba', 'langostino', 'shrimp', 'prawn', 'marisco', 'seafood', 'pulpo', 'calamar'],
    'lucide:shrimp',
  ],
  [['pescado', 'atun', 'tuna', 'salmon', 'merluza', 'fish', 'trucha', 'sardina'], 'tabler:fish'],
  [['huevos', 'eggs'], 'tabler:eggs'],
  [['huevo', 'egg', 'clara', 'omelette', 'tortilla de huevo'], 'tabler:egg'],
  [
    [
      'poroto',
      'frijol',
      'lenteja',
      'garbanzo',
      'legumbre',
      'bean',
      'lentil',
      'chickpea',
      'edamame',
    ],
    'lucide:bean',
  ],
  [
    [
      'nuez',
      'nueces',
      'almendra',
      'mani',
      'cacahuate',
      'peanut',
      'almond',
      'cashew',
      'pistacho',
      'avellana',
      'frutos secos',
      'nut',
    ],
    'tabler:nut',
  ],
  [['tofu', 'soja', 'soya', 'soy', 'vegano', 'vegan', 'seitan'], 'lucide:vegan'],
  [
    [
      'milanesa',
      'carne',
      'res',
      'vacuna',
      'bife',
      'lomo',
      'asado',
      'beef',
      'steak',
      'molida',
      'picada',
    ],
    'tabler:meat',
  ],

  // --- dairy ---
  [['queso', 'cheese', 'mozzarella', 'parmesano', 'ricota'], 'tabler:cheese'],
  [['yogur', 'yoghurt', 'yogurt', 'skyr', 'leche', 'milk', 'crema', 'nata'], 'tabler:milk'],

  // --- supplements --- (above flavor words: a "protein chocolate" reads as a
  // supplement, not a sweet; but below dairy so "yogur proteico" stays milk)
  [
    [
      'proteina',
      'protein',
      'whey',
      'caseina',
      'creatina',
      'creatine',
      'bcaa',
      'pre workout',
      'preworkout',
      'suplemento',
      'supplement',
      'gainer',
    ],
    'tabler:barbell',
  ],

  // --- grains / carbs / dishes ---
  [['croissant', 'medialuna', 'factura'], 'lucide:croissant'],
  [['baguette', 'flauta'], 'tabler:baguette'],
  [['pan', 'tostada', 'toast', 'bread', 'bagel'], 'tabler:bread'],
  [['pizza', 'fugazza'], 'tabler:pizza'],
  [['hamburguesa', 'burger'], 'tabler:burger'],
  [['sandwich', 'sanguche', 'bocadillo', 'taco', 'burrito', 'wrap'], 'lucide:sandwich'],
  [['empanada', 'dumpling', 'gyoza', 'raviol', 'ñoqui', 'noqui'], 'tabler:dumpling'],
  [['pochoclo', 'palomita', 'cabritas', 'popcorn'], 'lucide:popcorn'],
  [['sopa', 'caldo', 'soup'], 'tabler:soup'],
  [['ensalada', 'salad'], 'tabler:salad'],
  [['pasta', 'fideos', 'spaghetti', 'noodle', 'ramen', 'arroz', 'rice'], 'tabler:bowl-spoon'],
  [
    ['avena', 'oat', 'granola', 'muesli', 'cereal', 'grano', 'grain', 'maiz', 'choclo'],
    'tabler:grain',
  ],
  [['trigo', 'harina', 'flour', 'wheat', 'salvado'], 'tabler:wheat'],

  // --- fruit / veg ---
  [['palta', 'aguacate', 'avocado'], 'tabler:avocado'],
  [['manzana', 'apple'], 'tabler:apple'],
  [['banana', 'platano', 'banano'], 'tabler:banana'],
  [['uva', 'pasas', 'grape', 'raisin'], 'tabler:grape'],
  [
    [
      'cereza',
      'guinda',
      'cherry',
      'frutilla',
      'strawberry',
      'arandano',
      'blueberry',
      'frambuesa',
      'berries',
      'berry',
    ],
    'tabler:cherry',
  ],
  [
    [
      'limon',
      'lima',
      'naranja',
      'mandarina',
      'pomelo',
      'lemon',
      'lime',
      'orange',
      'citrico',
      'citrus',
    ],
    'tabler:lemon',
  ],
  [['zanahoria', 'carrot'], 'tabler:carrot'],
  [['morron', 'pimiento', 'aji', 'chile', 'chili', 'jalapeno', 'pepper'], 'tabler:pepper'],
  [['hongo', 'champinon', 'champignon', 'seta', 'mushroom'], 'tabler:mushroom'],
  [
    [
      'verdura',
      'vegetal',
      'brocoli',
      'espinaca',
      'lechuga',
      'kale',
      'acelga',
      'vegetable',
      'spinach',
      'lettuce',
    ],
    'tabler:salad',
  ],
  [['fruta', 'fruit'], 'tabler:apple'],

  // --- sweets / desserts ---
  [['chocolate', 'cacao', 'cocoa'], 'tabler:chocolate'],
  [['galleta', 'galletita', 'cookie', 'biscuit', 'cracker'], 'tabler:cookie'],
  [['helado', 'ice cream', 'icecream'], 'tabler:ice-cream'],
  [['dona', 'donut', 'rosquilla'], 'lucide:donut'],
  [
    ['torta', 'pastel', 'tarta', 'budin', 'bizcocho', 'cake', 'brownie', 'muffin', 'magdalena'],
    'tabler:cake',
  ],
  [['flan', 'postre', 'pudding', 'mousse', 'dessert', 'gelatina'], 'lucide:dessert'],
  [
    [
      'caramelo',
      'golosina',
      'gomita',
      'gummy',
      'candy',
      'azucar',
      'sugar',
      'miel',
      'honey',
      'mermelada',
      'jam',
      'dulce de leche',
    ],
    'tabler:candy',
  ],

  // --- drinks --- (coffee handled in overrides above)
  [['mate', 'te', 'tea', 'infusion'], 'tabler:teapot'],
  [['agua', 'water'], 'lucide:glass-water'],
  [
    [
      'gaseosa',
      'refresco',
      'soda',
      'cola',
      'coca',
      'sprite',
      'fanta',
      'jugo',
      'zumo',
      'juice',
      'energy',
      'isotonic',
      'gatorade',
    ],
    'lucide:cup-soda',
  ],
  [['cerveza', 'birra', 'beer', 'lager', 'ipa'], 'tabler:beer'],
  [['champan', 'champagne', 'espumante', 'sidra', 'prosecco', 'cava'], 'tabler:glass-champagne'],
  [['vino', 'wine', 'tinto', 'malbec', 'cabernet'], 'lucide:wine'],
  [['martini', 'vermut', 'vermouth'], 'lucide:martini'],
  [
    ['trago', 'coctel', 'cocktail', 'margarita', 'mojito', 'daiquiri', 'caipirinha'],
    'tabler:glass-cocktail',
  ],
  [
    [
      'gin',
      'vodka',
      'whisky',
      'whiskey',
      'ron',
      'rum',
      'tequila',
      'fernet',
      'aperitivo',
      'licor',
      'liquor',
      'aperol',
    ],
    'tabler:glass-gin',
  ],
  [['batido', 'licuado', 'smoothie', 'shake', 'milkshake'], 'tabler:milkshake'],
  [['bubble tea', 'boba'], 'tabler:bubble-tea'],

  // --- condiments / cooking ---
  [
    [
      'aceite',
      'oliva',
      'oil',
      'vinagre',
      'vinegar',
      'aderezo',
      'dressing',
      'mayonesa',
      'mayo',
      'ketchup',
      'mostaza',
      'mustard',
      'salsa',
      'sauce',
    ],
    'tabler:bottle',
  ],
  [['sal', 'salt'], 'tabler:salt'],
  [['pimienta', 'condimento', 'especia', 'spice', 'comino', 'pimenton', 'oregano'], 'tabler:salt'],
  [['albahaca', 'perejil', 'cilantro', 'hierba', 'herb', 'menta', 'mint', 'romero'], 'tabler:leaf'],

  // --- snack bars (plain cereal/granola bars; protein bars hit the rule above) ---
  [['barrita', 'cereal bar', 'granola bar'], 'tabler:chocolate'],
];

function normalize(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

const singular = (w: string) => w.replace(/s$/, '');

/** Resolve a product name to a palette icon via the keyword map, or null. */
export function iconFromName(name: string): string | null {
  const n = normalize(name);
  const tokens = n.split(/[^a-z0-9]+/).filter(Boolean);
  for (const [keywords, icon] of KEYWORD_RULES) {
    for (const raw of keywords) {
      const k = normalize(raw);
      // Long/space-bearing keywords match anywhere; short ones must match a
      // whole token (so "sal" doesn't fire on "ensalada"), plural-insensitive.
      const hit =
        k.length >= 5 || k.includes(' ')
          ? n.includes(k.trim())
          : tokens.some((t) => singular(t) === singular(k));
      if (hit) return icon;
    }
  }
  return null;
}

/** Hybrid resolver: stored icon (Claude's pick) → keyword map → generic. */
export function resolveProductIcon(p: { icon?: string | null; name: string }): string {
  if (isValidIcon(p.icon)) return p.icon;
  return iconFromName(p.name) ?? GENERIC_ICON;
}

/**
 * Icon for a whole meal = its main dish. Tries the meal's own name first
 * (e.g. "Pollo con arroz" → drumstick); if it has no name or no match, uses
 * the dominant entry (most kcal); else the generic icon.
 */
export function mealIconName(meal: {
  name?: string | null;
  entries: ReadonlyArray<{ name: string; grams: number; kcalPer100g: number }>;
}): string {
  if (meal.name) {
    const fromName = iconFromName(meal.name);
    if (fromName) return fromName;
  }
  // Walk entries from most to least kcal, returning the first that maps —
  // so a top ingredient with no icon doesn't sink the whole meal to generic.
  const byKcal = [...meal.entries].sort(
    (a, b) => b.kcalPer100g * b.grams - a.kcalPer100g * a.grams,
  );
  for (const e of byKcal) {
    const fromEntry = iconFromName(e.name);
    if (fromEntry) return fromEntry;
  }
  return GENERIC_ICON;
}
