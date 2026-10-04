import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import LogoutButton from "../../(auth)/logout-button";
import DashboardShell from "../../../components/dashboard/dashboard-shell";
import type { DashboardNavigationGroup } from "../../../components/dashboard/sidebar";
import { getCurrentUser } from "../../../lib/api/server";

const studentNavigation: readonly DashboardNavigationGroup[] = [
  {
    label: "LEARNING",
    items: [
      { label: "Dashboard", href: "/student" },
      { label: "Courses", href: "/student/courses" },
      { label: "Schedule", href: "/student/schedule" },
      { label: "Assignments", href: "/student/assignments" },
      { label: "Attendance", href: "/student/attendance" },
      { label: "Grades", href: "/student/grades" },
      { label: "Notifications", href: "/student/notifications" },
      { label: "Messages", href: "/student/messages" },
    ],
  },
  {
    label: "ACCOUNT",
    items: [
      { label: "Profile", href: "/student/profile" },
      { label: "Settings", href: "/student/settings" },
    ],
  },
];

export default async function StudentLayout({
  children,
}: Readonly<{
  children: ReactNode;
}>) {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  if (user.role !== "STUDENT") {
    redirect(user.role === "ADMIN" ? "/admin" : "/instructor");
  }

  const userName = [user.firstName, user.lastName].filter(Boolean).join(" ");

  return (
    <DashboardShell
      navigation={studentNavigation}
      userName={userName || "Student"}
      sidebarFooter={<LogoutButton />}
    >
      {children}
    </DashboardShell>
  );
}
