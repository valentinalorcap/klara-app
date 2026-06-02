import { MessageCircle } from 'lucide-react';
import { EmptyTab } from '@/components/EmptyTab';

export default function ChatPage() {
  return (
    <EmptyTab
      icon={MessageCircle}
      title="Chat"
      message="Talk to Klara — ask, get suggestions, fine-tune your day. On its way."
    />
  );
}
