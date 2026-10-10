import styles from "../../../../components/dashboard/admin/admin-academic-calendar.module.css";

export default function AcademicCalendarLoading() {
  return (
    <main className={styles.page} aria-busy="true">
      <header className={styles.pageHeader}>
        <div>
          <p className={styles.eyebrow}>UNIVERSITY ADMINISTRATION</p>
          <h1>Academic calendar</h1>
          <p className={styles.description}>Loading academic years...</p>
        </div>
      </header>
      <section
        className={styles.loadingSkeleton}
        aria-label="Loading academic calendar"
      >
        <span />
        <span />
        <span />
      </section>
    </main>
  );
}
