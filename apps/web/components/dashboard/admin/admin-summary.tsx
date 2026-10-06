import {
  BookOpenCheck,
  GraduationCap,
  Landmark,
  Users,
  type LucideIcon,
} from "lucide-react";
import styles from "./admin-overview.module.css";

export type AdminMetric = Readonly<{
  label: string;
  value: string | null;
  detail: string;
}>;

const metricIcons: readonly LucideIcon[] = [
  Users,
  GraduationCap,
  Landmark,
  BookOpenCheck,
];

export default function AdminSummary({
  metrics,
}: Readonly<{
  metrics: readonly AdminMetric[];
}>) {
  return (
    <section className={styles.metricsGrid} aria-label="Institutional summary">
      {metrics.map((metric, index) => {
        const Icon = metricIcons[index % metricIcons.length] ?? Users;
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
