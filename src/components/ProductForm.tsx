'use client';

import { useActionState, useState, useRef, useTransition } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Camera, Sparkles, RotateCcw } from 'lucide-react';
import type { ProductFormState } from '@/app/(app)/products/actions';
import { extractFromLabel } from '@/app/(app)/products/actions';
import { GlassCard } from './GlassCard';

const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

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

const numStr = (n: number | null | undefined) => (n != null ? String(n) : '');

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

  // Controlled so a label scan can prefill every field.
  const [name, setName] = useState(initialValues?.name ?? '');
  const [brand, setBrand] = useState(initialValues?.brand ?? '');
  const [kcal, setKcal] = useState(numStr(initialValues?.kcalPer100g));
  const [protein, setProtein] = useState(numStr(initialValues?.proteinPer100g));
  const [carbs, setCarbs] = useState(numStr(initialValues?.carbsPer100g));
  const [fat, setFat] = useState(numStr(initialValues?.fatPer100g));
  const [portion, setPortion] = useState(numStr(initialValues?.suggestedPortionGrams));
  const [icon, setIcon] = useState(initialValues?.icon ?? '');

  // Label-scan state.
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [scanError, setScanError] = useState<string | null>(null);
  const [analyzing, startAnalyze] = useTransition();
  const fileRef = useRef<HTMLInputElement>(null);

  function onPhoto(e: React.ChangeEvent<HTMLInputElement>) {
    const picked = e.target.files?.[0];
    if (fileRef.current) fileRef.current.value = ''; // allow re-picking the same file
    if (!picked) return;
    if (picked.size > MAX_IMAGE_BYTES) {
      const mb = (picked.size / 1024 / 1024).toFixed(1);
      setScanError(`That photo is ${mb} MB — use one under 5 MB.`);
      return;
    }
    setScanError(null);
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(URL.createObjectURL(picked));

    // Analyze immediately — no separate "analyze" step.
    const formData = new FormData();
    formData.append('image', picked);
    startAnalyze(async () => {
      const result = await extractFromLabel(formData);
      if (!result.ok) {
        setScanError(result.error);
        return;
      }
      const d = result.data;
      setName(d.name ?? '');
      setBrand(d.brand ?? '');
      setKcal(numStr(d.kcalPer100g));
      setProtein(numStr(d.proteinPer100g));
      setCarbs(numStr(d.carbsPer100g));
      setFat(numStr(d.fatPer100g));
      setPortion(numStr(d.suggestedPortionGrams));
      setIcon(d.icon ?? '');
    });
  }

  return (
    <form action={formAction} className="space-y-5">
      {/* Scanned photo stays pinned at the top (small) so the user can compare
          it against the values Klara copied in. */}
      {previewUrl ? (
        <GlassCard className="overflow-hidden p-2">
          <Image
            src={previewUrl}
            alt="Nutrition label"
            width={400}
            height={400}
            unoptimized
            className="mx-auto max-h-44 w-auto rounded-xl object-contain"
          />
        </GlassCard>
      ) : null}

      <label className="block">
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          onChange={onPhoto}
          disabled={analyzing}
          className="sr-only"
        />
        <span className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-2xl border border-[var(--accent)]/30 bg-[var(--accent)]/10 px-4 py-3 text-sm font-semibold text-[var(--accent)] transition hover:bg-[var(--accent)]/15 aria-disabled:opacity-60">
          {analyzing ? (
            <>
              <Sparkles size={15} className="animate-pulse" /> Klara is reading the label…
            </>
          ) : previewUrl ? (
            <>
              <RotateCcw size={15} /> Replace photo
            </>
          ) : (
            <>
              <Camera size={15} /> Add photo of the label
            </>
          )}
        </span>
      </label>
      {scanError ? (
        <p className="text-sm text-[var(--danger)]" role="alert">
          {scanError}
        </p>
      ) : null}

      {/* Carries Claude's scanned icon (or an existing product's) through to the
          server action. Not user-editable — icons are automatic. */}
      <input type="hidden" name="icon" value={icon} />
      <Field
        label="Name"
        name="name"
        value={name}
        onChange={setName}
        placeholder="Skyr yogurt"
        error={state.fieldErrors?.name}
        required
      />
      <Field
        label="Brand (optional)"
        name="brand"
        value={brand}
        onChange={setBrand}
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
          value={kcal}
          onChange={setKcal}
          error={state.fieldErrors?.kcalPer100g}
          required
        />
        <Field
          label="Protein (g)"
          name="proteinPer100g"
          type="number"
          step="0.1"
          value={protein}
          onChange={setProtein}
          error={state.fieldErrors?.proteinPer100g}
          required
        />
        <Field
          label="Carbs (g)"
          name="carbsPer100g"
          type="number"
          step="0.1"
          value={carbs}
          onChange={setCarbs}
          error={state.fieldErrors?.carbsPer100g}
          required
        />
        <Field
          label="Fat (g)"
          name="fatPer100g"
          type="number"
          step="0.1"
          value={fat}
          onChange={setFat}
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
        value={portion}
        onChange={setPortion}
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
  value,
  onChange,
  error,
  required,
}: {
  label: string;
  name: string;
  type?: string;
  step?: string;
  placeholder?: string;
  value: string;
  onChange: (v: string) => void;
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
        value={value}
        onChange={(e) => onChange(e.target.value)}
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
