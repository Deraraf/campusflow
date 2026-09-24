import styles from "./loading.module.css";

export default function DashboardLoading() {
  return (
    <main className={styles.page} aria-busy="true">
      <div className={styles.line} />
      <div className={styles.title} />
      <div className={styles.grid}>
        <div />
        <div />
        <div />
      </div>
    </main>
  );
}
