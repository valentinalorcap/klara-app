import { describe, expect, it } from 'vitest';
import {
  GENERIC_ICON,
  ICON_NAMES,
  getIconSvg,
  iconFromName,
  isValidIcon,
  resolveProductIcon,
} from './productIcons';

describe('product icon palette', () => {
  it('exposes a non-empty palette and the generic icon is in it', () => {
    expect(ICON_NAMES.length).toBeGreaterThan(50);
    expect(isValidIcon(GENERIC_ICON)).toBe(true);
  });

  it('every keyword-mapped icon exists in the baked palette', () => {
    // Sweep a broad set of names; whatever icon the map returns must be bakeable.
    const probes = [
      'pollo',
      'jamón',
      'queso',
      'vino',
      'cerveza',
      'café',
      'proteína whey',
      'ensalada',
      'manzana',
    ];
    for (const p of probes) {
      const icon = iconFromName(p);
      expect(icon).not.toBeNull();
      expect(getIconSvg(icon as string).body.length).toBeGreaterThan(0);
    }
  });
});

describe('iconFromName (keyword map, ES/EN, accent + plural insensitive)', () => {
  const cases: Array<[string, string]> = [
    ['Pechuga de pollo', 'lucide:drumstick'],
    ['Jamón cocido', 'lucide:ham'],
    ['Panceta ahumada', 'lucide:ham'],
    ['Aceite de oliva', 'tabler:bottle'],
    ['Ensalada mixta', 'tabler:salad'],
    ['Sal fina', 'tabler:salt'],
    ['Té verde', 'tabler:teapot'],
    ['Mate cocido', 'tabler:teapot'],
    ['Huevos', 'tabler:eggs'],
    ['Uvas', 'tabler:grape'],
    ['Proteína Whey', 'tabler:barbell'],
    ['Proteína chocolate Quamtrax', 'tabler:barbell'],
    ['Proteína frutilla', 'tabler:barbell'],
    ['Barra de chocolate', 'tabler:chocolate'],
    ['Vino tinto Malbec', 'lucide:wine'],
    ['Café con leche', 'tabler:coffee'],
    ['Dulce de leche', 'tabler:candy'],
    ['Yogur griego', 'tabler:milk'],
    ['Queso untable', 'tabler:cheese'],
  ];
  it.each(cases)('%s → %s', (name, expected) => {
    expect(iconFromName(name)).toBe(expected);
  });

  it('returns null for names with no sensible match', () => {
    expect(iconFromName('Tomate triturado')).toBeNull();
    expect(iconFromName('xyzzy')).toBeNull();
  });
});

describe('resolveProductIcon (hybrid: stored → keyword → generic)', () => {
  it('prefers a valid stored icon', () => {
    expect(resolveProductIcon({ icon: 'tabler:pizza', name: 'whatever' })).toBe('tabler:pizza');
  });

  it('ignores an invalid stored icon and falls back to the keyword map', () => {
    expect(resolveProductIcon({ icon: 'tabler:not-real', name: 'Pechuga de pollo' })).toBe(
      'lucide:drumstick',
    );
  });

  it('falls back to the generic icon when nothing matches', () => {
    expect(resolveProductIcon({ icon: null, name: 'Tomate triturado' })).toBe(GENERIC_ICON);
  });
});
