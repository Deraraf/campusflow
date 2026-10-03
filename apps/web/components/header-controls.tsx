"use client";

import { Bell, Menu, Moon, Search, Sun, UserRound, X } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import type { HeaderVariant } from "./site-header";
import { useTheme } from "./theme-provider";
import styles from "./site-header.module.css";

const publicNavigation = [
  { label: "Home", href: "/" },
  { label: "Courses", href: "/dashboard#courses" },
  { label: "Class schedule", href: "/dashboard#schedule" },
  { label: "Campus life", href: "/dashboard#campus-services" },
];

const authNavigation = [
  { label: "Home", href: "/" },
  { label: "Sign in", href: "/login" },
  { label: "Create account", href: "/register" },
];

const dashboardNavigation = [
  { label: "Overview", href: "/dashboard" },
  { label: "My courses", href: "/dashboard#courses" },
  { label: "Class schedule", href: "/dashboard#schedule" },
  { label: "Grades & transcripts", href: "/dashboard#grades" },
  { label: "Assignments", href: "/dashboard#assignments" },
  { label: "Campus services", href: "/dashboard#campus-services" },
];

export default function HeaderControls({
  variant,
  isAuthenticated,
}: {
  variant: HeaderVariant;
  isAuthenticated: boolean;
}) {
  const { theme, toggleTheme } = useTheme();
  const [menuOpen, setMenuOpen] = useState(false);
  const navigation =
    variant === "dashboard"
      ? dashboardNavigation
      : variant === "auth"
        ? authNavigation
        : publicNavigation;

  return (
    <>
      <button
        className={styles.themeButton}
        type="button"
        onClick={toggleTheme}
        aria-label={`Switch to ${theme === "light" ? "dark" : "light"} mode`}
        title={`Switch to ${theme === "light" ? "dark" : "light"} mode`}
      >
        {theme === "light" ? <Moon size={17} /> : <Sun size={17} />}
      </button>
      <button
        className={styles.menuButton}
        type="button"
        aria-expanded={menuOpen}
        aria-controls="mobile-site-navigation"
        aria-label={menuOpen ? "Close menu" : "Open menu"}
        onClick={() => setMenuOpen((open) => !open)}
      >
        {menuOpen ? <X size={19} /> : <Menu size={19} />}
      </button>
      {menuOpen ? (
        <div className={styles.mobileMenu} id="mobile-site-navigation">
          {variant === "dashboard" ? (
            <label className={styles.mobileSearch}>
              <Search size={16} aria-hidden="true" />
              <input
                aria-label="Search courses, faculty, and rooms"
                placeholder="Search courses, faculty, rooms..."
              />
            </label>
          ) : null}
          <nav className={styles.mobileNav} aria-label="Mobile navigation">
            {navigation.map((item) => (
              <Link
                key={item.label}
                href={item.href}
                onClick={() => setMenuOpen(false)}
              >
                {item.label}
              </Link>
            ))}
          </nav>
          {isAuthenticated ? (
            <div className={styles.mobileAccountLinks}>
              <Link href="/dashboard#assignments" onClick={() => setMenuOpen(false)}>
                <Bell size={16} /> Notifications <span>3</span>
              </Link>
              <Link href="/dashboard" onClick={() => setMenuOpen(false)}>
                <UserRound size={16} /> Student profile
              </Link>
            </div>
          ) : variant === "public" ? (
            <div className={styles.mobileAccountLinks}>
              <Link href="/login" onClick={() => setMenuOpen(false)}>
                Sign in
              </Link>
              <Link href="/register" onClick={() => setMenuOpen(false)}>
                Create account
              </Link>
            </div>
          ) : null}
        </div>
      ) : null}
    </>
  );
}