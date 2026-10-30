import type { Metadata } from "next";
import "./globals.css";
import { AuthProvider } from "@/components/auth-provider";
export const metadata: Metadata = { title: "RANKED.DEV — Compete. Code. Climb.", description: "A competitive coding arena with ranks, XP and instant feedback." };
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en" className="dark"><body className="min-h-screen bg-background font-sans"><AuthProvider>{children}</AuthProvider></body></html>;
}
