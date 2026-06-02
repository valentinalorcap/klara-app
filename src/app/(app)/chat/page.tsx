import { MessageCircle } from 'lucide-react';
import { EmptyTab } from '@/components/EmptyTab';

export default function ChatPage() {
  return (
    <EmptyTab
      icon={MessageCircle}
      title="Chat"
      message="Conversación con Klara — preguntas, recomendaciones, ajustes de tu día. En camino."
    />
  );
}
