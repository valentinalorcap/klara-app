'use client';

import { useActionState, useState, useMemo } from 'react';
import Link from 'next/link';
import { Trash2, Plus } from 'lucide-react';
import { GlassCard } from './GlassCard';
import { IngredientPicker, type ProductOption } from './IngredientPicker';
import { computeRecipeTotals, perPortion } from '@/lib/recipes';
import type { RecipeFormState } from '@/app/(app)/recipes/actions';

type IngredientRow = {
  /** The displayed/typed name. Always present after the user types or picks. */
  name: string;
  /** Stored as string while editing so the input can be cleared. */
  grams: string;
  /** Whether macros have been filled (by AI or library). */
  resolved: boolean;
  productId?: string;
  kcalPer100g: number;
  proteinPer100g: number;
  carbsPer100g: number;
  fatPer100g: number;
};

function emptyRow(): IngredientRow {
  return {
    name: '',
    grams: '',
    resolved: false,
    kcalPer100g: 0,
    proteinPer100g: 0,
    carbsPer100g: 0,
    fatPer100g: 0,
  };
}

type InitialRecipe = {
  name: string;
  portions: number;
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
  const [rowError, setRowError] = useState<string | null>(null);
  const [rows, setRows] = useState<IngredientRow[]>(
    initialValues?.ingredients.length
      ? initialValues.ingredients.map((i) => ({
          name: i.name,
          grams: String(i.grams),
          resolved: true,
          productId: i.productId ?? undefined,
          kcalPer100g: i.kcalPer100g,
          proteinPer100g: i.proteinPer100g,
          carbsPer100g: i.carbsPer100g,
          fatPer100g: i.fatPer100g,
        }))
      : [emptyRow()],
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

  function updateRow(index: number, patch: Partial<IngredientRow>) {
    setRows((prev) => prev.map((r, i) => (i === index ? { ...r, ...patch } : r)));
  }
  function addRow() {
    setRowError(null);
    setRows((prev) => [...prev, emptyRow()]);
  }
  function removeRow(index: number) {
    setRows((prev) => (prev.length > 1 ? prev.filter((_, i) => i !== index) : prev));
  }

  // Server expects `ingredients` as JSON.
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

      <GlassCard className="relative z-10 space-y-4 p-5">
        <p className="text-xs font-medium tracking-wider text-neutral-400 uppercase">Ingredients</p>

        {rows.map((row, i) => (
          <div key={i} className="space-y-2">
            <div className="flex items-end gap-1.5">
              <div className="min-w-0 flex-1">
                <IngredientPicker
                  value={row.name}
                  products={products}
                  onNameChange={(name) =>
                    updateRow(i, { name, resolved: row.resolved && row.name === name })
                  }
                  onSelectProduct={(p) =>
                    updateRow(i, {
                      name: p.name,
                      productId: p.id,
                      resolved: true,
                      kcalPer100g: p.kcalPer100g,
                      proteinPer100g: p.proteinPer100g,
                      carbsPer100g: p.carbsPer100g,
                      fatPer100g: p.fatPer100g,
                    })
                  }
                  onAiResolved={(data) =>
                    updateRow(i, {
                      name: data.canonicalName,
                      productId: undefined,
                      resolved: true,
                      kcalPer100g: data.kcalPer100g,
                      proteinPer100g: data.proteinPer100g,
                      carbsPer100g: data.carbsPer100g,
                      fatPer100g: data.fatPer100g,
                      // Only auto-fill grams if the user hasn't typed any yet —
                      // respect manual input.
                      grams:
                        data.estimatedGrams && row.grams.trim() === ''
                          ? String(data.estimatedGrams)
                          : row.grams,
                    })
                  }
                  onError={(msg) => setRowError(msg)}
                />
              </div>
              <label className="block w-16 shrink-0">
                <span className="text-xs text-neutral-400">Grams</span>
                <input
                  type="number"
                  inputMode="decimal"
                  value={row.grams}
                  onChange={(e) => updateRow(i, { grams: e.target.value })}
                  placeholder="100"
                  className="mt-1 block w-full rounded-2xl border border-white/10 bg-white/[0.04] px-2 py-2.5 text-center text-sm text-white tabular-nums placeholder:text-neutral-500 focus:bg-white/[0.08] focus:ring-2 focus:ring-[var(--accent)]/60 focus:outline-none"
                />
              </label>
              <button
                type="button"
                onClick={() => removeRow(i)}
                aria-label="Remove ingredient"
                disabled={rows.length === 1}
                className="-mr-2 flex h-10 w-8 shrink-0 items-center justify-end self-end text-neutral-400 transition hover:text-[var(--danger)] disabled:opacity-30"
              >
                <Trash2 size={16} />
              </button>
            </div>

            {row.resolved ? (
              <p className="pl-1 text-[11px] text-neutral-500 tabular-nums">
                {Math.round(row.kcalPer100g)} kcal · P {row.proteinPer100g.toFixed(1)}g · C{' '}
                {row.carbsPer100g.toFixed(1)}g · F {row.fatPer100g.toFixed(1)}g · per 100g
              </p>
            ) : null}
          </div>
        ))}

        {rowError ? (
          <p className="text-xs text-[var(--danger)]" role="alert">
            {rowError}
          </p>
        ) : null}
        {state.fieldErrors?.ingredients ? (
          <p className="text-xs text-[var(--danger)]">{state.fieldErrors.ingredients}</p>
        ) : null}

        <button
          type="button"
          onClick={addRow}
          className="flex w-full items-center justify-center gap-1.5 rounded-2xl border border-dashed border-white/15 px-4 py-3 text-xs font-medium text-[var(--accent)] transition hover:border-[var(--accent)]/60 hover:bg-[var(--accent)]/5"
        >
          <Plus size={14} /> Add ingredient
        </button>
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
