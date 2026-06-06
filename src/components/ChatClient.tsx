'use client';

import { useEffect, useRef, useState, type FormEvent } from 'react';
import { Send, Sparkles } from 'lucide-react';
import { ChatRole } from '@prisma/client';

export type ChatMessageView = {
  id: string;
  role: ChatRole;
  content: string;
};

const SUGGESTIONS = [
  'How am I doing today?',
  'Vegetarian dinner ideas',
  'Am I behind on protein?',
  'Something light for a snack',
];

function greetingFor(name: string): string {
  const hour = new Date().getHours();
  if (hour < 6) return `Hey ${name} 🌙`;
  if (hour < 12) return `Good morning, ${name} ☀️`;
  if (hour < 18) return `Hey ${name} 👋`;
  return `Good evening, ${name} 🌙`;
}

export function ChatClient({
  initialMessages,
  firstName,
}: {
  initialMessages: ChatMessageView[];
  firstName: string;
}) {
  const [messages, setMessages] = useState<ChatMessageView[]>(initialMessages);
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const scrollerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const el = scrollerRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, [messages]);

  async function send(content: string) {
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
      setMessages((prev) => prev.filter((m) => m.id !== assistantId || m.content.length > 0));
    } finally {
      setSending(false);
    }
  }

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    const content = draft.trim();
    if (!content || sending) return;
    void send(content);
  }

  function onSuggestion(text: string) {
    if (sending) return;
    void send(text);
  }

  const isEmpty = messages.length === 0;

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div
        ref={scrollerRef}
        className="-mx-2 flex-1 space-y-3 overflow-y-auto px-2 py-2"
        aria-live="polite"
      >
        {isEmpty ? (
          <EmptyState firstName={firstName} onPick={onSuggestion} disabled={sending} />
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
          ref={inputRef}
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

function KlaraAvatar() {
  return (
    <div
      aria-hidden
      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-[var(--accent)]/30 bg-[var(--accent)]/15 text-[var(--accent)]"
    >
      <Sparkles size={14} />
    </div>
  );
}

function Bubble({ message }: { message: ChatMessageView }) {
  const isUser = message.role === ChatRole.USER;
  if (isUser) {
    return (
      <div className="flex w-full justify-end">
        <div className="max-w-[85%] rounded-2xl bg-[var(--accent)]/15 px-3.5 py-2.5 text-sm leading-relaxed whitespace-pre-wrap text-white">
          {message.content}
        </div>
      </div>
    );
  }
  return (
    <div className="flex w-full items-start justify-start gap-2">
      <KlaraAvatar />
      <div className="max-w-[85%] rounded-2xl rounded-tl-md border border-white/10 bg-white/[0.04] px-3.5 py-2.5 text-sm leading-relaxed whitespace-pre-wrap text-neutral-100">
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

function EmptyState({
  firstName,
  onPick,
  disabled,
}: {
  firstName: string;
  onPick: (text: string) => void;
  disabled: boolean;
}) {
  return (
    <div className="mt-4 space-y-5 px-2">
      <div className="flex items-start gap-3">
        <KlaraAvatar />
        <div>
          <p className="text-base font-semibold text-white">{greetingFor(firstName)}</p>
          <p className="mt-1 text-sm text-neutral-300">
            I have your targets, today’s meals, and your last week of logs. Ask me whatever you want
            — or try one of these:
          </p>
        </div>
      </div>
      <div className="flex flex-wrap gap-2 pl-11">
        {SUGGESTIONS.map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => onPick(s)}
            disabled={disabled}
            className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-xs text-neutral-200 transition hover:border-[var(--accent)]/40 hover:bg-[var(--accent)]/10 hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
          >
            {s}
          </button>
        ))}
      </div>
    </div>
  );
}
