import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ChevronLeft } from 'lucide-react';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { RecipeForm } from '@/components/RecipeForm';
import { DeleteRecipeButton } from '@/components/DeleteRecipeButton';
import { deleteRecipe, updateRecipe } from '../../actions';

export default async function EditRecipePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();

  const [recipe, products] = await Promise.all([
    prisma.recipe.findUnique({
      where: { id },
      include: { ingredients: true },
    }),
    prisma.product.findMany({
      where: { userId: session!.user.id },
      orderBy: { name: 'asc' },
      select: {
        id: true,
        name: true,
        brand: true,
        kcalPer100g: true,
        proteinPer100g: true,
        carbsPer100g: true,
        fatPer100g: true,
      },
    }),
  ]);

  if (!recipe || recipe.userId !== session!.user.id) notFound();

  const updateAction = updateRecipe.bind(null, id);
  const deleteAction = deleteRecipe.bind(null, id);

  return (
    <main className="px-6 py-10">
      <Link
        href="/recipes"
        className="-ml-2 inline-flex items-center gap-1 text-sm text-neutral-400 transition hover:text-neutral-200"
      >
        <ChevronLeft size={16} />
        Recipes
      </Link>

      <h1 className="mt-4 text-2xl font-bold tracking-tight text-white">Edit recipe</h1>

      <div className="mt-8">
        <RecipeForm
          action={updateAction}
          products={products}
          initialValues={{
            name: recipe.name,
            portions: recipe.portions,
            ingredients: recipe.ingredients.map((i) => ({
              name: i.name,
              grams: i.grams,
              productId: i.productId,
              kcalPer100g: i.kcalPer100g,
              proteinPer100g: i.proteinPer100g,
              carbsPer100g: i.carbsPer100g,
              fatPer100g: i.fatPer100g,
            })),
          }}
          submitLabel="Save changes"
        />
        <DeleteRecipeButton action={deleteAction} />
      </div>
    </main>
  );
}
