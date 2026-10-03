"use client";

import Link from "next/link";
import { SubmitEvent, useEffect, useState } from "react";
import { resetPassword } from "../../../lib/api/auth";

export default function ResetPasswordForm() {
  const [token, setToken] = useState("");

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setToken(params.get("token") ?? "");
  }, []);

  const [password, setPassword] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);
    setMessage(null);
    setIsSuccess(false);

    try {
      if (!token) {
        throw new Error("This password reset link is missing its security token.");
      }

      const result = await resetPassword(token, password);
      setIsSuccess(true);
      setMessage(result.message);
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "We could not reset your password. Please try again.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <section
      style={{
        minHeight: "calc(100svh - 135px)",
        display: "grid",
        placeItems: "center",
        background: "var(--background)",
        color: "var(--foreground)",
        padding: "2rem",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: "420px",
          background: "var(--surface)",
          border: "1px solid var(--border)",
          borderRadius: "8px",
          padding: "2rem",
          boxShadow: "var(--shadow)",
        }}
      >
        <p style={{ margin: 0, color: "var(--accent)", fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", fontSize: "0.75rem" }}>
          CampusFlow
        </p>
        <h1 style={{ margin: "0.6rem 0 0.5rem", fontSize: "2rem" }}>Reset your password</h1>
        <p style={{ margin: "0 0 1.5rem", color: "var(--muted-strong)" }}>
          Choose a new password for your account.
        </p>

        <form onSubmit={handleSubmit} style={{ display: "grid", gap: "1rem" }}>
          <label style={{ display: "grid", gap: "0.4rem" }}>
            <span>New password</span>
            <input
              autoComplete="new-password"
              minLength={8}
              onChange={(event) => setPassword(event.target.value)}
              required
              type="password"
              value={password}
              style={{ padding: "0.8rem 0.9rem", borderRadius: "5px", border: "1px solid var(--border)", color: "var(--foreground)", background: "var(--surface-raised)" }}
            />
          </label>

          <button
            disabled={isSubmitting || isSuccess}
            type="submit"
            style={{
              padding: "0.9rem 1rem",
              border: "none",
              borderRadius: "5px",
              background: "var(--accent)",
              color: "#fff",
              cursor: isSubmitting || isSuccess ? "not-allowed" : "pointer",
              fontWeight: 700,
            }}
          >
            {isSubmitting ? "Resetting..." : isSuccess ? "Password reset" : "Reset password"}
          </button>

          {message ? (
            <p
              role={isSuccess ? "status" : "alert"}
              style={{
                margin: 0,
                color: isSuccess ? "var(--success)" : "var(--danger)",
                background: isSuccess ? "var(--success-soft)" : "var(--danger-soft)",
                border: "1px solid var(--border)",
                borderRadius: "5px",
                padding: "0.8rem 0.9rem",
              }}
            >
              {message}
            </p>
          ) : null}
        </form>

        <p style={{ marginTop: "1.25rem", fontSize: "0.9rem" }}>
          <Link href="/login" style={{ color: "var(--accent)" }}>← Back to sign in</Link>
        </p>
      </div>
    </section>
  );
}
