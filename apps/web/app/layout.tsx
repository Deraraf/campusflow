import type { Metadata } from "next";
import localFont from "next/font/local";
import SiteFooter from "../components/site-footer";
import { ThemeProvider } from "../components/theme-provider";
import "./globals.css";

const geistSans = localFont({
  src: "./fonts/GeistVF.woff",
  variable: "--font-geist-sans",
});
const geistMono = localFont({
  src: "./fonts/GeistMonoVF.woff",
  variable: "--font-geist-mono",
});

export const metadata: Metadata = {
  title: "CampusFlow | Ethiopian Public Service University",
  description: "CampusFlow is an academic workspace for Ethiopian Public Service University.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${geistSans.variable} ${geistMono.variable}`}>
        <ThemeProvider>
          <div className="site-content">{children}</div>
          <SiteFooter />
        </ThemeProvider>
      </body>
    </html>
  );
}
