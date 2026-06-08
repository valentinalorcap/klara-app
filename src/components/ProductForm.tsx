'use client';

import { useActionState } from 'react';
import Link from 'next/link';
import type { ProductFormState } from '@/app/(app)/products/actions';
import { GlassCard } from './GlassCard';

type Product = {
  name: string;
  brand: string | null;
  kcalPer100g: number;
  proteinPer100g: number;
  carbsPer100g: number;
  fatPer100g: number;
  suggestedPortionGrams: number | null;
  icon?: string | null;
};

export function ProductForm({
  action,
  initialValues,
  submitLabel,
}: {
  action: (state: ProductFormState, formData: FormData) => Promise<ProductFormState>;
  initialValues?: Product;
  submitLabel: string;
}) {
  const [state, formAction, pending] = useActionState<ProductFormState, FormData>(action, {});

  return (
    <form action={formAction} className="space-y-5">
      {/* Carries Claude's scanned icon (or an existing product's) through
          to the server action. Not user-editable — icons are automatic. */}
      <input type="hidden" name="icon" defaultValue={initialValues?.icon ?? ''} />
      <Field
        label="Name"
        name="name"
        defaultValue={initialValues?.name}
        placeholder="Skyr yogurt"
        error={state.fieldErrors?.name}
        required
      />
      <Field
        label="Brand (optional)"
        name="brand"
        defaultValue={initialValues?.brand ?? ''}
        placeholder="Sancor"
        error={state.fieldErrors?.brand}
      />

      <GlassCard className="space-y-3 p-5">
        <p className="text-xs font-medium tracking-wider text-neutral-400 uppercase">Per 100g</p>
        <Field
          label="Calories (kcal)"
          name="kcalPer100g"
          type="number"
          step="0.1"
          defaultValue={initialValues?.kcalPer100g}
          error={state.fieldErrors?.kcalPer100g}
          required
        />
        <Field
          label="Protein (g)"
          name="proteinPer100g"
          type="number"
          step="0.1"
          defaultValue={initialValues?.proteinPer100g}
          error={state.fieldErrors?.proteinPer100g}
          required
        />
        <Field
          label="Carbs (g)"
          name="carbsPer100g"
          type="number"
          step="0.1"
          defaultValue={initialValues?.carbsPer100g}
          error={state.fieldErrors?.carbsPer100g}
          required
        />
        <Field
          label="Fat (g)"
          name="fatPer100g"
          type="number"
          step="0.1"
          defaultValue={initialValues?.fatPer100g}
          error={state.fieldErrors?.fatPer100g}
          required
        />
      </GlassCard>

      <Field
        label="Suggested portion (g / ml — optional)"
        name="suggestedPortionGrams"
        type="number"
        step="1"
        placeholder="e.g. 150"
        defaultValue={initialValues?.suggestedPortionGrams ?? ''}
        error={state.fieldErrors?.suggestedPortionGrams}
      />

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
          href="/products"
          className="block w-full rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-center text-sm font-medium text-neutral-300 transition hover:bg-white/[0.08]"
        >
          Cancel
        </Link>
      </div>
    </form>
  );
}

function Field({
  label,
  name,
  type = 'text',
  step,
  placeholder,
  defaultValue,
  error,
  required,
}: {
  label: string;
  name: string;
  type?: string;
  step?: string;
  placeholder?: string;
  defaultValue?: string | number;
  error?: string;
  required?: boolean;
}) {
  return (
    <label className="block">
      <span className="text-xs font-medium text-neutral-300">{label}</span>
      <input
        name={name}
        type={type}
        step={step}
        placeholder={placeholder}
        defaultValue={defaultValue}
        required={required}
        inputMode={type === 'number' ? 'decimal' : undefined}
        className={`mt-2 block w-full rounded-2xl border bg-white/[0.04] px-4 py-3 text-sm text-white transition placeholder:text-neutral-500 focus:bg-white/[0.08] focus:ring-2 focus:ring-[var(--accent)]/60 focus:outline-none ${
          error ? 'border-[var(--danger)]/60' : 'border-white/10'
        }`}
        aria-invalid={Boolean(error)}
      />
      {error ? <p className="mt-1.5 text-xs text-[var(--danger)]">{error}</p> : null}
    </label>
  );
}
