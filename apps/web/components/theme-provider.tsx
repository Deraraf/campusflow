"use client";

import { createContext, useContext, useEffect, useState } from "react";

type Theme = "light" | "dark";

type ThemeContextValue = {
  theme: Theme;
  toggleTheme: () => void;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<Theme>("light");

  useEffect(() => {
    const storedTheme = window.localStorage.getItem("campusflow-theme");
    const initialTheme: Theme =
      storedTheme === "light" || storedTheme === "dark"
        ? storedTheme
        : window.matchMedia("(prefers-color-scheme: dark)").matches
          ? "dark"
          : "light";

    setTheme(initialTheme);
  }, []);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    const isDarkTheme = theme === "dark";

    function syncFavicons() {
      document
        .querySelectorAll<HTMLLinkElement>('link[rel~="icon"]')
        .forEach((favicon) => {
          favicon.type = isDarkTheme ? "image/png" : "image/jpeg";
          favicon.setAttribute("sizes", isDarkTheme ? "138x134" : "225x225");
          favicon.href = isDarkTheme
            ? "/epsu%20logo%20dark.png"
            : "/epsu%20logo%20light.jpg";
        });
    }

    syncFavicons();
    const observer = new MutationObserver(syncFavicons);
    observer.observe(document.head, { childList: true, subtree: true });

    return () => observer.disconnect();
  }, [theme]);

  function toggleTheme() {
    setTheme((currentTheme) => {
      const nextTheme = currentTheme === "light" ? "dark" : "light";
      window.localStorage.setItem("campusflow-theme", nextTheme);
      document.documentElement.dataset.theme = nextTheme;
      return nextTheme;
    });
  }

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);

  if (context === null) {
    throw new Error("useTheme must be used within ThemeProvider");
  }

  return context;
}