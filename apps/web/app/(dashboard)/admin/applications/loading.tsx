import styles from "../../../../components/dashboard/admin/admin-applications.module.css";

export default function ApplicationsLoading() {
  return (
    <main className={styles.page} aria-busy="true">
      <header className={styles.pageHeader}>
        <div>
          <p className={styles.eyebrow}>UNIVERSITY ADMINISTRATION</p>
          <h1>Student applications</h1>
          <p className={styles.description}>
            Loading admission applications...
          </p>
        </div>
      </header>
      <section
        className={styles.loadingPanel}
        aria-label="Loading applications"
      >
        <span />
        <span />
        <span />
        <span />
      </section>
    </main>
  );
}
