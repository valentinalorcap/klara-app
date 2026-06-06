import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { ChatClient } from '@/components/ChatClient';

const INITIAL_LOAD = 30;

export default async function ChatPage() {
  const session = await auth();
  const userId = session!.user.id;

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
      <header className="px-2 pb-3">
        <h1 className="text-2xl font-bold tracking-tight text-white">Chat</h1>
        <p className="mt-1 text-sm text-neutral-400">
          Klara has your day so far and the past week — ask anything.
        </p>
      </header>
      <ChatClient initialMessages={messages} />
    </main>
  );
}
