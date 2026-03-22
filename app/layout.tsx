import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "FlowOS — Personal Productivity Dashboard",
  description: "Smart Kanban, Pomodoro Timer, Habit Tracker & Daily Analytics",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="th" suppressHydrationWarning>
      <body>{children}</body>
    </html>
  );
}
