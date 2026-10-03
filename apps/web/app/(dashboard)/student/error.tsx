"use client";

export default function DashboardError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main style={{ padding: "4rem 1.5rem", color: "#173042" }}>
      <h1>Dashboard unavailable</h1>
      <p style={{ marginTop: "1rem" }}>We could not load this workspace.</p>
      <button onClick={() => reset()} style={{ marginTop: "1.5rem" }}>
        Try again
      </button>
    </main>
  );
}
