import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Health Twin Pilates Assessment",
  description: "AI-assisted health funnel with safe personalization and entitlement-gated plans."
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
