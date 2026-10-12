import styles from "../../../../../components/dashboard/admin/admin-student-records.module.css";

export default function StudentRecordLoading() {
  return (
    <main className={styles.page} aria-busy="true">
      <header className={styles.pageHeader}>
        <div>
          <p className={styles.eyebrow}>STUDENT ACADEMIC RECORD</p>
          <h1>Student record</h1>
          <p className={styles.description}>Loading profile and academic history...</p>
        </div>
      </header>
      <section className={styles.loadingPanel} aria-label="Loading student record">
        <span />
        <span />
        <span />
        <span />
      </section>
      <section className={styles.loadingPanel} aria-label="Loading academic sections">
        <span />
        <span />
        <span />
      </section>
    </main>
  );
}