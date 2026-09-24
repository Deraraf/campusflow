"use client";

import { FormEvent, useState } from "react";
import { login } from "../../../lib/api/auth";
import styles from "./login.module.css";
import { redirect, useRouter } from "next/navigation";

type LoginFormProps = {
  apiUrl: string;
};

export default function LoginForm({ apiUrl }: LoginFormProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const router = useRouter();

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);
    setMessage(null);

    try {
      await login(apiUrl, { email, password });
      router.refresh();
      router.push("/dashboard");

      setMessage("Signed in. Your secure session is ready.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to sign in");
    } finally {
      setIsSubmitting(false);
    }
  }

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
        {message ? <p role="status">{message}</p> : null}
      </form>
    </section>
  );
}
