import styles from "../../../../components/dashboard/admin/admin-ai-assistant.module.css";

export default function AdminAiAssistantLoading() {
  return (
    <main className={styles.page} aria-busy="true">
      <header className={styles.pageHeader}>
        <div>
          <p className={styles.eyebrow}>UNIVERSITY ADMINISTRATION</p>
          <h1>AI Assistant</h1>
          <p className={styles.description}>Loading your conversations...</p>
        </div>
      </header>
      <section className={styles.loadingPanel} aria-label="Loading conversations">
        <span /><span /><span /><span />
      </section>
    </main>
  );
}