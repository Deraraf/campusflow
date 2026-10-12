import type { AuthUser } from "@repo/types";
import AdminUsers from "../../../../components/dashboard/admin/admin-users";
import { apiFetch } from "../../../../lib/api/server";

type AdminUser = AuthUser &
  Readonly<{
    createdAt: string;
    updatedAt: string;
  }>;

export default async function UsersPage() {
  try {
    const users = await apiFetch<unknown>("/users");
    if (!Array.isArray(users)) {
      return (
        <AdminUsers
          users={null}
          loadError="The user service returned data in an unexpected format."
        />
      );
    }

    return <AdminUsers users={users as AdminUser[]} loadError={null} />;
  } catch (error) {
    return (
      <AdminUsers
        users={null}
        loadError={
          error instanceof Error
            ? error.message
            : "The user service is unavailable. Please try again."
        }
      />
    );
  }
}
