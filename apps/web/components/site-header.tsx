import {
  Bell,
  BookOpen,
  CalendarDays,
  GraduationCap,
  Search,
} from "lucide-react";
import { cookies } from "next/headers";
import Link from "next/link";
import { Suspense } from "react";
import HeaderControls from "./header-controls";
import styles from "./site-header.module.css";
import Image from "next/image";

export type HeaderVariant = "public" | "dashboard" | "auth";

const publicNavigation = [
  { label: "Home", href: "/" },
  { label: "Courses", href: "/dashboard#courses" },
  { label: "Campus life", href: "/dashboard#campus-services" },
];

const authNavigation = [{ label: "Home", href: "/" }];

export default function SiteHeader({ variant }: { variant: HeaderVariant }) {
  return (
    <Suspense fallback={<HeaderFallback />}>
      <RenderedHeader variant={variant} />
    </Suspense>
  );
}

async function RenderedHeader({ variant }: { variant: HeaderVariant }) {
  const isDashboard = variant === "dashboard";
  const isAuthenticated = (await cookies()).has("access_token");
  const navigation = variant === "auth" ? authNavigation : publicNavigation;

  return (
    <header className={styles.header}>
      <div className={styles.bar}>
        <Link className={styles.brand} href="/" aria-label="CampusFlow home">
          <Image
            src="/epsu logo light.jpg"
            alt="Ethiopian Public Service University logo"
            width={50}
            height={50}
            className={styles.brandImageLight}
          />
          <Image
            src="/epsu logo dark.png"
            alt=""
            aria-hidden="true"
            width={50}
            height={50}
            className={styles.brandImageDark}
          />

          <span className={styles.brandWords}>
            <strong>Ethiopian Public Service University</strong>
            <small>STUDENT PORTAL</small>
          </span>
        </Link>

        {isDashboard ? (
          <label className={styles.search}>
            <Search size={16} aria-hidden="true" />
            <input aria-label="Search campus" placeholder="Search courses, faculty, rooms..." />
            <kbd>⌘ K</kbd>
          </label>
        ) : (
          <nav className={styles.desktopNav} aria-label="Main navigation">
            {navigation.map((item) => (
              <Link key={item.label} href={item.href}>
                {item.label}
              </Link>
            ))}
          </nav>
        )}

        <div className={styles.actions}>
          {isDashboard ? (
            <div className={styles.term}>
              <CalendarDays size={15} aria-hidden="true" />
              <span>Fall Term 2026</span>
            </div>
          ) : null}
          {isAuthenticated ? (
            <>
              <Link
                className={styles.notification}
                href="/dashboard#assignments"
                aria-label="3 unread notifications"
                title="Notifications"
              >
                <Bell size={18} />
                <span className={styles.notificationCount}>3</span>
              </Link>
              <Link className={styles.profile} href="/dashboard" aria-label="Open student profile">
              <span className={styles.avatar}>S</span>
              <span className={styles.profileText}>
                  <strong>Student View</strong>
                  <small>My workspace</small>
              </span>
              </Link>
            </>
          ) : variant === "public" ? (
            <Link className={styles.signIn} href="/login">
              Sign in <BookOpen size={15} />
            </Link>
          ) : null}
          <HeaderControls variant={variant} isAuthenticated={isAuthenticated} />
        </div>
      </div>

      {isDashboard ? (
        <div className={styles.dashboardContext}>
          <span className={styles.activeDot} />
          <span>Active term</span>
          <span className={styles.contextDivider} />
          <span>Week 8 of 16</span>
        </div>
      ) : null}
    </header>
  );
}

function HeaderFallback() {
  return (
    <header className={styles.header} aria-hidden="true">
      <div className={styles.bar}>
        <span className={styles.brand}>
          <span className={styles.brandMark}><GraduationCap size={20} /></span>
          <span className={styles.brandWords}><strong>CampusFlow</strong><small>STUDENT PORTAL</small></span>
        </span>
      </div>
    </header>
  );
}