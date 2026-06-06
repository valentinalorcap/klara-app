'use client';

import { useEffect, useRef, useState, type FormEvent } from 'react';
import { Send, Sparkles } from 'lucide-react';
import { ChatRole } from '@prisma/client';
import { cn } from '@/lib/utils';

export type ChatMessageView = {
  id: string;
  role: ChatRole;
  content: string;
};

export function ChatClient({ initialMessages }: { initialMessages: ChatMessageView[] }) {
  const [messages, setMessages] = useState<ChatMessageView[]>(initialMessages);
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const scrollerRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to the bottom on new content.
  useEffect(() => {
    const el = scrollerRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, [messages]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    const content = draft.trim();
    if (!content || sending) return;
    setError(null);
    setSending(true);

    const userMessage: ChatMessageView = {
      id: `temp-user-${Date.now()}`,
      role: ChatRole.USER,
      content,
    };
    const assistantId = `temp-assistant-${Date.now()}`;
    const assistantMessage: ChatMessageView = {
      id: assistantId,
      role: ChatRole.ASSISTANT,
      content: '',
    };
    setMessages((prev) => [...prev, userMessage, assistantMessage]);
    setDraft('');

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content }),
      });
      if (!response.ok || !response.body) {
        const body = await response.json().catch(() => ({}));
        throw new Error(body.error ?? 'Chat failed.');
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        if (!chunk) continue;
        setMessages((prev) =>
          prev.map((m) => (m.id === assistantId ? { ...m, content: m.content + chunk } : m)),
        );
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Chat failed.';
      setError(message);
      // Drop the empty placeholder if the request blew up before any text arrived.
      setMessages((prev) => prev.filter((m) => m.id !== assistantId || m.content.length > 0));
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div
        ref={scrollerRef}
        className="-mx-2 flex-1 space-y-3 overflow-y-auto px-2 py-2"
        aria-live="polite"
      >
        {messages.length === 0 ? (
          <div className="mt-6 flex flex-col items-center gap-2 px-6 text-center">
            <Sparkles size={20} className="text-[var(--accent)]" />
            <p className="text-sm text-neutral-300">
              Klara knows your targets, today’s meals, and the last week. Try “How am I doing on
              protein?” or “What should I aim for at dinner?”
            </p>
          </div>
        ) : (
          messages.map((m) => <Bubble key={m.id} message={m} />)
        )}
      </div>

      {error ? (
        <p className="mt-2 text-xs text-[var(--danger)]" role="alert">
          {error}
        </p>
      ) : null}

      <form onSubmit={onSubmit} className="mt-3 flex items-end gap-2">
        <textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              onSubmit(e);
            }
          }}
          placeholder="Ask Klara…"
          rows={1}
          maxLength={2000}
          disabled={sending}
          className="block max-h-32 min-h-[44px] flex-1 resize-none rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-2.5 text-sm text-white placeholder:text-neutral-500 focus:bg-white/[0.08] focus:ring-2 focus:ring-[var(--accent)]/60 focus:outline-none disabled:opacity-50"
        />
        <button
          type="submit"
          disabled={sending || !draft.trim()}
          aria-label="Send"
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[var(--accent)] text-white shadow-[0_8px_24px_-8px_var(--accent-glow)] transition hover:bg-[var(--accent-hover)] active:scale-95 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Send size={16} />
        </button>
      </form>
    </div>
  );
}

function Bubble({ message }: { message: ChatMessageView }) {
  const isUser = message.role === ChatRole.USER;
  return (
    <div className={cn('flex w-full', isUser ? 'justify-end' : 'justify-start')}>
      <div
        className={cn(
          'max-w-[85%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed whitespace-pre-wrap',
          isUser
            ? 'bg-[var(--accent)]/15 text-white'
            : 'border border-white/10 bg-white/[0.04] text-neutral-100',
        )}
      >
        {message.content || (
          <span className="inline-flex items-center gap-1 text-neutral-400">
            <Sparkles size={12} className="animate-pulse text-[var(--accent)]" />
            Klara is thinking…
          </span>
        )}
      </div>
    </div>
  );
}
