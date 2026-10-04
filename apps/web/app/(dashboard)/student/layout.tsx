import type { ReactNode } from "react";
import DashboardShell from "../../../components/dashboard/dashboard-shell";

export default function StudentLayout({
  children,
}: Readonly<{
  children: ReactNode;
}>) {
  return <DashboardShell>{children}</DashboardShell>;
}
