"use client";

import { Menu, X } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";
import { useState } from "react";
import type { DashboardNavigationGroup } from "./sidebar";
import styles from "./dashboard-shell.module.css";

export default function MobileNavigation({
  groups,
  children,
}: Readonly<{
  groups: readonly DashboardNavigationGroup[];
  children?: ReactNode;
}>) {
  const [isOpen, setIsOpen] = useState(false);

  if (groups.length === 0) {
    return null;
  }

  return (
    <div className={styles.mobileNavigation}>
      <button
        className={styles.iconButton}
        type="button"
        aria-expanded={isOpen}
        aria-controls="dashboard-mobile-navigation"
        aria-label={isOpen ? "Close dashboard navigation" : "Open dashboard navigation"}
        onClick={() => setIsOpen((open) => !open)}
      >
        {isOpen ? <X size={19} aria-hidden="true" /> : <Menu size={19} aria-hidden="true" />}
      </button>
      <nav
        className={styles.mobileMenu}
        id="dashboard-mobile-navigation"
        aria-label="Dashboard navigation"
        hidden={!isOpen}
      >
        {groups.map((group) => (
          <section className={styles.navGroup} key={group.label}>
            <h2 className={styles.navHeading}>{group.label}</h2>
            <ul className={styles.navList}>
              {group.items.map((item) => (
                <li key={item.href}>
                  <Link
                    className={styles.navLink}
                    href={item.href}
                    onClick={() => setIsOpen(false)}
                  >
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        ))}
        {children ? <div className={styles.mobileFooter}>{children}</div> : null}
      </nav>
    </div>
  );
}
