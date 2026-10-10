import styles from "../../../../components/dashboard/admin/admin-users.module.css";

export default function UsersLoading() {
  return (
    <main className={styles.page} aria-busy="true">
      <header className={styles.pageHeader}>
        <div>
          <p className={styles.eyebrow}>UNIVERSITY ADMINISTRATION</p>
          <h1>User management</h1>
          <p className={styles.description}>Loading user accounts...</p>
        </div>
      </header>
      <section className={styles.loadingPanel} aria-label="Loading users">
        <span />
        <span />
        <span />
        <span />
      </section>
    </main>
  );
}
