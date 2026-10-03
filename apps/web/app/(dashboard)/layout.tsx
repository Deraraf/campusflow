import { Suspense } from "react";
import { redirect } from "next/navigation";
import SiteHeader from "../../components/site-header";
import { getCurrentUser } from "../../lib/api/server";

function DashboardAuthFallback() {
  return (
    <main
      style={{
        minHeight: "100vh",
        display: "grid",
        placeItems: "center",
        padding: "2rem",
        color: "#173042",
      }}
    >
      <p>Checking your session...</p>
    </main>
  );
}

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
    <>
      <SiteHeader variant="dashboard" />
      <Suspense fallback={<DashboardAuthFallback />}>
        <ProtectedDashboard>{children}</ProtectedDashboard>
      </Suspense>
    </>
  );
}
