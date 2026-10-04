import Link from "next/link";
import OverviewEmptyState from "./overview-empty-state";
import OverviewSection from "./overview-section";
import styles from "./student-overview.module.css";

export type AnnouncementItem = Readonly<{
  title: string;
  summary: string;
  publishedAt: string;
}>;

export default function Announcements({
  items,
}: Readonly<{
  items: readonly AnnouncementItem[];
}>) {
  return (
    <OverviewSection
      title="Announcements"
      actionHref="/student/notifications"
      actionLabel="Notifications"
    >
      {items.length === 0 ? (
        <OverviewEmptyState>There are no announcements to show.</OverviewEmptyState>
      ) : (
        <ul className={styles.itemList}>
          {items.map((item) => (
            <li className={styles.announcementItem} key={`${item.title}-${item.publishedAt}`}>
              <div className={styles.itemCopy}>
                <strong>{item.title}</strong>
                <span>{item.summary}</span>
              </div>
              <time className={styles.activityTime}>{item.publishedAt}</time>
            </li>
          ))}
        </ul>
      )}
      <Link className={styles.mobilePanelAction} href="/student/notifications">
        View notifications
      </Link>
    </OverviewSection>
  );
}
