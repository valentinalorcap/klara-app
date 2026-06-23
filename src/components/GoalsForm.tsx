'use client';

import { useActionState, useState } from 'react';
import { GlassCard } from './GlassCard';
import { updateGoals, type GoalsFormState } from '@/app/(app)/settings/actions';

type Initial = {
  dailyKcalGoal: number | null;
  dailyProteinGoal: number | null;
  dailyCarbsGoal: number | null;
  dailyFatGoal: number | null;
};

// Suggested macro split of total calories: 30% protein, 35% carbs, 35% fat
// (protein & carbs at 4 kcal/g, fat at 9 kcal/g). Used only for placeholders.
function suggestedMacros(kcal: number) {
  return {
    protein: Math.round((kcal * 0.3) / 4),
    carbs: Math.round((kcal * 0.35) / 4),
    fat: Math.round((kcal * 0.35) / 9),
  };
}

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
  // Calories drive the suggested macro placeholders; default to 2300.
  const [kcal, setKcal] = useState(
    initial.dailyKcalGoal != null ? String(initial.dailyKcalGoal) : '2300',
  );
  const sug = suggestedMacros(Number(kcal) || 0);

  return (
    <form action={formAction} className="space-y-5">
      <GlassCard className="space-y-3 p-5">
        <p className="text-xs font-medium tracking-wider text-neutral-400 uppercase">
          Daily calories
        </p>
        <Field
          label="Calories (kcal)"
          name="dailyKcalGoal"
          value={kcal}
          onChange={setKcal}
          placeholder="2300"
          error={state.fieldErrors?.dailyKcalGoal}
        />
      </GlassCard>

      <GlassCard className="space-y-3 p-5">
        <p className="text-xs font-medium tracking-wider text-neutral-400 uppercase">Macros</p>
        <p className="-mt-1 text-[11px] text-neutral-500">
          Placeholders are a suggested split for your calories — type your own, or leave a field
          blank to skip its ring.
        </p>
        <Field
          label="Protein (g)"
          name="dailyProteinGoal"
          defaultValue={initial.dailyProteinGoal}
          placeholder={String(sug.protein)}
          error={state.fieldErrors?.dailyProteinGoal}
        />
        <Field
          label="Carbs (g)"
          name="dailyCarbsGoal"
          defaultValue={initial.dailyCarbsGoal}
          placeholder={String(sug.carbs)}
          error={state.fieldErrors?.dailyCarbsGoal}
        />
        <Field
          label="Fat (g)"
          name="dailyFatGoal"
          defaultValue={initial.dailyFatGoal}
          placeholder={String(sug.fat)}
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
  placeholder,
  error,
  value,
  onChange,
  defaultValue,
}: {
  label: string;
  name: string;
  placeholder: string;
  error?: string;
  /** Controlled (calories). */
  value?: string;
  onChange?: (v: string) => void;
  /** Uncontrolled initial value (macros). */
  defaultValue?: number | null;
}) {
  const controlled = value !== undefined;
  return (
    <div>
      <label className="flex items-center justify-between gap-3">
        <span className="text-sm text-neutral-300">{label}</span>
        <input
          name={name}
          type="number"
          step="1"
          inputMode="decimal"
          onFocus={(e) => e.target.select()}
          placeholder={placeholder}
          {...(controlled
            ? {
                value,
                onChange: (e: React.ChangeEvent<HTMLInputElement>) => onChange?.(e.target.value),
              }
            : { defaultValue: defaultValue ?? '' })}
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
