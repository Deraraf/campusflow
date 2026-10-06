import Link from "next/link";
import styles from "./admin-overview.module.css";

export default function AdminSectionPage({
  title,
}: Readonly<{
  title: string;
}>) {
  return (
    <main className={styles.sectionPage}>
      <p className={styles.eyebrow}>UNIVERSITY ADMINISTRATION</p>
      <h1>{title}</h1>
      <p className={styles.welcomeCopy}>
        Records for this section are not available yet.
      </p>
      <Link className={styles.textLink} href="/admin">
        Return to institutional overview
      </Link>
    </main>
  );
}
