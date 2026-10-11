"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Bot, MessageSquarePlus, RefreshCw, Send, Trash2 } from "lucide-react";
import type {
  CommunicationLoad,
  ConversationMessage,
  ConversationSummary,
} from "../../../lib/admin/communications";
import {
  isConversationMessage,
  isConversationSummary,
} from "../../../lib/admin/communications";
import { isRecord } from "../../../lib/admin/student-records";
import styles from "./admin-ai-assistant.module.css";

type MessageState = Readonly<{
  conversationId: string;
  data: readonly ConversationMessage[] | null;
  error: string | null;
  loading: boolean;
}>;

function formatTimestamp(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Date unavailable";
  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "UTC",
  }).format(date);
}

async function responseError(response: Response) {
  try {
    const body: unknown = await response.json();
    if (isRecord(body) && "message" in body) {
      if (typeof body.message === "string") return body.message;
      if (Array.isArray(body.message)) {
        return body.message.filter((item) => typeof item === "string").join(" ");
      }
    }
  } catch {
    // Use a status-based message for non-JSON responses.
  }
  return `Request failed (${response.status}). Please try again.`;
}

async function fetchMessages(conversationId: string, signal?: AbortSignal) {
  const response = await fetch(
    `/api/admin/conversations/${encodeURIComponent(conversationId)}/messages`,
    { credentials: "same-origin", cache: "no-store", signal },
  );
  if (!response.ok) throw new Error(await responseError(response));
  const result: unknown = await response.json();
  if (!Array.isArray(result) || !result.every(isConversationMessage)) {
    throw new Error("Conversation messages returned data in an unexpected format.");
  }
  return [...result].sort((left, right) => {
    const timeDifference = Date.parse(left.createdAt) - Date.parse(right.createdAt);
    return timeDifference || left.id.localeCompare(right.id);
  });
}

export default function AdminAiAssistant({
  initialConversations,
}: Readonly<{ initialConversations: CommunicationLoad<ConversationSummary> }>) {
  const router = useRouter();
  const [conversations, setConversations] = useState<readonly ConversationSummary[]>(initialConversations.data ?? []);
  const [conversationError, setConversationError] = useState(initialConversations.error);
  const [selectedId, setSelectedId] = useState<string | null>(initialConversations.data?.[0]?.id ?? null);
  const [messages, setMessages] = useState<MessageState | null>(null);
  const [messageRetry, setMessageRetry] = useState(0);
  const [draft, setDraft] = useState("");
  const [sendPending, setSendPending] = useState(false);
  const [createPending, setCreatePending] = useState(false);
  const [deletePending, setDeletePending] = useState(false);
  const [renameOpen, setRenameOpen] = useState(false);
  const [renameDraft, setRenameDraft] = useState("");
  const [renamePending, setRenamePending] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setConversations(initialConversations.data ?? []);
    setConversationError(initialConversations.error);
    setSelectedId((current) => {
      if (current && initialConversations.data?.some((item) => item.id === current)) return current;
      return initialConversations.data?.[0]?.id ?? null;
    });
  }, [initialConversations]);

  useEffect(() => {
    if (!selectedId) {
      setMessages(null);
      return;
    }
    const controller = new AbortController();
    setMessages({ conversationId: selectedId, data: null, error: null, loading: true });
    void fetchMessages(selectedId, controller.signal)
      .then((data) => {
        if (!controller.signal.aborted) {
          setMessages({ conversationId: selectedId, data, error: null, loading: false });
        }
      })
      .catch((caught) => {
        if (!controller.signal.aborted) {
          setMessages({
            conversationId: selectedId,
            data: null,
            error: caught instanceof Error ? caught.message : "Messages could not be loaded.",
            loading: false,
          });
        }
      });
    return () => controller.abort();
  }, [selectedId, messageRetry]);

  useEffect(() => {
    if (messages?.data && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages?.data]);

  const selected = conversations.find((conversation) => conversation.id === selectedId) ?? null;
  const selectedMessages = messages?.conversationId === selectedId ? messages : null;

  async function createConversation() {
    if (createPending) return;
    setCreatePending(true);
    setActionError(null);
    setNotice(null);
    try {
      const response = await fetch("/api/admin/conversations", {
        method: "POST",
        credentials: "same-origin",
      });
      if (!response.ok) throw new Error(await responseError(response));
      const result: unknown = await response.json();
      if (!isConversationSummary(result)) {
        throw new Error("The conversation service returned an unexpected response.");
      }
      setConversations((current) => [result, ...current.filter((item) => item.id !== result.id)]);
      setSelectedId(result.id);
      setNotice("Conversation created.");
      router.refresh();
    } catch (caught) {
      setActionError(caught instanceof Error ? caught.message : "Conversation could not be created.");
    } finally {
      setCreatePending(false);
    }
  }

  async function sendMessage(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selected || sendPending) return;
    const content = draft.trim();
    if (!content) {
      setActionError("Enter a message before sending.");
      return;
    }

    setSendPending(true);
    setActionError(null);
    setNotice(null);
    try {
      const response = await fetch(
        `/api/admin/conversations/${encodeURIComponent(selected.id)}/messages`,
        {
          method: "POST",
          credentials: "same-origin",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ role: "USER", content }),
        },
      );
      if (!response.ok) throw new Error(await responseError(response));
      const created: unknown = await response.json();
      if (!isConversationMessage(created) || created.role !== "USER") {
        throw new Error("The conversation service returned an unexpected message.");
      }
      setDraft("");

      try {
        const freshMessages = await fetchMessages(selected.id);
        setMessages({ conversationId: selected.id, data: freshMessages, error: null, loading: false });
        setNotice("Message saved to this conversation. No AI response was generated by the backend.");
      } catch (caught) {
        setMessages((current) => {
          const existing = current?.conversationId === selected.id ? current.data ?? [] : [];
          const merged = existing.some((item) => item.id === created.id)
            ? existing
            : [...existing, created];
          return {
            conversationId: selected.id,
            data: [...merged].sort((left, right) => Date.parse(left.createdAt) - Date.parse(right.createdAt)),
            error: caught instanceof Error ? `Message saved, but history refresh failed: ${caught.message}` : "Message saved, but history refresh failed.",
            loading: false,
          };
        });
        setNotice("Message saved. Conversation history could not be refreshed.");
      }
      router.refresh();
    } catch (caught) {
      setActionError(caught instanceof Error ? caught.message : "Message could not be saved.");
    } finally {
      setSendPending(false);
    }
  }

  async function renameConversation(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selected || renamePending || !renameDraft.trim()) return;
    setRenamePending(true);
    setActionError(null);
    try {
      const response = await fetch(`/api/admin/conversations/${encodeURIComponent(selected.id)}`, {
        method: "PATCH",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: renameDraft.trim() }),
      });
      if (!response.ok) throw new Error(await responseError(response));
      const updated: unknown = await response.json();
      if (!isConversationSummary(updated)) throw new Error("The conversation service returned an unexpected response.");
      setConversations((current) => current.map((item) => item.id === updated.id ? updated : item));
      setRenameOpen(false);
      setNotice("Conversation title updated.");
      router.refresh();
    } catch (caught) {
      setActionError(caught instanceof Error ? caught.message : "Conversation title could not be updated.");
    } finally {
      setRenamePending(false);
    }
  }

  async function deleteConversation() {
    if (!selected || deletePending) return;
    if (!window.confirm("Delete this conversation and its persisted messages?")) return;
    setDeletePending(true);
    setActionError(null);
    try {
      const response = await fetch(`/api/admin/conversations/${encodeURIComponent(selected.id)}`, {
        method: "DELETE",
        credentials: "same-origin",
      });
      if (!response.ok) throw new Error(await responseError(response));
      const remaining = conversations.filter((item) => item.id !== selected.id);
      setConversations(remaining);
      setSelectedId(remaining[0]?.id ?? null);
      setMessages(null);
      setNotice("Conversation deleted.");
      router.refresh();
    } catch (caught) {
      setActionError(caught instanceof Error ? caught.message : "Conversation could not be deleted.");
    } finally {
      setDeletePending(false);
    }
  }

  async function retryConversations() {
    setConversationError(null);
    router.refresh();
  }

  return (
    <main className={styles.page}>
      <header className={styles.pageHeader}>
        <div>
          <p className={styles.eyebrow}>UNIVERSITY ADMINISTRATION</p>
          <h1>AI Assistant</h1>
          <p className={styles.description}>Your private conversations and persisted messages.</p>
        </div>
        <button className={styles.primaryButton} type="button" onClick={() => void createConversation()} disabled={createPending}>
          <MessageSquarePlus size={16} aria-hidden="true" /> {createPending ? "Creating..." : "New conversation"}
        </button>
      </header>

      <aside className={styles.capabilityNotice}>
        <Bot size={18} aria-hidden="true" />
        <p><strong>Conversation storage only.</strong> This backend saves your messages but does not generate AI responses. Only user-authored messages can be submitted.</p>
      </aside>

      {notice ? <p className={styles.successNotice} role="status">{notice}</p> : null}
      {actionError ? <p className={styles.errorNotice} role="alert">{actionError}</p> : null}

      <div className={styles.workspace}>
        <aside className={styles.sidebar} aria-label="Your conversations">
          <div className={styles.sidebarHeader}><h2>Conversations</h2><span>{conversations.length}</span></div>
          {conversationError ? (
            <div className={styles.inlineError} role="alert"><p>{conversationError}</p><button className={styles.secondaryButton} type="button" onClick={() => void retryConversations()}>Retry</button></div>
          ) : conversations.length === 0 ? (
            <div className={styles.sidebarEmpty}><MessageSquarePlus size={18} aria-hidden="true" /><p>No conversations yet.</p></div>
          ) : (
            <ul className={styles.conversationList}>
              {conversations.map((conversation) => (
                <li key={conversation.id}>
                  <button className={`${styles.conversationButton} ${selectedId === conversation.id ? styles.conversationActive : ""}`} type="button" aria-current={selectedId === conversation.id ? "true" : undefined} onClick={() => { setSelectedId(conversation.id); setActionError(null); setNotice(null); setRenameOpen(false); }}>
                    <strong>{conversation.title || "Untitled conversation"}</strong>
                    <time dateTime={conversation.updatedAt}>{formatTimestamp(conversation.updatedAt)}</time>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </aside>

        <section className={styles.chatPanel} aria-label="Conversation">
          {!selected ? (
            <div className={styles.chatEmpty}><Bot size={28} aria-hidden="true" /><h2>Start a conversation</h2><p>Create a conversation to save messages. This backend does not generate assistant replies.</p><button className={styles.primaryButton} type="button" onClick={() => void createConversation()} disabled={createPending}>Create conversation</button></div>
          ) : (
            <>
              <header className={styles.chatHeader}>
                <div><p className={styles.sectionEyebrow}>PRIVATE CONVERSATION</p><h2>{selected.title || "Untitled conversation"}</h2></div>
                <div className={styles.chatActions}>
                  <button className={styles.secondaryButton} type="button" onClick={() => { setRenameDraft(selected.title ?? ""); setRenameOpen((value) => !value); }} disabled={renamePending}>Rename</button>
                  <button className={styles.dangerIconButton} type="button" onClick={() => void deleteConversation()} disabled={deletePending} aria-label="Delete conversation"><Trash2 size={16} aria-hidden="true" /></button>
                </div>
              </header>

              {renameOpen ? (
                <form className={styles.renameForm} onSubmit={renameConversation}>
                  <label><span className={styles.visuallyHidden}>Conversation title</span><input value={renameDraft} onChange={(event) => setRenameDraft(event.target.value)} required maxLength={180} /></label>
                  <button className={styles.primaryButton} type="submit" disabled={renamePending || !renameDraft.trim()}>{renamePending ? "Saving..." : "Save title"}</button>
                  <button className={styles.secondaryButton} type="button" onClick={() => setRenameOpen(false)} disabled={renamePending}>Cancel</button>
                </form>
              ) : null}

              {selectedMessages?.loading || selectedMessages === null ? (
                <div className={styles.messagesLoading} aria-busy="true" aria-label="Loading messages"><span /><span /><span /></div>
              ) : selectedMessages.error && selectedMessages.data === null ? (
                <div className={styles.messageError} role="alert"><p>{selectedMessages.error}</p><button className={styles.secondaryButton} type="button" onClick={() => { setMessages(null); setMessageRetry((value) => value + 1); }}>Retry</button></div>
              ) : (
                <div className={styles.messageHistory} ref={scrollRef} aria-live="polite">
                  {selectedMessages.data?.length ? selectedMessages.data.map((message) => (
                    <article key={message.id} className={`${styles.message} ${styles[`message${message.role}`]}`}>
                      <div className={styles.messageMeta}><strong>{message.role === "USER" ? "You" : message.role === "ASSISTANT" ? "Assistant" : "System"}</strong><time dateTime={message.createdAt}>{formatTimestamp(message.createdAt)}</time></div>
                      <p>{message.content}</p>
                    </article>
                  )) : <div className={styles.emptyMessages}><MessageSquarePlus size={22} aria-hidden="true" /><h3>No messages yet</h3><p>Send a message to save it in this conversation. No assistant reply will be generated.</p></div>}
                  {selectedMessages.error ? <p className={styles.refreshWarning} role="status">{selectedMessages.error}</p> : null}
                </div>
              )}

              <form className={styles.messageForm} onSubmit={sendMessage}>
                <label><span className={styles.visuallyHidden}>Message content</span><textarea value={draft} onChange={(event) => setDraft(event.target.value)} placeholder="Write a message to save in this conversation" rows={3} required disabled={sendPending} /></label>
                <div className={styles.composerFooter}><p>Only your USER message is persisted; this endpoint does not produce an AI response.</p><button className={styles.primaryButton} type="submit" disabled={sendPending || !draft.trim()}><Send size={15} aria-hidden="true" />{sendPending ? "Saving..." : "Save message"}</button></div>
              </form>
            </>
          )}
        </section>
      </div>
    </main>
  );
}