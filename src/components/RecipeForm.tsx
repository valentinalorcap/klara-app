'use client';

import { useActionState, useState, useMemo, useRef } from 'react';
import Link from 'next/link';
import { AnimatePresence } from 'framer-motion';
import { GlassCard } from './GlassCard';
import { type ProductOption, type LibraryItem } from './IngredientPicker';
import { IngredientTabs } from './IngredientTabs';
import { MacroStats } from './MacroStats';
import {
  IngredientSwipeRow,
  rowFromItem,
  rowFromEstimate,
  type IngredientRow,
} from './IngredientRow';
import { computeRecipeTotals, perPortion, effectiveTotalGrams } from '@/lib/recipes';
import type { EstimationEntry } from '@/lib/freeTextEstimation';
import type { RecipeFormState } from '@/app/(app)/library/recipes/actions';

type InitialRecipe = {
  name: string;
  portions: number;
  totalGrams: number | null;
  suggestedPortionGrams: number | null;
  ingredients: {
    name: string;
    grams: number;
    productId: string | null;
    kcalPer100g: number;
    proteinPer100g: number;
    carbsPer100g: number;
    fatPer100g: number;
  }[];
};

export function RecipeForm({
  action,
  products,
  initialValues,
  submitLabel,
}: {
  action: (state: RecipeFormState, formData: FormData) => Promise<RecipeFormState>;
  products: ProductOption[];
  initialValues?: InitialRecipe;
  submitLabel: string;
}) {
  const [state, formAction, pending] = useActionState<RecipeFormState, FormData>(action, {});
  const [name, setName] = useState(initialValues?.name ?? '');
  // Optional; left blank for a new recipe (auto-fills from weight ÷ portion).
  const [portions, setPortions] = useState(
    initialValues?.portions != null ? String(initialValues.portions) : '',
  );
  const [totalGrams, setTotalGrams] = useState(
    initialValues?.totalGrams != null ? String(initialValues.totalGrams) : '',
  );
  const [suggestedPortionGrams, setSuggestedPortionGrams] = useState(
    initialValues?.suggestedPortionGrams != null ? String(initialValues.suggestedPortionGrams) : '',
  );
  const [error, setError] = useState<string | null>(null);

  // Monotonic row-id source; initial rows get deterministic index ids so the
  // ref is never read during render (hydration-stable).
  const rowIdSeq = useRef(initialValues?.ingredients.length ?? 0);
  const nextRowId = () => `row-${rowIdSeq.current++}`;
  const [rows, setRows] = useState<IngredientRow[]>(
    initialValues?.ingredients.length
      ? initialValues.ingredients.map((i, idx) => ({
          id: `row-${idx}`,
          name: i.name,
          grams: String(i.grams),
          resolved: true,
          productId: i.productId ?? undefined,
          kcalPer100g: i.kcalPer100g,
          proteinPer100g: i.proteinPer100g,
          carbsPer100g: i.carbsPer100g,
          fatPer100g: i.fatPer100g,
        }))
      : [],
  );

  // Recipes can't contain recipes, so the picker only offers products.
  const productsAsItems = useMemo<LibraryItem[]>(
    () => products.map((p) => ({ kind: 'product', ...p })),
    [products],
  );

  const resolvedRows = useMemo(
    () =>
      rows
        .filter((r) => r.resolved && r.name.trim() && Number(r.grams) > 0)
        .map((r) => ({
          name: r.name,
          grams: Number(r.grams),
          kcalPer100g: r.kcalPer100g,
          proteinPer100g: r.proteinPer100g,
          carbsPer100g: r.carbsPer100g,
          fatPer100g: r.fatPer100g,
        })),
    [rows],
  );
  const totals = useMemo(() => computeRecipeTotals(resolvedRows), [resolvedRows]);
  const portionsNum = Number(portions) || 1;

  const ingredientSumGrams = useMemo(
    () => resolvedRows.reduce((sum, r) => sum + r.grams, 0),
    [resolvedRows],
  );
  const totalGramsForDefault = Number(totalGrams) || ingredientSumGrams;

  // Live preview: per the suggested portion grams when set (recipe scaled to
  // those grams), else fall back to total ÷ portions.
  const denom = effectiveTotalGrams({ totalGrams: Number(totalGrams) || null, ingredientSumGrams });
  const sp = Number(suggestedPortionGrams);
  const usePortionGrams = sp > 0 && denom > 0;
  const perPortionMacros = usePortionGrams
    ? {
        kcal: (totals.totalKcal * sp) / denom,
        protein: (totals.totalProtein * sp) / denom,
        carbs: (totals.totalCarbs * sp) / denom,
        fat: (totals.totalFat * sp) / denom,
      }
    : perPortion(totals, portionsNum);

  // When both cooked weight and a suggested portion are set, derive the number
  // of portions automatically (weight ÷ portion).
  function autoPortions(weight: number, portion: number) {
    if (weight > 0 && portion > 0) setPortions(String(Math.max(1, Math.round(weight / portion))));
  }
  function onTotalGrams(v: string) {
    setTotalGrams(v);
    autoPortions(Number(v), Number(suggestedPortionGrams));
  }
  function onSuggestedPortion(v: string) {
    setSuggestedPortionGrams(v);
    autoPortions(Number(totalGrams), Number(v));
  }

  function updateGrams(index: number, grams: string) {
    setRows((prev) => prev.map((r, i) => (i === index ? { ...r, grams } : r)));
  }
  function removeRow(index: number) {
    setRows((prev) => prev.filter((_, i) => i !== index));
  }
  function addRowFromItem(item: LibraryItem, grams: number) {
    setError(null);
    setRows((prev) => [...prev, rowFromItem(item, grams, nextRowId())]);
  }
  function addRowsFromEstimate(entries: EstimationEntry[]) {
    setError(null);
    setRows((prev) => [...prev, ...entries.map((e) => rowFromEstimate(e, nextRowId()))]);
  }

  // Server expects `ingredients` as JSON. Recipe ingredients only link to a
  // product (no recipe-in-recipe), so a recipeId from a match is dropped here.
  const ingredientsJson = JSON.stringify(
    rows
      .filter((r) => r.resolved && r.name.trim() && Number(r.grams) > 0)
      .map((r) => ({
        name: r.name.trim(),
        grams: Number(r.grams),
        productId: r.productId,
        kcalPer100g: r.kcalPer100g,
        proteinPer100g: r.proteinPer100g,
        carbsPer100g: r.carbsPer100g,
        fatPer100g: r.fatPer100g,
      })),
  );

  return (
    <form action={formAction} className="space-y-5">
      <input type="hidden" name="ingredients" value={ingredientsJson} />

      <TextField
        label="Recipe Name"
        name="name"
        value={name}
        onChange={setName}
        placeholder="Banana bread"
        error={state.fieldErrors?.name}
        required
      />

      {rows.length > 0 ? (
        <GlassCard className="p-4">
          <ul>
            <AnimatePresence initial={false}>
              {rows.map((row, i) => (
                <IngredientSwipeRow
                  key={row.id}
                  row={row}
                  isLast={i === rows.length - 1}
                  onGramsChange={(grams) => updateGrams(i, grams)}
                  onRemove={() => removeRow(i)}
                />
              ))}
            </AnimatePresence>
          </ul>
        </GlassCard>
      ) : null}

      <GlassCard className="p-4">
        <IngredientTabs
          items={productsAsItems}
          onAddItem={addRowFromItem}
          onAddEstimate={addRowsFromEstimate}
          onError={(m) => setError(m || null)}
          describePlaceholder="e.g. 2 cups flour, 3 eggs, 1 banana"
        />
      </GlassCard>

      {error ? (
        <p className="text-sm text-[var(--danger)]" role="alert">
          {error}
        </p>
      ) : null}
      {state.fieldErrors?.ingredients ? (
        <p className="text-xs text-[var(--danger)]">{state.fieldErrors.ingredients}</p>
      ) : null}

      <GlassCard className="space-y-3 p-4">
        <p className="text-xs font-medium tracking-wider text-neutral-400 uppercase">
          Portions &amp; weight
          <span className="ml-2 text-[10px] text-neutral-500 normal-case">· optional</span>
        </p>
        <p className="-mt-2 text-[11px] text-neutral-500">
          Sets the default serving size when you log this recipe.
        </p>
        <TextField
          label="Total cooked weight (g)"
          name="totalGrams"
          type="number"
          row
          value={totalGrams}
          onChange={onTotalGrams}
          placeholder={ingredientSumGrams ? String(Math.round(ingredientSumGrams)) : '1100'}
          error={state.fieldErrors?.totalGrams}
        />
        <TextField
          label="Suggested portion (g)"
          name="suggestedPortionGrams"
          type="number"
          row
          value={suggestedPortionGrams}
          onChange={onSuggestedPortion}
          placeholder={
            totalGramsForDefault && portionsNum > 0
              ? String(Math.round(totalGramsForDefault / portionsNum))
              : '150'
          }
          error={state.fieldErrors?.suggestedPortionGrams}
        />
        <TextField
          label="Portions"
          name="portions"
          type="number"
          row
          value={portions}
          onChange={setPortions}
          placeholder="1"
          error={state.fieldErrors?.portions}
        />
      </GlassCard>

      <MacroStats
        title={usePortionGrams ? `Per portion · ${Math.round(sp)}g (live)` : 'Per portion (live)'}
        kcal={perPortionMacros.kcal}
        protein={perPortionMacros.protein}
        carbs={perPortionMacros.carbs}
        fat={perPortionMacros.fat}
      />

      {state.fieldErrors && Object.keys(state.fieldErrors).length > 0 ? (
        <p className="text-sm text-[var(--danger)]" role="alert">
          You have fields left to complete.
        </p>
      ) : null}
      {state.formError ? (
        <p className="text-sm text-[var(--danger)]" role="alert">
          {state.formError}
        </p>
      ) : null}

      <div className="space-y-2">
        <button
          type="submit"
          disabled={pending}
          className="w-full rounded-2xl bg-[var(--accent)] px-4 py-3.5 text-sm font-semibold text-white transition hover:bg-[var(--accent-hover)] active:scale-[0.98] disabled:opacity-50"
        >
          {pending ? 'Saving…' : submitLabel}
        </button>
        <Link
          href="/library"
          className="block w-full rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-center text-sm font-medium text-neutral-300 transition hover:bg-white/[0.08]"
        >
          Cancel
        </Link>
      </div>
    </form>
  );
}

function TextField({
  label,
  name,
  value,
  onChange,
  placeholder,
  type = 'text',
  error,
  row = false,
  required = false,
}: {
  label: string;
  name: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: string;
  error?: string;
  /** Compact row layout (label left, value input right) — like other views. */
  row?: boolean;
  /** Show a "*" after the label. */
  required?: boolean;
}) {
  const border = error ? 'border-[var(--danger)]/60' : 'border-white/10';
  const labelNode = (
    <>
      {label}
      {required ? <span className="text-[var(--accent-text)]"> *</span> : null}
    </>
  );

  if (row) {
    return (
      <div>
        <label className="flex items-center justify-between gap-3">
          <span className="text-sm text-neutral-300">{labelNode}</span>
          <input
            name={name}
            type={type}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onFocus={(e) => e.target.select()}
            placeholder={placeholder}
            inputMode={type === 'number' ? 'numeric' : undefined}
            className={`w-24 rounded-2xl border bg-white/[0.04] px-3 py-2 text-right text-sm text-white tabular-nums transition placeholder:text-neutral-500 focus:bg-white/[0.08] focus:ring-2 focus:ring-[var(--accent)]/60 focus:outline-none ${border}`}
            aria-invalid={Boolean(error)}
          />
        </label>
        {error ? <p className="mt-1 text-right text-xs text-[var(--danger)]">{error}</p> : null}
      </div>
    );
  }

  return (
    <label className="block">
      <span className="text-xs font-medium text-neutral-300">{labelNode}</span>
      <input
        name={name}
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        inputMode={type === 'number' ? 'numeric' : undefined}
        className={`mt-2 block w-full rounded-2xl border bg-white/[0.04] px-4 py-3 text-sm text-white transition placeholder:text-neutral-500 focus:bg-white/[0.08] focus:ring-2 focus:ring-[var(--accent)]/60 focus:outline-none ${border}`}
        aria-invalid={Boolean(error)}
      />
      {error ? <p className="mt-1.5 text-xs text-[var(--danger)]">{error}</p> : null}
    </label>
  );
}
