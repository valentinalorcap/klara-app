import { GlassCard } from './GlassCard';

/**
 * Design-system card showing a macro summary as a 4-column grid:
 * kcal · P · C · F (big value + small label). Reused by add meal ("Total")
 * and add recipe ("Per portion"). Values are raw numbers; formatting is here.
 */
export function MacroStats({
  title,
  kcal,
  protein,
  carbs,
  fat,
}: {
  title: string;
  kcal: number;
  protein: number;
  carbs: number;
  fat: number;
}) {
  return (
    <GlassCard className="space-y-3 p-5">
      <p className="text-xs font-medium tracking-wider text-neutral-400 uppercase">{title}</p>
      <div className="grid grid-cols-4 gap-3 text-center">
        <Stat label="kcal" value={Math.round(kcal)} />
        <Stat label="P" value={`${protein.toFixed(1)}g`} />
        <Stat label="C" value={`${carbs.toFixed(1)}g`} />
        <Stat label="F" value={`${fat.toFixed(1)}g`} />
      </div>
    </GlassCard>
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
