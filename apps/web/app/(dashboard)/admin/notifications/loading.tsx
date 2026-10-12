import styles from "../../../../components/dashboard/admin/admin-notifications.module.css";

export default function AdminNotificationsLoading() {
  return (
    <main className={styles.page} aria-busy="true">
      <header className={styles.pageHeader}>
        <div>
          <p className={styles.eyebrow}>UNIVERSITY ADMINISTRATION</p>
          <h1>Notifications</h1>
          <p className={styles.description}>Loading your notification inbox...</p>
        </div>
      </header>
      <section className={styles.loadingPanel} aria-label="Loading notifications">
        <span /><span /><span /><span />
      </section>
    </main>
  );
}