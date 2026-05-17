import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Claude Visuals",
  description:
    "Cinematic real-time visualizer for Claude Code — see every agent, task, and tool call as it happens.",
  icons: {
    icon: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className="min-h-screen antialiased">{children}</body>
    </html>
  );
}
