"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Search, UserRound, X } from "lucide-react";
import type { AuthUser } from "@repo/types";
import styles from "./admin-users.module.css";

type AdminUser = AuthUser &
  Readonly<{
    createdAt: string;
    updatedAt: string;
  }>;

type Department = Readonly<{
  id: string;
  name: string;
  code: string;
  college?: Readonly<{ name: string }> | null;
}>;

type PromotionTarget = Pick<
  AdminUser,
  "id" | "firstName" | "lastName" | "email"
>;
type RoleFilter = "ALL" | AdminUser["role"];
type StatusFilter = "ALL" | AdminUser["status"];

const roleLabels: Record<AdminUser["role"], string> = {
  STUDENT: "Student",
  INSTRUCTOR: "Instructor",
  ADMIN: "Admin",
};

const statusLabels: Record<AdminUser["status"], string> = {
  PENDING_VERIFICATION: "Pending verification",
  ACTIVE: "Active",
  SUSPENDED: "Suspended",
};

function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Unknown";
  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeZone: "UTC",
  }).format(date);
}

async function responseError(response: Response) {
  try {
    const body: unknown = await response.json();
    if (typeof body === "object" && body !== null && "message" in body) {
      const message = (body as { message?: unknown }).message;
      if (typeof message === "string") return message;
      if (Array.isArray(message))
        return message.filter((item) => typeof item === "string").join(" ");
    }
  } catch {
    // Fall through to a status-based message for non-JSON errors.
  }
  return `Request failed (${response.status}). Please try again.`;
}

export default function AdminUsers({
  users,
  loadError,
}: Readonly<{
  users: readonly AdminUser[] | null;
  loadError: string | null;
}>) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState<RoleFilter>("ALL");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("ALL");
  const [detailsUser, setDetailsUser] = useState<AdminUser | null>(null);
  const [promotionUser, setPromotionUser] = useState<PromotionTarget | null>(
    null,
  );
  const [departments, setDepartments] = useState<readonly Department[]>([]);
  const [departmentsLoading, setDepartmentsLoading] = useState(false);
  const [departmentsError, setDepartmentsError] = useState<string | null>(null);
  const [departmentId, setDepartmentId] = useState("");
  const [employeeNumber, setEmployeeNumber] = useState("");
  const [promotionPending, setPromotionPending] = useState(false);
  const [promotionError, setPromotionError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  async function loadDepartments() {
    setDepartmentsLoading(true);
    setDepartmentsError(null);
    try {
      const response = await fetch("/api/admin/departments", {
        credentials: "same-origin",
        cache: "no-store",
      });
      if (!response.ok) throw new Error(await responseError(response));
      const data: unknown = await response.json();
      if (!Array.isArray(data))
        throw new Error("Department data has an unexpected format.");
      setDepartments(data as Department[]);
    } catch (error) {
      setDepartmentsError(
        error instanceof Error
          ? error.message
          : "Departments could not be loaded.",
      );
    } finally {
      setDepartmentsLoading(false);
    }
  }

  useEffect(() => {
    if (promotionUser) void loadDepartments();
  }, [promotionUser]);

  const visibleUsers = (users ?? []).filter((user) => {
    const searchText =
      `${user.firstName} ${user.lastName} ${user.email}`.toLowerCase();
    return (
      searchText.includes(query.trim().toLowerCase()) &&
      (roleFilter === "ALL" || user.role === roleFilter) &&
      (statusFilter === "ALL" || user.status === statusFilter)
    );
  });

  function openPromotion(user: AdminUser) {
    setNotice(null);
    setPromotionError(null);
    setDepartmentId("");
    setEmployeeNumber("");
    setPromotionUser(user);
  }

  async function submitPromotion(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!promotionUser || promotionPending) return;

    const cleanEmployeeNumber = employeeNumber.trim();
    if (!departmentId || !cleanEmployeeNumber) {
      setPromotionError("Select a department and enter an employee number.");
      return;
    }

    setPromotionPending(true);
    setPromotionError(null);
    try {
      const response = await fetch(
        `/api/admin/users/${encodeURIComponent(promotionUser.id)}/promote-instructor`,
        {
          method: "PATCH",
          credentials: "same-origin",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            departmentId,
            employeeNumber: cleanEmployeeNumber,
          }),
        },
      );
      if (!response.ok) throw new Error(await responseError(response));

      const name = [promotionUser.firstName, promotionUser.lastName]
        .filter(Boolean)
        .join(" ");
      setNotice(`${name || promotionUser.email} was promoted to Instructor.`);
      setPromotionUser(null);
      router.refresh();
    } catch (error) {
      setPromotionError(
        error instanceof Error
          ? error.message
          : "Promotion failed. Please try again.",
      );
    } finally {
      setPromotionPending(false);
    }
  }

  return (
    <main className={styles.page}>
      <header className={styles.pageHeader}>
        <div>
          <p className={styles.eyebrow}>UNIVERSITY ADMINISTRATION</p>
          <h1>User management</h1>
          <p className={styles.description}>
            Browse account access and promote eligible students to instructors.
          </p>
        </div>
        {users ? (
          <p className={styles.totalCount}>
            {users.length.toLocaleString()} accounts
          </p>
        ) : null}
      </header>

      {notice ? (
        <p className={styles.successNotice} role="status">
          {notice}
        </p>
      ) : null}

      {loadError ? (
        <section className={styles.errorPanel} role="alert">
          <h2>Users could not be loaded</h2>
          <p>{loadError}</p>
          <button
            className={styles.secondaryButton}
            type="button"
            onClick={() => router.refresh()}
          >
            Retry
          </button>
        </section>
      ) : users === null ? (
        <section className={styles.emptyPanel}>
          <UserRound size={22} aria-hidden="true" />
          <h2>User list unavailable</h2>
          <p>No user data was returned. Refresh to try again.</p>
        </section>
      ) : (
        <>
          <section className={styles.toolbar} aria-label="Filter users">
            <label className={styles.searchField}>
              <Search size={17} aria-hidden="true" />
              <span className={styles.visuallyHidden}>
                Search users by name or email
              </span>
              <input
                type="search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search name or email"
              />
            </label>
            <label className={styles.filterField}>
              <span>Role</span>
              <select
                value={roleFilter}
                onChange={(event) =>
                  setRoleFilter(event.target.value as RoleFilter)
                }
              >
                <option value="ALL">All roles</option>
                <option value="STUDENT">Student</option>
                <option value="INSTRUCTOR">Instructor</option>
                <option value="ADMIN">Admin</option>
              </select>
            </label>
            <label className={styles.filterField}>
              <span>Status</span>
              <select
                value={statusFilter}
                onChange={(event) =>
                  setStatusFilter(event.target.value as StatusFilter)
                }
              >
                <option value="ALL">All statuses</option>
                <option value="PENDING_VERIFICATION">
                  Pending verification
                </option>
                <option value="ACTIVE">Active</option>
                <option value="SUSPENDED">Suspended</option>
              </select>
            </label>
          </section>

          <div className={styles.resultCount} aria-live="polite">
            Showing {visibleUsers.length.toLocaleString()} of{" "}
            {users.length.toLocaleString()} accounts
          </div>

          {users.length === 0 ? (
            <section className={styles.emptyPanel}>
              <UserRound size={22} aria-hidden="true" />
              <h2>No user accounts yet</h2>
              <p>Accounts will appear here when they are created.</p>
            </section>
          ) : visibleUsers.length === 0 ? (
            <section className={styles.emptyPanel}>
              <Search size={22} aria-hidden="true" />
              <h2>No matching users</h2>
              <p>Try changing the search text or filters.</p>
            </section>
          ) : (
            <>
              <div className={styles.tableWrap}>
                <table className={styles.userTable}>
                  <caption className={styles.visuallyHidden}>
                    CampusFlow user accounts
                  </caption>
                  <thead>
                    <tr>
                      <th scope="col">User</th>
                      <th scope="col">Role</th>
                      <th scope="col">Account status</th>
                      <th scope="col">Created</th>
                      <th scope="col">
                        <span className={styles.visuallyHidden}>Actions</span>
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {visibleUsers.map((user) => {
                      const fullName = [user.firstName, user.lastName]
                        .filter(Boolean)
                        .join(" ");
                      return (
                        <tr key={user.id}>
                          <td>
                            <div className={styles.userIdentity}>
                              <strong>{fullName || "Name not provided"}</strong>
                              <span>{user.email}</span>
                            </div>
                          </td>
                          <td>
                            <span
                              className={`${styles.badge} ${styles[`role${user.role}`]}`}
                            >
                              {roleLabels[user.role]}
                            </span>
                          </td>
                          <td>
                            <span
                              className={`${styles.badge} ${styles[`status${user.status}`]}`}
                            >
                              {statusLabels[user.status]}
                            </span>
                          </td>
                          <td>{formatDate(user.createdAt)}</td>
                          <td>
                            <div className={styles.rowActions}>
                              <button
                                className={styles.textButton}
                                type="button"
                                onClick={() => setDetailsUser(user)}
                              >
                                Details
                              </button>
                              {user.role === "STUDENT" ? (
                                <button
                                  className={styles.promoteButton}
                                  type="button"
                                  onClick={() => openPromotion(user)}
                                >
                                  Promote
                                </button>
                              ) : null}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              <ul className={styles.mobileUsers} aria-label="User accounts">
                {visibleUsers.map((user) => {
                  const fullName = [user.firstName, user.lastName]
                    .filter(Boolean)
                    .join(" ");
                  return (
                    <li className={styles.mobileUser} key={user.id}>
                      <div className={styles.mobileUserHeader}>
                        <div className={styles.userIdentity}>
                          <strong>{fullName || "Name not provided"}</strong>
                          <span>{user.email}</span>
                        </div>
                        <span
                          className={`${styles.badge} ${styles[`role${user.role}`]}`}
                        >
                          {roleLabels[user.role]}
                        </span>
                      </div>
                      <dl className={styles.mobileFacts}>
                        <div>
                          <dt>Account status</dt>
                          <dd>
                            <span
                              className={`${styles.badge} ${styles[`status${user.status}`]}`}
                            >
                              {statusLabels[user.status]}
                            </span>
                          </dd>
                        </div>
                        <div>
                          <dt>Created</dt>
                          <dd>{formatDate(user.createdAt)}</dd>
                        </div>
                      </dl>
                      <div className={styles.rowActions}>
                        <button
                          className={styles.textButton}
                          type="button"
                          onClick={() => setDetailsUser(user)}
                        >
                          Details
                        </button>
                        {user.role === "STUDENT" ? (
                          <button
                            className={styles.promoteButton}
                            type="button"
                            onClick={() => openPromotion(user)}
                          >
                            Promote
                          </button>
                        ) : null}
                      </div>
                    </li>
                  );
                })}
              </ul>
            </>
          )}
        </>
      )}

      {detailsUser ? (
        <div
          className={styles.dialogBackdrop}
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setDetailsUser(null);
          }}
        >
          <section
            className={styles.dialog}
            role="dialog"
            aria-modal="true"
            aria-labelledby="user-details-title"
            onKeyDown={(event) => {
              if (event.key === "Escape") setDetailsUser(null);
            }}
          >
            <header className={styles.dialogHeader}>
              <div>
                <p className={styles.eyebrow}>ACCOUNT DETAILS</p>
                <h2 id="user-details-title">
                  {[detailsUser.firstName, detailsUser.lastName]
                    .filter(Boolean)
                    .join(" ") || "User details"}
                </h2>
              </div>
              <button
                className={styles.iconButton}
                type="button"
                autoFocus
                aria-label="Close user details"
                onClick={() => setDetailsUser(null)}
              >
                <X size={18} aria-hidden="true" />
              </button>
            </header>
            <dl className={styles.detailList}>
              <div>
                <dt>Email</dt>
                <dd>{detailsUser.email}</dd>
              </div>
              <div>
                <dt>Role</dt>
                <dd>{roleLabels[detailsUser.role]}</dd>
              </div>
              <div>
                <dt>Account status</dt>
                <dd>{statusLabels[detailsUser.status]}</dd>
              </div>
              <div>
                <dt>Email verified</dt>
                <dd>
                  {detailsUser.emailVerifiedAt
                    ? formatDate(detailsUser.emailVerifiedAt)
                    : "Not verified"}
                </dd>
              </div>
              <div>
                <dt>Created</dt>
                <dd>{formatDate(detailsUser.createdAt)}</dd>
              </div>
              <div>
                <dt>Last updated</dt>
                <dd>{formatDate(detailsUser.updatedAt)}</dd>
              </div>
            </dl>
          </section>
        </div>
      ) : null}

      {promotionUser ? (
        <div
          className={styles.dialogBackdrop}
          onMouseDown={(event) => {
            if (event.target === event.currentTarget && !promotionPending)
              setPromotionUser(null);
          }}
        >
          <section
            className={styles.dialog}
            role="dialog"
            aria-modal="true"
            aria-labelledby="promote-title"
            aria-describedby="promote-description"
            onKeyDown={(event) => {
              if (event.key === "Escape" && !promotionPending)
                setPromotionUser(null);
            }}
          >
            <header className={styles.dialogHeader}>
              <div>
                <p className={styles.eyebrow}>ROLE CHANGE</p>
                <h2 id="promote-title">Promote to instructor</h2>
              </div>
              <button
                className={styles.iconButton}
                type="button"
                aria-label="Close promotion form"
                disabled={promotionPending}
                onClick={() => setPromotionUser(null)}
              >
                <X size={18} aria-hidden="true" />
              </button>
            </header>
            <p className={styles.dialogCopy} id="promote-description">
              Promote{" "}
              {[promotionUser.firstName, promotionUser.lastName]
                .filter(Boolean)
                .join(" ") || promotionUser.email}{" "}
              from Student to Instructor. This creates an instructor profile in
              the selected department.
            </p>
            <form className={styles.promotionForm} onSubmit={submitPromotion}>
              <label className={styles.formField}>
                <span>Employee number</span>
                <input
                  autoFocus
                  autoComplete="off"
                  required
                  value={employeeNumber}
                  onChange={(event) => setEmployeeNumber(event.target.value)}
                />
              </label>
              <label className={styles.formField}>
                <span>Department</span>
                <select
                  required
                  value={departmentId}
                  onChange={(event) => setDepartmentId(event.target.value)}
                  disabled={departmentsLoading || departments.length === 0}
                >
                  <option value="">Select a department</option>
                  {departments.map((department) => (
                    <option key={department.id} value={department.id}>
                      {department.name} ({department.code})
                      {department.college?.name
                        ? ` · ${department.college.name}`
                        : ""}
                    </option>
                  ))}
                </select>
              </label>
              {departmentsLoading ? (
                <p className={styles.formHint} role="status">
                  Loading departments...
                </p>
              ) : null}
              {departmentsError ? (
                <div className={styles.formError} role="alert">
                  <p>{departmentsError}</p>
                  <button
                    className={styles.textButton}
                    type="button"
                    onClick={() => void loadDepartments()}
                  >
                    Retry department list
                  </button>
                </div>
              ) : null}
              {departments.length === 0 &&
              !departmentsLoading &&
              !departmentsError ? (
                <p className={styles.formHint}>
                  No departments are available for assignment.
                </p>
              ) : null}
              {promotionError ? (
                <p className={styles.formError} role="alert">
                  {promotionError}
                </p>
              ) : null}
              <div className={styles.dialogActions}>
                <button
                  className={styles.secondaryButton}
                  type="button"
                  disabled={promotionPending}
                  onClick={() => setPromotionUser(null)}
                >
                  Cancel
                </button>
                <button
                  className={styles.promoteButton}
                  type="submit"
                  disabled={
                    promotionPending ||
                    departmentsLoading ||
                    departments.length === 0 ||
                    Boolean(departmentsError)
                  }
                >
                  {promotionPending ? "Promoting..." : "Confirm promotion"}
                </button>
              </div>
            </form>
          </section>
        </div>
      ) : null}
    </main>
  );
}
