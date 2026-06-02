'use client';

export function DeleteProductButton({ action }: { action: () => Promise<void> }) {
  return (
    <form action={action} className="mt-3">
      <button
        type="submit"
        className="w-full rounded-2xl px-4 py-3 text-sm font-medium text-[var(--danger)] transition hover:bg-[var(--danger)]/10"
        onClick={(e) => {
          if (!confirm('Delete this product?')) e.preventDefault();
        }}
      >
        Delete
      </button>
    </form>
  );
}
