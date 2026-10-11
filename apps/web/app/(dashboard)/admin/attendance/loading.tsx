import styles from "../../../../components/dashboard/admin/admin-attendance.module.css";

export default function AdminAttendanceLoading() {
  return (
    <main className={styles.page} aria-busy="true">
      <header className={styles.pageHeader}>
        <div>
          <p className={styles.eyebrow}>UNIVERSITY ADMINISTRATION</p>
          <h1>Attendance</h1>
          <p className={styles.description}>Loading attendance records...</p>
        </div>
      </header>
      <section className={styles.loadingPanel} aria-label="Loading attendance">
        <span />
        <span />
        <span />
        <span />
      </section>
    </main>
  );
}