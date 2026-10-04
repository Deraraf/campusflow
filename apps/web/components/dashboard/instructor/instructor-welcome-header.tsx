import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import styles from "./instructor-overview.module.css";

export default function InstructorWelcomeHeader() {
  return (
    <header className={styles.welcomeHeader}>
      <div>
        <p className={styles.eyebrow}>INSTRUCTOR WORKSPACE</p>
        <h1>Teaching overview</h1>
        <p className={styles.welcomeCopy}>
          Review your teaching schedule, coursework, and student activity.
        </p>
      </div>
      <Link className={styles.textLink} href="/instructor/courses">
        My courses <ArrowUpRight size={15} aria-hidden="true" />
      </Link>
    </header>
  );
}
