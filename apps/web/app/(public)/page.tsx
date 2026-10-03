import {
  ArrowRight,
  BookOpen,
  CalendarDays,
  Clock3,
  GraduationCap,
  MoveUpRight,
} from "lucide-react";
import Link from "next/link";
import styles from "./public.module.css";

const highlights = [
  { label: "Enrolled courses", value: "5", detail: "Fall term" },
  { label: "Credits in progress", value: "16", detail: "Full-time load" },
  { label: "Next class", value: "10:00", detail: "CS 301 · 25 min" },
  { label: "Due today", value: "3", detail: "1 needs attention" },
];

export default function PublicHome() {
  return (
    <main className={styles.page}>
      <section className={styles.welcome}>
        <div className={styles.welcomeCopy}>
          <p className={styles.eyebrow}>Your student workspace</p>
          <h1>Make room for the work that matters.</h1>
          <p className={styles.lede}>
            A clear view of classes, deadlines, progress, and campus life, all
            in one place.
          </p>
          <div className={styles.actions}>
            <Link className={styles.primaryAction} href="/login">
              Open student dashboard <ArrowRight size={16} />
            </Link>
            <Link className={styles.secondaryAction} href="/register">
              Create an account
            </Link>
          </div>
          <div className={styles.termNote}>
            <span className={styles.liveDot} />
            <span>Fall term is in progress</span>
            <span className={styles.noteDivider} />
            <span>Week 2 of 16</span>
          </div>
        </div>

        <aside className={styles.weekPanel} aria-label="This week's agenda preview">
          <div className={styles.weekHeader}>
            <div>
                <p className={styles.panelEyebrow}>FRIDAY · OCTOBER 02</p>
              <h2>Your day, in view.</h2>
            </div>
            <span className={styles.weekIcon}>
              <CalendarDays size={19} />
            </span>
          </div>
          <div className={styles.agendaItem}>
            <span className={`${styles.agendaMarker} ${styles.blueMarker}`} />
            <div className={styles.agendaTime}>10:00 AM</div>
            <div className={styles.agendaDescription}>
              <strong>Distributed Systems &amp; Cloud Infrastructure</strong>
              <span>CS 301 · Turing Hall 304</span>
            </div>
            <span className={styles.liveBadge}>IN 25 MIN</span>
          </div>
          <div className={styles.agendaItem}>
            <span className={`${styles.agendaMarker} ${styles.tealMarker}`} />
            <div className={styles.agendaTime}>1:15 PM</div>
            <div className={styles.agendaDescription}>
              <strong>Linear Algebra &amp; Matrix Computing</strong>
              <span>MATH 245 · Lovelace Science 112</span>
            </div>
            <span className={styles.roomBadge}>75 MIN</span>
          </div>
          <div className={styles.weekFooter}>
            <span>2 classes remaining today</span>
            <Link href="/login" aria-label="See today's schedule">
              View schedule <MoveUpRight size={13} />
            </Link>
          </div>
        </aside>
      </section>

      <section className={styles.highlights} aria-label="Academic snapshot">
        {highlights.map((item, index) => (
          <div className={styles.highlight} key={item.label}>
            <span className={styles.highlightLabel}>{item.label}</span>
            <strong className={index === 3 ? styles.warningValue : undefined}>
              {item.value}
              {index === 0 ? <small> courses</small> : null}
              {index === 1 ? <small> credits</small> : null}
            </strong>
            <span className={styles.highlightDetail}>{item.detail}</span>
          </div>
        ))}
      </section>

      <section className={styles.workspaceSection}>
        <div className={styles.sectionHeading}>
          <div>
            <p className={styles.eyebrow}>Built around your semester</p>
            <h2>Everything has its place.</h2>
          </div>
          <Link className={styles.textLink} href="/login">
            Explore the workspace <ArrowRight size={15} />
          </Link>
        </div>

        <div className={styles.featureGrid}>
          <Link className={styles.feature} href="/login">
            <span className={`${styles.featureIcon} ${styles.featureBlue}`}>
              <BookOpen size={18} />
            </span>
            <div>
              <h3>Courses &amp; grades</h3>
              <p>Keep your classes, marks, and academic progress together.</p>
            </div>
            <ArrowRight size={16} className={styles.featureArrow} />
          </Link>
          <Link className={styles.feature} href="/login">
            <span className={`${styles.featureIcon} ${styles.featureAmber}`}>
              <Clock3 size={18} />
            </span>
            <div>
              <h3>Schedule &amp; deadlines</h3>
              <p>Know what is next today and what needs attention this week.</p>
            </div>
            <ArrowRight size={16} className={styles.featureArrow} />
          </Link>
          <Link className={styles.feature} href="/login">
            <span className={`${styles.featureIcon} ${styles.featureTeal}`}>
              <GraduationCap size={18} />
            </span>
            <div>
              <h3>Campus support</h3>
              <p>Find advising, study spaces, services, and helpful resources.</p>
            </div>
            <ArrowRight size={16} className={styles.featureArrow} />
          </Link>
        </div>
      </section>

      <section className={styles.closing}>
        <div>
          <p className={styles.eyebrow}>A steadier semester starts here</p>
          <h2>Pick up right where you left off.</h2>
        </div>
        <Link className={styles.closingLink} href="/login">
          Go to your workspace <ArrowRight size={16} />
        </Link>
      </section>
    </main>
  );
}
