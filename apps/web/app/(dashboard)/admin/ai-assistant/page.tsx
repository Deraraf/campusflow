import AdminAiAssistant from "../../../../components/dashboard/admin/admin-ai-assistant";
import {
  isConversationSummary,
  resolveCommunicationList,
} from "../../../../lib/admin/communications";
import { apiFetch } from "../../../../lib/api/server";

export default async function AdminAiAssistantPage() {
  const conversationsResult = await Promise.resolve()
    .then(() => apiFetch<unknown>("/conversations"))
    .then(
      (value) => ({ status: "fulfilled", value }) as const,
      (reason: unknown) => ({ status: "rejected", reason }) as const,
    );

  return (
    <AdminAiAssistant
      initialConversations={resolveCommunicationList(
        conversationsResult,
        isConversationSummary,
        "Conversations",
      )}
    />
  );
}