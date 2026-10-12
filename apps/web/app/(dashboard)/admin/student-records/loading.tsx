import styles from "../../../../components/dashboard/admin/admin-student-records.module.css";

export default function StudentRecordsLoading() {
  return (
    <main className={styles.page} aria-busy="true">
      <header className={styles.pageHeader}>
        <div>
          <p className={styles.eyebrow}>UNIVERSITY ADMINISTRATION</p>
          <h1>Student records</h1>
          <p className={styles.description}>Loading student profiles...</p>
        </div>
      </header>
      <section className={styles.loadingPanel} aria-label="Loading students">
        <span />
        <span />
        <span />
        <span />
      </section>
    </main>
  );
}