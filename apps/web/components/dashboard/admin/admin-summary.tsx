import {
  BookOpenCheck,
  ClipboardCheck,
  GraduationCap,
  Landmark,
  Users,
  type LucideIcon,
} from "lucide-react";
import styles from "./admin-overview.module.css";

export type AdminMetric = Readonly<{
  label: string;
  value: number | null;
  detail: string;
  unavailable?: boolean;
}>;

const metricIcons: readonly LucideIcon[] = [
  Users,
  GraduationCap,
  Landmark,
  BookOpenCheck,
  ClipboardCheck,
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
          <article
            className={`${styles.metric} ${metric.unavailable ? styles.metricUnavailable : ""}`}
            key={metric.label}
            aria-label={`${metric.label}: ${metric.value === null ? "unavailable" : metric.value}`}
          >
            <div className={styles.metricLabel}>
              <span>{metric.label}</span>
              <Icon size={17} aria-hidden="true" />
            </div>
            <strong className={styles.metricValue}>
              {metric.value === null ? "—" : metric.value.toLocaleString()}
            </strong>
            <span className={styles.metricDetail}>
              {metric.detail}
            </span>
          </article>
        );
      })}
    </section>
  );
}
