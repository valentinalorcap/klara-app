import { Package } from 'lucide-react';
import { EmptyTab } from '@/components/EmptyTab';

export default function ProductsPage() {
  // Real list + create flow lands in the next commit of this branch.
  return (
    <EmptyTab
      icon={Package}
      title="Productos"
      message="Aquí vivirá tu biblioteca de productos — yogur, salsa chipotle, proteína, lo que comes."
    />
  );
}
