import Link from "next/link";
import styles from "./public.module.css";

export default function PublicHome() {
  return (
    <main className={styles.page}>
      <section className={styles.hero}>
        <p className={styles.eyebrow}>CampusFlow</p>
        <h1>One clear place for the whole campus.</h1>
        <p className={styles.lede}>
          A focused academic workspace for students, instructors, and university
          operations.
        </p>
        <div className={styles.actions}>
          <Link className={styles.primaryAction} href="/login">
            Sign in
          </Link>
          <Link className={styles.secondaryAction} href="/dashboard">
            Explore dashboard
          </Link>
        </div>
      </section>
      <section className={styles.signalGrid} aria-label="CampusFlow areas">
        <article>
          <span>01</span>
          <h2>Learn</h2>
          <p>Courses, assignments, grades, and attendance in one view.</p>
        </article>
        <article>
          <span>02</span>
          <h2>Teach</h2>
          <p>Keep course delivery and student progress moving together.</p>
        </article>
        <article>
          <span>03</span>
          <h2>Operate</h2>
          <p>Give university teams the context to make better decisions.</p>
        </article>
      </section>
    </main>
  );
}
