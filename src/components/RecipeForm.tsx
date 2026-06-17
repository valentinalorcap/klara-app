'use client';

import { useActionState, useState, useMemo, useRef } from 'react';
import Link from 'next/link';
import { GlassCard } from './GlassCard';
import { type ProductOption, type LibraryItem } from './IngredientPicker';
import { DescribeMeal } from './DescribeMeal';
import { ProductPicker } from './ProductPicker';
import {
  IngredientSwipeRow,
  rowFromItem,
  rowFromEstimate,
  type IngredientRow,
} from './IngredientRow';
import { computeRecipeTotals, perPortion } from '@/lib/recipes';
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
  const [portions, setPortions] = useState(String(initialValues?.portions ?? 1));
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
  const perPortionMacros = perPortion(totals, portionsNum);

  const ingredientSumGrams = useMemo(
    () => resolvedRows.reduce((sum, r) => sum + r.grams, 0),
    [resolvedRows],
  );
  const totalGramsForDefault = Number(totalGrams) || ingredientSumGrams;

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
        label="Name"
        name="name"
        value={name}
        onChange={setName}
        placeholder="Banana bread"
        error={state.fieldErrors?.name}
      />
      <TextField
        label="Portions"
        name="portions"
        type="number"
        value={portions}
        onChange={setPortions}
        placeholder="8"
        error={state.fieldErrors?.portions}
      />

      {rows.length > 0 ? (
        <GlassCard className="p-5">
          <ul>
            {rows.map((row, i) => (
              <IngredientSwipeRow
                key={row.id}
                row={row}
                isLast={i === rows.length - 1}
                onGramsChange={(grams) => updateGrams(i, grams)}
                onRemove={() => removeRow(i)}
              />
            ))}
          </ul>
        </GlassCard>
      ) : null}

      <GlassCard className="p-5">
        <DescribeMeal
          label="Describe the ingredients"
          placeholder="e.g. 2 cups flour, 3 eggs, 1 banana"
          onAddEstimate={addRowsFromEstimate}
          onError={(m) => setError(m || null)}
        />
      </GlassCard>

      <GlassCard className="p-5">
        <ProductPicker items={productsAsItems} onAddItem={addRowFromItem} />
      </GlassCard>

      {error ? (
        <p className="text-sm text-[var(--danger)]" role="alert">
          {error}
        </p>
      ) : null}
      {state.fieldErrors?.ingredients ? (
        <p className="text-xs text-[var(--danger)]">{state.fieldErrors.ingredients}</p>
      ) : null}

      <GlassCard className="space-y-3 p-5">
        <p className="text-xs font-medium tracking-wider text-neutral-400 uppercase">
          Optional weight
        </p>
        <p className="-mt-1 text-[11px] text-neutral-500">
          If you weigh the cooked dish, set the total grams here. When logging this recipe to a
          meal, the suggested portion seeds the grams field.
        </p>
        <TextField
          label="Total cooked weight (g)"
          name="totalGrams"
          type="number"
          value={totalGrams}
          onChange={setTotalGrams}
          placeholder={ingredientSumGrams ? `e.g. ${Math.round(ingredientSumGrams)}` : 'e.g. 1100'}
          error={state.fieldErrors?.totalGrams}
        />
        <TextField
          label="Suggested portion (g)"
          name="suggestedPortionGrams"
          type="number"
          value={suggestedPortionGrams}
          onChange={setSuggestedPortionGrams}
          placeholder={
            totalGramsForDefault && portionsNum > 0
              ? `e.g. ${Math.round(totalGramsForDefault / portionsNum)}`
              : 'e.g. 150'
          }
          error={state.fieldErrors?.suggestedPortionGrams}
        />
      </GlassCard>

      <GlassCard className="space-y-3 p-5">
        <p className="text-xs font-medium tracking-wider text-neutral-400 uppercase">
          Per portion (live)
        </p>
        <div className="grid grid-cols-4 gap-3 text-center">
          <Stat label="kcal" value={Math.round(perPortionMacros.kcal)} />
          <Stat label="P" value={perPortionMacros.protein.toFixed(1) + 'g'} />
          <Stat label="C" value={perPortionMacros.carbs.toFixed(1) + 'g'} />
          <Stat label="F" value={perPortionMacros.fat.toFixed(1) + 'g'} />
        </div>
      </GlassCard>

      {state.formError ? (
        <p className="text-sm text-[var(--danger)]" role="alert">
          {state.formError}
        </p>
      ) : null}

      <div className="space-y-2">
        <button
          type="submit"
          disabled={pending}
          className="w-full rounded-2xl bg-[var(--accent)] px-4 py-3.5 text-sm font-semibold text-white shadow-[0_8px_24px_-8px_var(--accent-glow)] transition hover:bg-[var(--accent-hover)] active:scale-[0.98] disabled:opacity-50"
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

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div>
      <p className="text-base font-semibold text-white tabular-nums">{value}</p>
      <p className="mt-0.5 text-[10px] tracking-wider text-neutral-500 uppercase">{label}</p>
    </div>
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
}: {
  label: string;
  name: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: string;
  error?: string;
}) {
  return (
    <label className="block">
      <span className="text-xs font-medium text-neutral-300">{label}</span>
      <input
        name={name}
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        inputMode={type === 'number' ? 'numeric' : undefined}
        className={`mt-2 block w-full rounded-2xl border bg-white/[0.04] px-4 py-3 text-sm text-white transition placeholder:text-neutral-500 focus:bg-white/[0.08] focus:ring-2 focus:ring-[var(--accent)]/60 focus:outline-none ${
          error ? 'border-[var(--danger)]/60' : 'border-white/10'
        }`}
        aria-invalid={Boolean(error)}
      />
      {error ? <p className="mt-1.5 text-xs text-[var(--danger)]">{error}</p> : null}
    </label>
  );
}
