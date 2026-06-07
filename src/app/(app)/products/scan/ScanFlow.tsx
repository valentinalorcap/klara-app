'use client';

import { useState, useTransition, useRef } from 'react';
import Image from 'next/image';
import { Camera, RotateCcw, Sparkles } from 'lucide-react';
import { GlassCard } from '@/components/GlassCard';
import { ProductForm } from '@/components/ProductForm';
import { createProduct } from '../actions';
import { extractFromLabel } from './actions';
import type { ExtractedLabel } from '@/lib/labelExtraction';

type Phase = 'select' | 'preview' | 'analyzing' | 'review';

// Mirrors the server action's MAX_IMAGE_BYTES. Catching oversized files
// here lets us show a useful message instead of a generic 500 from Next
// rejecting the Server Action body.
const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

export function ScanFlow() {
  const [phase, setPhase] = useState<Phase>('select');
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [extracted, setExtracted] = useState<ExtractedLabel | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const fileInputRef = useRef<HTMLInputElement>(null);

  function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const picked = e.target.files?.[0];
    if (!picked) return;
    if (picked.size > MAX_IMAGE_BYTES) {
      const mb = (picked.size / 1024 / 1024).toFixed(1);
      setError(
        `That photo is ${mb} MB. The label scanner needs an image under 5 MB — try retaking it at a lower resolution.`,
      );
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }
    setFile(picked);
    setPreviewUrl(URL.createObjectURL(picked));
    setError(null);
    setPhase('preview');
  }

  function reset() {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setFile(null);
    setPreviewUrl(null);
    setExtracted(null);
    setError(null);
    setPhase('select');
    if (fileInputRef.current) fileInputRef.current.value = '';
  }

  function analyze() {
    if (!file) return;
    setError(null);
    setPhase('analyzing');
    const formData = new FormData();
    formData.append('image', file);
    startTransition(async () => {
      const result = await extractFromLabel(formData);
      if (!result.ok) {
        setError(result.error);
        setPhase('preview');
        return;
      }
      setExtracted(result.data);
      setPhase('review');
    });
  }

  if (phase === 'select') {
    return (
      <GlassCard className="p-8 text-center">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-white/10 text-[var(--accent)]">
          <Camera size={26} />
        </div>
        <p className="mt-5 text-sm text-neutral-300">
          Point your camera at the nutrition facts panel of the product.
        </p>
        <label className="mt-6 block">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={onFileChange}
            className="sr-only"
          />
          <span className="inline-flex w-full cursor-pointer items-center justify-center rounded-2xl bg-[var(--accent)] px-4 py-3.5 text-sm font-semibold text-white shadow-[0_8px_24px_-8px_var(--accent-glow)] transition hover:bg-[var(--accent-hover)] active:scale-[0.98]">
            Take photo or choose one
          </span>
        </label>
        {error ? (
          <p className="mt-4 text-sm text-[var(--danger)]" role="alert">
            {error}
          </p>
        ) : null}
      </GlassCard>
    );
  }

  if (phase === 'review' && extracted) {
    return (
      <div className="space-y-4">
        <GlassCard className="flex items-center gap-3 p-4">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[var(--accent)]/20 text-[var(--accent)]">
            <Sparkles size={16} />
          </div>
          <p className="text-xs text-neutral-300">
            Review what Klara read from the label. Edit anything that looks off, then create.
          </p>
        </GlassCard>

        <ProductForm
          action={createProduct}
          submitLabel="Create product"
          initialValues={{
            name: extracted.name ?? '',
            brand: extracted.brand ?? null,
            kcalPer100g: extracted.kcalPer100g,
            proteinPer100g: extracted.proteinPer100g,
            carbsPer100g: extracted.carbsPer100g,
            fatPer100g: extracted.fatPer100g,
            suggestedPortionGrams: extracted.suggestedPortionGrams ?? null,
          }}
        />
      </div>
    );
  }

  // preview or analyzing
  return (
    <div className="space-y-4">
      <GlassCard className="overflow-hidden p-0">
        {previewUrl ? (
          <Image
            src={previewUrl}
            alt="Captured label"
            width={800}
            height={1000}
            unoptimized
            className="h-auto w-full object-contain"
          />
        ) : null}
      </GlassCard>

      {error ? (
        <p className="text-sm text-[var(--danger)]" role="alert">
          {error}
        </p>
      ) : null}

      <button
        type="button"
        onClick={analyze}
        disabled={phase === 'analyzing' || pending}
        className="flex w-full items-center justify-center gap-2 rounded-2xl bg-[var(--accent)] px-4 py-3.5 text-sm font-semibold text-white shadow-[0_8px_24px_-8px_var(--accent-glow)] transition hover:bg-[var(--accent-hover)] active:scale-[0.98] disabled:opacity-60"
      >
        <Sparkles size={16} />
        {phase === 'analyzing' ? 'Reading the label…' : 'Analyze with Klara'}
      </button>

      <button
        type="button"
        onClick={reset}
        disabled={pending}
        className="flex w-full items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm font-medium text-neutral-300 transition hover:bg-white/[0.08] disabled:opacity-60"
      >
        <RotateCcw size={14} />
        Pick another photo
      </button>
    </div>
  );
}
