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
  userName,
  sidebarFooter,
}: Readonly<{
  children: ReactNode;
  navigation?: readonly DashboardNavigationGroup[];
  userName?: string;
  sidebarFooter?: ReactNode;
}>) {
  const visibleNavigation = navigation.filter((group) => group.items.length > 0);
  const hasNavigation = visibleNavigation.length > 0;

  return (
    <div className={styles.shell}>
      <DashboardHeader
        navigation={visibleNavigation}
        userName={userName}
        mobileFooter={sidebarFooter}
      />
      <div className={`${styles.body} ${hasNavigation ? styles.withSidebar : ""}`}>
        {hasNavigation ? (
          <DashboardSidebar groups={visibleNavigation} footer={sidebarFooter} />
        ) : null}
        <div className={styles.content}>
          <PageContainer>{children}</PageContainer>
        </div>
      </div>
    </div>
  );
}
