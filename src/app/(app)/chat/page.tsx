import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { ChatClient } from '@/components/ChatClient';

const INITIAL_LOAD = 30;

export default async function ChatPage() {
  const session = await auth();
  const userId = session!.user.id;
  const firstName = session?.user?.name?.split(' ')[0] ?? 'friend';

  const recent = await prisma.chatMessage.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
    take: INITIAL_LOAD,
  });
  const messages = recent.reverse().map((m) => ({
    id: m.id,
    role: m.role,
    content: m.content,
  }));

  return (
    <main className="flex h-[100dvh] flex-col px-4 pt-8 pb-24">
      <ChatClient initialMessages={messages} firstName={firstName} />
    </main>
  );
}
