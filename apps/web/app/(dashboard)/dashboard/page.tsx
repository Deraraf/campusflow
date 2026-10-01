import { getCurrentUser } from "../../../lib/api/server";
import LogoutButton from "../../(auth)/logout-button";
import styles from "./dashboard.module.css";

export default async function DashboardPage() {
  // getCurrentUser is safe here: the layout already redirected if null,
  // but we still call it directly so this page works standalone too.
  const user = await getCurrentUser();

  const displayName = user
    ? `${user.firstName} ${user.lastName}`
    : "Student";

  const roleLabel: Record<string, string> = {
    STUDENT: "Student",
    INSTRUCTOR: "Instructor",
    ADMIN: "Administrator",
  };

  return (
    <main className={styles.page}>
      <p className={styles.eyebrow}>Authenticated workspace</p>

      <h1>
        Welcome back,{" "}
        <span style={{ color: "#c45b36" }}>{displayName}</span>.
      </h1>

      {user && (
        <p className={styles.lede}>
          Signed in as{" "}
          <strong>{user.email}</strong> ·{" "}
          {roleLabel[user.role] ?? user.role}
        </p>
      )}

      <div className={styles.grid}>
        <article>
          <span>01</span>
          <h2>Courses</h2>
          <p>
            Course data will be loaded on the server when the API surface is
            ready.
          </p>
        </article>

        <article>
          <span>02</span>
          <h2>Activity</h2>
          <p>
            Personal activity stays dynamic and is never shared through a public
            cache.
          </p>
        </article>

        <article>
          <span>03</span>
          <h2>Notifications</h2>
          <p>Fast-changing data will use short-lived or uncached requests.</p>
        </article>
      </div>

      <LogoutButton />
    </main>
  );
}
