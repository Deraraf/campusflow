import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import LogoutButton from "../../(auth)/logout-button";
import DashboardShell from "../../../components/dashboard/dashboard-shell";
import type { DashboardNavigationGroup } from "../../../components/dashboard/sidebar";
import { getCurrentUser } from "../../../lib/api/server";

const adminNavigation: readonly DashboardNavigationGroup[] = [
  {
    label: "ADMINISTRATION",
    items: [
      { label: "Dashboard", href: "/admin" },
      { label: "Users", href: "/admin/users" },
      { label: "Applications", href: "/admin/applications" },
      { label: "Students", href: "/admin/students" },
      { label: "Instructors", href: "/admin/instructors" },
      { label: "Departments", href: "/admin/departments" },
      { label: "Programs", href: "/admin/programs" },
      { label: "Courses", href: "/admin/courses" },
      { label: "Reports", href: "/admin/reports" },
      { label: "Announcements", href: "/admin/announcements" },
      { label: "Settings", href: "/admin/settings" },
    ],
  },
  {
    label: "ACCOUNT",
    items: [{ label: "Profile", href: "/admin/profile" }],
  },
];

export default async function AdminLayout({
  children,
}: Readonly<{
  children: ReactNode;
}>) {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  if (user.role !== "ADMIN") {
    redirect(user.role === "INSTRUCTOR" ? "/instructor" : "/student");
  }

  const userName = [user.firstName, user.lastName].filter(Boolean).join(" ");

  return (
    <DashboardShell
      navigation={adminNavigation}
      userName={userName || "Administrator"}
      sidebarFooter={<LogoutButton />}
    >
      {children}
    </DashboardShell>
  );
}
