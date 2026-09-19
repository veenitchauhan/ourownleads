import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "OurOwnLeads | Your business, connected",
  description: "A simple workspace for your WhatsApp conversations and business assistant.",
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
