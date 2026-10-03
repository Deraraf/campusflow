"use client";

import Link from "next/link";
import { SubmitEvent, useState } from "react";
import { login } from "../../../lib/api/auth";
import styles from "./login.module.css";
import { useRouter, useSearchParams } from "next/navigation";

export default function LoginForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const router = useRouter();
  const searchParams = useSearchParams();
  const nextUrl = searchParams.get("next") || "/student";

  async function handleSubmit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);
    setMessage(null);

    try {
      await login({ email: email.trim().toLowerCase(), password });
      router.push(nextUrl);
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to sign in");
    } finally {
      setIsSubmitting(false);
    }
  }

  const isVerificationError = message?.toLowerCase().includes("verification");

  return (
    <section className={styles.shell}>
      <div className={styles.intro}>
        <p className={styles.eyebrow}>CampusFlow access</p>
        <h1>Welcome back.</h1>
        <p>Sign in to continue to your academic workspace.</p>
      </div>
      <form className={styles.form} onSubmit={handleSubmit}>
        <label>
          Email
          <input
            autoComplete="email"
            onChange={(event) => setEmail(event.target.value)}
            required
            type="email"
            value={email}
          />
        </label>
        <label>
          Password
          <input
            autoComplete="current-password"
            onChange={(event) => setPassword(event.target.value)}
            required
            type="password"
            value={password}
          />
        </label>
        <button disabled={isSubmitting} type="submit">
          {isSubmitting ? "Signing in..." : "Sign in"}
        </button>

        {message ? (
          <div>
            <p role="status">{message}</p>
            {isVerificationError ? (
              <p className={styles.messageLink}>
                <Link
                  href={
                    email
                      ? `/resend-verification?email=${encodeURIComponent(email)}`
                      : "/resend-verification"
                  }
                >
                  Resend verification link →
                </Link>
              </p>
            ) : null}
          </div>
        ) : null}

        <nav className={styles.formLinks} aria-label="Account help">
          <Link href="/register">Create an account</Link>
          <Link href="/forgot-password">Forgot password?</Link>
          <Link
            href={
              email
                ? `/resend-verification?email=${encodeURIComponent(email)}`
                : "/resend-verification"
            }
          >
            Resend activation email
          </Link>
        </nav>
      </form>
    </section>
  );
}
