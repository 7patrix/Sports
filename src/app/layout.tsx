import type { Metadata } from "next";
import "./globals.css";

const appUrl = process.env.APP_URL ?? "https://healthtwins.site";
const title = "Health Twin - AI Pilates & Wellness Assessment";
const description =
  "Build your Health Twin in minutes: an AI-assisted, safety-reviewed Pilates and wellness plan personalized to your body, goals and constraints.";

export const metadata: Metadata = {
  metadataBase: new URL(appUrl),
  title,
  description,
  applicationName: "Health Twin",
  keywords: ["Pilates", "health assessment", "wellness plan", "AI coach", "健康分身"],
  openGraph: {
    type: "website",
    url: appUrl,
    siteName: "Health Twin",
    title,
    description
  },
  twitter: {
    card: "summary_large_image",
    title,
    description
  },
  robots: { index: true, follow: true }
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
