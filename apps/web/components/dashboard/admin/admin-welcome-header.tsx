import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import styles from "./admin-overview.module.css";

export default function AdminWelcomeHeader() {
  return (
    <header className={styles.welcomeHeader}>
      <div>
        <p className={styles.eyebrow}>UNIVERSITY ADMINISTRATION</p>
        <h1>Admin dashboard</h1>
        <p className={styles.welcomeCopy}>
          Welcome to CampusFlow administration. Review university accounts and
          current-term course offerings.
        </p>
      </div>
      <Link className={styles.textLink} href="/admin/users">
        User directory <ArrowUpRight size={15} aria-hidden="true" />
      </Link>
    </header>
  );
}
