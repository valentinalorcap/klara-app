import { auth, signOut } from '@/auth';

export default async function TodayPage() {
  const session = await auth();
  const firstName = session?.user?.name?.split(' ')[0] ?? 'amiga';

  return (
    <main className="px-6 py-8">
      <header>
        <p className="text-sm text-neutral-500">Buen día</p>
        <h1 className="mt-1 text-2xl font-bold tracking-tight">Hola {firstName} 👋</h1>
      </header>

      <section className="mt-8 rounded-2xl border border-neutral-200 bg-white p-6 text-center">
        <p className="text-sm text-neutral-500">
          Acá va a vivir tu día: calorías, proteína, comidas registradas y recomendaciones.
        </p>
        <p className="mt-3 text-xs text-neutral-400">Próximamente.</p>
      </section>

      <form
        action={async () => {
          'use server';
          await signOut({ redirectTo: '/login' });
        }}
        className="mt-10"
      >
        <button
          type="submit"
          className="w-full rounded-md border border-neutral-300 bg-white px-4 py-2 text-sm font-medium text-neutral-700 transition hover:bg-neutral-100"
        >
          Cerrar sesión
        </button>
      </form>
    </main>
  );
}
