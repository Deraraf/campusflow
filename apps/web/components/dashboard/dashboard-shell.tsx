import type { ReactNode } from "react";
import DashboardHeader from "./header";
import DashboardSidebar, {
  type DashboardNavigationGroup,
} from "./sidebar";
import PageContainer from "./page-container";
import styles from "./dashboard-shell.module.css";

export default function DashboardShell({
  children,
  navigation = [],
}: Readonly<{
  children: ReactNode;
  navigation?: readonly DashboardNavigationGroup[];
}>) {
  const visibleNavigation = navigation.filter((group) => group.items.length > 0);
  const hasNavigation = visibleNavigation.length > 0;

  return (
    <div className={styles.shell}>
      <DashboardHeader navigation={visibleNavigation} />
      <div className={`${styles.body} ${hasNavigation ? styles.withSidebar : ""}`}>
        {hasNavigation ? <DashboardSidebar groups={visibleNavigation} /> : null}
        <div className={styles.content}>
          <PageContainer>{children}</PageContainer>
        </div>
      </div>
    </div>
  );
}
