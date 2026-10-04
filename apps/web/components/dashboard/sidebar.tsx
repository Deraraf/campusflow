import type { ReactNode } from "react";
import Link from "next/link";
import styles from "./dashboard-shell.module.css";

export type DashboardNavigationItem = Readonly<{
  label: string;
  href: string;
}>;

export type DashboardNavigationGroup = Readonly<{
  label: string;
  items: readonly DashboardNavigationItem[];
}>;

export default function DashboardSidebar({
  groups,
  footer,
}: Readonly<{
  groups: readonly DashboardNavigationGroup[];
  footer?: ReactNode;
}>) {
  return (
    <aside className={styles.sidebar} aria-label="Dashboard sidebar">
      <nav aria-label="Workspace navigation">
        {groups.map((group) => (
          <section className={styles.navGroup} key={group.label}>
            <h2 className={styles.navHeading}>{group.label}</h2>
            <ul className={styles.navList}>
              {group.items.map((item) => (
                <li key={item.href}>
                  <Link className={styles.navLink} href={item.href}>
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </nav>
      {footer ? <div className={styles.sidebarFooter}>{footer}</div> : null}
    </aside>
  );
}
