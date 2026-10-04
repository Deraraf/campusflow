import type { ReactNode } from "react";
import styles from "./dashboard-shell.module.css";

export default function PageContainer({
  children,
}: Readonly<{
  children: ReactNode;
}>) {
  return <div className={styles.pageContainer}>{children}</div>;
}
