import Link from "next/link";
import { ArrowRight, Inbox } from "lucide-react";
import styles from "./instructor-overview.module.css";

export type TeachingRecord = Readonly<{
  title: string;
  detail: string;
  meta?: string;
}>;

export default function TeachingWorkSection({
  title,
  records,
  emptyMessage,
  href,
  actionLabel,
}: Readonly<{
  title: string;
  records: readonly TeachingRecord[];
  emptyMessage: string;
  href: string;
  actionLabel: string;
}>) {
  return (
    <section className={styles.workSection}>
      <header className={styles.sectionHeader}>
        <h2>{title}</h2>
        <Link className={styles.sectionAction} href={href}>
          {actionLabel} <ArrowRight size={14} aria-hidden="true" />
        </Link>
      </header>
      {records.length === 0 ? (
        <div className={styles.emptyState}>
          <Inbox size={18} aria-hidden="true" />
          <p>{emptyMessage}</p>
        </div>
      ) : (
        <ul className={styles.recordList}>
          {records.map((record) => (
            <li className={styles.record} key={`${record.title}-${record.meta ?? ""}`}>
              <div>
                <strong>{record.title}</strong>
                <span>{record.detail}</span>
              </div>
              {record.meta ? <span className={styles.recordMeta}>{record.meta}</span> : null}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
