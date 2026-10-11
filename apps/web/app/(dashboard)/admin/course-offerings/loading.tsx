import styles from "../../../../components/dashboard/admin/admin-course-management.module.css";

export default function CourseOfferingsLoading() {
  return (
    <main className={styles.page} aria-busy="true">
      <header className={styles.pageHeader}>
        <div>
          <p className={styles.eyebrow}>UNIVERSITY ADMINISTRATION</p>
          <h1>Course offerings</h1>
          <p className={styles.description}>Loading academic options...</p>
        </div>
      </header>
      <div
        className={styles.loadingSkeleton}
        aria-label="Loading course offerings"
      >
        <span />
        <span />
        <span />
      </div>
    </main>
  );
}
