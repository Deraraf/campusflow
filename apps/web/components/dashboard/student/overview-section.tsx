import type { ReactNode } from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import styles from "./student-overview.module.css";

export default function OverviewSection({
  title,
  children,
  actionHref,
  actionLabel,
}: Readonly<{
  title: string;
  children: ReactNode;
  actionHref?: string;
  actionLabel?: string;
}>) {
  return (
    <section className={styles.panel}>
      <header className={styles.panelHeader}>
        <h2>{title}</h2>
        {actionHref && actionLabel ? (
          <Link className={styles.panelAction} href={actionHref}>
            {actionLabel} <ArrowRight size={14} aria-hidden="true" />
          </Link>
        ) : null}
      </header>
      {children}
    </section>
  );
}
