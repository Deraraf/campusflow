"use client";

import Link from "next/link";
import { type SubmitEvent, useEffect, useState } from "react";
import { resendVerification } from "../../../lib/api/auth";
import styles from "./resend-verification.module.css";

const ResendVerificationForm = () => {
  const [email, setEmail] = useState("");

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const emailParam = params.get("email");

    if (emailParam) {
      setEmail(emailParam);
    }
  }, []);
  const [message, setMessage] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);
    setMessage(null);
    setIsSuccess(false);

    try {
      const result = await resendVerification(email);
      setMessage(result.message);
      setIsSuccess(true);
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Unable to resend the verification email. Please try again.",
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
          <p className={styles.eyebrow}>Account verification</p>
        </div>

        <div>
          <h1>Check your inbox.</h1>
          <p className={styles.description}>
            Request a fresh verification link for your CampusFlow account.
          </p>
        </div>

        <p className={styles.note}>
          Verification links expire after 24 hours. If your link has expired,
          you can request another one here.
        </p>
      </div>

      <div className={styles.formCard}>
        <div className={styles.formHeader}>
          <p className={styles.formEyebrow}>Resend link</p>
          <h2>Verify your email</h2>
          <p>Enter the email address you used to create your account.</p>
        </div>

        <form className={styles.form} onSubmit={handleSubmit}>
          <label className={styles.field}>
            <span>Email address</span>
            <input
              autoComplete="email"
              disabled={isSubmitting}
              onChange={(event) => setEmail(event.target.value)}
              required
              type="email"
              value={email}
            />
          </label>

          {message ? (
            <div
              aria-live="polite"
              className={isSuccess ? styles.success : styles.error}
              role={isSuccess ? "status" : "alert"}
            >
              <p>{message}</p>
            </div>
          ) : null}

          <button
            className={styles.submitButton}
            disabled={isSubmitting}
            type="submit"
          >
            {isSubmitting ? "Sending link..." : "Resend verification email"}
          </button>

          <p className={styles.loginPrompt}>
            Back to <Link href="/login">sign in</Link> or{" "}
            <Link href="/register">create an account</Link>.
          </p>
        </form>
      </div>
    </section>
  );
};

export default ResendVerificationForm;