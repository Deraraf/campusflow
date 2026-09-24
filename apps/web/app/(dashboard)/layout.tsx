import { Suspense } from "react";
import { redirect } from "next/navigation";
import { apiFetch } from "../../lib/api/server";

export type AuthUser = {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: "STUDENT" | "INSTRUCTOR" | "ADMIN";
  status: "PENDING_VERIFICATION" | "ACTIVE" | "SUSPENDED";
  emailVerifiedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

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
  try {
    await apiFetch<AuthUser>("/auth/me");
  } catch {
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
