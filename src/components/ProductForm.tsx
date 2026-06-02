'use client';

import { useActionState } from 'react';
import Link from 'next/link';
import type { ProductFormState } from '@/app/(app)/products/actions';

type Product = {
  name: string;
  brand: string | null;
  kcalPer100g: number;
  proteinPer100g: number;
  carbsPer100g: number;
  fatPer100g: number;
};

export function ProductForm({
  action,
  initialValues,
  submitLabel,
  onDelete,
}: {
  action: (state: ProductFormState, formData: FormData) => Promise<ProductFormState>;
  initialValues?: Product;
  submitLabel: string;
  onDelete?: () => void;
}) {
  const [state, formAction, pending] = useActionState<ProductFormState, FormData>(action, {});

  return (
    <form action={formAction} className="space-y-5">
      <Field
        label="Nombre"
        name="name"
        defaultValue={initialValues?.name}
        placeholder="Yogur skyr"
        error={state.fieldErrors?.name}
        required
      />
      <Field
        label="Marca (opcional)"
        name="brand"
        defaultValue={initialValues?.brand ?? ''}
        placeholder="Sancor"
        error={state.fieldErrors?.brand}
      />

      <fieldset className="space-y-3 rounded-xl border border-neutral-200 bg-white p-4">
        <legend className="px-1 text-xs font-medium tracking-wider text-neutral-500 uppercase">
          Por 100g
        </legend>
        <Field
          label="Calorías (kcal)"
          name="kcalPer100g"
          type="number"
          step="0.1"
          defaultValue={initialValues?.kcalPer100g}
          error={state.fieldErrors?.kcalPer100g}
          required
        />
        <Field
          label="Proteína (g)"
          name="proteinPer100g"
          type="number"
          step="0.1"
          defaultValue={initialValues?.proteinPer100g}
          error={state.fieldErrors?.proteinPer100g}
          required
        />
        <Field
          label="Carbohidratos (g)"
          name="carbsPer100g"
          type="number"
          step="0.1"
          defaultValue={initialValues?.carbsPer100g}
          error={state.fieldErrors?.carbsPer100g}
          required
        />
        <Field
          label="Grasas (g)"
          name="fatPer100g"
          type="number"
          step="0.1"
          defaultValue={initialValues?.fatPer100g}
          error={state.fieldErrors?.fatPer100g}
          required
        />
      </fieldset>

      {state.formError ? (
        <p className="text-sm text-red-600" role="alert">
          {state.formError}
        </p>
      ) : null}

      <div className="space-y-2">
        <button
          type="submit"
          disabled={pending}
          className="w-full rounded-md bg-neutral-900 px-4 py-3 text-sm font-medium text-white transition hover:bg-neutral-800 disabled:opacity-50"
        >
          {pending ? 'Guardando…' : submitLabel}
        </button>
        <Link
          href="/products"
          className="block w-full rounded-md border border-neutral-300 bg-white px-4 py-2 text-center text-sm font-medium text-neutral-700 transition hover:bg-neutral-100"
        >
          Cancelar
        </Link>
        {onDelete ? <DeleteButton onDelete={onDelete} /> : null}
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
      <span className="text-sm font-medium text-neutral-700">{label}</span>
      <input
        name={name}
        type={type}
        step={step}
        placeholder={placeholder}
        defaultValue={defaultValue}
        required={required}
        inputMode={type === 'number' ? 'decimal' : undefined}
        className={`mt-1 block w-full rounded-md border bg-white px-3 py-2 text-sm shadow-sm transition focus:ring-2 focus:ring-neutral-900 focus:outline-none ${
          error ? 'border-red-400' : 'border-neutral-300'
        }`}
        aria-invalid={Boolean(error)}
      />
      {error ? <p className="mt-1 text-xs text-red-600">{error}</p> : null}
    </label>
  );
}

function DeleteButton({ onDelete }: { onDelete: () => void }) {
  return (
    <form action={onDelete}>
      <button
        type="submit"
        className="mt-3 w-full rounded-md px-4 py-2 text-sm font-medium text-red-600 transition hover:bg-red-50"
        onClick={(e) => {
          if (!confirm('¿Eliminar este producto?')) e.preventDefault();
        }}
      >
        Eliminar
      </button>
    </form>
  );
}
