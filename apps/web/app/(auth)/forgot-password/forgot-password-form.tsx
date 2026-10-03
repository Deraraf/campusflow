"use client";

import Link from "next/link";
import { SubmitEvent, useState } from "react";
import { forgotPassword } from "../../../lib/api/auth";

export default function ForgotPasswordForm() {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);
    setMessage(null);
    setIsSuccess(false);

    try {
      const result = await forgotPassword(email);
      setIsSuccess(true);
      setMessage(result.message);
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "We could not send the reset email. Please try again.",
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
        <h1 style={{ margin: "0.6rem 0 0.5rem", fontSize: "2rem" }}>Forgot your password?</h1>
        <p style={{ margin: "0 0 1.5rem", color: "var(--muted-strong)" }}>
          Enter your email and we’ll send a reset link if your account is active.
        </p>

        <form onSubmit={handleSubmit} style={{ display: "grid", gap: "1rem" }}>
          <label style={{ display: "grid", gap: "0.4rem" }}>
            <span>Email address</span>
            <input
              autoComplete="email"
              onChange={(event) => setEmail(event.target.value)}
              required
              type="email"
              value={email}
              style={{ padding: "0.8rem 0.9rem", borderRadius: "5px", border: "1px solid var(--border)", color: "var(--foreground)", background: "var(--surface-raised)" }}
            />
          </label>

          <button
            disabled={isSubmitting}
            type="submit"
            style={{
              padding: "0.9rem 1rem",
              border: "none",
              borderRadius: "5px",
              background: "var(--accent)",
              color: "#fff",
              cursor: isSubmitting ? "not-allowed" : "pointer",
              fontWeight: 700,
            }}
          >
            {isSubmitting ? "Sending reset link..." : "Send reset link"}
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
