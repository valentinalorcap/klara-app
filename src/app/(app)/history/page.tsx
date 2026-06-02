import { BarChart3 } from 'lucide-react';
import { EmptyTab } from '@/components/EmptyTab';

export default function HistoryPage() {
  return (
    <EmptyTab
      icon={BarChart3}
      title="Historial"
      message="Tus días anteriores y tus tendencias. Calendario y gráficos próximamente."
    />
  );
}
