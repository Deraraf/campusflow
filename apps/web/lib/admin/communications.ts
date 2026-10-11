import { isRecord } from "./student-records";

export type AdminNotification = Readonly<{
  id: string;
  userId: string;
  title: string;
  message: string;
  isRead: boolean;
  createdAt: string;
  updatedAt: string;
}>;

export type NotificationRecipient = Readonly<{
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: "STUDENT" | "INSTRUCTOR" | "ADMIN";
  status: "PENDING_VERIFICATION" | "ACTIVE" | "SUSPENDED";
}>;

export type ConversationSummary = Readonly<{
  id: string;
  userId: string;
  title: string | null;
  createdAt: string;
  updatedAt: string;
}>;

export type ConversationMessage = Readonly<{
  id: string;
  role: "USER" | "ASSISTANT" | "SYSTEM";
  content: string;
  createdAt: string;
}>;

export type CommunicationLoad<T> = Readonly<{
  data: readonly T[] | null;
  error: string | null;
}>;

export const messageRoles = ["USER", "ASSISTANT", "SYSTEM"] as const;
export const notificationRoles = ["STUDENT", "INSTRUCTOR", "ADMIN"] as const;
export const notificationUserStatuses = [
  "PENDING_VERIFICATION",
  "ACTIVE",
  "SUSPENDED",
] as const;

export function isAdminNotification(value: unknown): value is AdminNotification {
  return (
    isRecord(value) &&
    typeof value.id === "string" &&
    typeof value.userId === "string" &&
    typeof value.title === "string" &&
    typeof value.message === "string" &&
    typeof value.isRead === "boolean" &&
    typeof value.createdAt === "string" &&
    typeof value.updatedAt === "string"
  );
}

export function isNotificationRecipient(
  value: unknown,
): value is NotificationRecipient {
  return (
    isRecord(value) &&
    typeof value.id === "string" &&
    typeof value.email === "string" &&
    typeof value.firstName === "string" &&
    typeof value.lastName === "string" &&
    notificationRoles.includes(value.role as NotificationRecipient["role"]) &&
    notificationUserStatuses.includes(value.status as NotificationRecipient["status"])
  );
}

export function isConversationSummary(
  value: unknown,
): value is ConversationSummary {
  return (
    isRecord(value) &&
    typeof value.id === "string" &&
    typeof value.userId === "string" &&
    (typeof value.title === "string" || value.title === null) &&
    typeof value.createdAt === "string" &&
    typeof value.updatedAt === "string"
  );
}

export function isConversationMessage(
  value: unknown,
): value is ConversationMessage {
  return (
    isRecord(value) &&
    typeof value.id === "string" &&
    messageRoles.includes(value.role as ConversationMessage["role"]) &&
    typeof value.content === "string" &&
    typeof value.createdAt === "string"
  );
}

export function resolveCommunicationList<T>(
  result: PromiseSettledResult<unknown>,
  guard: (value: unknown) => value is T,
  label: string,
): CommunicationLoad<T> {
  if (result.status === "rejected") {
    return {
      data: null,
      error:
        result.reason instanceof Error
          ? result.reason.message
          : `${label} could not be loaded. Please try again.`,
    };
  }
  return Array.isArray(result.value) && result.value.every(guard)
    ? { data: result.value, error: null }
    : { data: null, error: `${label} returned data in an unexpected format.` };
}