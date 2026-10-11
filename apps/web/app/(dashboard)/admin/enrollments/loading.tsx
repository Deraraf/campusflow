import styles from "../../../../components/dashboard/admin/admin-enrollments.module.css";

export default function AdminEnrollmentsLoading() {
  return (
    <main className={styles.page} aria-busy="true">
      <header className={styles.pageHeader}>
        <div>
          <p className={styles.eyebrow}>UNIVERSITY ADMINISTRATION</p>
          <h1>Enrollments</h1>
          <p className={styles.description}>Loading enrollment records...</p>
        </div>
      </header>
      <section className={styles.loadingPanel} aria-label="Loading enrollments">
        <span />
        <span />
        <span />
        <span />
      </section>
    </main>
  );
}