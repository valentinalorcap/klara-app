import { ChefHat } from 'lucide-react';
import { EmptyTab } from '@/components/EmptyTab';

export default function RecipesPage() {
  return (
    <EmptyTab
      icon={ChefHat}
      title="Recetas"
      message="Tus recetas con macros calculadas automáticamente. Llegará en una fase próxima."
    />
  );
}
