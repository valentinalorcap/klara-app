'use client';

import { useActionState } from 'react';
import { GlassCard } from './GlassCard';
import { updateGoals, type GoalsFormState } from '@/app/(app)/settings/actions';

type Initial = {
  dailyKcalGoal: number | null;
  dailyProteinGoal: number | null;
  dailyCarbsGoal: number | null;
  dailyFatGoal: number | null;
};

export function GoalsForm({
  initial,
  action = updateGoals,
  submitLabel = 'Save goals',
}: {
  initial: Initial;
  /** Server action handling the submit. Defaults to Settings' updateGoals. */
  action?: (state: GoalsFormState, formData: FormData) => Promise<GoalsFormState>;
  submitLabel?: string;
}) {
  const [state, formAction, pending] = useActionState<GoalsFormState, FormData>(action, {});

  return (
    <form action={formAction} className="space-y-5">
      <GlassCard className="space-y-3 p-5">
        <p className="text-xs font-medium tracking-wider text-neutral-400 uppercase">Daily goals</p>
        <p className="-mt-1 text-[11px] text-neutral-500">
          Macro recommendations aren&apos;t available yet — set your own. Leave a field blank to
          skip its ring.
        </p>
        <Field
          label="Calories (kcal)"
          name="dailyKcalGoal"
          initial={initial.dailyKcalGoal}
          placeholder="1800"
          error={state.fieldErrors?.dailyKcalGoal}
        />
        <Field
          label="Protein (g)"
          name="dailyProteinGoal"
          initial={initial.dailyProteinGoal}
          placeholder="120"
          error={state.fieldErrors?.dailyProteinGoal}
        />
        <Field
          label="Carbs (g)"
          name="dailyCarbsGoal"
          initial={initial.dailyCarbsGoal}
          placeholder="180"
          error={state.fieldErrors?.dailyCarbsGoal}
        />
        <Field
          label="Fat (g)"
          name="dailyFatGoal"
          initial={initial.dailyFatGoal}
          placeholder="60"
          error={state.fieldErrors?.dailyFatGoal}
        />
      </GlassCard>

      {state.formError ? (
        <p className="text-sm text-[var(--danger)]" role="alert">
          {state.formError}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-2xl bg-[var(--accent)] px-4 py-3.5 text-sm font-semibold text-white shadow-[0_8px_24px_-8px_var(--accent-glow)] transition hover:bg-[var(--accent-hover)] active:scale-[0.98] disabled:opacity-50"
      >
        {pending ? 'Saving…' : submitLabel}
      </button>
    </form>
  );
}

function Field({
  label,
  name,
  initial,
  placeholder,
  error,
}: {
  label: string;
  name: string;
  initial: number | null;
  placeholder: string;
  error?: string;
}) {
  return (
    <div>
      <label className="flex items-center justify-between gap-3">
        <span className="text-sm text-neutral-300">{label}</span>
        <input
          name={name}
          type="number"
          step="1"
          inputMode="decimal"
          defaultValue={initial ?? ''}
          onFocus={(e) => e.target.select()}
          placeholder={placeholder}
          className={`w-24 rounded-2xl border bg-white/[0.04] px-3 py-2 text-right text-sm text-white tabular-nums transition placeholder:text-neutral-500 focus:bg-white/[0.08] focus:ring-2 focus:ring-[var(--accent)]/60 focus:outline-none ${
            error ? 'border-[var(--danger)]/60' : 'border-white/10'
          }`}
          aria-invalid={Boolean(error)}
        />
      </label>
      {error ? <p className="mt-1 text-right text-xs text-[var(--danger)]">{error}</p> : null}
    </div>
  );
}
