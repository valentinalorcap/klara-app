import { signIn, auth } from '@/auth';
import { redirect } from 'next/navigation';

export default async function LoginPage() {
  const session = await auth();
  if (session?.user) redirect('/today');

  return (
    <main className="flex min-h-screen items-center justify-center bg-neutral-50 px-6">
      <div className="w-full max-w-sm space-y-8 text-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Klara</h1>
          <p className="mt-2 text-sm text-neutral-600">Tu asistente de nutrición.</p>
        </div>

        <form
          action={async () => {
            'use server';
            await signIn('google', { redirectTo: '/today' });
          }}
        >
          <button
            type="submit"
            className="w-full rounded-md bg-neutral-900 px-4 py-3 text-sm font-medium text-white transition hover:bg-neutral-800"
          >
            Continuar con Google
          </button>
        </form>
      </div>
    </main>
  );
}
