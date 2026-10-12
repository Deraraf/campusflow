"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Bell, Check, Plus, RefreshCw, Search, X } from "lucide-react";
import type {
  AdminNotification,
  CommunicationLoad,
  NotificationRecipient,
} from "../../../lib/admin/communications";
import { isRecord } from "../../../lib/admin/student-records";
import styles from "./admin-notifications.module.css";

type ReadFilter = "ALL" | "UNREAD" | "READ";

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
    // Use a status-based message for non-JSON error responses.
  }
  return `Request failed (${response.status}). Please try again.`;
}

function userName(user: Pick<NotificationRecipient, "firstName" | "lastName">) {
  return [user.firstName, user.lastName].filter(Boolean).join(" ") || "Name unavailable";
}

export default function AdminNotifications({
  notifications,
  recipients,
}: Readonly<{
  notifications: CommunicationLoad<AdminNotification>;
  recipients: CommunicationLoad<NotificationRecipient>;
}>) {
  const router = useRouter();
  const [filter, setFilter] = useState<ReadFilter>("ALL");
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showComposer, setShowComposer] = useState(false);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const rows = notifications.data ?? [];
  const selected = rows.find((row) => row.id === selectedId) ?? null;
  const unreadCount = rows.filter((row) => !row.isRead).length;
  const needle = query.trim().toLocaleLowerCase();
  const visible = rows.filter((row) => {
    const matchesRead = filter === "ALL" || (filter === "UNREAD" ? !row.isRead : row.isRead);
    return matchesRead && `${row.title} ${row.message}`.toLocaleLowerCase().includes(needle);
  });

  async function toggleRead(notification: AdminNotification) {
    if (pendingId) return;
    setPendingId(notification.id);
    setActionError(null);
    setSuccess(null);
    try {
      const action = notification.isRead ? "unread" : "read";
      const response = await fetch(
        `/api/admin/notifications/${encodeURIComponent(notification.id)}/${action}`,
        { method: "PATCH", credentials: "same-origin" },
      );
      if (!response.ok) throw new Error(await responseError(response));
      setSuccess(notification.isRead ? "Notification marked unread." : "Notification marked read.");
      router.refresh();
    } catch (caught) {
      setActionError(caught instanceof Error ? caught.message : "Notification state could not be updated.");
    } finally {
      setPendingId(null);
    }
  }

  function clearFilters() {
    setQuery("");
    setFilter("ALL");
  }

  return (
    <main className={styles.page}>
      <header className={styles.pageHeader}>
        <div>
          <p className={styles.eyebrow}>UNIVERSITY ADMINISTRATION</p>
          <h1>Notifications</h1>
          <p className={styles.description}>Your Admin inbox and notifications created for individual accounts.</p>
        </div>
        <button className={styles.primaryButton} type="button" onClick={() => { setShowComposer((value) => !value); setSuccess(null); }}>
          {showComposer ? <X size={16} aria-hidden="true" /> : <Plus size={16} aria-hidden="true" />}
          {showComposer ? "Close composer" : "New notification"}
        </button>
      </header>

      {success ? <p className={styles.successNotice} role="status">{success}</p> : null}
      {actionError ? <p className={styles.formError} role="alert">{actionError}</p> : null}

      {showComposer ? (
        <NotificationComposer
          recipients={recipients}
          onCancel={() => setShowComposer(false)}
          onRetry={() => router.refresh()}
          onCreated={(message) => { setSuccess(message); setShowComposer(false); router.refresh(); }}
        />
      ) : null}

      <section className={styles.inboxHeader}>
        <div>
          <p className={styles.sectionEyebrow}>PERSONAL INBOX</p>
          <h2>Notifications for your account</h2>
        </div>
        {notifications.data ? <span className={styles.unreadCount}>{unreadCount} unread</span> : null}
      </section>

      <section className={styles.toolbar} aria-label="Filter notifications">
        <label className={styles.searchField}>
          <Search size={17} aria-hidden="true" />
          <span className={styles.visuallyHidden}>Search notifications</span>
          <input type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search title or message" />
        </label>
        <div className={styles.segmented} role="group" aria-label="Read status">
          {(["ALL", "UNREAD", "READ"] as const).map((value) => (
            <button key={value} type="button" aria-pressed={filter === value} onClick={() => setFilter(value)}>
              {value === "ALL" ? "All" : value === "UNREAD" ? "Unread" : "Read"}
            </button>
          ))}
        </div>
      </section>

      {notifications.error ? (
        <section className={styles.errorPanel} role="alert">
          <div><h2>Inbox could not be loaded</h2><p>{notifications.error}</p></div>
          <button className={styles.secondaryButton} type="button" onClick={() => router.refresh()}><RefreshCw size={15} aria-hidden="true" /> Retry</button>
        </section>
      ) : notifications.data === null ? (
        <EmptyState title="Inbox unavailable" message="No notification data was returned. Retry to try again." onRetry={() => router.refresh()} />
      ) : rows.length === 0 ? (
        <EmptyState title="No notifications yet" message="Notifications addressed to your Admin account will appear here." />
      ) : visible.length === 0 ? (
        <EmptyState title="No matching notifications" message="Change or clear the search and read-status filter." onClear={clearFilters} />
      ) : (
        <div className={styles.inboxLayout}>
          <ul className={styles.notificationList} aria-label="Notifications">
            {visible.map((notification) => (
              <li key={notification.id}>
                <button
                  className={`${styles.notificationRow} ${notification.isRead ? styles.read : styles.unread} ${selectedId === notification.id ? styles.selected : ""}`}
                  type="button"
                  aria-current={selectedId === notification.id ? "true" : undefined}
                  onClick={() => { setSelectedId(notification.id); setActionError(null); }}
                >
                  <span className={styles.readMarker} aria-hidden="true">{notification.isRead ? <Check size={14} /> : null}</span>
                  <span className={styles.notificationCopy}>
                    <strong>{notification.title}</strong>
                    <span>{notification.message}</span>
                    <time dateTime={notification.createdAt}>{formatTimestamp(notification.createdAt)}</time>
                  </span>
                  <span className={styles.readLabel}>{notification.isRead ? "Read" : "Unread"}</span>
                </button>
              </li>
            ))}
          </ul>

          {selected ? (
            <aside className={styles.detailPanel} aria-labelledby="notification-detail-title">
              <header className={styles.detailHeader}>
                <div><p className={styles.sectionEyebrow}>NOTIFICATION</p><h2 id="notification-detail-title">{selected.title}</h2></div>
                <button className={styles.iconButton} type="button" aria-label="Close notification details" onClick={() => setSelectedId(null)}><X size={17} aria-hidden="true" /></button>
              </header>
              <p className={styles.detailMessage}>{selected.message}</p>
              <dl className={styles.detailFacts}>
                <div><dt>Received</dt><dd>{formatTimestamp(selected.createdAt)}</dd></div>
                <div><dt>State</dt><dd>{selected.isRead ? "Read" : "Unread"}</dd></div>
              </dl>
              <button className={styles.secondaryButton} type="button" disabled={pendingId === selected.id} onClick={() => void toggleRead(selected)}>
                {pendingId === selected.id ? "Updating..." : selected.isRead ? "Mark unread" : "Mark as read"}
              </button>
            </aside>
          ) : (
            <aside className={styles.detailPlaceholder}><Bell size={20} aria-hidden="true" /><p>Select a notification to inspect it.</p></aside>
          )}
        </div>
      )}
    </main>
  );
}

function NotificationComposer({
  recipients,
  onCancel,
  onRetry,
  onCreated,
}: Readonly<{
  recipients: CommunicationLoad<NotificationRecipient>;
  onCancel: () => void;
  onRetry: () => void;
  onCreated: (message: string) => void;
}>) {
  const [userId, setUserId] = useState("");
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;
    if (!userId || !title.trim() || !message.trim()) {
      setError("Choose a recipient and provide a title and message.");
      return;
    }
    setPending(true);
    setError(null);
    try {
      const response = await fetch("/api/admin/notifications", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, title: title.trim(), message: message.trim() }),
      });
      if (!response.ok) throw new Error(await responseError(response));
      const recipient = recipients.data?.find((item) => item.id === userId);
      onCreated(`Notification created for ${recipient ? `${userName(recipient)} (${recipient.email})` : "the selected account"}.`);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Notification could not be created.");
    } finally {
      setPending(false);
    }
  }

  return (
    <section className={styles.composer} aria-labelledby="new-notification-title">
      <header className={styles.detailHeader}>
        <div><p className={styles.sectionEyebrow}>SINGLE RECIPIENT</p><h2 id="new-notification-title">Create notification</h2></div>
        <button className={styles.iconButton} type="button" onClick={onCancel} aria-label="Close notification composer"><X size={17} aria-hidden="true" /></button>
      </header>
      <p className={styles.formHint}>This creates one inbox notification for the selected user. It does not broadcast or send a bulk announcement.</p>
      {recipients.error ? (
        <div className={styles.errorInline} role="alert"><p>{recipients.error}</p><button className={styles.secondaryButton} type="button" onClick={onRetry}>Retry</button></div>
      ) : recipients.data === null ? (
        <p className={styles.formHint}>The user list is unavailable, so a recipient cannot be selected.</p>
      ) : recipients.data.length === 0 ? (
        <p className={styles.formHint}>No users are available.</p>
      ) : (
        <form className={styles.composerForm} onSubmit={submit}>
          <label className={styles.formField}><span>Recipient</span><select value={userId} onChange={(event) => setUserId(event.target.value)} required><option value="">Select one user</option>{recipients.data.map((user) => <option key={user.id} value={user.id}>{userName(user)} · {user.email} · {user.role}</option>)}</select></label>
          <label className={styles.formField}><span>Title</span><input value={title} onChange={(event) => setTitle(event.target.value)} required maxLength={180} /></label>
          <label className={styles.formField}><span>Message</span><textarea value={message} onChange={(event) => setMessage(event.target.value)} required rows={4} /></label>
          {error ? <p className={styles.formError} role="alert">{error}</p> : null}
          <div className={styles.formActions}><button className={styles.secondaryButton} type="button" onClick={onCancel} disabled={pending}>Cancel</button><button className={styles.primaryButton} type="submit" disabled={pending || !userId || !title.trim() || !message.trim()}>{pending ? "Creating..." : "Create notification"}</button></div>
        </form>
      )}
    </section>
  );
}

function EmptyState({
  title,
  message,
  onRetry,
  onClear,
}: Readonly<{ title: string; message: string; onRetry?: () => void; onClear?: () => void }>) {
  return <section className={styles.emptyPanel}><Bell size={22} aria-hidden="true" /><h2>{title}</h2><p>{message}</p>{onRetry ? <button className={styles.secondaryButton} type="button" onClick={onRetry}>Retry</button> : null}{onClear ? <button className={styles.secondaryButton} type="button" onClick={onClear}>Clear filters</button> : null}</section>;
}