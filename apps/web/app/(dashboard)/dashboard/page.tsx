import LogoutButton from "../../(auth)/logout-button";
import styles from "./dashboard.module.css";

const apiUrl = process.env.NEXT_API_URL ?? "http://localhost:4000";

export default function DashboardPage() {
  return (
    <main className={styles.page}>
      <p className={styles.eyebrow}>Authenticated workspace</p>

      <h1>CampusFlow dashboard</h1>

      <p className={styles.lede}>
        This server-rendered shell is ready for role-aware academic views.
      </p>

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

      <LogoutButton apiUrl={apiUrl} />
    </main>
  );
}
