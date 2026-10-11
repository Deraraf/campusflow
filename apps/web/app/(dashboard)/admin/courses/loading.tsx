import styles from "../../../../components/dashboard/admin/admin-course-management.module.css";

export default function CoursesLoading() {
  return (
    <main className={styles.page} aria-busy="true">
      <header className={styles.pageHeader}>
        <div>
          <p className={styles.eyebrow}>UNIVERSITY ADMINISTRATION</p>
          <h1>Course catalog</h1>
          <p className={styles.description}>Loading catalog courses...</p>
        </div>
      </header>
      <div className={styles.loadingSkeleton} aria-label="Loading courses">
        <span />
        <span />
        <span />
      </div>
    </main>
  );
}
