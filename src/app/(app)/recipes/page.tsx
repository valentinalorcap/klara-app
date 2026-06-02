import { ChefHat } from 'lucide-react';
import { EmptyTab } from '@/components/EmptyTab';

export default function RecipesPage() {
  return (
    <EmptyTab
      icon={ChefHat}
      title="Recipes"
      message="Your recipes with macros calculated automatically. Coming in an upcoming phase."
    />
  );
}
