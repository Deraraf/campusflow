import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import LogoutButton from "../../(auth)/logout-button";
import DashboardShell from "../../../components/dashboard/dashboard-shell";
import type { DashboardNavigationGroup } from "../../../components/dashboard/sidebar";
import { getCurrentUser } from "../../../lib/api/server";

const instructorNavigation: readonly DashboardNavigationGroup[] = [
  {
    label: "TEACHING",
    items: [
      { label: "Dashboard", href: "/instructor" },
      { label: "My Courses", href: "/instructor/courses" },
      { label: "Schedule", href: "/instructor/schedule" },
      { label: "Assignments", href: "/instructor/assignments" },
      { label: "Attendance", href: "/instructor/attendance" },
      { label: "Grades", href: "/instructor/grades" },
      { label: "Students", href: "/instructor/students" },
      { label: "Notifications", href: "/instructor/notifications" },
      { label: "Messages", href: "/instructor/messages" },
    ],
  },
  {
    label: "ACCOUNT",
    items: [
      { label: "Profile", href: "/instructor/profile" },
      { label: "Settings", href: "/instructor/settings" },
    ],
  },
];

export default async function InstructorLayout({
  children,
}: Readonly<{
  children: ReactNode;
}>) {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  if (user.role !== "INSTRUCTOR") {
    redirect(user.role === "ADMIN" ? "/admin" : "/student");
  }

  const userName = [user.firstName, user.lastName].filter(Boolean).join(" ");

  return (
    <DashboardShell
      navigation={instructorNavigation}
      userName={userName || "Instructor"}
      sidebarFooter={<LogoutButton />}
    >
      {children}
    </DashboardShell>
  );
}
