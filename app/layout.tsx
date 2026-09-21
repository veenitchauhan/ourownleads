import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Our Own Leads | Your business, connected",
  description: "Our Own Leads brings lead management, WhatsApp conversations, and business knowledge into one simple workspace for growing businesses.",
  other: {
    "codex-preview": "development",
  },
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}
