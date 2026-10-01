"use client";

import Link from "next/link";
import { SubmitEvent, useState } from "react";
import { register } from "../../../lib/api/auth";
import styles from "./register.module.css";

export default function RegisterForm() {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [message, setMessage] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    const normalizedEmail = email.trim().toLowerCase();
    setIsSubmitting(true);
    setMessage(null);
    setIsSuccess(false);

    try {
      await register({
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        email: normalizedEmail,
        password,
      });
      setIsSuccess(true);
      setMessage(
        `Your account has been created. We sent a verification link to ${normalizedEmail}. Check your inbox and click the link to activate your account.`,
      );
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "We could not create your account. Please try again.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <section className={styles.shell}>
      <div className={styles.intro}>
        <div>
          <p className={styles.brand}>CampusFlow</p>
          <p className={styles.eyebrow}>Student registration</p>
        </div>

        <div>
          <h1>Create your account.</h1>

          <p className={styles.description}>
            Join CampusFlow and manage your university experience from one
            focused academic workspace.
          </p>
        </div>

        <p className={styles.note}>
          Your account will be created as a student account. You will need to
          verify your email before signing in.
        </p>
      </div>

      <div className={styles.formCard}>
        <div className={styles.formHeader}>
          <p className={styles.formEyebrow}>Get started</p>
          <h2>Create your account</h2>
          <p>Enter your details below to create your CampusFlow account.</p>
        </div>

        <form className={styles.form} onSubmit={handleSubmit}>
          <div className={styles.nameGrid}>
            <label className={styles.field}>
              <span>First name</span>
              <input
                autoComplete="given-name"
                disabled={isSubmitting || isSuccess}
                onChange={(event) => setFirstName(event.target.value)}
                required
                type="text"
                value={firstName}
              />
            </label>

            <label className={styles.field}>
              <span>Last name</span>
              <input
                autoComplete="family-name"
                disabled={isSubmitting || isSuccess}
                onChange={(event) => setLastName(event.target.value)}
                required
                type="text"
                value={lastName}
              />
            </label>
          </div>

          <label className={styles.field}>
            <span>Email address</span>
            <input
              autoComplete="email"
              disabled={isSubmitting || isSuccess}
              onChange={(event) => setEmail(event.target.value)}
              required
              type="email"
              value={email}
            />
          </label>

          <label className={styles.field}>
            <span>Password</span>
            <input
              autoComplete="new-password"
              disabled={isSubmitting || isSuccess}
              minLength={8}
              onChange={(event) => setPassword(event.target.value)}
              required
              type="password"
              value={password}
            />
            <small>Use at least 8 characters.</small>
          </label>

          {message ? (
            <div
              aria-live="polite"
              className={isSuccess ? styles.success : styles.error}
              role={isSuccess ? "status" : "alert"}
            >
              <p>{message}</p>
              {!isSuccess && message.toLowerCase().includes("pending verification") ? (
                <p style={{ marginTop: "0.5rem" }}>
                  <Link
                    href={`/resend-verification?email=${encodeURIComponent(email.trim().toLowerCase())}`}
                    style={{ color: "#c45b36", fontWeight: "bold" }}
                  >
                    Resend verification email →
                  </Link>
                </p>
              ) : null}
            </div>
          ) : null}

          <button
            className={styles.submitButton}
            disabled={isSubmitting || isSuccess}
            type="submit"
          >
            {isSubmitting ? "Creating account..." : "Create account"}
          </button>

          <p className={styles.loginPrompt}>
            Already have an account? <Link href="/login">Sign in</Link>
          </p>

          <p className={styles.loginPrompt} style={{ marginTop: "0.25rem" }}>
            Need to reset your password? <Link href="/forgot-password">Reset it here</Link>
          </p>
        </form>
      </div>
    </section>
  );
}
