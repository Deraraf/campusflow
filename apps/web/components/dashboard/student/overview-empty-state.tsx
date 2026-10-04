import { Inbox } from "lucide-react";
import styles from "./student-overview.module.css";

export default function OverviewEmptyState({
  children,
}: Readonly<{
  children: string;
}>) {
  return (
    <div className={styles.emptyState}>
      <span className={styles.emptyIcon}>
        <Inbox size={18} aria-hidden="true" />
      </span>
      <p>{children}</p>
    </div>
  );
}
