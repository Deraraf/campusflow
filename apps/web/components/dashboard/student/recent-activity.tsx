import OverviewEmptyState from "./overview-empty-state";
import OverviewSection from "./overview-section";
import styles from "./student-overview.module.css";

export type ActivityItem = Readonly<{
  title: string;
  detail: string;
  occurredAt: string;
}>;

export default function RecentActivity({
  items,
}: Readonly<{
  items: readonly ActivityItem[];
}>) {
  return (
    <OverviewSection title="Recent activity">
      {items.length === 0 ? (
        <OverviewEmptyState>Recent activity will appear here.</OverviewEmptyState>
      ) : (
        <ul className={styles.itemList}>
          {items.map((item) => (
            <li className={styles.activityItem} key={`${item.title}-${item.occurredAt}`}>
              <span className={styles.activityMarker} aria-hidden="true" />
              <div className={styles.itemCopy}>
                <strong>{item.title}</strong>
                <span>{item.detail}</span>
              </div>
              <time className={styles.activityTime}>{item.occurredAt}</time>
            </li>
          ))}
        </ul>
      )}
    </OverviewSection>
  );
}
