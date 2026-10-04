import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import styles from "./admin-overview.module.css";

export default function AdminWelcomeHeader() {
  return (
    <header className={styles.welcomeHeader}>
      <div>
        <p className={styles.eyebrow}>UNIVERSITY ADMINISTRATION</p>
        <h1>Institutional overview</h1>
        <p className={styles.welcomeCopy}>
          Review university records, administration, and system activity.
        </p>
      </div>
      <Link className={styles.textLink} href="/admin/users">
        User directory <ArrowUpRight size={15} aria-hidden="true" />
      </Link>
    </header>
  );
}
