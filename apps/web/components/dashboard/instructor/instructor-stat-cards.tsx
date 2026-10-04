import {
  BookOpenCheck,
  CalendarDays,
  ClipboardCheck,
  GraduationCap,
  type LucideIcon,
} from "lucide-react";
import styles from "./instructor-overview.module.css";

export type InstructorMetric = Readonly<{
  label: string;
  value: string | null;
  detail: string;
}>;

const metricIcons: readonly LucideIcon[] = [
  BookOpenCheck,
  CalendarDays,
  ClipboardCheck,
  GraduationCap,
];

export default function InstructorStatCards({
  metrics,
}: Readonly<{
  metrics: readonly InstructorMetric[];
}>) {
  return (
    <section className={styles.metricsGrid} aria-label="Teaching summary">
      {metrics.map((metric, index) => {
        const Icon = metricIcons[index % metricIcons.length] ?? BookOpenCheck;
        return (
          <article className={styles.metric} key={metric.label}>
            <div className={styles.metricLabel}>
              <span>{metric.label}</span>
              <Icon size={17} aria-hidden="true" />
            </div>
            <strong className={styles.metricValue}>{metric.value ?? "—"}</strong>
            <span className={styles.metricDetail}>{metric.detail}</span>
          </article>
        );
      })}
    </section>
  );
}
