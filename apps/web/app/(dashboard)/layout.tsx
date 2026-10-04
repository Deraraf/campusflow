import { Suspense } from "react";
import { redirect } from "next/navigation";
import DashboardAuthFallback from "../../components/dashboard/dashboard-auth-fallback";
import { getCurrentUser } from "../../lib/api/server";

async function ProtectedDashboard({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const user = await getCurrentUser();

  if (user === null) {
    redirect("/login");
  }

  return children;
}

export default function DashboardLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <Suspense fallback={<DashboardAuthFallback />}>
      <ProtectedDashboard>{children}</ProtectedDashboard>
    </Suspense>
  );
}
