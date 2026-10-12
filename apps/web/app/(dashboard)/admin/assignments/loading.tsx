import styles from "../../../../components/dashboard/admin/admin-assessments.module.css";

export default function AssignmentsLoading() {
  return (
    <main className={styles.page} aria-busy="true">
      <header className={styles.pageHeader}>
        <div>
          <p className={styles.eyebrow}>UNIVERSITY ADMINISTRATION</p>
          <h1>Assignments</h1>
          <p className={styles.description}>Loading assignment records...</p>
        </div>
      </header>
      <section className={styles.loadingPanel} aria-label="Loading assignments">
        <span /><span /><span /><span />
      </section>
    </main>
  );
}