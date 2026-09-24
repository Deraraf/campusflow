"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { resendVerification, verifyEmail } from "../../../lib/api/auth";
import styles from "./verify-email.module.css";

export default function VerifyEmailForm({ apiUrl }: { apiUrl: string }) {
  const searchParams = useSearchParams();
  const token = searchParams.get("token") ?? "";

  const verifiedTokenRef = useRef<string | null>(null);

  const [message, setMessage] = useState("Verifying your email...");
  const [isSuccess, setIsSuccess] = useState(false);

  const [email, setEmail] = useState("");
  const [isResending, setIsResending] = useState(false);
  const [resendMessage, setResendMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!token) {
      setMessage("This verification link is missing its token.");
      return;
    }

    if (verifiedTokenRef.current === token) {
      return;
    }

    verifiedTokenRef.current = token;

    verifyEmail(apiUrl, token)
      .then(() => {
        setIsSuccess(true);
        setMessage(
          "Your email has been verified successfully. Your account is now active.",
        );
      })
      .catch((error: unknown) => {
        setMessage(
          error instanceof Error
            ? error.message
            : "This verification link is invalid or expired.",
        );
      });
  }, [apiUrl, token]);

  async function handleResend(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setIsResending(true);
    setResendMessage(null);

    try {
      const result = await resendVerification(apiUrl, email);

      setResendMessage(result.message);
    } catch (error) {
      setResendMessage(
        error instanceof Error
          ? error.message
          : "Unable to resend the verification email.",
      );
    } finally {
      setIsResending(false);
    }
  }

  return (
    <main className={styles.page}>
      <section className={styles.card}>
        <div className={styles.header}>
          <p className={styles.brand}>CampusFlow</p>

          <p className={styles.eyebrow}>Email verification</p>

          <h1>
            {isSuccess
              ? "You’re in."
              : token
                ? "Almost there."
                : "Verify your email."}
          </h1>

          <p className={styles.message}>{message}</p>
        </div>

        {isSuccess ? (
          <div className={styles.actions}>
            <Link className={styles.primaryButton} href="/login">
              Continue to sign in
            </Link>
          </div>
        ) : (
          <div className={styles.resendSection}>
            <div>
              <h2>Need a new verification link?</h2>

              <p>
                Enter the email address you used to create your CampusFlow
                account.
              </p>
            </div>

            <form className={styles.form} onSubmit={handleResend}>
              <label className={styles.field}>
                <span>Email address</span>

                <input
                  autoComplete="email"
                  disabled={isResending}
                  onChange={(event) => setEmail(event.target.value)}
                  required
                  type="email"
                  value={email}
                />
              </label>

              <button
                className={styles.primaryButton}
                disabled={isResending}
                type="submit"
              >
                {isResending ? "Sending..." : "Resend verification email"}
              </button>

              {resendMessage ? (
                <p
                  aria-live="polite"
                  className={styles.resendMessage}
                  role="status"
                >
                  {resendMessage}
                </p>
              ) : null}
            </form>

            <Link className={styles.secondaryLink} href="/login">
              Back to sign in
            </Link>
          </div>
        )}
      </section>
    </main>
  );
}
