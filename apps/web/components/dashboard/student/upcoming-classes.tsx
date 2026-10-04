import Link from "next/link";
import OverviewEmptyState from "./overview-empty-state";
import OverviewSection from "./overview-section";
import styles from "./student-overview.module.css";

export type ClassItem = Readonly<{
  course: string;
  title: string;
  time: string;
  location: string;
}>;

export default function UpcomingClasses({
  items,
}: Readonly<{
  items: readonly ClassItem[];
}>) {
  return (
    <OverviewSection
      title="Upcoming classes"
      actionHref="/student/schedule"
      actionLabel="Full schedule"
    >
      {items.length === 0 ? (
        <OverviewEmptyState>No upcoming classes are available.</OverviewEmptyState>
      ) : (
        <ul className={styles.itemList}>
          {items.map((item) => (
            <li className={styles.classItem} key={`${item.course}-${item.time}`}>
              <time className={styles.itemTime}>{item.time}</time>
              <div className={styles.itemCopy}>
                <strong>{item.title}</strong>
                <span>{item.course} · {item.location}</span>
              </div>
            </li>
          ))}
        </ul>
      )}
      <Link className={styles.mobilePanelAction} href="/student/schedule">
        View schedule
      </Link>
    </OverviewSection>
  );
}
