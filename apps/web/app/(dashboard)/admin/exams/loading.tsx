import styles from "../../../../components/dashboard/admin/admin-assessments.module.css";

export default function ExamsLoading() {
  return (
    <main className={styles.page} aria-busy="true">
      <header className={styles.pageHeader}>
        <div>
          <p className={styles.eyebrow}>UNIVERSITY ADMINISTRATION</p>
          <h1>Exams</h1>
          <p className={styles.description}>Loading exam records...</p>
        </div>
      </header>
      <section className={styles.loadingPanel} aria-label="Loading exams">
        <span /><span /><span /><span />
      </section>
    </main>
  );
}