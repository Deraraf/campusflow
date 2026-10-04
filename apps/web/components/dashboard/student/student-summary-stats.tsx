import { BookOpen, CalendarDays, Clock3, GraduationCap, type LucideIcon } from "lucide-react";
import styles from "./student-overview.module.css";

export type StudentMetric = Readonly<{
  label: string;
  value: string | null;
  detail: string;
}>;

const metricIcons: readonly LucideIcon[] = [
  BookOpen,
  CalendarDays,
  Clock3,
  GraduationCap,
];

export default function StudentSummaryStats({
  stats,
}: Readonly<{
  stats: readonly StudentMetric[];
}>) {
  return (
    <section className={styles.summarySection} aria-label="Academic summary">
      <div className={styles.summaryGrid}>
        {stats.map((stat, index) => {
          const Icon = metricIcons[index % metricIcons.length] ?? BookOpen;
          return (
            <article className={styles.metric} key={stat.label}>
              <div className={styles.metricTopline}>
                <span>{stat.label}</span>
                <Icon size={17} aria-hidden="true" />
              </div>
              <strong className={styles.metricValue}>{stat.value ?? "—"}</strong>
              <span className={styles.metricDetail}>{stat.detail}</span>
            </article>
          );
        })}
      </div>
    </section>
  );
}
