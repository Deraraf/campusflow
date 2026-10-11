import AdminNotifications from "../../../../components/dashboard/admin/admin-notifications";
import {
  isAdminNotification,
  isNotificationRecipient,
  resolveCommunicationList,
} from "../../../../lib/admin/communications";
import { apiFetch } from "../../../../lib/api/server";

export default async function AdminNotificationsPage() {
  const [notificationsResult, usersResult] = await Promise.allSettled([
    apiFetch<unknown>("/notifications"),
    apiFetch<unknown>("/users"),
  ]);

  return (
    <AdminNotifications
      notifications={resolveCommunicationList(
        notificationsResult,
        isAdminNotification,
        "Notifications",
      )}
      recipients={resolveCommunicationList(
        usersResult,
        isNotificationRecipient,
        "User directory",
      )}
    />
  );
}