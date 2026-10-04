import Link from "next/link";
import OverviewEmptyState from "./overview-empty-state";
import OverviewSection from "./overview-section";
import styles from "./student-overview.module.css";

export type AssignmentItem = Readonly<{
  title: string;
  course: string;
  dueAt: string;
}>;

export default function UpcomingAssignments({
  items,
}: Readonly<{
  items: readonly AssignmentItem[];
}>) {
  return (
    <OverviewSection
      title="Upcoming assignments"
      actionHref="/student/assignments"
      actionLabel="All assignments"
    >
      {items.length === 0 ? (
        <OverviewEmptyState>No upcoming assignments are available.</OverviewEmptyState>
      ) : (
        <ul className={styles.itemList}>
          {items.map((item) => (
            <li className={styles.assignmentItem} key={`${item.course}-${item.title}`}>
              <div className={styles.itemCopy}>
                <strong>{item.title}</strong>
                <span>{item.course}</span>
              </div>
              <time className={styles.dueTime} dateTime={item.dueAt}>
                {item.dueAt}
              </time>
            </li>
          ))}
        </ul>
      )}
      <Link className={styles.mobilePanelAction} href="/student/assignments">
        View assignments
      </Link>
    </OverviewSection>
  );
}
