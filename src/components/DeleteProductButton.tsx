'use client';

export function DeleteProductButton({ action }: { action: () => Promise<void> }) {
  return (
    <form action={action} className="mt-3">
      <button
        type="submit"
        className="w-full rounded-md px-4 py-2 text-sm font-medium text-red-600 transition hover:bg-red-50"
        onClick={(e) => {
          if (!confirm('¿Eliminar este producto?')) e.preventDefault();
        }}
      >
        Eliminar
      </button>
    </form>
  );
}
