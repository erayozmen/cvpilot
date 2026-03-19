import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "CVPilot — Build Your Perfect CV",
  description:
    "CVPilot helps you craft a professional CV and cover letter in minutes. Sign up free.",
  keywords: ["CV builder", "resume builder", "cover letter", "job application"],
  openGraph: {
    title: "CVPilot — Build Your Perfect CV",
    description: "Craft a professional CV and cover letter in minutes.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-paper antialiased">{children}</body>
    </html>
  );
}
