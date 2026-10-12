import styles from "../../../../components/dashboard/admin/admin-academic-structure.module.css";

export default function AcademicStructureLoading() {
  return (
    <main className={styles.page} aria-busy="true">
      <header className={styles.pageHeader}>
        <div>
          <p className={styles.eyebrow}>UNIVERSITY ADMINISTRATION</p>
          <h1>Academic structure</h1>
          <p className={styles.description}>
            Loading colleges, departments, and programs...
          </p>
        </div>
      </header>
      <section
        className={styles.loadingSkeleton}
        aria-label="Loading academic structure"
      >
        <span />
        <span />
        <span />
      </section>
    </main>
  );
}
