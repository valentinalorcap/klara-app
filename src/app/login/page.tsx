import { signIn, auth } from '@/auth';
import { redirect } from 'next/navigation';
import { GlassCard } from '@/components/GlassCard';

export default async function LoginPage() {
  const session = await auth();
  if (session?.user) redirect('/today');

  return (
    <main className="flex min-h-screen items-center justify-center px-6">
      <GlassCard className="w-full max-w-sm p-8">
        <div className="text-center">
          <h1 className="text-3xl font-bold tracking-tight text-white">Klara</h1>
          <p className="mt-2 text-sm text-neutral-400">Your nutrition assistant.</p>
        </div>

        <form
          action={async () => {
            'use server';
            await signIn('google', { redirectTo: '/today' });
          }}
          className="mt-8"
        >
          <button
            type="submit"
            className="w-full rounded-2xl bg-[var(--accent)] px-4 py-3.5 text-sm font-semibold text-white shadow-[0_8px_24px_-8px_var(--accent-glow)] transition hover:bg-[var(--accent-hover)] active:scale-[0.98]"
          >
            Continue with Google
          </button>
        </form>
      </GlassCard>
    </main>
  );
}
