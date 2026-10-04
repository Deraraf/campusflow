import Link from "next/link";
import styles from "./student-overview.module.css";

export default function StudentSectionPage({
  title,
}: Readonly<{
  title: string;
}>) {
  return (
    <main className={styles.sectionPage}>
      <p className={styles.eyebrow}>STUDENT WORKSPACE</p>
      <h1>{title}</h1>
      <p className={styles.sectionDescription}>
        Records for this section are not available yet.
      </p>
      <Link className={styles.textLink} href="/student">
        Return to dashboard
      </Link>
    </main>
  );
}
