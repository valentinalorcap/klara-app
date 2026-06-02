import { BarChart3 } from 'lucide-react';
import { EmptyTab } from '@/components/EmptyTab';

export default function HistoryPage() {
  return (
    <EmptyTab
      icon={BarChart3}
      title="History"
      message="Your past days and trends. Calendar and charts coming soon."
    />
  );
}
