import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import styles from "./student-overview.module.css";

export default function StudentWelcomeHeader() {
  return (
    <header className={styles.welcomeHeader}>
      <div>
        <p className={styles.eyebrow}>STUDENT WORKSPACE</p>
        <h1>Welcome back</h1>
        <p className={styles.welcomeCopy}>
          Your academic overview, all in one place.
        </p>
      </div>
      <Link className={styles.textLink} href="/student/courses">
        Courses <ArrowUpRight size={15} aria-hidden="true" />
      </Link>
    </header>
  );
}
