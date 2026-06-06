import { NextResponse } from 'next/server';
import { z } from 'zod';
import { ChatRole } from '@prisma/client';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { getAnthropic, MODELS } from '@/lib/anthropic';
import { buildChatSystemDynamic, buildChatSystemStable } from '@/lib/chat';
import { loadChatContext } from '@/lib/chat.server';

export const runtime = 'nodejs';

const inputSchema = z.object({
  content: z.string().trim().min(1, 'Empty message.').max(2000, 'Message is too long.'),
});

/** Cap on history sent to the model. Older messages stay in the DB. */
const HISTORY_LIMIT = 30;

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
  }
  const userId = session.user.id;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: 'Invalid JSON' }, { status: 400 });
  }
  const parsed = inputSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, error: parsed.error.issues[0]?.message ?? 'Invalid input' },
      { status: 400 },
    );
  }

  const userContent = parsed.data.content;

  // Persist the user message immediately so we keep it even if streaming fails.
  await prisma.chatMessage.create({
    data: { userId, role: ChatRole.USER, content: userContent },
  });

  const [context, history] = await Promise.all([
    loadChatContext(userId),
    prisma.chatMessage.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: HISTORY_LIMIT,
    }),
  ]);
  const orderedHistory = history.reverse();

  const messages = orderedHistory.map((m) => ({
    role: m.role === ChatRole.USER ? ('user' as const) : ('assistant' as const),
    content: m.content,
  }));

  const client = getAnthropic();
  const stableSystem = buildChatSystemStable(context);
  const dynamicSystem = buildChatSystemDynamic(context);

  const encoder = new TextEncoder();
  let accumulated = '';

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      try {
        const sdkStream = client.messages.stream({
          model: MODELS.sonnet,
          max_tokens: 1024,
          system: [
            { type: 'text', text: stableSystem, cache_control: { type: 'ephemeral' } },
            { type: 'text', text: dynamicSystem },
          ],
          messages,
        });

        for await (const event of sdkStream) {
          if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
            const chunk = event.delta.text;
            accumulated += chunk;
            controller.enqueue(encoder.encode(chunk));
          }
        }

        if (accumulated.trim().length > 0) {
          await prisma.chatMessage.create({
            data: { userId, role: ChatRole.ASSISTANT, content: accumulated },
          });
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Chat failed.';
        controller.enqueue(encoder.encode(`\n\n[Klara error] ${message}`));
        // Persist whatever the model produced so the history isn't lost on a
        // mid-stream failure.
        if (accumulated.trim().length > 0) {
          await prisma.chatMessage
            .create({
              data: { userId, role: ChatRole.ASSISTANT, content: accumulated },
            })
            .catch(() => {});
        }
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'no-store',
    },
  });
}
