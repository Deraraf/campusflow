import styles from "../../../../components/dashboard/admin/admin-curricula.module.css";

export default function CurriculaLoading() {
  return (
    <main className={styles.page} aria-busy="true">
      <header className={styles.pageHeader}>
        <div>
          <p className={styles.eyebrow}>UNIVERSITY ADMINISTRATION</p>
          <h1>Curriculum management</h1>
          <p className={styles.description}>
            Loading academic structure and catalog options...
          </p>
        </div>
      </header>
      <div
        className={styles.loadingSkeleton}
        aria-label="Loading curriculum tools"
      >
        <span />
        <span />
        <span />
      </div>
    </main>
  );
}
