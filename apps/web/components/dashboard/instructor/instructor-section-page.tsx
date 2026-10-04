import Link from "next/link";
import styles from "./instructor-overview.module.css";

export default function InstructorSectionPage({
  title,
}: Readonly<{
  title: string;
}>) {
  return (
    <main className={styles.sectionPage}>
      <p className={styles.eyebrow}>INSTRUCTOR WORKSPACE</p>
      <h1>{title}</h1>
      <p className={styles.welcomeCopy}>
        Instructor records for this section are not available yet.
      </p>
      <Link className={styles.textLink} href="/instructor">
        Return to teaching overview
      </Link>
    </main>
  );
}
