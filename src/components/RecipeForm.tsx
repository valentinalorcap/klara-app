'use client';

import { useActionState, useState, useMemo } from 'react';
import Link from 'next/link';
import { Trash2, Plus } from 'lucide-react';
import { GlassCard } from './GlassCard';
import { computeRecipeTotals, perPortion, type ProductMacros } from '@/lib/recipes';
import type { RecipeFormState } from '@/app/(app)/recipes/actions';

type ProductOption = ProductMacros & {
  id: string;
  name: string;
  brand: string | null;
};

type IngredientRow = {
  productId: string;
  grams: string; // kept as string while editing so empty input is allowed
};

type InitialRecipe = {
  name: string;
  portions: number;
  ingredients: { productId: string; grams: number }[];
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
  const [rows, setRows] = useState<IngredientRow[]>(
    initialValues?.ingredients.length
      ? initialValues.ingredients.map((i) => ({ productId: i.productId, grams: String(i.grams) }))
      : [{ productId: '', grams: '' }],
  );

  const productsById = useMemo(
    () => Object.fromEntries(products.map((p) => [p.id, p])),
    [products],
  );

  const totals = useMemo(() => {
    const parsed = rows
      .map((r) => ({ productId: r.productId, grams: Number(r.grams) }))
      .filter((r) => r.productId && Number.isFinite(r.grams) && r.grams > 0);
    return computeRecipeTotals(parsed, productsById);
  }, [rows, productsById]);

  const portionsNum = Number(portions) || 1;
  const perPortionMacros = perPortion(totals, portionsNum);

  function updateRow(index: number, patch: Partial<IngredientRow>) {
    setRows((prev) => prev.map((r, i) => (i === index ? { ...r, ...patch } : r)));
  }
  function addRow() {
    setRows((prev) => [...prev, { productId: '', grams: '' }]);
  }
  function removeRow(index: number) {
    setRows((prev) => (prev.length > 1 ? prev.filter((_, i) => i !== index) : prev));
  }

  // Server expects `ingredients` as JSON string.
  const ingredientsJson = JSON.stringify(
    rows
      .map((r) => ({ productId: r.productId, grams: Number(r.grams) }))
      .filter((r) => r.productId && Number.isFinite(r.grams) && r.grams > 0),
  );

  if (products.length === 0) {
    return (
      <GlassCard className="p-8 text-center">
        <p className="text-sm leading-relaxed text-neutral-300">
          You need at least one product to build a recipe.
        </p>
        <Link
          href="/products/new"
          className="mt-5 inline-flex w-full items-center justify-center rounded-2xl bg-[var(--accent)] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[var(--accent-hover)]"
        >
          Add a product first
        </Link>
      </GlassCard>
    );
  }

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

      <GlassCard className="space-y-3 p-5">
        <div className="flex items-baseline justify-between">
          <p className="text-xs font-medium tracking-wider text-neutral-400 uppercase">
            Ingredients
          </p>
          <button
            type="button"
            onClick={addRow}
            className="inline-flex items-center gap-1 text-xs font-medium text-[var(--accent)] transition hover:text-[var(--accent-hover)]"
          >
            <Plus size={14} /> Add
          </button>
        </div>

        {rows.map((row, i) => (
          <div key={i} className="flex items-end gap-2">
            <label className="block flex-1">
              <span className="text-xs text-neutral-400">Product</span>
              <select
                value={row.productId}
                onChange={(e) => updateRow(i, { productId: e.target.value })}
                className="mt-1 block w-full rounded-2xl border border-white/10 bg-white/[0.04] px-3 py-2.5 text-sm text-white focus:bg-white/[0.08] focus:ring-2 focus:ring-[var(--accent)]/60 focus:outline-none"
              >
                <option value="">Pick a product</option>
                {products.map((p) => (
                  <option key={p.id} value={p.id} className="bg-[#1e1b4b]">
                    {p.name}
                    {p.brand ? ` · ${p.brand}` : ''}
                  </option>
                ))}
              </select>
            </label>
            <label className="block w-24">
              <span className="text-xs text-neutral-400">Grams</span>
              <input
                type="number"
                inputMode="decimal"
                value={row.grams}
                onChange={(e) => updateRow(i, { grams: e.target.value })}
                placeholder="100"
                className="mt-1 block w-full rounded-2xl border border-white/10 bg-white/[0.04] px-3 py-2.5 text-sm text-white placeholder:text-neutral-500 focus:bg-white/[0.08] focus:ring-2 focus:ring-[var(--accent)]/60 focus:outline-none"
              />
            </label>
            <button
              type="button"
              onClick={() => removeRow(i)}
              aria-label="Remove ingredient"
              disabled={rows.length === 1}
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-neutral-400 transition hover:bg-white/5 hover:text-[var(--danger)] disabled:opacity-30"
            >
              <Trash2 size={16} />
            </button>
          </div>
        ))}

        {state.fieldErrors?.ingredients ? (
          <p className="text-xs text-[var(--danger)]">{state.fieldErrors.ingredients}</p>
        ) : null}
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
          href="/recipes"
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
