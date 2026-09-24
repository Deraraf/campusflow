"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { logout } from "../../lib/api/auth";

export default function LogoutButton({ apiUrl }: { apiUrl: string }) {
  const router = useRouter();
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleLogout() {
    setIsLoggingOut(true);
    setError(null);

    try {
      await logout(apiUrl);

      router.replace("/login");
      router.refresh();
    } catch (error) {
      setError(error instanceof Error ? error.message : "Unable to sign out");
    } finally {
      setIsLoggingOut(false);
    }
  }

  return (
    <div>
      <button type="button" onClick={handleLogout} disabled={isLoggingOut}>
        {isLoggingOut ? "Signing out..." : "Sign out"}
      </button>

      {error ? <p role="alert">{error}</p> : null}
    </div>
  );
}
